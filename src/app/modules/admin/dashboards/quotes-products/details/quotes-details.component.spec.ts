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
import { ProcesoComercialService } from 'app/shared/proceso-comercial/proceso-comercial.service';
import Swal from 'sweetalert2';
import { CatalogosSgc, RespuestaObtenerSgc, EncabezadoCotizacionSgc, CotizacionSgcVista, PartidaSgc, CotizacionOrigen } from '../quotes-products.types';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { By } from '@angular/platform-browser';
import { MatSelect } from '@angular/material/select';

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
  let mockProcesoService: { obtener: jasmine.Spy };

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

  const mockOrigen: CotizacionOrigen = {
    cotizacionProductosId: 10,
    folioCotizacion: 'COT-1234',
    puedeAgregarFolio: false,
    requerimiento: {
      id: 57,
      folio: 'REQ-2026-0057',
      titulo: 'Modernización de tablero',
      tipoProyecto: 'Instalación',
      descripcion: 'Suministro de tableros',
      estatus: 'Aprobado para cotización',
      rutaAtencion: 'Técnica',
      empresa: 'Cliente Ficticio SA de CV',
      nombreContacto: 'Contacto Ficticio',
      telefono: '5512345678',
      email: 'contacto@ficticio.test',
      fechaRecepcion: '2026-11-20T10:00:00'
    },
    lead: {
      id: 12,
      nombreContacto: 'Contacto Ficticio',
      empresa: 'Cliente Ficticio SA de CV',
      telefono: '5512345678',
      email: 'contacto@ficticio.test',
      fuenteLead: 'WhatsApp',
      campana: null,
      necesidadInicial: 'Motor trifásico',
      sucursalQueRecibe: 'Querétaro',
      estatus: 'Oportunidad',
      tipoCliente: 'Industrial',
      tipoNecesidad: 'Producto',
      zonaAtencion: 'Querétaro',
      nivelPrioridad: 'Alta',
      fechaRegistro: '2026-11-18T09:30:00'
    }
  };

  beforeEach(async () => {
    paramMapSubject = new BehaviorSubject(convertToParamMap({ id: 'new' }));
    mockProcesoService = { obtener: jasmine.createSpy('obtener').and.returnValue(of({ actual: 'cotizacion', mensaje: 'Va en Cotización', pasos: [] })) };

    mockQuotesService = {
      get userInformation() {
        return JSON.stringify({ usuario: { id: 7, nombre: 'Test User' } });
      },
      getEstatus: jasmine.createSpy('getEstatus').and.returnValue(of({ data: [] })),
      getQuoteById: jasmine.createSpy('getQuoteById').and.returnValue(of({ code: 200, data: {} })),
      catalogosSgc: jasmine.createSpy('catalogosSgc').and.returnValue(of(mockCatalogos)),
      origen: jasmine.createSpy('origen').and.returnValue(of(mockOrigen)),
      agregarFolio: jasmine.createSpy('agregarFolio').and.returnValue(of({ cotizacionProductosId: 10, folioCotizacion: 'COT-1234' })),
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
          cotizacion: {
            cotizacionProductosId: 10,
            clienteId: 1,
            unidadDeNegocioId: 2,
            usuarioId: 7,
            requisitosEspeciales: false,
            createdDate: '2026-11-13T10:00:00Z',
            updatedDate: null,
            nombreCliente: 'Juan Perez',
            nombreEmpresa: 'Empresa Demo SA',
            correo: 'juan@empresa.com',
            telefono: '4421234567',
            rfc: 'EDM200101AA1',
            direccionCompleta: 'Av Central 123',
            estado: 'Querétaro',
            estatus: 1,
            observaciones: 'Ninguna',
          },
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
      emitir: jasmine.createSpy('emitir').and.returnValue(of({ folio: 'COT-2026-0001', version: 1 })),
      nuevaVersion: jasmine.createSpy('nuevaVersion').and.returnValue(of({ version: 2, etapa: 'Borrador' })),
      versiones: jasmine.createSpy('versiones').and.returnValue(of([])),
      version: jasmine.createSpy('version').and.returnValue(of({})),
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
        { provide: ProcesoComercialService, useValue: mockProcesoService },
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
    expect(component.sgcForm.get('condicionesPago')).toBeDefined();

    const compiled = fixture.nativeElement as HTMLElement;
    const tabLabels = Array.from(compiled.querySelectorAll('.mat-tab-label, .mdc-tab__text-label'))
      .map((el) => el.textContent?.trim());
    const tienePestana = tabLabels.some((lbl) => lbl?.includes('Clasificación y condiciones'));
    expect(tienePestana).toBeTrue();
  });

  it('El_formulario_SGC_no_tiene_control_formaPago', () => {
    expect(component.sgcForm.get('formaPago')).toBeNull();
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
      cotizacion: {
        cotizacionProductosId: 42,
        clienteId: 1,
        unidadDeNegocioId: 2,
        usuarioId: 7,
        requisitosEspeciales: false,
        createdDate: '2026-11-14T10:00:00Z',
        updatedDate: null,
      } as any,
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
      cotizacion: {
        cotizacionProductosId: 55,
        clienteId: 1,
        unidadDeNegocioId: 2,
        usuarioId: 7,
        requisitosEspeciales: false,
        createdDate: '2026-11-14T10:00:00Z',
        updatedDate: null,
      } as any,
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

  describe('Cotización informativa (contrato v1.2)', () => {
    const respuesta = (over: Partial<RespuestaObtenerSgc> = {}): RespuestaObtenerSgc => ({
      cotizacionProductosId: 55,
      cotizacion: {
        cotizacionProductosId: 55, clienteId: 1, unidadDeNegocioId: 2, usuarioId: 7, requisitosEspeciales: false,
        createdDate: '2026-11-14T10:00:00Z', updatedDate: null,
      } as any,
      sgc: null,
      partidas: [],
      partidasHeredadas: true,
      totales: { subtotal: 0, iva: 0, total: 0, costoDirecto: 0, utilidad: null, margenPorcentaje: null, margenBajo: false, partidasSinCosto: 0 },
      faltantes: [],
      ...over,
    });

    it('Con_informativa_true_queda_en_solo_consulta_con_su_franja_y_sin_la_de_solo_lectura', () => {
      mockQuotesService.obtenerSgc.and.returnValue(of(respuesta({ informativa: true })));

      component.loadQuotes(55);
      fixture.detectChanges();

      expect(component.esInformativa).toBeTrue();
      expect(component.soloLectura).toBeTrue();
      expect(component.quotesForm.disabled).toBeTrue();
      expect(component.sgcForm.disabled).toBeTrue();
      expect(fixture.nativeElement.querySelector('.franja-informativa')?.textContent).toContain('solo consulta');
      expect(fixture.nativeElement.querySelector('.franja-solo-lectura')).toBeNull();
    });

    it('Sin_el_campo_informativa_la_cotizacion_sigue_editable_como_antes', () => {
      mockQuotesService.obtenerSgc.and.returnValue(of(respuesta()));

      component.loadQuotes(55);
      fixture.detectChanges();

      expect(component.esInformativa).toBeFalse();
      expect(component.soloLectura).toBeFalse();
      expect(component.quotesForm.enabled).toBeTrue();
      expect(fixture.nativeElement.querySelector('.franja-informativa')).toBeNull();
    });

    it('Con_informativa_false_tampoco_cambia_nada', () => {
      mockQuotesService.obtenerSgc.and.returnValue(of(respuesta({ informativa: false })));

      component.loadQuotes(55);
      fixture.detectChanges();

      expect(component.esInformativa).toBeFalse();
      expect(component.soloLectura).toBeFalse();
    });

    it('Informativa_false_con_partidas_no_heredadas_no_es_informativa', () => {
      mockQuotesService.obtenerSgc.and.returnValue(of(respuesta({ informativa: false, partidasHeredadas: false })));

      component.loadQuotes(55);
      fixture.detectChanges();

      expect(component.esInformativa).toBeFalse();
    });
  });

  it('La_pestana_Resumen_muestra_totales_y_faltantes', async () => {
    component.folio = 'COT-2026-0042';
    component.version = 1;
    component.faltantes = ['Falta el punto de entrega.'];
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

  it('El_PDF_recibe_la_etapa_para_que_una_cotizacion_emitida_no_salga_como_borrador', () => {
    const dialog = TestBed.inject(MatDialog) as any;
    component.folio = 'COT-2026-0042';
    component.version = 1;
    component.etapa = 'Emitida';

    component.openCotizacionPreview();

    const datos = dialog.open.calls.mostRecent().args[1].data;
    expect(datos.sgc.etapa).toBe('Emitida');
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

  it('Una_cotizacion_nueva_no_pide_el_proceso_y_una_existente_si', () => {
    expect(mockProcesoService.obtener).not.toHaveBeenCalled();

    mockQuotesService.obtenerSgc.and.returnValue(
      of({
        cotizacionProductosId: 10,
        sgc: { folio: 'COT-01', version: 1, etapa: 'Borrador' } as any,
        partidas: [],
        totales: { subtotal: 0, iva: 0, total: 0 } as any,
        faltantes: [],
        acciones: { editar: true, enviarRevision: false, volverBorrador: false, revisar: [], emitir: false, nuevaVersion: false }
      })
    );
    paramMapSubject.next(convertToParamMap({ id: '10' }));
    fixture.detectChanges();

    expect(mockProcesoService.obtener).toHaveBeenCalledWith('cotizacion', 10);
    expect(fixture.nativeElement.querySelector('app-proceso-comercial')).not.toBeNull();
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

  it('La_franja_usa_el_nombre_legible_de_la_etapa_y_no_su_codigo', () => {
    mockQuotesService.obtenerSgc.and.returnValue(
      of({
        cotizacionProductosId: 10,
        sgc: { folio: 'COT-01', version: 1, etapa: 'EnSeguimiento' } as any,
        partidas: [],
        totales: { subtotal: 0, iva: 0, total: 0 } as any,
        faltantes: [],
        acciones: { editar: false, enviarRevision: false, volverBorrador: false, revisar: [], emitir: false, nuevaVersion: true },
      })
    );

    paramMapSubject.next(convertToParamMap({ id: '10' }));
    fixture.detectChanges();

    const franja = fixture.nativeElement.querySelector('.franja-solo-lectura');
    expect(franja.textContent).toContain('En seguimiento');
    expect(franja.textContent).not.toContain('EnSeguimiento');
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

  it('El_boton_Registrar_envio_solo_aparece_si_acciones_emitir', () => {
    component.acciones = { editar: true, enviarRevision: false, volverBorrador: false, revisar: [], emitir: false, nuevaVersion: false };
    fixture.detectChanges();
    let btnEmitir = fixture.nativeElement.querySelector('.btn-registrar-envio');
    expect(btnEmitir).toBeNull();

    component.acciones = { editar: false, enviarRevision: false, volverBorrador: false, revisar: [], emitir: true, nuevaVersion: false };
    fixture.detectChanges();
    btnEmitir = fixture.nativeElement.querySelector('.btn-registrar-envio');
    expect(btnEmitir).toBeTruthy();
  });

  it('Despues_de_emitir_se_recarga_y_queda_en_solo_lectura', () => {
    const mockDialog = TestBed.inject(MatDialog) as any;
    mockDialog.open.and.returnValue({
      afterClosed: () => of({ guardado: true, data: { folio: 'COT-01', version: 1 } }),
    });

    mockQuotesService.obtenerSgc.and.returnValue(
      of({
        cotizacionProductosId: 15,
        cotizacion: {
          cotizacionProductosId: 15,
          clienteId: 1,
          unidadDeNegocioId: 2,
          usuarioId: 7,
          requisitosEspeciales: false,
          createdDate: '2026-11-14T10:00:00Z',
          updatedDate: null,
        } as any,
        sgc: { folio: 'COT-01', version: 1, etapa: 'Emitida' } as any,
        partidas: [],
        totales: { subtotal: 0, iva: 0, total: 0 } as any,
        faltantes: [],
        acciones: { editar: false, enviarRevision: false, volverBorrador: false, revisar: [], emitir: false, nuevaVersion: true },
      })
    );

    component.quotesId = 15;
    component.abrirEmisionDialog();
    fixture.detectChanges();

    expect(mockQuotesService.obtenerSgc).toHaveBeenCalledWith(15);
    expect(component.soloLectura).toBeTrue();
    expect(component.etapa).toBe('Emitida');
    expect(component.quotesForm.disabled).toBeTrue();
  });

  describe('Tarea F15-0: Reabrir cotización con contrato exacto del API', () => {
    // Copiado de CotizacionSgcEncabezadoVistaDto (jr_api/DTOs/CotizacionesSgc/CotizacionSgcDtos.cs)
    const encabezadoDtoExacto: EncabezadoCotizacionSgc = {
      cotizacionProductosId: 10,
      clienteId: 5,
      unidadDeNegocioId: 2,
      usuarioId: 7,
      requisitosEspeciales: true,
      createdDate: '2026-11-13T10:00:00Z',
      updatedDate: '2026-11-14T12:00:00Z',
      nombreCliente: 'Cliente Ficticio',
      nombreEmpresa: 'Empresa Ficticia SA de CV',
      correo: 'contacto@ficticia.com',
      telefono: '4421234567',
      rfc: 'CFI200101XYZ',
      direccionCompleta: 'Av Tecnologico 100, Queretaro',
      estado: 'Querétaro',
      estatus: 3,
      observaciones: 'Entrega prioritaria en nave 2',
    };

    // Copiado de CotizacionSgcVistaDto y PartidaSgcDto (jr_api/DTOs/CotizacionesSgc/CotizacionSgcDtos.cs)
    const sgcDtoExacto: CotizacionSgcVista = {
      folio: 'COT-2026-0010',
      version: 1,
      etapa: 'Emitida',
      subtotal: 1000,
      iva: 160,
      total: 1160,
      creadoPorUsuarioId: 7,
      creadoPorNombre: 'Vendedor Demo',
      fechaCreacion: '2026-11-13T10:00:00Z',
      fechaModificacion: null,
      fechaPrimeraEmision: '2026-11-14T10:00:00Z',
      fechaEmision: '2026-11-14T10:00:00Z',
      fechaVencimiento: '2026-11-29T10:00:00Z',
      medioEnvio: 'Correo',
      clienteReceptor: 'Ing. Receptor',
      correoReceptor: 'receptor@cliente.com',
      claseCambioVersion: 'Inicial',
      cambioResumen: null,
      requerimientoId: 42,
      tipo: 'CT',
      moneda: 'USD',
      tipoCambio: 19.5,
      vigenciaDias: 15,
      penalizacionCancelacion: '10% anticipo',
      formaPago: 'Transferencia',
      condicionesPago: '30 días de crédito',
      puntoEntrega: 'Planta Querétaro',
      condicionesEntrega: 'FOB',
      cuentaDeposito: 'BBVA 1234567890',
      exclusiones: 'No incluye maniobras',
      observacionesRelevantes: 'Garantía 1 año',
      contactoNombre: 'Ing. Receptor',
      contactoCorreo: 'receptor@cliente.com',
      contactoTelefono: '4429876543',
      anexosTecnicos: 'Ficha técnica v1',
      alcanceTecnico: 'Suministro e instalación',
      recursosRequeridos: 'Grúa 5 ton',
      personalInvolucrado: '2 técnicos',
      tiemposEstimados: '3 semanas',
      supuestosOperativos: 'Área despejada',
      condicionesEjecucion: 'Turno diurno',
      riesgosLimitaciones: 'Lluvia',
      entregables: ['Planos', 'Certificado'],
      costosIndirectos: 50,
      margenAutorizadoPorcentaje: 20,
    };

    const partidasDtoExacto: PartidaSgc[] = [
      {
        partida: 1,
        tipoConcepto: 'Material',
        materialServicio: 'Cable uso rudo 3x10',
        descripcion: 'Bobina 100m',
        codigoProducto: 'CAB-001',
        productoId: 101,
        unidad: 'MTR',
        cantidad: 100,
        precioUnitario: 10,
        descuento: 0,
        costoUnitario: 6,
        tiempoEntregaDias: 5,
        notas: 'Entrega por tramos',
        heredada: false,
      },
    ];

    it('Reabrir_asigna_cada_campo_del_encabezado_a_su_control', () => {
      // Cita CotizacionSgcEncabezadoVistaDto
      const respuestaApi: RespuestaObtenerSgc = {
        cotizacionProductosId: 10,
        cotizacion: encabezadoDtoExacto,
        sgc: sgcDtoExacto,
        partidas: partidasDtoExacto,
        partidasHeredadas: false,
        totales: { subtotal: 1000, iva: 160, total: 1160, costoDirecto: 600, utilidad: 400, margenPorcentaje: 40, margenBajo: false, partidasSinCosto: 0 },
        faltantes: [],
      };
      mockQuotesService.obtenerSgc.and.returnValue(of(respuestaApi));

      component.loadQuotes(10);
      fixture.detectChanges();

      expect(component.quotesForm.get('cotizacionProductosId')?.value).toBe(10);
      expect(component.quotesForm.get('clienteId')?.value).toBe(5);
      expect(component.quotesForm.get('unidadDeNegocioId')?.value).toBe(2);
      expect(component.quotesForm.get('usuarioId')?.value).toBe(7);
      expect(component.quotesForm.get('requisitosEspeciales')?.value).toBe(true);
      expect(component.quotesForm.get('createdDate')?.value).toBe('2026-11-13T10:00:00Z');
      expect(component.quotesForm.get('updatedDate')?.value).toBe('2026-11-14T12:00:00Z');
      expect(component.quotesForm.get('nombreCliente')?.value).toBe('Cliente Ficticio');
      expect(component.quotesForm.get('nombreEmpresa')?.value).toBe('Empresa Ficticia SA de CV');
      expect(component.quotesForm.get('correo')?.value).toBe('contacto@ficticia.com');
      expect(component.quotesForm.get('telefono')?.value).toBe('4421234567');
      expect(component.quotesForm.get('rfc')?.value).toBe('CFI200101XYZ');
      expect(component.quotesForm.get('direccionCompleta')?.value).toBe('Av Tecnologico 100, Queretaro');
      expect(component.quotesForm.get('estado')?.value).toBe('Querétaro');
      expect(component.quotesForm.get('estatus')?.value).toBe(3);
      expect(component.quotesForm.get('observaciones')?.value).toBe('Entrega prioritaria en nave 2');
      expect(component.cotizacion).toEqual(encabezadoDtoExacto);
    });

    it('Reabrir_asigna_cada_campo_del_SGC_y_las_partidas', () => {
      // Cita CotizacionSgcVistaDto y PartidaSgcDto
      const respuestaApi: RespuestaObtenerSgc = {
        cotizacionProductosId: 10,
        cotizacion: encabezadoDtoExacto,
        sgc: sgcDtoExacto,
        partidas: partidasDtoExacto,
        partidasHeredadas: false,
        totales: { subtotal: 1000, iva: 160, total: 1160, costoDirecto: 600, utilidad: 400, margenPorcentaje: 40, margenBajo: false, partidasSinCosto: 0 },
        faltantes: [],
      };
      mockQuotesService.obtenerSgc.and.returnValue(of(respuestaApi));

      component.loadQuotes(10);
      fixture.detectChanges();

      expect(component.folio).toBe('COT-2026-0010');
      expect(component.version).toBe(1);
      expect(component.etapa).toBe('Emitida');
      expect(component.sgcForm.get('requerimientoId')?.value).toBe(42);
      expect(component.sgcForm.get('tipo')?.value).toBe('CT');
      expect(component.sgcForm.get('moneda')?.value).toBe('USD');
      expect(component.sgcForm.get('tipoCambio')?.value).toBe(19.5);
      expect(component.sgcForm.get('vigenciaDias')?.value).toBe(15);
      expect(component.sgcForm.get('penalizacionCancelacion')?.value).toBe('10% anticipo');
      expect(component.sgcForm.get('condicionesPago')?.value).toBe('30 días de crédito');
      expect(component.sgcForm.get('puntoEntrega')?.value).toBe('Planta Querétaro');
      expect(component.sgcForm.get('condicionesEntrega')?.value).toBe('FOB');
      expect(component.sgcForm.get('cuentaDeposito')?.value).toBe('BBVA 1234567890');
      expect(component.sgcForm.get('exclusiones')?.value).toBe('No incluye maniobras');
      expect(component.sgcForm.get('observacionesRelevantes')?.value).toBe('Garantía 1 año');
      expect(component.sgcForm.get('contactoNombre')?.value).toBe('Ing. Receptor');
      expect(component.sgcForm.get('contactoCorreo')?.value).toBe('receptor@cliente.com');
      expect(component.sgcForm.get('contactoTelefono')?.value).toBe('4429876543');
      expect(component.sgcForm.get('anexosTecnicos')?.value).toBe('Ficha técnica v1');
      expect(component.sgcForm.get('alcanceTecnico')?.value).toBe('Suministro e instalación');
      expect(component.sgcForm.get('recursosRequeridos')?.value).toBe('Grúa 5 ton');
      expect(component.sgcForm.get('personalInvolucrado')?.value).toBe('2 técnicos');
      expect(component.sgcForm.get('tiemposEstimados')?.value).toBe('3 semanas');
      expect(component.sgcForm.get('supuestosOperativos')?.value).toBe('Área despejada');
      expect(component.sgcForm.get('condicionesEjecucion')?.value).toBe('Turno diurno');
      expect(component.sgcForm.get('riesgosLimitaciones')?.value).toBe('Lluvia');
      expect(component.sgcForm.get('entregables')?.value).toEqual(['Planos', 'Certificado']);
      expect(component.sgcForm.get('costosIndirectos')?.value).toBe(50);
      expect(component.sgcForm.get('margenAutorizadoPorcentaje')?.value).toBe(20);

      expect(component.partidasFormArray.length).toBe(1);
      const p = component.partidasFormArray.at(0).value;
      expect(p.partida).toBe(1);
      expect(p.tipoConcepto).toBe('Material');
      expect(p.materialServicio).toBe('Cable uso rudo 3x10');
      expect(p.descripcion).toBe('Bobina 100m');
      expect(p.codigoProducto).toBe('CAB-001');
      expect(p.productoId).toBe(101);
      expect(p.unidad).toBe('MTR');
      expect(p.cantidad).toBe(100);
      expect(p.precioUnitario).toBe(10);
      expect(p.descuento).toBe(0);
      expect(p.costoUnitario).toBe(6);
      expect(p.tiempoEntregaDias).toBe(5);
      expect(p.notas).toBe('Entrega por tramos');
    });

    it('Reabrir_hace_una_sola_peticion_y_no_llama_getQuoteById', () => {
      const respuestaApi: RespuestaObtenerSgc = {
        cotizacionProductosId: 10,
        cotizacion: encabezadoDtoExacto,
        sgc: sgcDtoExacto,
        partidas: [],
        partidasHeredadas: false,
        totales: { subtotal: 0, iva: 0, total: 0, costoDirecto: 0, utilidad: null, margenPorcentaje: null, margenBajo: false, partidasSinCosto: 0 },
        faltantes: [],
      };
      mockQuotesService.obtenerSgc.and.returnValue(of(respuestaApi));

      component.loadQuotes(10);

      expect(mockQuotesService.obtenerSgc).toHaveBeenCalledTimes(1);
      expect(mockQuotesService.obtenerSgc).toHaveBeenCalledWith(10);
      expect(mockQuotesService.getQuoteById).toHaveBeenCalledTimes(0);
    });

    it('Reabrir_y_guardar_sin_cambios_manda_los_mismos_valores', () => {
      // Caso en USD, con requerimientoId, entregables, tipoCambio (en USD) y observaciones
      const respuestaApi: RespuestaObtenerSgc = {
        cotizacionProductosId: 10,
        cotizacion: encabezadoDtoExacto,
        sgc: sgcDtoExacto,
        partidas: partidasDtoExacto,
        partidasHeredadas: false,
        totales: { subtotal: 1000, iva: 160, total: 1160, costoDirecto: 600, utilidad: 400, margenPorcentaje: 40, margenBajo: false, partidasSinCosto: 0 },
        faltantes: [],
      };
      mockQuotesService.obtenerSgc.and.returnValue(of(respuestaApi));

      component.loadQuotes(10);
      const dto = component.armarDtoGuardar();

      // Encabezado
      expect(dto.cotizacion.cotizacionProductosId).toBe(10);
      expect(dto.cotizacion.clienteId).toBe(5);
      expect(dto.cotizacion.unidadDeNegocioId).toBe(2);
      expect(dto.cotizacion.requisitosEspeciales).toBe(true);
      expect(dto.cotizacion.nombreCliente).toBe('Cliente Ficticio');
      expect(dto.cotizacion.nombreEmpresa).toBe('Empresa Ficticia SA de CV');
      expect(dto.cotizacion.correo).toBe('contacto@ficticia.com');
      expect(dto.cotizacion.telefono).toBe('4421234567');
      expect(dto.cotizacion.rfc).toBe('CFI200101XYZ');
      expect(dto.cotizacion.direccionCompleta).toBe('Av Tecnologico 100, Queretaro');
      expect(dto.cotizacion.estado).toBe('Querétaro');
      expect(dto.cotizacion.estatus).toBe(3);
      expect(dto.cotizacion.observaciones).toBe('Entrega prioritaria en nave 2');

      // SGC
      expect(dto.sgc.tipo).toBe('CT');
      expect(dto.sgc.moneda).toBe('USD');
      expect(dto.sgc.tipoCambio).toBe(19.5);
      expect(dto.sgc.requerimientoId).toBe(42);
      expect(dto.sgc.vigenciaDias).toBe(15);
      expect(dto.sgc.penalizacionCancelacion).toBe('10% anticipo');
      expect(dto.sgc.formaPago).toBeUndefined();
      expect(dto.sgc.condicionesPago).toBe('30 días de crédito');
      expect(dto.sgc.puntoEntrega).toBe('Planta Querétaro');
      expect(dto.sgc.condicionesEntrega).toBe('FOB');
      expect(dto.sgc.cuentaDeposito).toBe('BBVA 1234567890');
      expect(dto.sgc.exclusiones).toBe('No incluye maniobras');
      expect(dto.sgc.observacionesRelevantes).toBe('Garantía 1 año');
      expect(dto.sgc.contactoNombre).toBe('Ing. Receptor');
      expect(dto.sgc.contactoCorreo).toBe('receptor@cliente.com');
      expect(dto.sgc.contactoTelefono).toBe('4429876543');
      expect(dto.sgc.anexosTecnicos).toBe('Ficha técnica v1');
      expect(dto.sgc.alcanceTecnico).toBe('Suministro e instalación');
      expect(dto.sgc.recursosRequeridos).toBe('Grúa 5 ton');
      expect(dto.sgc.personalInvolucrado).toBe('2 técnicos');
      expect(dto.sgc.tiemposEstimados).toBe('3 semanas');
      expect(dto.sgc.supuestosOperativos).toBe('Área despejada');
      expect(dto.sgc.condicionesEjecucion).toBe('Turno diurno');
      expect(dto.sgc.riesgosLimitaciones).toBe('Lluvia');
      expect(dto.sgc.entregables).toEqual(['Planos', 'Certificado']);
      expect(dto.sgc.costosIndirectos).toBe(50);
      expect(dto.sgc.margenAutorizadoPorcentaje).toBe(20);

      // Partidas
      expect(dto.partidas.length).toBe(1);
      expect(dto.partidas[0].materialServicio).toBe('Cable uso rudo 3x10');
      expect(dto.partidas[0].precioUnitario).toBe(10);
      expect(dto.partidas[0].costoUnitario).toBe(6);
    });

    it('Guardar_no_manda_formaPago', () => {
      const sgcVal = component.sgcForm.getRawValue();
      expect(sgcVal.formaPago).toBeUndefined();
    });

    it('Una_cotizacion_con_formaPago_guardado_carga_sin_errores', () => {
      expect(() => {
        component.sgcForm.patchValue({
          tipo: 'CS',
          moneda: 'MXN',
          formaPago: 'Transferencia electrónica guardada previamente'
        });
      }).not.toThrow();
      expect(component.sgcForm.get('formaPago')).toBeNull();
    });

    it('El_selector_de_cliente_muestra_el_cliente_aunque_la_lista_llegue_despues', async () => {
      // Lista de clientes llega DESPUÉS de loadQuotes
      const respuestaApi: RespuestaObtenerSgc = {
        cotizacionProductosId: 10,
        cotizacion: encabezadoDtoExacto, // clienteId: 5
        sgc: sgcDtoExacto,
        partidas: [],
        partidasHeredadas: false,
        totales: { subtotal: 0, iva: 0, total: 0, costoDirecto: 0, utilidad: null, margenPorcentaje: null, margenBajo: false, partidasSinCosto: 0 },
        faltantes: [],
      };
      mockQuotesService.obtenerSgc.and.returnValue(of(respuestaApi));

      // Empezamos con lista de clientes vacía
      component.clients = [];
      component.filteredClients = [];
      component.loadQuotes(10);
      fixture.detectChanges();

      expect(component.quotesForm.get('clienteId')?.value).toBe(5);

      // Llega la lista de clientes después
      component.clients = [{ clienteId: 5, nombre: 'Cliente Cinco S.A.' }];
      component.filteredClients = component.clients;
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const selects = fixture.debugElement.queryAll(By.directive(MatSelect));
      expect(selects.length).toBeGreaterThan(0);
      const clienteMatSelect = selects[0].componentInstance as MatSelect;
      expect(clienteMatSelect.value).toBe(5);
      expect(clienteMatSelect.options.length).toBeGreaterThan(1);
      expect(clienteMatSelect.triggerValue).toContain('Cliente Cinco S.A.');
    });

    it('Reabrir_una_cotizacion_heredada_asigna_el_encabezado_y_las_partidas_heredadas', () => {
      // Caso heredado: sgc: null, partidasHeredadas: true
      const partidaHeredada: PartidaSgc = {
        partida: 1,
        tipoConcepto: 'Material',
        materialServicio: 'Material Heredado CONTPAQi',
        unidad: 'PZA',
        cantidad: 5,
        precioUnitario: 200,
        descuento: 0,
        heredada: true,
      };
      const respuestaApi: RespuestaObtenerSgc = {
        cotizacionProductosId: 10,
        cotizacion: encabezadoDtoExacto,
        sgc: null,
        partidas: [partidaHeredada],
        partidasHeredadas: true,
        totales: { subtotal: 1000, iva: 160, total: 1160, costoDirecto: 0, utilidad: null, margenPorcentaje: null, margenBajo: false, partidasSinCosto: 1 },
        faltantes: [],
      };
      mockQuotesService.obtenerSgc.and.returnValue(of(respuestaApi));

      component.loadQuotes(10);
      fixture.detectChanges();

      expect(component.esHeredada).toBeTrue();
      expect(component.quotesForm.get('observaciones')?.value).toBe('Entrega prioritaria en nave 2');
      expect(component.quotesForm.get('nombreCliente')?.value).toBe('Cliente Ficticio');
      expect(component.quotesForm.get('clienteId')?.value).toBe(5);
      expect(component.partidas.length).toBe(1);
      expect(component.partidas[0].materialServicio).toBe('Material Heredado CONTPAQi');
      expect(component.sgcForm.get('tipo')?.value).toBe('CS');
      expect(component.sgcForm.get('moneda')?.value).toBe('MXN');
      expect(component.sgcForm.get('vigenciaDias')?.value).toBe(15);
    });

    it('Si_la_respuesta_no_trae_encabezado_se_avisa', () => {
      // Respuesta de obtenerSgc con cotizacion: null
      const respuestaSinEncabezado: RespuestaObtenerSgc = {
        cotizacionProductosId: 10,
        cotizacion: null,
        sgc: null,
        partidas: [],
        partidasHeredadas: false,
        totales: { subtotal: 0, iva: 0, total: 0, costoDirecto: 0, utilidad: null, margenPorcentaje: null, margenBajo: false, partidasSinCosto: 0 },
        faltantes: [],
      };
      mockQuotesService.obtenerSgc.and.returnValue(of(respuestaSinEncabezado));

      component.loadQuotes(10);

      expect(mockChatService.showError).toHaveBeenCalledWith(
        'Opps',
        'No se pudo cargar el encabezado de la cotización.',
        5000
      );
    });

    it('Un_error_de_carga_se_ve_en_pantalla', () => {
      mockQuotesService.obtenerSgc.and.returnValue(
        throwError(() => ({ error: { mensaje: 'Error al conectar con la base de datos' } }))
      );

      component.loadQuotes(10);

      expect(mockChatService.showError).toHaveBeenCalledWith(
        'Opps',
        'Error al conectar con la base de datos',
        5000
      );
    });

    it('La_pestana_solo_aparece_si_la_cotizacion_esta_emitida_o_cerrada', () => {
      // En etapas de borrador o revisión -> NO debe aparecer
      component.etapa = 'Borrador';
      fixture.detectChanges();
      expect(component.etapaEsEmitidaOCerrada).toBeFalse();

      component.etapa = 'EnRevision';
      fixture.detectChanges();
      expect(component.etapaEsEmitidaOCerrada).toBeFalse();

      component.etapa = 'Revisada';
      fixture.detectChanges();
      expect(component.etapaEsEmitidaOCerrada).toBeFalse();

      // En etapas emitidas o de seguimiento -> SI debe aparecer
      component.etapa = 'Emitida';
      fixture.detectChanges();
      expect(component.etapaEsEmitidaOCerrada).toBeTrue();

      component.etapa = 'EnSeguimiento';
      fixture.detectChanges();
      expect(component.etapaEsEmitidaOCerrada).toBeTrue();

      // En etapas cerradas -> SI debe aparecer
      const etapasCerradas = ['Ganada', 'Perdida', 'Cancelada', 'Vencida', 'CerradaSinRespuesta'];
      for (const e of etapasCerradas) {
        component.etapa = e;
        expect(component.etapaEsEmitidaOCerrada).toBeTrue();
      }
    });

    it('El_boton_Cerrar_solo_aparece_si_acciones_cerrar_tiene_resultados', () => {
      // Sin resultados de cierre
      component.acciones = { ...component.acciones, cerrar: [] };
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.btn-cerrar-cotizacion')).toBeNull();

      // Con resultados de cierre
      component.acciones = { ...component.acciones, cerrar: ['Ganada', 'Perdida'] };
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.btn-cerrar-cotizacion')).not.toBeNull();
    });

    it('Una_cotizacion_cerrada_queda_de_solo_lectura_y_muestra_su_resultado', async () => {
      component.etapa = 'Ganada';
      component.acciones = {
        editar: false,
        enviarRevision: false,
        volverBorrador: false,
        revisar: [],
        emitir: false,
        nuevaVersion: false,
        seguimiento: false,
        cerrar: [],
      };
      // Copiado de CotizacionSgcVistaDto del API C# (CotizacionSgcDtos.cs)
      component.sgcVista = {
        folio: 'COT-2026-0042',
        version: 1,
        etapa: 'Ganada',
        tipo: 'CS',
        moneda: 'MXN',
        vigenciaDias: 15,
        entregables: [],
        fechaCierre: '2026-11-16T15:30:00Z',
        tipoEvidencia: 'OrdenCompra',
        referenciaEvidencia: 'OC-998877',
        montoVendido: 35000,
        subtotal: 30172.41,
        iva: 4827.59,
        total: 35000,
        creadoPorUsuarioId: 10,
        fechaCreacion: '2026-11-10T10:00:00Z',
        motivoCierre: null,
        comentarioCierre: 'Cliente confirmó compra vía portal',
      };
      component.selectedTabIndex = 3; // Pestaña Resumen

      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.etapaEsCerrada).toBeTrue();
      const bloque = fixture.nativeElement.querySelector('.bloque-resultado-cierre');
      expect(bloque).not.toBeNull();
      expect(bloque.textContent).toContain('Resultado del cierre');
      expect(bloque.textContent).toContain('OC-998877');
      expect(bloque.textContent).toContain('Cliente confirmó compra vía portal');
      // No hay botones de acción disponibles
      expect(fixture.nativeElement.querySelector('.btn-cerrar-cotizacion')).toBeNull();
      expect(fixture.nativeElement.querySelector('.btn-registrar-envio')).toBeNull();
    });
  });

  describe('Revisión F3: cierre con conflicto y nombres legibles', () => {
    function abrirCierreCon(resultadoDialogo: any): void {
      const mockDialog = TestBed.inject(MatDialog) as any;
      mockDialog.open.and.returnValue({ afterClosed: () => of(resultadoDialogo) });
      component.quotesId = 15;
      component.acciones = { ...component.acciones, cerrar: ['Ganada', 'Perdida'] };
      mockQuotesService.obtenerSgc.calls.reset();
      mockChatService.showError.calls.reset();
      component.abrirCierreDialog();
    }

    it('Un_conflicto_al_cerrar_muestra_el_mensaje_y_recarga_la_cotizacion', () => {
      abrirCierreCon({ guardado: false, conflicto: true, mensaje: 'La cotización ya está cerrada.' });

      expect(mockChatService.showError).toHaveBeenCalledWith('Opps', 'La cotización ya está cerrada.', 5000);
      expect(mockQuotesService.obtenerSgc).toHaveBeenCalledTimes(1);
      expect(mockQuotesService.obtenerSgc).toHaveBeenCalledWith(15);
    });

    it('Cerrar_con_exito_recarga_una_vez_y_sin_error', () => {
      abrirCierreCon({ guardado: true, resultado: 'Perdida', fechaCierre: '2026-11-16T19:00:00Z' });

      expect(mockQuotesService.obtenerSgc).toHaveBeenCalledTimes(1);
      expect(mockChatService.showError).not.toHaveBeenCalled();
    });

    it('Cancelar_el_cierre_no_recarga_ni_avisa', () => {
      abrirCierreCon(false);

      expect(mockQuotesService.obtenerSgc).not.toHaveBeenCalled();
      expect(mockChatService.showError).not.toHaveBeenCalled();
    });

    it('El_resultado_del_cierre_muestra_los_nombres_del_catalogo_y_no_los_codigos', async () => {
      component.catalogos = {
        tipos: [], monedas: [], tiposConcepto: [], entregables: [], ivaTasa: 0.16,
        motivosCierre: [{ codigo: 'FaltaPresupuesto', nombre: 'Sin presupuesto del cliente' }],
        tiposEvidencia: [{ codigo: 'CorreoAceptacion', nombre: 'Correo de aceptación del cliente' }],
      } as any;
      component.etapa = 'Perdida';
      component.acciones = { ...component.acciones, editar: false, seguimiento: false, cerrar: [] };
      component.sgcVista = {
        folio: 'COT-2026-0042', version: 1, etapa: 'Perdida', tipo: 'CS', moneda: 'MXN', vigenciaDias: 15, entregables: [],
        subtotal: 100, iva: 16, total: 116, creadoPorUsuarioId: 10, fechaCreacion: '2026-11-10T10:00:00Z',
        fechaCierre: '2026-11-16T15:30:00Z', motivoCierre: 'FaltaPresupuesto', comentarioCierre: null,
      } as any;
      component.selectedTabIndex = 3;
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      let bloque = fixture.nativeElement.querySelector('.bloque-resultado-cierre');
      expect(bloque.querySelector('.motivo-cierre-texto').textContent).toContain('Sin presupuesto del cliente');
      expect(bloque.textContent).not.toContain('FaltaPresupuesto');

      component.etapa = 'Ganada';
      component.sgcVista = {
        ...(component.sgcVista as any), etapa: 'Ganada', motivoCierre: null,
        tipoEvidencia: 'CorreoAceptacion', referenciaEvidencia: 'Correo del 15/11', montoVendido: 116,
      };
      fixture.detectChanges();
      bloque = fixture.nativeElement.querySelector('.bloque-resultado-cierre');
      expect(bloque.querySelector('.evidencia-texto').textContent).toContain('Correo de aceptación del cliente — Correo del 15/11');
      expect(bloque.textContent).not.toContain('CorreoAceptacion');
    });

    it('Sin_catalogos_cargados_el_resultado_usa_los_nombres_de_respaldo', async () => {
      component.catalogos = null;
      component.etapa = 'Perdida';
      component.acciones = { ...component.acciones, editar: false, seguimiento: false, cerrar: [] };
      component.sgcVista = {
        folio: 'COT-2026-0042', version: 1, etapa: 'Perdida', tipo: 'CS', moneda: 'MXN', vigenciaDias: 15, entregables: [],
        subtotal: 100, iva: 16, total: 116, creadoPorUsuarioId: 10, fechaCreacion: '2026-11-10T10:00:00Z',
        fechaCierre: '2026-11-16T15:30:00Z', motivoCierre: 'FaltaPresupuesto',
      } as any;
      component.selectedTabIndex = 3;
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const texto = fixture.nativeElement.querySelector('.motivo-cierre-texto').textContent;
      expect(texto).toContain('Falta de presupuesto');
      expect(texto).not.toContain('FaltaPresupuesto');
    });
  });

  describe('Origen y folio de cotización en el encabezado', () => {
    it('El_editor_muestra_el_folio_o_la_opcion_de_agregarlo_en_el_encabezado', async () => {
      const origenConFolio: CotizacionOrigen = {
        ...mockOrigen,
        folioCotizacion: 'COT-777',
        puedeAgregarFolio: false
      };
      mockQuotesService.origen.and.returnValue(of(origenConFolio));

      paramMapSubject.next(convertToParamMap({ id: '10' }));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(mockQuotesService.origen).toHaveBeenCalledWith(10);
      const headerFolio = fixture.nativeElement.querySelector('[data-testid="folio-cotizacion-header"]');
      expect(headerFolio).not.toBeNull();
      expect(headerFolio.textContent).toContain('COT-777');
    });

    it('Sin_folio_y_sin_opcion_de_agregarlo_no_muestra_nada_en_el_encabezado', async () => {
      mockQuotesService.origen.and.returnValue(of({ ...mockOrigen, folioCotizacion: null, puedeAgregarFolio: false } as CotizacionOrigen));

      paramMapSubject.next(convertToParamMap({ id: '10' }));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="folio-cotizacion-header"]')).toBeNull();
    });

    it('Sin_folio_pero_con_la_opcion_de_agregarlo_muestra_el_boton_en_el_encabezado', async () => {
      mockQuotesService.origen.and.returnValue(of({ ...mockOrigen, folioCotizacion: null, puedeAgregarFolio: true } as CotizacionOrigen));

      paramMapSubject.next(convertToParamMap({ id: '10' }));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const header = fixture.nativeElement.querySelector('[data-testid="folio-cotizacion-header"]');
      expect(header).not.toBeNull();
      expect(header.querySelector('[data-testid="btn-agregar-folio"]')).not.toBeNull();
    });

    it('Si_el_origen_falla_no_muestra_nada_ni_rompe_el_editor', async () => {
      mockQuotesService.origen.and.returnValue(throwError(() => new Error('Error al cargar origen')));

      paramMapSubject.next(convertToParamMap({ id: '10' }));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.origen).toBeNull();
      const headerFolio = fixture.nativeElement.querySelector('[data-testid="folio-cotizacion-header"]');
      expect(headerFolio).toBeNull();
    });

    it('No_pide_el_origen_en_una_cotizacion_nueva', async () => {
      mockQuotesService.origen.calls.reset();

      paramMapSubject.next(convertToParamMap({ id: 'new' }));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.quotesId).toBeNull();
      expect(mockQuotesService.origen).not.toHaveBeenCalled();
      const headerFolio = fixture.nativeElement.querySelector('[data-testid="folio-cotizacion-header"]');
      expect(headerFolio).toBeNull();
    });
  });
});
