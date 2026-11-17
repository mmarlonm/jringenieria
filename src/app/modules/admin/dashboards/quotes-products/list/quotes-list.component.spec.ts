import { ComponentFixture, TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { QuoteListComponent } from './quotes-list.component';
import { QuotesService } from '../quotes-products.service';
import { ChatNotificationService } from 'app/shared/components/chat-notification/chat-notification.service';
import { MatDialog } from '@angular/material/dialog';
import { ResumenSgc } from '../quotes-products.types';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

registerLocaleData(localeEs);

describe('QuoteListComponent', () => {
  let component: QuoteListComponent;
  let fixture: ComponentFixture<QuoteListComponent>;
  let mockQuotesService: any;
  let mockChatService: any;
  let mockRouter: any;

  const mockQuotesData = [
    {
      cotizacionProductosId: 101,
      nombreCliente: 'Cliente Alpha',
      unidadDeNegocio: { nombre: 'Baja Tensión' },
      createdDate: '2026-11-14',
      requisitosEspeciales: false,
      total: 1000,
      estatus: 1,
    },
    {
      cotizacionProductosId: 102,
      nombreCliente: 'Cliente Beta',
      unidadDeNegocio: { nombre: 'Media Tensión' },
      createdDate: '2026-11-14',
      requisitosEspeciales: true,
      total: 2500,
      estatus: 1,
    },
  ];

  const mockResumenes: ResumenSgc[] = [
    {
      cotizacionProductosId: 101,
      folio: 'COT-2026-0001',
      tipo: 'CT',
      version: 1,
      total: 1200,
      moneda: 'MXN',
      etapa: 'Borrador',
      fechaEmision: '2026-11-14T10:00:00Z',
      fechaVencimiento: '2026-11-29T10:00:00Z',
      creadoPorNombre: 'Juan Perez',
    },
  ];

  beforeEach(async () => {
    mockQuotesService = {
      getQuotes: jasmine.createSpy('getQuotes'),
      getQuotesPorRango: jasmine.createSpy('getQuotesPorRango').and.returnValue(
        of({
          code: 200,
          data: JSON.parse(JSON.stringify(mockQuotesData)),
          totalCount: 2,
        })
      ),
      getEstatus: jasmine.createSpy('getEstatus').and.returnValue(of({ code: 200, data: [{ id: 1, nombre: 'Pendiente' }] })),
      resumenSgc: jasmine.createSpy('resumenSgc').and.returnValue(of(mockResumenes)),
      cambiarEstatus: jasmine.createSpy('cambiarEstatus').and.returnValue(of({ code: 200 })),
      deleteQuote: jasmine.createSpy('deleteQuote').and.returnValue(of({ code: 200 })),
    };

    mockChatService = {
      showSuccess: jasmine.createSpy('showSuccess'),
      showWarning: jasmine.createSpy('showWarning'),
      showError: jasmine.createSpy('showError'),
    };

    mockRouter = {
      url: '/admin/quotes',
      navigate: jasmine.createSpy('navigate'),
    };

    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, QuoteListComponent],
      providers: [
        { provide: QuotesService, useValue: mockQuotesService },
        { provide: ChatNotificationService, useValue: mockChatService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: {} },
        { provide: MatDialog, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuoteListComponent);
    component = fixture.componentInstance;
    component.permisosDisponibles = ['btnAdd', 'btnEdit', 'btnDelete'];
    fixture.detectChanges();
  });

  it('La_lista_muestra_folio_tipo_y_total_del_resumen', () => {
    expect(mockQuotesService.resumenSgc).toHaveBeenCalledWith([101, 102]);

    const item1 = component.dataSource.data.find((q) => q.cotizacionProductosId === 101);
    expect(item1.folio).toBe('COT-2026-0001');
    expect(item1.tipo).toBe('CT');
    expect(item1.totalSgc).toBe(1200);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('COT-2026-0001');
    expect(compiled.textContent).toContain('CT');
    expect(compiled.textContent).toContain('1,200');
  });

  it('Sin_registro_muestra_el_id_y_el_total_de_siempre', () => {
    // 102 no vino en mockResumenes
    const item2 = component.dataSource.data.find((q) => q.cotizacionProductosId === 102);
    expect(item2.folio).toBeUndefined();
    expect(item2.tipo).toBeUndefined();
    expect(item2.totalSgc).toBeUndefined();
    expect(item2.total).toBe(2500);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('#102');
    expect(compiled.textContent).toContain('2,500');
  });

  it('Si_el_resumen_falla_se_muestra_un_aviso_y_la_lista_sigue', () => {
    mockQuotesService.resumenSgc.and.returnValue(throwError(() => new Error('Error al cargar resumen')));

    component.getQuotes();
    fixture.detectChanges();

    expect(component.dataSource.data.length).toBe(2);
    expect(mockChatService.showWarning).toHaveBeenCalled();
    expect(component.errorResumenSgc).toBeTrue();
  });

  it('El_filtro_busca_por_folio', () => {
    component.setCustomFilter();

    component.filterValue = 'COT-2026-0001';
    component.applyFilter();

    expect(component.dataSource.filteredData.length).toBe(1);
    expect(component.dataSource.filteredData[0].cotizacionProductosId).toBe(101);
  });

  it('La_lista_muestra_etapa_vigencia_envio_y_responsable', () => {
    expect(component.displayedColumns).toContain('etapa');
    expect(component.displayedColumns).toContain('vigencia');
    expect(component.displayedColumns).toContain('envio');
    expect(component.displayedColumns).toContain('responsable');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Borrador');
    expect(compiled.textContent).toContain('Juan Perez');
    expect(compiled.textContent).toContain('2026-11-14');
    expect(compiled.textContent).toContain('2026-11-29');
  });

  it('Las_filas_con_registro_ocultan_el_estatus_viejo_y_muestran_la_etapa', () => {
    const item1 = component.dataSource.data.find((q) => q.cotizacionProductosId === 101);
    expect(component.tieneRegistroSgc(item1)).toBeTrue();

    const compiled = fixture.nativeElement as HTMLElement;
    // Row 101 has SGC: should render etapa chip
    const chips = compiled.querySelectorAll('app-etapa-chip');
    expect(chips.length).toBeGreaterThan(0);
  });

  it('Las_filas_sin_registro_conservan_el_estatus_viejo', () => {
    const item2 = component.dataSource.data.find((q) => q.cotizacionProductosId === 102);
    expect(component.tieneRegistroSgc(item2)).toBeFalse();

    const compiled = fixture.nativeElement as HTMLElement;
    // Row 102 preserves legacy status name
    expect(compiled.textContent).toContain('Pendiente');
  });

  it('El_filtro_por_etapa_filtra_las_filas_cargadas', () => {
    component.todasLasQuotesDePagina = [
      { cotizacionProductosId: 101, etapa: 'Borrador' },
      { cotizacionProductosId: 102, etapa: 'Emitida' },
      { cotizacionProductosId: 103, etapa: 'Borrador' },
    ];
    component.dataSource.data = [...component.todasLasQuotesDePagina];

    component.filtrarPorEtapa('Emitida');
    expect(component.dataSource.data.length).toBe(1);
    expect(component.dataSource.data[0].cotizacionProductosId).toBe(102);

    component.filtrarPorEtapa('Borrador');
    expect(component.dataSource.data.length).toBe(2);

    component.filtrarPorEtapa('todas');
    expect(component.dataSource.data.length).toBe(3);
  });

  it('El_folio_muestra_la_version_si_es_mayor_a_1', () => {
    const quoteV1 = { cotizacionProductosId: 101, folio: 'COT-2026-0001', version: 1 };
    const quoteV2 = { cotizacionProductosId: 102, folio: 'COT-2026-0002', version: 2 };

    expect(component.obtenerTextoFolio(quoteV1)).toBe('COT-2026-0001');
    expect(component.obtenerTextoFolio(quoteV2)).toBe('COT-2026-0002 v2');
  });

  it('El_boton_eliminar_se_oculta_si_la_cotizacion_no_esta_en_borrador_o_es_version_mayor_a_1', () => {
    // Sin SGC: se puede eliminar
    expect(component.puedeEliminar({ cotizacionProductosId: 100 })).toBeTrue();

    // Con SGC en Borrador y v1: se puede eliminar
    expect(component.puedeEliminar({ cotizacionProductosId: 101, tieneSgc: true, etapa: 'Borrador', version: 1 })).toBeTrue();

    // Con SGC en etapa distinta a Borrador: no se puede eliminar
    expect(component.puedeEliminar({ cotizacionProductosId: 102, tieneSgc: true, etapa: 'EnRevision', version: 1 })).toBeFalse();
    expect(component.puedeEliminar({ cotizacionProductosId: 103, tieneSgc: true, etapa: 'Emitida', version: 1 })).toBeFalse();

    // Con SGC en Borrador pero versión > 1: no se puede eliminar
    expect(component.puedeEliminar({ cotizacionProductosId: 104, tieneSgc: true, etapa: 'Borrador', version: 2 })).toBeFalse();
  });

  it('Un_409_al_eliminar_muestra_el_mensaje_del_API', async () => {
    spyOn(component, 'showConfirmation').and.returnValue(Promise.resolve(true));
    mockQuotesService.deleteQuote.and.returnValue(
      throwError(() => ({
        status: 409,
        error: { mensaje: 'No se puede eliminar una cotización que no esté en borrador.' },
      }))
    );

    await component.deleteQuote(101);

    expect(mockChatService.showError).toHaveBeenCalledWith(
      'Error',
      'No se puede eliminar una cotización que no esté en borrador.',
      5000
    );
  });

  it('La_lista_muestra_probabilidad_y_proxima_accion', () => {
    expect(component.displayedColumns).toContain('probabilidad');
    expect(component.displayedColumns).toContain('proximaAccion');

    // Asignar datos con probabilidad y próxima acción
    const quote = {
      cotizacionProductosId: 101,
      nombreCliente: 'Cliente Alpha',
      probabilidadPorcentaje: 85,
      proximaAccionFecha: '2026-11-20T00:00:00',
      total: 1000,
    };
    component.dataSource.data = [quote];
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('85%');
    expect(compiled.textContent).toContain('20/11/2026');
  });

  it('Las_marcas_de_vencida_y_atraso_aparecen_donde_corresponden', () => {
    component.dataSource.data = [
      {
        cotizacionProductosId: 101,
        etapa: 'Emitida',
        vencida: true,
        seguimientoAtrasado: false,
      },
      {
        cotizacionProductosId: 102,
        etapa: 'EnSeguimiento',
        vencida: false,
        seguimientoAtrasado: true,
      },
    ];
    fixture.detectChanges();

    const marcaVencida = fixture.nativeElement.querySelector('.marca-vencida');
    expect(marcaVencida).not.toBeNull();
    expect(marcaVencida.textContent).toContain('Vencida por cerrar');

    const marcaAtraso = fixture.nativeElement.querySelector('.marca-atraso');
    expect(marcaAtraso).not.toBeNull();
    expect(marcaAtraso.textContent).toContain('Seguimiento atrasado');
  });

  it('El_filtro_de_marcas_filtra_las_filas_cargadas', () => {
    component.todasLasQuotesDePagina = [
      { cotizacionProductosId: 1, etapa: 'Emitida', vencida: true, seguimientoAtrasado: false },
      { cotizacionProductosId: 2, etapa: 'EnSeguimiento', vencida: false, seguimientoAtrasado: true },
      { cotizacionProductosId: 3, etapa: 'Emitida', vencida: false, seguimientoAtrasado: false },
    ];
    component.dataSource.data = [...component.todasLasQuotesDePagina];

    component.filtrarPorMarcas('vencidas');
    expect(component.dataSource.data.length).toBe(1);
    expect(component.dataSource.data[0].cotizacionProductosId).toBe(1);

    component.filtrarPorMarcas('atrasadas');
    expect(component.dataSource.data.length).toBe(1);
    expect(component.dataSource.data[0].cotizacionProductosId).toBe(2);

    component.filtrarPorMarcas('todas');
    expect(component.dataSource.data.length).toBe(3);
  });

  it('El_boton_Indicadores_navega_a_la_ruta_de_indicadores', () => {
    component.irAIndicadores();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboards/quote-products/indicadores']);

    const btnIndicadores = fixture.nativeElement.querySelector('.btn-indicadores');
    expect(btnIndicadores).not.toBeNull();
    btnIndicadores.click();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboards/quote-products/indicadores']);
  });

  describe('Filtro de fechas inicio y fin', () => {
    const una = (id: number) => ({
      cotizacionProductosId: id, nombreCliente: 'Cliente ' + id, unidadDeNegocio: { nombre: 'Baja Tensión' },
      createdDate: '2026-11-14T10:00:00', requisitosEspeciales: false, total: 100, estatus: 1,
    });

    it('Las_fechas_empiezan_el_primero_del_mes_y_terminan_hoy', () => {
      jasmine.clock().install();
      try {
        jasmine.clock().mockDate(new Date(2026, 10, 17, 12, 0, 0));
        const a = TestBed.createComponent(QuoteListComponent).componentInstance;
        expect(a.fechaDesde).toBe('2026-11-01');
        expect(a.fechaHasta).toBe('2026-11-17');

        // El primer dia del mes el rango es de un solo dia
        jasmine.clock().mockDate(new Date(2026, 2, 1, 9, 0, 0));
        const b = TestBed.createComponent(QuoteListComponent).componentInstance;
        expect(b.fechaDesde).toBe('2026-03-01');
        expect(b.fechaHasta).toBe('2026-03-01');
      } finally {
        jasmine.clock().uninstall();
      }
    });

    it('La_primera_carga_pide_el_rango_del_mes_con_la_pagina_uno', () => {
      expect(mockQuotesService.getQuotesPorRango).toHaveBeenCalledTimes(1);
      expect(mockQuotesService.getQuotesPorRango).toHaveBeenCalledWith(1, 10, component.fechaDesde, component.fechaHasta);
      expect(mockQuotesService.getQuotes).not.toHaveBeenCalled();
    });

    it('Hay_dos_campos_de_fecha_separados_con_sus_valores', async () => {
      await fixture.whenStable();
      fixture.detectChanges();
      const desde = fixture.nativeElement.querySelector('.input-fecha-desde') as HTMLInputElement;
      const hasta = fixture.nativeElement.querySelector('.input-fecha-hasta') as HTMLInputElement;

      expect(desde.type).toBe('date');
      expect(hasta.type).toBe('date');
      expect(desde.value).toBe(component.fechaDesde);
      expect(hasta.value).toBe(component.fechaHasta);
      // Cada uno limita al otro: no se puede elegir una inicial posterior a la final desde el calendario
      expect(desde.max).toBe(component.fechaHasta);
      expect(hasta.min).toBe(component.fechaDesde);
    });

    it('Cambiar_una_fecha_en_pantalla_vuelve_a_pedir_con_el_rango_y_la_pagina_cero', fakeAsync(() => {
      flushMicrotasks();
      component.pageIndex = 3;
      mockQuotesService.getQuotesPorRango.calls.reset();
      const desde = fixture.nativeElement.querySelector('.input-fecha-desde') as HTMLInputElement;

      desde.value = '2026-10-01';
      desde.dispatchEvent(new Event('input'));
      desde.dispatchEvent(new Event('change'));
      tick(400);

      expect(mockQuotesService.getQuotesPorRango).toHaveBeenCalledTimes(1);
      expect(mockQuotesService.getQuotesPorRango).toHaveBeenCalledWith(1, 10, '2026-10-01', component.fechaHasta);
      expect(component.pageIndex).toBe(0);
    }));

    it('Cambiar_de_pagina_conserva_el_rango', () => {
      mockQuotesService.getQuotesPorRango.calls.reset();
      component.fechaDesde = '2026-09-01';
      component.fechaHasta = '2026-09-30';

      component.onPageChange({ pageIndex: 2, pageSize: 20 });

      expect(mockQuotesService.getQuotesPorRango).toHaveBeenCalledWith(3, 20, '2026-09-01', '2026-09-30');
    });

    it('Teclear_varias_veces_seguidas_hace_una_sola_peticion', fakeAsync(() => {
      mockQuotesService.getQuotesPorRango.calls.reset();

      for (const f of ['2026-10-01', '2026-10-02', '2026-10-03']) {
        component.fechaDesde = f;
        component.onDateChange();
        tick(100);
      }
      expect(mockQuotesService.getQuotesPorRango).not.toHaveBeenCalled();

      tick(400);
      expect(mockQuotesService.getQuotesPorRango).toHaveBeenCalledTimes(1);
      expect(mockQuotesService.getQuotesPorRango).toHaveBeenCalledWith(1, 10, '2026-10-03', component.fechaHasta);
    }));

    it('Una_fecha_inicio_posterior_a_la_final_avisa_y_no_pide', fakeAsync(() => {
      mockQuotesService.getQuotesPorRango.calls.reset();
      component.fechaDesde = '2026-11-20';
      component.fechaHasta = '2026-11-10';

      component.onDateChange();
      tick(400);
      fixture.detectChanges();

      expect(mockQuotesService.getQuotesPorRango).not.toHaveBeenCalled();
      expect(component.errorFechas).toBe('La fecha inicial no puede ser posterior a la fecha final.');
      expect(fixture.nativeElement.querySelector('.error-fechas').textContent)
        .toContain('La fecha inicial no puede ser posterior a la fecha final.');

      // Al corregirla, el aviso desaparece y se pide el rango
      component.fechaHasta = '2026-11-30';
      component.onDateChange();
      tick(400);
      fixture.detectChanges();

      expect(component.errorFechas).toBeNull();
      expect(fixture.nativeElement.querySelector('.error-fechas')).toBeNull();
      expect(mockQuotesService.getQuotesPorRango).toHaveBeenCalledTimes(1);
    }));

    it('Un_ano_absurdo_no_se_manda_y_avisa', fakeAsync(() => {
      mockQuotesService.getQuotesPorRango.calls.reset();
      component.fechaDesde = '0002-11-01';

      component.onDateChange();
      tick(400);

      expect(mockQuotesService.getQuotesPorRango).not.toHaveBeenCalled();
      expect(component.errorFechas).toBe('Escribe fechas válidas (año entre 2000 y 2100).');
    }));

    it('Vaciar_una_fecha_deja_ese_extremo_abierto', fakeAsync(() => {
      mockQuotesService.getQuotesPorRango.calls.reset();
      component.fechaHasta = '';

      component.onDateChange();
      tick(400);

      expect(mockQuotesService.getQuotesPorRango).toHaveBeenCalledWith(1, 10, component.fechaDesde, null);
      expect(component.errorFechas).toBeNull();
    }));

    it('El_total_y_el_contador_salen_del_totalCount_del_API', () => {
      mockQuotesService.getQuotesPorRango.and.returnValue(
        of({ code: 200, message: 'ok', data: JSON.parse(JSON.stringify(mockQuotesData)), totalCount: 37 })
      );

      component.getQuotes();
      fixture.detectChanges();

      expect(component.totalItems).toBe(37);
      expect(component.quotesCount).toBe(37);
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('37');
    });

    it('Un_error_del_API_al_listar_se_ve_en_pantalla_y_vacia_la_lista', () => {
      mockChatService.showError.calls.reset();
      mockQuotesService.getQuotesPorRango.and.returnValue(
        of({ code: 500, message: 'Error al obtener cotizaciones: tiempo agotado', data: [] })
      );

      component.getQuotes();

      expect(mockChatService.showError).toHaveBeenCalledWith('Error', 'Error al obtener cotizaciones: tiempo agotado', 5000);
      expect(component.dataSource.data.length).toBe(0);

      mockChatService.showError.calls.reset();
      mockQuotesService.getQuotesPorRango.and.returnValue(throwError(() => ({ status: 0 })));
      component.getQuotes();

      expect(mockChatService.showError).toHaveBeenCalledWith('Error', 'No se pudo cargar la lista de cotizaciones.', 5000);
    });

    it('Una_respuesta_vieja_no_pisa_a_la_nueva', () => {
      const a = new Subject<any>();
      const b = new Subject<any>();
      mockQuotesService.getQuotesPorRango.and.returnValues(a.asObservable(), b.asObservable());
      mockQuotesService.resumenSgc.and.returnValue(of([]));

      component.getQuotes();
      component.getQuotes();
      b.next({ code: 200, data: [una(900)], totalCount: 1 });
      a.next({ code: 200, data: [una(800)], totalCount: 1 });

      expect(component.dataSource.data.map((q) => q.cotizacionProductosId)).toEqual([900]);
    });

    it('Un_resumen_viejo_no_pisa_la_lista_nueva', () => {
      const resumenViejo = new Subject<ResumenSgc[]>();
      mockQuotesService.resumenSgc.and.returnValues(resumenViejo.asObservable(), of([]));
      mockQuotesService.getQuotesPorRango.and.returnValues(
        of({ code: 200, data: [una(800)], totalCount: 1 }),
        of({ code: 200, data: [una(900)], totalCount: 1 })
      );

      component.getQuotes();
      component.getQuotes();
      resumenViejo.next([{ cotizacionProductosId: 800, folio: 'COT-VIEJO', tipo: 'CS', version: 1, total: 1, moneda: 'MXN', etapa: 'Borrador' } as ResumenSgc]);

      expect(component.dataSource.data.map((q) => q.cotizacionProductosId)).toEqual([900]);
    });
  });
});
