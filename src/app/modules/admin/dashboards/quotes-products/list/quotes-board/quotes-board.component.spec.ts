import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { QuotesService } from '../../quotes-products.service';
import { TipoCotizacionSgc } from '../../quotes-products.types';
import { QuotesBoardComponent } from './quotes-board.component';

function cot(id: number, over: any = {}): any {
  return {
    cotizacionProductosId: id, nombreCliente: `Cliente ${id}`, total: 1000 * id, createdDate: '2026-11-10T00:00:00',
    unidadDeNegocio: { nombre: 'Unidad Ficticia' }, tipoSgc: null, informativa: false, ...over
  };
}

function pagina(items: any[], total = items.length): Observable<any> {
  return of({ code: 200, data: items, totalCount: total });
}

describe('QuotesBoardComponent', () => {
  let fixture: ComponentFixture<QuotesBoardComponent>;
  let component: QuotesBoardComponent;
  let listado: jasmine.Spy;
  let resumen: jasmine.Spy;
  let respuestas: Partial<Record<TipoCotizacionSgc, (page: number) => Observable<any>>>;

  beforeEach(() => {
    respuestas = {
      CS: () => pagina([]),
      CT: () => pagina([]),
      CE: () => pagina([])
    };
    listado = jasmine.createSpy('getQuotesPorRango').and.callFake(
      (page: number, _size: number, _d: any, _h: any, tipo: TipoCotizacionSgc) => respuestas[tipo]!(page)
    );
    resumen = jasmine.createSpy('resumenSgc').and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [QuotesBoardComponent, NoopAnimationsModule, MatIconTestingModule],
      providers: [{ provide: QuotesService, useValue: { getQuotesPorRango: listado, resumenSgc: resumen } }]
    });
    fixture = TestBed.createComponent(QuotesBoardComponent);
    component = fixture.componentInstance;
    fixture.autoDetectChanges(true);
  });

  const el = (): HTMLElement => fixture.nativeElement;
  const q = (sel: string): HTMLElement | null => el().querySelector(sel);
  const col = (tipo: string): HTMLElement => q(`[data-testid="columna-${tipo}"]`) as HTMLElement;
  const tarjetasDe = (tipo: string): HTMLElement[] => Array.from(col(tipo).querySelectorAll('[data-testid^="tarjeta-"]'));
  const llamadasDe = (tipo: string): any[][] => listado.calls.allArgs().filter(a => a[4] === tipo);

  function iniciar(desde = '2026-11-01', hasta = '2026-11-23'): void {
    fixture.componentRef.setInput('desde', desde);
    fixture.componentRef.setInput('hasta', hasta);
    fixture.detectChanges();
  }

  it('Pide_una_pagina_por_columna_con_su_tipo_y_el_rango', () => {
    iniciar();

    expect(listado).toHaveBeenCalledWith(1, 15, '2026-11-01', '2026-11-23', 'CS');
    expect(listado).toHaveBeenCalledWith(1, 15, '2026-11-01', '2026-11-23', 'CT');
    expect(listado).toHaveBeenCalledWith(1, 15, '2026-11-01', '2026-11-23', 'CE');
    expect(listado).toHaveBeenCalledTimes(3);
  });

  it('Columna_Comercial_incluye_las_informativas_con_etiqueta_y_las_demas_columnas_no', () => {
    respuestas.CS = () => pagina([cot(1, { informativa: true }), cot(2)]);
    respuestas.CT = () => pagina([cot(3, { tipoSgc: 'CT' })]);
    iniciar();

    expect(tarjetasDe('CS').length).toBe(2);
    expect(tarjetasDe('CS')[0].textContent).toContain('Informativa');
    expect(tarjetasDe('CS')[1].textContent).not.toContain('Informativa');
    expect(tarjetasDe('CT').length).toBe(1);
    expect(tarjetasDe('CE').length).toBe(0);
    expect(col('CE').textContent).toContain('Sin cotizaciones en este rango');
  });

  it('Tarjeta_muestra_folio_cliente_total_y_etapa_del_resumen_SGC', () => {
    respuestas.CS = () => pagina([cot(2)]);
    resumen.and.returnValue(of([{
      cotizacionProductosId: 2, folio: 'COT-2026-0002', tipo: 'CS', version: 1, etapa: 'EnSeguimiento',
      total: 500, moneda: 'MXN', requerimientoFolio: 'REQ-2026-0057', vencida: false, seguimientoAtrasado: true
    }]));
    iniciar();

    const t = tarjetasDe('CS')[0];
    expect(t.textContent).toContain('COT-2026-0002');
    expect(t.textContent).toContain('Cliente 2');
    expect(t.textContent).toContain('$500.00');
    expect(t.textContent).toContain('En seguimiento');
    expect(t.textContent).toContain('REQ-2026-0057');
    expect(t.textContent).toContain('Seguimiento atrasado');
  });

  it('Sin_resumen_SGC_la_tarjeta_usa_el_numero_y_el_total_de_CONTPAQ', () => {
    respuestas.CS = () => pagina([cot(7, { informativa: true })]);
    iniciar();

    const t = tarjetasDe('CS')[0];
    expect(t.textContent).toContain('#7');
    expect(t.textContent).toContain('$7,000.00');
  });

  it('Ver_mas_pide_la_pagina_siguiente_y_agrega_sin_duplicar', () => {
    respuestas.CS = (p) => p === 1 ? pagina([cot(1), cot(2)], 3) : pagina([cot(2), cot(3)], 3);
    iniciar();
    expect(tarjetasDe('CS').length).toBe(2);

    (col('CS').querySelector('[data-testid="ver-mas"]') as HTMLElement).click();
    fixture.detectChanges();

    expect(llamadasDe('CS')[1][0]).toBe(2);
    expect(tarjetasDe('CS').map(t => t.getAttribute('data-testid'))).toEqual(['tarjeta-1', 'tarjeta-2', 'tarjeta-3']);
    expect(col('CS').querySelector('[data-testid="ver-mas"]')).toBeNull();
  });

  it('Una_columna_con_error_muestra_Reintentar_y_las_otras_siguen_funcionando', () => {
    respuestas.CS = () => pagina([cot(1)]);
    respuestas.CT = () => throwError(() => new Error('falló'));
    iniciar();

    expect(tarjetasDe('CS').length).toBe(1);
    expect(col('CT').querySelector('[data-testid="error-columna"]')).not.toBeNull();
    expect(col('CS').querySelector('[data-testid="error-columna"]')).toBeNull();
    expect(col('CE').querySelector('[data-testid="error-columna"]')).toBeNull();

    respuestas.CT = () => pagina([cot(5, { tipoSgc: 'CT' })]);
    (col('CT').querySelector('[data-testid="reintentar-columna"]') as HTMLElement).click();
    fixture.detectChanges();

    expect(llamadasDe('CT').length).toBe(2);
    expect(llamadasDe('CS').length).toBe(1);
    expect(col('CT').querySelector('[data-testid="error-columna"]')).toBeNull();
    expect(tarjetasDe('CT').length).toBe(1);
  });

  it('Una_respuesta_con_code_distinto_de_200_se_ve_como_error_de_esa_columna', () => {
    respuestas.CE = () => of({ code: 500, message: 'Error del servidor ficticio' });
    iniciar();

    expect(col('CE').querySelector('[data-testid="error-columna"]')?.textContent).toContain('Error del servidor ficticio');
  });

  it('Cambiar_las_fechas_recarga_las_tres_columnas_desde_la_pagina_1', () => {
    respuestas.CS = (p) => p === 1 ? pagina([cot(1)], 40) : pagina([cot(2)], 40);
    iniciar();
    (col('CS').querySelector('[data-testid="ver-mas"]') as HTMLElement).click();
    expect(llamadasDe('CS').length).toBe(2);

    fixture.componentRef.setInput('desde', '2026-10-01');
    fixture.detectChanges();

    expect(listado).toHaveBeenCalledTimes(3 + 1 + 3);
    expect(listado.calls.mostRecent().args[0]).toBe(1);
    expect(listado.calls.mostRecent().args[2]).toBe('2026-10-01');
    expect(tarjetasDe('CS').length).toBe(1); // reinició: ya no arrastra la página 2
  });

  it('Una_respuesta_vieja_no_pisa_a_la_nueva', () => {
    const vieja = new Subject<any>();
    const nueva = new Subject<any>();
    let llamada = 0;
    respuestas.CS = () => (++llamada === 1 ? vieja : nueva);
    iniciar();

    fixture.componentRef.setInput('desde', '2026-10-01');
    fixture.detectChanges();

    nueva.next({ code: 200, data: [cot(9)], totalCount: 1 });
    nueva.complete();
    vieja.next({ code: 200, data: [cot(1)], totalCount: 1 });
    vieja.complete();
    fixture.detectChanges();

    expect(tarjetasDe('CS').map(t => t.getAttribute('data-testid'))).toEqual(['tarjeta-9']);
  });

  it('El_texto_filtra_lo_ya_cargado_sin_volver_a_pedir_al_API', () => {
    respuestas.CS = () => pagina([cot(1), cot(2), cot(3)]);
    iniciar();
    const peticiones = listado.calls.count();

    fixture.componentRef.setInput('texto', 'cliente 2');
    fixture.detectChanges();

    expect(tarjetasDe('CS').map(t => t.getAttribute('data-testid'))).toEqual(['tarjeta-2']);
    expect(listado.calls.count()).toBe(peticiones);

    fixture.componentRef.setInput('texto', 'no existe');
    fixture.detectChanges();
    expect(col('CS').textContent).toContain('Ninguna de las cargadas coincide');
  });

  it('Los_filtros_de_etapa_y_marcas_se_aplican_a_lo_cargado', () => {
    respuestas.CS = () => pagina([cot(1), cot(2)]);
    resumen.and.returnValue(of([
      { cotizacionProductosId: 1, folio: 'COT-1', tipo: 'CS', version: 1, etapa: 'Borrador', total: 1, moneda: 'MXN', vencida: false, seguimientoAtrasado: false },
      { cotizacionProductosId: 2, folio: 'COT-2', tipo: 'CS', version: 1, etapa: 'EnSeguimiento', total: 2, moneda: 'MXN', vencida: true, seguimientoAtrasado: false }
    ]));
    iniciar();

    fixture.componentRef.setInput('etapa', 'EnSeguimiento');
    fixture.detectChanges();
    expect(tarjetasDe('CS').map(t => t.getAttribute('data-testid'))).toEqual(['tarjeta-2']);

    fixture.componentRef.setInput('etapa', 'todas');
    fixture.componentRef.setInput('marcas', 'atrasadas');
    fixture.detectChanges();
    expect(tarjetasDe('CS').length).toBe(0);

    fixture.componentRef.setInput('marcas', 'vencidas');
    fixture.detectChanges();
    expect(tarjetasDe('CS').map(t => t.getAttribute('data-testid'))).toEqual(['tarjeta-2']);
  });

  it('Un_clic_en_la_tarjeta_emite_el_id_de_la_cotizacion', () => {
    respuestas.CT = () => pagina([cot(44, { tipoSgc: 'CT' })]);
    iniciar();
    const abiertos: number[] = [];
    component.abrir.subscribe((id: number) => abiertos.push(id));

    (q('[data-testid="tarjeta-44"]') as HTMLElement).click();

    expect(abiertos).toEqual([44]);
  });

  it('Si_el_resumen_SGC_falla_avisa_en_la_columna_y_conserva_las_tarjetas', () => {
    respuestas.CS = () => pagina([cot(1)]);
    resumen.and.returnValue(throwError(() => new Error('falló')));
    iniciar();

    expect(col('CS').querySelector('[data-testid="aviso-resumen"]')).not.toBeNull();
    expect(tarjetasDe('CS').length).toBe(1);
  });

  it('Emite_la_suma_de_los_totales_de_las_tres_columnas_fuera_del_ciclo_de_deteccion', async () => {
    respuestas.CS = () => pagina([cot(1)], 12);
    respuestas.CT = () => pagina([cot(2, { tipoSgc: 'CT' })], 5);
    respuestas.CE = () => pagina([], 0);
    const totales: number[] = [];
    component.totalChange.subscribe((t: number) => totales.push(t));
    iniciar();

    // No se emite dentro del mismo ciclo (evita NG0100 en el padre); llega en la microtarea siguiente
    expect(totales.length).toBe(0);
    await fixture.whenStable();

    expect(totales[totales.length - 1]).toBe(17);
  });

  it('Muestra_el_conteo_cargadas_de_total_por_columna', () => {
    respuestas.CS = () => pagina([cot(1), cot(2)], 30);
    iniciar();

    expect(col('CS').querySelector('[data-testid="conteo-columna"]')?.textContent?.trim()).toBe('2 de 30');
  });
});
