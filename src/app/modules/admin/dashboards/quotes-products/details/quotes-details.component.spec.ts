import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuoteDetailsComponent } from './quotes-details.component';
import { QuotesService } from '../quotes-products.service';
import { ClientsService } from '../../../catalogs/clients/clients.service';
import { ProspectosService } from '../../prospects/prospects.services';
import { ProjectService } from '../../project/project.service';
import { ChatNotificationService } from 'app/shared/components/chat-notification/chat-notification.service';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError, BehaviorSubject } from 'rxjs';
import Swal from 'sweetalert2';
import { CatalogosSgc, RespuestaObtenerSgc } from '../quotes-products.types';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

registerLocaleData(localeEs);

describe('QuoteDetailsComponent SGC', () => {
  let component: QuoteDetailsComponent;
  let fixture: ComponentFixture<QuoteDetailsComponent>;
  let mockQuotesService: any;
  let mockClientsService: any;
  let mockProspectsService: any;
  let mockProjectService: any;
  let mockChatService: any;
  let mockRouter: any;
  let paramMapSubject: BehaviorSubject<any>;

  const mockCatalogos: CatalogosSgc = {
    tipos: [
      { codigo: 'CS', nombre: 'Comercial simple' },
      { codigo: 'CT', nombre: 'Técnico-comercial' },
      { codigo: 'CE', nombre: 'Estratégica' },
    ],
    monedas: [
      { codigo: 'MXN', nombre: 'Pesos Mexicanos' },
      { codigo: 'USD', nombre: 'Dólares Americanos' },
    ],
    tiposConcepto: [{ codigo: 'Material', nombre: 'Material eléctrico' }],
    entregables: [{ codigo: 'Suministro', nombre: 'Suministro' }],
    ivaTasa: 0.16,
  };

  beforeEach(async () => {
    paramMapSubject = new BehaviorSubject(convertToParamMap({ id: 'new' }));

    mockQuotesService = {
      get userInformation() {
        return JSON.stringify({ usuario: { id: 7, nombre: 'Test User' } });
      },
      getEstatus: jasmine.createSpy('getEstatus').and.returnValue(of({ data: [] })),
      getQuoteById: jasmine.createSpy('getQuoteById').and.returnValue(of({ code: 200, data: {} })),
      catalogosSgc: jasmine.createSpy('catalogosSgc').and.returnValue(of(mockCatalogos)),
      guardarSgc: jasmine.createSpy('guardarSgc').and.returnValue(
        of({
          code: 200,
          message: 'Cotización guardada correctamente.',
          data: {
            cotizacionProductosId: 10,
            folio: 'COT-2026-0001',
            version: 1,
            subtotal: 100,
            iva: 16,
            total: 116,
            faltantes: [],
          },
        })
      ),
      obtenerSgc: jasmine.createSpy('obtenerSgc').and.returnValue(
        of({
          cotizacionProductosId: 10,
          sgc: null,
          partidas: [],
          partidasHeredadas: false,
          totales: {
            subtotal: 0,
            iva: 0,
            total: 0,
            costoDirecto: 0,
            utilidad: null,
            margenPorcentaje: null,
            margenBajo: false,
            partidasSinCosto: 0,
          },
          faltantes: [],
        })
      ),
      enviarRevision: jasmine.createSpy('enviarRevision').and.returnValue(of({ etapa: 'EnRevision' })),
      requerimientosDisponibles: jasmine.createSpy('requerimientosDisponibles').and.returnValue(of([])),
      revisiones: jasmine.createSpy('revisiones').and.returnValue(of([])),
      volverBorrador: jasmine.createSpy('volverBorrador').and.returnValue(of({ etapa: 'Borrador' })),
    };

    mockClientsService = {
      getClient: jasmine.createSpy('getClient').and.returnValue(of([])),
      getClientById: jasmine.createSpy('getClientById').and.returnValue(of({})),
    };

    mockProspectsService = {
      getProspectos: jasmine.createSpy('getProspectos').and.returnValue(of({ data: [] })),
    };

    mockProjectService = {
      getUnidadesDeNegocio: jasmine.createSpy('getUnidadesDeNegocio').and.returnValue(of([])),
    };

    mockChatService = {
      showSuccess: jasmine.createSpy('showSuccess'),
      showError: jasmine.createSpy('showError'),
    };

    mockRouter = {
      navigate: jasmine.createSpy('navigate'),
    };

    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, QuoteDetailsComponent],
      providers: [
        { provide: QuotesService, useValue: mockQuotesService },
        { provide: ClientsService, useValue: mockClientsService },
        { provide: ProspectosService, useValue: mockProspectsService },
        { provide: ProjectService, useValue: mockProjectService },
        { provide: ChatNotificationService, useValue: mockChatService },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMapSubject.asObservable(),
          },
        },
        { provide: MatDialog, useValue: { open: jasmine.createSpy('open') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuoteDetailsComponent);
    component = fixture.componentInstance;
    fixture.autoDetectChanges(true);
  });

  it('La_pestana_Clasificacion_y_condiciones_muestra_los_campos', () => {
    expect(component.sgcForm).toBeDefined();
    expect(component.sgcForm.get('tipo')).toBeDefined();
    expect(component.sgcForm.get('moneda')).toBeDefined();
    expect(component.sgcForm.get('vigenciaDias')).toBeDefined();
    expect(component.sgcForm.get('formaPago')).toBeDefined();
    expect(component.sgcForm.get('condicionesPago')).toBeDefined();

    const compiled = fixture.nativeElement as HTMLElement;
    const tabLabels = Array.from(compiled.querySelectorAll('.mat-tab-label, .mdc-tab__text-label'))
      .map((el) => el.textContent?.trim());
    const tienePestana = tabLabels.some((lbl) => lbl?.includes('Clasificación y condiciones'));
    expect(tienePestana).toBeTrue();
  });

  it('El_tipo_de_cambio_solo_se_pide_en_USD', () => {
    component.sgcForm.get('moneda')?.setValue('MXN');
    expect(component.sgcForm.get('tipoCambio')?.validator).toBeNull();
    expect(component.sgcForm.get('tipoCambio')?.valid).toBeTrue();

    component.sgcForm.get('moneda')?.setValue('USD');
    expect(component.sgcForm.get('tipoCambio')?.validator).not.toBeNull();
    component.sgcForm.get('tipoCambio')?.setValue(null);
    expect(component.sgcForm.get('tipoCambio')?.valid).toBeFalse();
  });

  it('Al_cambiar_a_USD_el_tipo_de_cambio_es_obligatorio', () => {
    component.sgcForm.get('moneda')?.setValue('MXN');
    component.sgcForm.get('tipoCambio')?.setValue(null);
    expect(component.sgcForm.get('tipoCambio')?.valid).toBeTrue();

    component.sgcForm.get('moneda')?.setValue('USD');
    expect(component.sgcForm.get('tipoCambio')?.valid).toBeFalse();

    component.sgcForm.get('tipoCambio')?.setValue(20.5);
    expect(component.sgcForm.get('tipoCambio')?.valid).toBeTrue();
  });

  it('Guardar_envia_cotizacion_sgc_y_partidas_a_guardarSgc', () => {
    component.quotesForm.patchValue({
      clienteId: 5,
      unidadDeNegocioId: 2,
      nombreCliente: 'Cliente A',
    });
    component.sgcForm.patchValue({
      tipo: 'CS',
      moneda: 'MXN',
      vigenciaDias: 15,
    });
    component.partidas = [
      {
        partida: 1,
        tipoConcepto: 'Material',
        materialServicio: 'Cable 10',
        unidad: 'M',
        cantidad: 5,
        precioUnitario: 20,
        descuento: 0,
      },
    ];

    component.saveQuotes();

    expect(mockQuotesService.guardarSgc).toHaveBeenCalled();
    const args = mockQuotesService.guardarSgc.calls.mostRecent().args[0];
    expect(args.cotizacion).toBeDefined();
    expect(args.cotizacion.clienteId).toBe(5);
    expect(args.sgc).toBeDefined();
    expect(args.sgc.tipo).toBe('CS');
    expect(args.partidas).toBeDefined();
    expect(args.partidas.length).toBe(1);
  });

  it('Guardar_no_envia_totales_ni_usuario', () => {
    component.quotesForm.patchValue({
      clienteId: 5,
      unidadDeNegocioId: 2,
      usuarioId: 99,
    });
    component.subtotal = 500;
    component.total = 580;

    component.saveQuotes();

    const args = mockQuotesService.guardarSgc.calls.mostRecent().args[0];
    expect((args.cotizacion as any).usuarioId).toBeUndefined();
    expect((args.cotizacion as any).total).toBeUndefined();
    expect((args.cotizacion as any).subtotal).toBeUndefined();
  });

  it('Guardar_con_exito_muestra_el_folio_y_navega_a_la_lista', () => {
    component.quotesForm.patchValue({ clienteId: 1, unidadDeNegocioId: 1 });
    component.saveQuotes();

    expect(mockChatService.showSuccess).toHaveBeenCalledWith(
      'Éxito',
      jasmine.stringMatching(/COT-2026-0001/),
      jasmine.any(Number)
    );
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboards/quote-products']);
  });

  it('Un_400_muestra_la_lista_de_errores_y_no_navega', () => {
    mockQuotesService.guardarSgc.and.returnValue(
      throwError(() => ({
        status: 400,
        error: { mensaje: 'Error de validación', errores: ['Falta punto de entrega', 'Partida 1 sin precio'] },
      }))
    );

    component.saveQuotes();
    fixture.detectChanges();

    expect(component.erroresGuardado).toEqual(['Falta punto de entrega', 'Partida 1 sin precio']);
    expect(mockRouter.navigate).not.toHaveBeenCalled();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Falta punto de entrega');
    expect(compiled.textContent).toContain('Partida 1 sin precio');
  });

  it('Un_error_de_red_se_muestra_y_no_navega', () => {
    mockQuotesService.guardarSgc.and.returnValue(
      throwError(() => ({
        status: 500,
        error: { mensaje: 'Fallo interno del servidor' },
      }))
    );

    component.saveQuotes();
    fixture.detectChanges();

    expect(component.erroresGuardado).toContain('Fallo interno del servidor');
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('El_boton_Guardar_no_se_repite_con_doble_clic', () => {
    mockQuotesService.guardarSgc.calls.reset();
    component.guardando = true;

    component.saveQuotes();

    expect(mockQuotesService.guardarSgc).not.toHaveBeenCalled();
  });

  it('Una_cotizacion_con_registro_carga_sus_datos_sgc', () => {
    const sgcVista: any = {
      tipo: 'CT',
      moneda: 'USD',
      tipoCambio: 19.8,
      vigenciaDias: 30,
      formaPago: 'Transferencia',
      condicionesPago: 'Contado',
      puntoEntrega: 'Obra',
      condicionesEntrega: 'En sitio',
      cuentaDeposito: 'BBVA 1234',
      exclusiones: 'Sin obra civil',
      observacionesRelevantes: 'Entrega en horario laboral',
      contactoNombre: 'Juan Perez',
      contactoCorreo: 'juan@test.com',
      contactoTelefono: '1234567890',
      anexosTecnicos: 'Plano anexo',
      entregables: ['Suministro'],
      folio: 'COT-2026-0005',
      version: 2,
      subtotal: 1000,
      iva: 160,
      total: 1160,
      creadoPorUsuarioId: 7,
      fechaCreacion: '2026-11-14',
    };

    const mockRes: RespuestaObtenerSgc = {
      cotizacionProductosId: 42,
      sgc: sgcVista,
      partidas: [
        {
          partida: 1,
          tipoConcepto: 'Material',
          materialServicio: 'Transformador',
          unidad: 'PZA',
          cantidad: 1,
          precioUnitario: 1000,
          descuento: 0,
        },
      ],
      partidasHeredadas: false,
      totales: {
        subtotal: 1000,
        iva: 160,
        total: 1160,
        costoDirecto: 800,
        utilidad: 200,
        margenPorcentaje: 20,
        margenBajo: false,
        partidasSinCosto: 0,
      },
      faltantes: [],
    };

    mockQuotesService.obtenerSgc.and.returnValue(of(mockRes));

    component.loadQuotes(42);
    fixture.detectChanges();

    expect(component.sgcForm.get('tipo')?.value).toBe('CT');
    expect(component.sgcForm.get('moneda')?.value).toBe('USD');
    expect(component.sgcForm.get('tipoCambio')?.value).toBe(19.8);
    expect(component.sgcForm.get('contactoNombre')?.value).toBe('Juan Perez');
    expect(component.folio).toBe('COT-2026-0005');
    expect(component.version).toBe(2);
    expect(component.esHeredada).toBeFalse();
  });

  it('Una_cotizacion_sin_registro_abre_con_valores_por_defecto_y_el_aviso_de_heredadas', () => {
    const mockRes: RespuestaObtenerSgc = {
      cotizacionProductosId: 55,
      sgc: null,
      partidas: [
        {
          partida: 1,
          tipoConcepto: 'Material',
          materialServicio: 'Cable heredado',
          unidad: 'M',
          cantidad: 10,
          precioUnitario: 15,
          descuento: 0,
          heredada: true,
        },
      ],
      partidasHeredadas: true,
      totales: {
        subtotal: 150,
        iva: 24,
        total: 174,
        costoDirecto: 0,
        utilidad: null,
        margenPorcentaje: null,
        margenBajo: false,
        partidasSinCosto: 1,
      },
      faltantes: [],
    };

    mockQuotesService.obtenerSgc.and.returnValue(of(mockRes));

    component.loadQuotes(55);
    fixture.detectChanges();

    expect(component.sgcForm.get('tipo')?.value).toBe('CS');
    expect(component.sgcForm.get('moneda')?.value).toBe('MXN');
    expect(component.sgcForm.get('vigenciaDias')?.value).toBe(15);
    expect(component.esHeredada).toBeTrue();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain(
      'Esta cotización viene de CONTPAQi. Al guardarla se copiarán sus partidas al ERP y los cambios posteriores en CONTPAQi ya no se reflejarán.'
    );
  });

  it('La_pestana_Resumen_muestra_totales_y_faltantes', async () => {
    component.folio = 'COT-2026-0042';
    component.version = 1;
    component.faltantes = ['Falta la forma de pago.', 'Falta el punto de entrega.'];
    component.partidas = [
      {
        partida: 1,
        tipoConcepto: 'Material',
        materialServicio: 'Tablero',
        unidad: 'PZA',
        cantidad: 1,
        precioUnitario: 100,
        descuento: 0,
      },
    ];
    component.calcularTotales();

    // Activar pestaña Resumen (índice 3)
    component.selectedTabIndex = 3;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Pendiente para poder emitir');
    expect(compiled.textContent).toContain('Falta la forma de pago.');
    expect(compiled.textContent).toContain('Falta el punto de entrega.');
    expect(compiled.textContent).toContain('COT-2026-0042');
  });

  it('Los_textos_que_vienen_del_API_se_muestran_escapados', () => {
    const xssScript = '<script id="xss-test">window.__xss = true;</script>';
    component.erroresGuardado = [xssScript];
    fixture.detectChanges();

    const scriptElement = fixture.nativeElement.querySelector('#xss-test');
    expect(scriptElement).toBeNull();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('<script id="xss-test">window.__xss = true;</script>');
  });

  it('Un_error_al_cargar_catalogos_se_ve_con_Reintentar', () => {
    mockQuotesService.catalogosSgc.and.returnValue(throwError(() => new Error('Error al cargar')));

    component.cargarCatalogos();
    fixture.detectChanges();

    expect(component.catalogoError).toBeTrue();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Error al cargar los catálogos del SGC');
    expect(compiled.textContent).toContain('Reintentar');

    // Al reintentar con éxito
    mockQuotesService.catalogosSgc.and.returnValue(of(mockCatalogos));
    component.cargarCatalogos();
    fixture.detectChanges();
    expect(component.catalogoError).toBeFalse();
    expect(component.catalogos).toEqual(mockCatalogos);
  });

  it('La_pestana_Alcance_tecnico_solo_aparece_en_CT_y_CE', async () => {
    component.sgcForm.get('tipo')?.setValue('CS');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    let compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('Alcance técnico');

    component.sgcForm.get('tipo')?.setValue('CT');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Alcance técnico');

    component.sgcForm.get('tipo')?.setValue('CE');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Alcance técnico');
  });

  it('Cambiar_a_CS_oculta_la_pestana_sin_borrar_lo_capturado', async () => {
    component.sgcForm.get('tipo')?.setValue('CT');
    component.sgcForm.get('alcanceTecnico')?.setValue('Detalle técnico de ingeniería avanzada');
    component.sgcForm.get('costosIndirectos')?.setValue(2500);
    fixture.detectChanges();
    await fixture.whenStable();

    let compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Alcance técnico');

    component.sgcForm.get('tipo')?.setValue('CS');
    fixture.detectChanges();
    await fixture.whenStable();

    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('Alcance técnico');
    expect(component.sgcForm.get('alcanceTecnico')?.value).toBe('Detalle técnico de ingeniería avanzada');
    expect(component.sgcForm.get('costosIndirectos')?.value).toBe(2500);
  });

  it('Marcar_entregables_guarda_sus_codigos', () => {
    expect(component.sgcForm.get('entregables')?.value).toEqual([]);

    component.toggleEntregable('ENT-01', true);
    expect(component.sgcForm.get('entregables')?.value).toEqual(['ENT-01']);

    component.toggleEntregable('ENT-02', true);
    expect(component.sgcForm.get('entregables')?.value).toEqual(['ENT-01', 'ENT-02']);

    component.toggleEntregable('ENT-01', false);
    expect(component.sgcForm.get('entregables')?.value).toEqual(['ENT-02']);
  });

  it('El_resumen_muestra_costo_directo_utilidad_y_margen', async () => {
    component.sgcForm.get('tipo')?.setValue('CT');
    component.sgcForm.get('costosIndirectos')?.setValue(50);
    component.sgcForm.get('margenAutorizadoPorcentaje')?.setValue(20);

    component.partidas = [
      {
        partida: 1,
        tipoConcepto: 'Material',
        materialServicio: 'Cable',
        unidad: 'M',
        cantidad: 10,
        precioUnitario: 100,
        costoUnitario: 60,
        descuento: 0,
      },
    ];
    component.calcularTotales();

    // En CT, Resumen es pestaña 4
    component.selectedTabIndex = 4;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Costo directo');
    expect(compiled.textContent).toContain('Utilidad');
    expect(compiled.textContent).toContain('Margen');
    expect(compiled.textContent).toContain('35'); // (1000 - 600 - 50) / 1000 = 35%
  });

  it('Sin_costos_no_se_muestra_el_margen', async () => {
    component.sgcForm.get('tipo')?.setValue('CT');
    component.partidas = [
      {
        partida: 1,
        tipoConcepto: 'Material',
        materialServicio: 'Cable',
        unidad: 'M',
        cantidad: 10,
        precioUnitario: 100,
        costoUnitario: null,
        descuento: 0,
      },
    ];
    component.calcularTotales();

    component.selectedTabIndex = 4;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.bloque-margen')).toBeNull();
  });

  it('Un_margen_menor_al_autorizado_muestra_el_aviso', async () => {
    component.sgcForm.get('tipo')?.setValue('CT');
    component.sgcForm.get('costosIndirectos')?.setValue(0);
    component.sgcForm.get('margenAutorizadoPorcentaje')?.setValue(25);

    // Margen real será 10% (Subtotal 100, Costo 90 -> Utilidad 10 -> 10% < 25%)
    component.partidas = [
      {
        partida: 1,
        tipoConcepto: 'Material',
        materialServicio: 'Tablero',
        unidad: 'PZA',
        cantidad: 1,
        precioUnitario: 100,
        costoUnitario: 90,
        descuento: 0,
      },
    ];
    component.calcularTotales();
    expect(component.totales.margenBajo).toBeTrue();

    component.selectedTabIndex = 4;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Margen por debajo del autorizado');
  });

  it('Los_textos_largos_se_muestran_escapados', async () => {
    component.sgcForm.get('tipo')?.setValue('CT');
    const xss = '<img src=x onerror=alert(1)>';
    component.sgcForm.get('alcanceTecnico')?.setValue(xss);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img[src="x"]')).toBeNull();
  });

  it('El_PDF_recibe_el_folio_y_la_version_de_la_cotizacion', () => {
    const dialog = TestBed.inject(MatDialog) as any;
    component.folio = 'COT-2026-0042';
    component.version = 1;

    component.openCotizacionPreview();

    const datos = dialog.open.calls.mostRecent().args[1].data;
    expect(datos.sgc.folio).toBe('COT-2026-0042');
    expect(datos.sgc.version).toBe(1);
  });

  it('Exportar_PDF_en_una_cotizacion_nueva_no_falla', () => {
    const dialog = TestBed.inject(MatDialog) as any;
    component.cotizacion = undefined;

    expect(() => component.openCotizacionPreview()).not.toThrow();
    expect(dialog.open).toHaveBeenCalled();
  });

  it('Vaciar_las_partidas_y_guardar_envia_una_lista_vacia', () => {
    component.quotesForm.patchValue({ clienteId: 5, unidadDeNegocioId: 2, nombreCliente: 'Cliente A' });
    component.sincronizarPartidasFormArray([
      { partida: 1, tipoConcepto: 'Material', materialServicio: 'Cable', unidad: 'M', cantidad: 1, precioUnitario: 10, descuento: 0 } as any,
    ]);
    component.partidasFormArray.removeAt(0);

    component.saveQuotes();

    const args = mockQuotesService.guardarSgc.calls.mostRecent().args[0];
    expect(args.partidas).toEqual([]);
  });

  it('Si_no_se_puede_editar_los_formularios_quedan_deshabilitados_y_no_hay_boton_Guardar', () => {
    mockQuotesService.obtenerSgc.and.returnValue(
      of({
        cotizacionProductosId: 10,
        sgc: { folio: 'COT-01', version: 1, etapa: 'EnRevision' } as any,
        partidas: [],
        totales: { subtotal: 0, iva: 0, total: 0 } as any,
        faltantes: [],
        acciones: { editar: false, enviarRevision: false, volverBorrador: true, revisar: ['Comercial'], emitir: false, nuevaVersion: false },
      })
    );

    paramMapSubject.next(convertToParamMap({ id: '10' }));
    fixture.detectChanges();

    expect(component.quotesForm.disabled).toBeTrue();
    expect(component.sgcForm.disabled).toBeTrue();
    expect(component.partidasFormArray.disabled).toBeTrue();
    const btns = fixture.nativeElement.querySelectorAll('button');
    const guardarPresent = Array.from(btns).some((b: any) => b.textContent.includes('Guardar'));
    expect(guardarPresent).toBeFalse();
  });

  it('La_franja_dice_la_etapa_y_la_version', () => {
    mockQuotesService.obtenerSgc.and.returnValue(
      of({
        cotizacionProductosId: 10,
        sgc: { folio: 'COT-01', version: 2, etapa: 'EnRevision' } as any,
        partidas: [],
        totales: { subtotal: 0, iva: 0, total: 0 } as any,
        faltantes: [],
        acciones: { editar: false, enviarRevision: false, volverBorrador: true, revisar: ['Comercial'], emitir: false, nuevaVersion: false },
      })
    );

    paramMapSubject.next(convertToParamMap({ id: '10' }));
    fixture.detectChanges();

    const franja = fixture.nativeElement.querySelector('.franja-solo-lectura');
    expect(franja).toBeTruthy();
    expect(franja.textContent).toContain('revisión');
    expect(franja.textContent).toContain('2');
  });

  it('Una_cotizacion_en_Borrador_sigue_editable', () => {
    mockQuotesService.obtenerSgc.and.returnValue(
      of({
        cotizacionProductosId: 10,
        sgc: { folio: 'COT-01', version: 1, etapa: 'Borrador' } as any,
        partidas: [],
        totales: { subtotal: 0, iva: 0, total: 0 } as any,
        faltantes: [],
        acciones: { editar: true, enviarRevision: true, volverBorrador: false, revisar: [], emitir: false, nuevaVersion: false },
      })
    );

    paramMapSubject.next(convertToParamMap({ id: '10' }));
    fixture.detectChanges();

    expect(component.quotesForm.enabled).toBeTrue();
    expect(component.sgcForm.enabled).toBeTrue();
    const franja = fixture.nativeElement.querySelector('.franja-solo-lectura');
    expect(franja).toBeNull();
    const btns = fixture.nativeElement.querySelectorAll('button');
    const guardarPresent = Array.from(btns).some((b: any) => b.textContent.includes('Guardar'));
    expect(guardarPresent).toBeTrue();
  });

  it('El_chip_aparece_en_el_encabezado', () => {
    mockQuotesService.obtenerSgc.and.returnValue(
      of({
        cotizacionProductosId: 10,
        sgc: { folio: 'COT-01', version: 1, etapa: 'EnRevision' } as any,
        partidas: [],
        totales: { subtotal: 0, iva: 0, total: 0 } as any,
        faltantes: [],
        acciones: { editar: false, enviarRevision: false, volverBorrador: false, revisar: [], emitir: false, nuevaVersion: false },
      })
    );

    paramMapSubject.next(convertToParamMap({ id: '10' }));
    fixture.detectChanges();

    const chip = fixture.nativeElement.querySelector('app-etapa-chip');
    expect(chip).toBeTruthy();
    expect(chip.textContent).toContain('En revisión');
  });

  it('Elegir_un_requerimiento_lo_muestra_y_lo_manda_al_guardar', async () => {
    component.quotesForm.patchValue({ clienteId: 1, unidadDeNegocioId: 2, nombreCliente: 'Cliente' });
    const req = { id: 101, folio: 'REQ-101', estatus: 'Calificado Comercial' };
    component.onRequerimientoChange(req as any);
    component.selectedTabIndex = 4;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const reqComp = fixture.nativeElement.querySelector('app-requerimiento-sgc');
    expect(reqComp).toBeTruthy();

    component.saveQuotes();

    const dto = mockQuotesService.guardarSgc.calls.mostRecent().args[0];
    expect(dto.sgc.requerimientoId).toBe(101);
  });

  it('Quitar_el_vinculo_manda_cero', () => {
    component.quotesForm.patchValue({ clienteId: 1, unidadDeNegocioId: 2, nombreCliente: 'Cliente' });
    component.onRequerimientoChange(null);
    component.saveQuotes();

    const dto = mockQuotesService.guardarSgc.calls.mostRecent().args[0];
    expect(dto.sgc.requerimientoId).toBe(0);
  });

  it('Enviar_a_revision_guarda_primero_si_hay_cambios', async () => {
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true } as any));
    mockQuotesService.enviarRevision.and.returnValue(of({ etapa: 'EnRevision' }));
    component.quotesId = 15;
    component.quotesForm.patchValue({ clienteId: 1, unidadDeNegocioId: 2, nombreCliente: 'Cliente' });
    component.quotesForm.markAsDirty();

    await component.enviarARevision();

    expect(mockQuotesService.guardarSgc).toHaveBeenCalled();
    expect(mockQuotesService.enviarRevision).toHaveBeenCalledWith(15);
  });

  it('Enviar_a_revision_pide_confirmacion', async () => {
    const swalSpy = spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: false } as any));
    component.quotesId = 15;

    await component.enviarARevision();

    expect(swalSpy).toHaveBeenCalled();
    expect(mockQuotesService.enviarRevision).not.toHaveBeenCalled();
  });

  it('Enviar_a_revision_no_se_repite_con_doble_clic', async () => {
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true } as any));
    mockQuotesService.enviarRevision.and.returnValue(of({ etapa: 'EnRevision' }));
    component.quotesId = 15;
    component.quotesForm.markAsPristine();
    component.sgcForm.markAsPristine();

    const p1 = component.enviarARevision();
    const p2 = component.enviarARevision();
    await Promise.all([p1, p2]);

    expect(mockQuotesService.enviarRevision.calls.count()).toBe(1);
  });

  it('Un_400_muestra_los_faltantes_y_no_recarga', async () => {
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true } as any));
    mockQuotesService.enviarRevision.and.returnValue(
      throwError(() => ({
        status: 400,
        error: { mensaje: 'Faltan datos para enviar a revisión.', errores: ['Vincula un requerimiento calificado.'] },
      }))
    );
    component.quotesId = 15;
    component.quotesForm.markAsPristine();
    component.sgcForm.markAsPristine();
    const loadSpy = spyOn(component, 'loadQuotes');

    await component.enviarARevision();

    expect(component.erroresGuardado).toEqual(['Vincula un requerimiento calificado.']);
    expect(loadSpy).not.toHaveBeenCalled();
  });

  it('El_boton_solo_aparece_si_acciones_enviarRevision', () => {
    component.acciones = { editar: true, enviarRevision: false, volverBorrador: false, revisar: [], emitir: false, nuevaVersion: false };
    fixture.detectChanges();
    let btnEnviar = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b: any) => b.textContent.includes('Enviar a revisión'));
    expect(btnEnviar).toBeFalsy();

    component.acciones = { editar: true, enviarRevision: true, volverBorrador: false, revisar: [], emitir: false, nuevaVersion: false };
    fixture.detectChanges();
    btnEnviar = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b: any) => b.textContent.includes('Enviar a revisión'));
    expect(btnEnviar).toBeTruthy();
  });

  it('Despues_de_enviar_la_cotizacion_queda_en_solo_lectura', async () => {
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true } as any));
    mockQuotesService.enviarRevision.and.returnValue(of({ etapa: 'EnRevision' }));
    mockQuotesService.obtenerSgc.and.returnValue(
      of({
        cotizacionProductosId: 15,
        sgc: { folio: 'COT-01', version: 1, etapa: 'EnRevision' } as any,
        partidas: [],
        totales: { subtotal: 0, iva: 0, total: 0 } as any,
        faltantes: [],
        acciones: { editar: false, enviarRevision: false, volverBorrador: true, revisar: ['Comercial'], emitir: false, nuevaVersion: false },
      })
    );
    component.quotesId = 15;
    component.quotesForm.markAsPristine();
    component.sgcForm.markAsPristine();

    await component.enviarARevision();
    fixture.detectChanges();

    expect(component.soloLectura).toBeTrue();
    expect(component.quotesForm.disabled).toBeTrue();
  });
});
