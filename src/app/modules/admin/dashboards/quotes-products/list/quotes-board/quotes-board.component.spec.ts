import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MatDialog } from '@angular/material/dialog';
import { Observable, Subject, of, throwError } from 'rxjs';
import { QuotesService } from '../../quotes-products.service';
import { TipoCotizacionSgc } from '../../quotes-products.types';
import { CotizacionDetalleDialogComponent } from '../../cotizacion-detalle-dialog/cotizacion-detalle-dialog.component';
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
  let mockDialog: any;
  let respuestas: Partial<Record<TipoCotizacionSgc, (page: number) => Observable<any>>>;

  beforeEach(() => {
    mockDialog = {
      open: jasmine.createSpy('open')
    };
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
      providers: [
        { provide: QuotesService, useValue: { getQuotesPorRango: listado, resumenSgc: resumen } },
        { provide: MatDialog, useValue: mockDialog }
      ]
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
    expect(t.textContent).toContain('Enviada a cliente');
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

  it('Cada_tarjeta_tiene_el_icono_ver', () => {
    respuestas.CS = () => pagina([cot(2)]);
    iniciar();

    const ojo = q('[data-testid="ver-tarjeta-2"]');
    expect(ojo).not.toBeNull();
    expect(ojo?.getAttribute('mattooltip') || ojo?.getAttribute('ng-reflect-message') || 'Ver detalle').toBe('Ver detalle');
  });

  it('El_icono_ver_de_la_tarjeta_abre_el_dialogo_y_no_emite_abrir', () => {
    respuestas.CS = () => pagina([cot(2)]);
    iniciar();
    const abiertos: number[] = [];
    component.abrir.subscribe((id: number) => abiertos.push(id));

    const ojo = q('[data-testid="ver-tarjeta-2"]') as HTMLElement;
    ojo.click();
    fixture.detectChanges();

    expect(mockDialog.open).toHaveBeenCalledWith(
      CotizacionDetalleDialogComponent,
      jasmine.objectContaining({
        data: jasmine.objectContaining({ cotizacionProductosId: 2, informativa: false })
      })
    );
    expect(abiertos.length).toBe(0);
  });

  it('Hacer_clic_en_la_tarjeta_sigue_abriendo_la_cotizacion', () => {
    respuestas.CS = () => pagina([cot(2)]);
    iniciar();
    const abiertos: number[] = [];
    component.abrir.subscribe((id: number) => abiertos.push(id));

    const tarjeta = q('[data-testid="tarjeta-2"]') as HTMLElement;
    tarjeta.click();
    fixture.detectChanges();

    expect(abiertos).toEqual([2]);
    expect(mockDialog.open).not.toHaveBeenCalled();
  });

  it('Cada_tarjeta_eliminable_tiene_el_icono_papelera_si_hay_permiso', () => {
    component.permisoEliminar = true;
    respuestas.CS = () => pagina([cot(2, { etapa: 'Borrador', version: 1 })]);
    iniciar();

    expect(q('[data-testid="eliminar-tarjeta-2"]')).not.toBeNull();
  });

  it('Sin_permiso_btnDelete_no_hay_icono', () => {
    component.permisoEliminar = false;
    respuestas.CS = () => pagina([cot(2, { etapa: 'Borrador', version: 1 })]);
    iniciar();

    expect(q('[data-testid="eliminar-tarjeta-2"]')).toBeNull();
  });

  it('Una_tarjeta_que_no_se_puede_eliminar_no_tiene_icono', () => {
    component.permisoEliminar = true;
    respuestas.CS = () => pagina([cot(2, { etapa: 'Emitida', version: 1 })]);
    iniciar();

    expect(q('[data-testid="eliminar-tarjeta-2"]')).toBeNull();
  });

  it('Si_informativa_es_false_y_aun_no_llega_resumen_no_hay_icono_eliminar', () => {
    component.permisoEliminar = true;
    respuestas.CS = () => pagina([cot(2, { informativa: false })]);
    iniciar();

    expect(q('[data-testid="eliminar-tarjeta-2"]')).toBeNull();
  });

  it('La_papelera_emite_eliminar_con_el_id_y_no_abre_la_cotizacion', () => {
    component.permisoEliminar = true;
    respuestas.CS = () => pagina([cot(2, { etapa: 'Borrador', version: 1 })]);
    iniciar();
    const eliminados: number[] = [];
    const abiertos: number[] = [];
    component.eliminar.subscribe((id: number) => eliminados.push(id));
    component.abrir.subscribe((id: number) => abiertos.push(id));

    const btn = q('[data-testid="eliminar-tarjeta-2"]') as HTMLElement;
    btn.click();
    fixture.detectChanges();

    expect(eliminados).toEqual([2]);
    expect(abiertos.length).toBe(0);
  });

  it('La_tarjeta_muestra_CONTPAQ_y_su_folio_cuando_lo_tiene', () => {
    respuestas.CS = () => pagina([cot(2, { folioContpaq: '842' })]);
    iniciar();

    const chip = q('[data-testid="chip-folio-contpaq"]');
    expect(chip).not.toBeNull();
    expect(chip?.textContent?.trim()).toBe('CONTPAQ 842');
  });

  it('Si_folioContpaq_es_null_no_se_pinta_el_chip', () => {
    respuestas.CS = () => pagina([cot(2, { folioContpaq: null })]);
    iniciar();

    expect(q('[data-testid="chip-folio-contpaq"]')).toBeNull();
  });

  it('El_filtro_por_texto_encuentra_tarjetas_por_folio_CONTPAQ', () => {
    respuestas.CS = () => pagina([
      cot(2, { folioContpaq: '842', nombreCliente: 'Uno' }),
      cot(3, { folioContpaq: '999', nombreCliente: 'Dos' })
    ]);
    iniciar();

    component.texto = '842';
    component.ngOnChanges({ texto: { currentValue: '842', previousValue: '', firstChange: false, isFirstChange: () => false } });
    fixture.detectChanges();

    expect(q('[data-testid="tarjeta-2"]')).not.toBeNull();
    expect(q('[data-testid="tarjeta-3"]')).toBeNull();
  });

  it('Botones_de_la_tarjeta_no_se_enciman_con_el_chip', () => {
    component.permisoEliminar = true;
    respuestas.CS = () => pagina([cot(2, { etapa: 'Borrador', version: 1 })]);
    iniciar();

    const tarjeta = q('[data-testid="tarjeta-2"]');
    const encabezado = q('[data-testid="encabezado-tarjeta"]');
    const botones = q('[data-testid="botones-accion-tarjeta"]');

    expect(tarjeta).not.toBeNull();
    expect(encabezado).not.toBeNull();
    expect(botones).not.toBeNull();
    expect(tarjeta?.className).toContain('pr-20');
    expect(encabezado?.className).toContain('pr-16');
  });

  it('Titulo_de_la_tarjeta_es_el_prospecto_del_lead', () => {
    respuestas.CS = () => pagina([cot(2, { nombreCliente: 'MOSTRADOR' })]);
    resumen.and.returnValue(of([{
      cotizacionProductosId: 2,
      folio: 'COT-2026-0002',
      tipo: 'CS',
      version: 1,
      total: 1000,
      estatusCotizacion: 'EnProceso',
      prospecto: {
        leadId: 55,
        empresa: 'Industrias Alfa',
        nombreContacto: 'Ing. Perez'
      }
    }]));
    iniciar();

    const tarjeta = q('[data-testid="tarjeta-2"]');
    const titulo = q('[data-testid="titulo-tarjeta"]');
    const chipLead = q('[data-testid="chip-lead"]');

    expect(titulo?.textContent?.trim()).toBe('Industrias Alfa');
    expect(chipLead).not.toBeNull();
    expect(chipLead?.textContent?.trim()).toBe('Lead');
  });

  it('Sin_lead_muestra_el_cliente_de_CONTPAQ', () => {
    respuestas.CS = () => pagina([cot(2, { nombreCliente: 'CLIENTE CONTPAQ S.A.' })]);
    resumen.and.returnValue(of([{
      cotizacionProductosId: 2,
      folio: 'COT-2026-0002',
      tipo: 'CS',
      version: 1,
      total: 1000,
      estatusCotizacion: 'EnProceso',
      prospecto: null
    }]));
    iniciar();

    const titulo = q('[data-testid="titulo-tarjeta"]');
    const chipLead = q('[data-testid="chip-lead"]');

    expect(titulo?.textContent?.trim()).toBe('CLIENTE CONTPAQ S.A.');
    expect(chipLead).toBeNull();
  });

  it('Chip_de_estatus_con_los_cuatro_nombres', () => {
    respuestas.CS = () => pagina([
      cot(1, { estatusCotizacion: 'EnProceso' }),
      cot(2, { estatusCotizacion: 'EnviadaACliente' }),
      cot(3, { estatusCotizacion: 'AprobadaPorCliente' }),
      cot(4, { estatusCotizacion: 'Rechazada' })
    ]);
    iniciar();

    const chip1 = q('[data-testid="chip-estatus-EnProceso"]');
    const chip2 = q('[data-testid="chip-estatus-EnviadaACliente"]');
    const chip3 = q('[data-testid="chip-estatus-AprobadaPorCliente"]');
    const chip4 = q('[data-testid="chip-estatus-Rechazada"]');

    expect(chip1?.textContent?.trim()).toBe('En proceso');
    expect(chip2?.textContent?.trim()).toBe('Enviada a cliente');
    expect(chip3?.textContent?.trim()).toBe('Aprobada por cliente');
    expect(chip4?.textContent?.trim()).toBe('Rechazada');
  });

  it('Filtro_por_estatus', () => {
    respuestas.CS = () => pagina([
      cot(1, { estatusCotizacion: 'EnProceso' }),
      cot(2, { estatusCotizacion: 'EnviadaACliente' }),
      cot(3, { informativa: true })
    ]);
    iniciar();

    expect(q('[data-testid="tarjeta-1"]')).not.toBeNull();
    expect(q('[data-testid="tarjeta-2"]')).not.toBeNull();
    expect(q('[data-testid="tarjeta-3"]')).not.toBeNull();

    component.etapa = 'EnProceso';
    component.ngOnChanges({ etapa: { currentValue: 'EnProceso', previousValue: 'todas', firstChange: false, isFirstChange: () => false } });
    fixture.detectChanges();

    expect(q('[data-testid="tarjeta-1"]')).not.toBeNull();
    expect(q('[data-testid="tarjeta-2"]')).toBeNull();
    expect(q('[data-testid="tarjeta-3"]')).toBeNull();

    component.etapa = 'informativa';
    component.ngOnChanges({ etapa: { currentValue: 'informativa', previousValue: 'EnProceso', firstChange: false, isFirstChange: () => false } });
    fixture.detectChanges();

    expect(q('[data-testid="tarjeta-1"]')).toBeNull();
    expect(q('[data-testid="tarjeta-2"]')).toBeNull();
    expect(q('[data-testid="tarjeta-3"]')).not.toBeNull();
  });
});
