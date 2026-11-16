import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { IndicadoresComponent } from './indicadores.component';
import { QuotesService } from '../quotes-products.service';
import { ProjectService } from '../../project/project.service';
import { IndicadoresSgc } from '../quotes-products.types';
import routes from '../quotes-products.routes';
import { By } from '@angular/platform-browser';
import { MatSelect } from '@angular/material/select';

describe('IndicadoresComponent', () => {
  let component: IndicadoresComponent;
  let fixture: ComponentFixture<IndicadoresComponent>;
  let quotesService: jasmine.SpyObj<QuotesService>;
  let projectService: jasmine.SpyObj<ProjectService>;
  let router: jasmine.SpyObj<Router>;

  // Copiado de IndicadoresSgcDto del API C# (CotizacionSgcIndicadoresDtos.cs)
  const mockIndicadoresExactos: IndicadoresSgc = {
    emitidas: 10,
    ganadas: 4,
    perdidas: 2,
    canceladas: 1,
    vencidas: 1,
    cerradasSinRespuesta: 0,
    abiertas: 2,
    tasaConversionPorcentaje: 40.0,
    tiempoPromedioEmisionHoras: {
      cs: 12.5,
      ct: 48.0,
      ce: 160.0,
      general: 45.2,
    },
    enTiempo: {
      cs: {
        emitidas: 4,
        enPlazo: 4,
        porcentaje: 100.0,
        plazoHoras: 24,
      },
      ct: {
        emitidas: 4,
        enPlazo: 3,
        porcentaje: 75.0,
        plazoHoras: 120,
      },
      ce: {
        emitidas: 2,
        enPlazo: 2,
        porcentaje: 100.0,
        plazoHoras: 336,
      },
    },
    montos: [
      {
        moneda: 'MXN',
        cotizado: 250000,
        vendido: 100000,
        captacionPorcentaje: 40.0,
      },
      {
        moneda: 'USD',
        cotizado: 20000,
        vendido: 12000,
        captacionPorcentaje: 60.0,
      },
    ],
    motivosPerdida: [
      { motivo: 'Precio', cantidad: 2 },
      { motivo: 'DecisionCliente', cantidad: 1 },
      { motivo: 'Vencida', cantidad: 1 },
    ],
  };

  beforeEach(async () => {
    const quotesSpy = jasmine.createSpyObj('QuotesService', ['indicadores']);
    const projectSpy = jasmine.createSpyObj('ProjectService', ['getUnidadesDeNegocio']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    quotesSpy.indicadores.and.returnValue(of(mockIndicadoresExactos));
    projectSpy.getUnidadesDeNegocio.and.returnValue(
      of([
        // Copiado de UnidadDeNegocio del API C# (jr_api/Models/UnidadDeNegocio.cs), camelCase
        { unidadId: 1, nombre: 'Matriz', descripcion: 'Casa matriz', fechaCreacion: '2026-01-05T00:00:00Z' },
        { unidadId: 2, nombre: 'Querétaro', descripcion: null, fechaCreacion: '2026-01-05T00:00:00Z' },
      ])
    );

    await TestBed.configureTestingModule({
      imports: [
        IndicadoresComponent,
        HttpClientTestingModule,
        NoopAnimationsModule,
      ],
      providers: [
        { provide: QuotesService, useValue: quotesSpy },
        { provide: ProjectService, useValue: projectSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    quotesService = TestBed.inject(QuotesService) as jasmine.SpyObj<QuotesService>;
    projectService = TestBed.inject(ProjectService) as jasmine.SpyObj<ProjectService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    fixture = TestBed.createComponent(IndicadoresComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('Consultar_manda_rango_tipo_y_sucursal', () => {
    component.desde = '2026-11-01';
    component.hasta = '2026-11-30';
    component.tipo = 'CT';
    component.unidadDeNegocioId = 2;

    component.consultar();

    expect(quotesService.indicadores).toHaveBeenCalledWith({
      desde: '2026-11-01',
      hasta: '2026-11-30',
      tipo: 'CT',
      unidadDeNegocioId: 2,
    });
  });

  it('Los_valores_por_defecto_son_el_mes_actual', () => {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    const d = String(hoy.getDate()).padStart(2, '0');

    expect(component.desde).toBe(`${y}-${m}-01`);
    expect(component.hasta).toBe(`${y}-${m}-${d}`);
  });

  it('Las_tarjetas_muestran_los_conteos_y_la_tasa', () => {
    component.indicadores = mockIndicadoresExactos;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.tarjeta-emitidas')?.textContent).toContain('10');
    expect(compiled.querySelector('.tarjeta-ganadas')?.textContent).toContain('4');
    // Cerradas no ganadas = 2 + 1 + 1 + 0 = 4
    expect(compiled.querySelector('.tarjeta-no-ganadas')?.textContent).toContain('4');
    expect(compiled.querySelector('.tarjeta-abiertas')?.textContent).toContain('2');
    expect(compiled.querySelector('.tarjeta-conversion')?.textContent).toContain('40%');
  });

  it('Los_nulos_se_muestran_como_raya', () => {
    // Copiado de IndicadoresSgcDto con valores nulos (sin cotizaciones emitidas en el periodo)
    const mockNulos: IndicadoresSgc = {
      emitidas: 0,
      ganadas: 0,
      perdidas: 0,
      canceladas: 0,
      vencidas: 0,
      cerradasSinRespuesta: 0,
      abiertas: 0,
      tasaConversionPorcentaje: null,
      tiempoPromedioEmisionHoras: {
        cs: null,
        ct: null,
        ce: null,
        general: null,
      },
      enTiempo: {
        cs: null,
        ct: null,
        ce: null,
      },
      montos: [],
      motivosPerdida: [],
    };

    component.indicadores = mockNulos;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.tarjeta-conversion')?.textContent).toContain('—');

    // Tabla de tiempos debe contener rayas
    const tiempos = compiled.querySelector('.tabla-tiempos')?.textContent;
    expect(tiempos).toContain('—');

    // Tabla de plazos debe contener rayas
    const plazos = compiled.querySelector('.tabla-plazos')?.textContent;
    expect(plazos).toContain('—');
  });

  it('La_barra_de_plazo_es_verde_desde_90_por_ciento', () => {
    component.indicadores = mockIndicadoresExactos;
    fixture.detectChanges();

    const barras = fixture.nativeElement.querySelectorAll('.barra-plazo');
    expect(barras.length).toBeGreaterThanOrEqual(2);

    // CS tiene 100% (>= 90%) -> bg-green-600
    expect(barras[0].classList.contains('bg-green-600')).toBeTrue();

    // CT tiene 75% (< 90%) -> bg-amber-500
    expect(barras[1].classList.contains('bg-amber-500')).toBeTrue();
  });

  it('Los_montos_se_muestran_por_moneda_sin_mezclarlas', () => {
    component.indicadores = mockIndicadoresExactos;
    fixture.detectChanges();

    const filas = fixture.nativeElement.querySelectorAll('.fila-monto');
    expect(filas.length).toBe(2);

    expect(filas[0].textContent).toContain('MXN');
    expect(filas[0].textContent).toContain('40%');

    expect(filas[1].textContent).toContain('USD');
    expect(filas[1].textContent).toContain('60%');
  });

  it('Los_motivos_usan_el_nombre_del_catalogo_y_se_ordenan', () => {
    component.indicadores = mockIndicadoresExactos;
    fixture.detectChanges();

    const filas = fixture.nativeElement.querySelectorAll('.fila-motivo');
    expect(filas.length).toBe(3);

    // Primer motivo: Precio (2)
    expect(filas[0].textContent).toContain('Precio');
    expect(filas[0].textContent).toContain('2');

    // Segundo motivo: Decisión del cliente (3)
    expect(filas[1].textContent).toContain('Decisión del cliente');
    expect(filas[1].textContent).toContain('1');

    // Tercer motivo: Vencida (1)
    expect(filas[2].textContent).toContain('Vencida');
    expect(filas[2].textContent).toContain('1');
  });

  it('Un_400_del_API_se_muestra_con_su_mensaje', () => {
    quotesService.indicadores.and.returnValue(
      throwError(() => ({
        status: 400,
        error: { mensaje: 'El rango de consulta no puede exceder 366 días.' },
      }))
    );

    component.consultar();
    fixture.detectChanges();

    expect(component.errorMensaje).toBe('El rango de consulta no puede exceder 366 días.');
    expect(component.errorRed).toBeFalse();

    const errorDiv = fixture.nativeElement.querySelector('.mensaje-error-api');
    expect(errorDiv).not.toBeNull();
    expect(errorDiv.textContent).toContain('El rango de consulta no puede exceder 366 días.');
  });

  it('Un_error_de_red_se_ve_con_Reintentar', () => {
    quotesService.indicadores.and.returnValue(
      throwError(() => ({
        status: 0,
        message: 'Http failure response: 0 Unknown Error',
      }))
    );

    component.consultar();
    fixture.detectChanges();

    expect(component.errorRed).toBeTrue();
    const errorRedDiv = fixture.nativeElement.querySelector('.mensaje-error-red');
    expect(errorRedDiv).not.toBeNull();

    const btnReintentar = fixture.nativeElement.querySelector('.btn-reintentar');
    expect(btnReintentar).not.toBeNull();

    quotesService.indicadores.and.returnValue(of(mockIndicadoresExactos));
    btnReintentar.click();

    expect(quotesService.indicadores).toHaveBeenCalled();
  });

  it('La_ruta_indicadores_va_antes_que_la_ruta_por_id', () => {
    const indexIndicadores = routes.findIndex((r) => r.path === 'indicadores');
    const indexId = routes.findIndex((r) => r.path === ':id');

    expect(indexIndicadores).toBeGreaterThanOrEqual(0);
    expect(indexId).toBeGreaterThanOrEqual(0);
    expect(indexIndicadores).toBeLessThan(
      indexId,
      'La ruta "indicadores" debe ir antes de ":id" para no ser capturada como parámetro.'
    );
  });

  it('El_componente_no_entra_en_un_ciclo_de_deteccion', () => {
    // autoDetectChanges(true) no debe arrojar ExpressionChangedAfterItHasBeenCheckedError ni bucles
    fixture.autoDetectChanges(true);

    component.indicadores = mockIndicadoresExactos;
    fixture.detectChanges();

    expect(component.indicadores.emitidas).toBe(10);
    expect(fixture.nativeElement.querySelector('.tarjeta-emitidas')?.textContent).toContain('10');
  });

  // ---- Revision de Claude (Fase 3, front) ----
  it('El_selector_de_sucursal_usa_el_unidadId_del_API', async () => {
    const select = fixture.debugElement.query(By.css('.select-sucursal')).componentInstance as MatSelect;
    expect(select.options.toArray().map((o) => o.value)).toEqual([null, 1, 2]);

    select.open();
    fixture.detectChanges();
    await fixture.whenStable();
    const opcion = (Array.from(document.querySelectorAll('mat-option')) as HTMLElement[])
      .find((o) => (o.textContent || '').includes('Querétaro'));
    expect(opcion).toBeDefined();
    opcion!.click();
    fixture.detectChanges();

    expect(component.unidadDeNegocioId).toBe(2);
    component.consultar();
    expect(quotesService.indicadores).toHaveBeenCalledWith(jasmine.objectContaining({ unidadDeNegocioId: 2 }));
  });

  it('El_plazo_en_horas_sale_del_API_y_no_de_un_texto_fijo', () => {
    component.indicadores = {
      ...mockIndicadoresExactos,
      enTiempo: {
        ...mockIndicadoresExactos.enTiempo,
        cs: { emitidas: 4, enPlazo: 4, porcentaje: 100.0, plazoHoras: 48 },
      },
    };
    fixture.detectChanges();

    const tabla = fixture.nativeElement.querySelector('.tabla-plazos').textContent;
    expect(tabla).toContain('48 h');
    expect(tabla).toContain('120 h');
    expect(tabla).toContain('336 h');
    expect(tabla).not.toContain('24 h');
  });
});
