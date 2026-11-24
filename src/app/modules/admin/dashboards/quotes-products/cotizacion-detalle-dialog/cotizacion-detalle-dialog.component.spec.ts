import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { QuotesService } from '../quotes-products.service';
import { CotizacionOrigen, RespuestaObtenerSgc } from '../quotes-products.types';
import { CotizacionDetalleDialogComponent } from './cotizacion-detalle-dialog.component';

describe('CotizacionDetalleDialogComponent', () => {
  let fixture: ComponentFixture<CotizacionDetalleDialogComponent>;
  let component: CotizacionDetalleDialogComponent;
  let quotesService: jasmine.SpyObj<QuotesService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<CotizacionDetalleDialogComponent>>;
  let router: jasmine.SpyObj<Router>;

  const mockCabecera = {
    code: 200,
    message: '',
    data: {
      cotizacionProductosId: 311,
      folioContpaq: 'COT-1234',
      nombreCliente: 'Cliente Ficticio',
      nombreEmpresa: 'Cliente Ficticio SA de CV',
      correo: 'contacto@ficticio.test',
      telefono: '5512345678',
      createdDate: '2026-11-20T10:00:00',
      total: 25000,
      detalles: [
        {
          cantidad: 2,
          precioUnitario: 12500,
          descuento: 0,
          producto: { nombreProducto: 'Sensor Óptico Local', codigoProducto: 'SEN-01' }
        }
      ]
    }
  };

  const mockSgc: RespuestaObtenerSgc = {
    cotizacionProductosId: 311,
    cotizacion: {
      cotizacionProductosId: 311,
      clienteId: 1,
      unidadDeNegocioId: 2,
      nombreCliente: 'Cliente Ficticio',
      nombreEmpresa: 'Cliente Ficticio SA de CV',
      requisitosEspeciales: false
    },
    sgc: {
      folio: 'COT-2026-0042',
      version: 1,
      etapa: 'Borrador',
      tipo: 'CT',
      moneda: 'MXN',
      tipoCambio: null,
      vigenciaDias: 15,
      subtotal: 21551.72,
      iva: 3448.28,
      total: 25000,
      contactoNombre: 'Contacto Ficticio',
      contactoCorreo: 'contacto@ficticio.test',
      contactoTelefono: '5512345678',
      entregables: [],
      creadoPorUsuarioId: 1,
      fechaCreacion: '2026-11-10T10:00:00Z'
    },
    partidas: [
      {
        partida: 1,
        materialServicio: 'Transformador 500 kVA',
        cantidad: 1,
        unidad: 'PZA',
        precioUnitario: 25000,
        descuento: 0,
        tipoConcepto: 'Material',
        tiempoEntregaDias: 10
      }
    ],
    partidasHeredadas: false,
    faltantes: [],
    totales: {
      subtotal: 21551.72,
      iva: 3448.28,
      total: 25000,
      costoDirecto: 18000,
      utilidad: 3551.72,
      margenPorcentaje: 16.48,
      margenBajo: false,
      partidasSinCosto: 0
    },
    acciones: {
      editar: true,
      enviarRevision: true,
      volverBorrador: false,
      revisar: [],
      emitir: false,
      nuevaVersion: false,
      cerrar: []
    }
  };

  const mockOrigen: CotizacionOrigen = {
    cotizacionProductosId: 311,
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
      campana: 'Campaña Fin de Año',
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

  function crearComponente(data: any = { cotizacionProductosId: 311, unidadNombre: 'Querétaro' }): void {
    quotesService = jasmine.createSpyObj('QuotesService', ['getQuoteById', 'obtenerSgc', 'origen']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    router = jasmine.createSpyObj('Router', ['navigate']);

    quotesService.getQuoteById.and.returnValue(of(mockCabecera));
    quotesService.obtenerSgc.and.returnValue(of(mockSgc));
    quotesService.origen.and.returnValue(of(mockOrigen));

    TestBed.configureTestingModule({
      imports: [CotizacionDetalleDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: QuotesService, useValue: quotesService },
        { provide: Router, useValue: router }
      ]
    });

    fixture = TestBed.createComponent(CotizacionDetalleDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  const q = (testid: string): HTMLElement | null => fixture.nativeElement.querySelector(`[data-testid="${testid}"]`);

  it('Carga_cabecera_SGC_y_origen_en_paralelo', () => {
    crearComponente();

    expect(quotesService.getQuoteById).toHaveBeenCalledWith(311);
    expect(quotesService.obtenerSgc).toHaveBeenCalledWith(311);
    expect(quotesService.origen).toHaveBeenCalledWith(311);
  });

  it('Si_falla_el_origen_muestra_aviso_en_esa_seccion_y_el_resto_se_ve', () => {
    quotesService = jasmine.createSpyObj('QuotesService', ['getQuoteById', 'obtenerSgc', 'origen']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    router = jasmine.createSpyObj('Router', ['navigate']);

    quotesService.getQuoteById.and.returnValue(of(mockCabecera));
    quotesService.obtenerSgc.and.returnValue(of(mockSgc));
    quotesService.origen.and.returnValue(throwError(() => new Error('Error al cargar origen')));

    TestBed.configureTestingModule({
      imports: [CotizacionDetalleDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { cotizacionProductosId: 311 } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: QuotesService, useValue: quotesService },
        { provide: Router, useValue: router }
      ]
    });

    fixture = TestBed.createComponent(CotizacionDetalleDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(q('error-origen')).not.toBeNull();
    expect(q('folio-sgc')?.textContent).toContain('COT-2026-0042');
    expect(fixture.nativeElement.textContent).toContain('Transformador 500 kVA');
  });

  it('Si_falla_el_SGC_muestra_aviso_y_el_resto_se_ve', () => {
    quotesService = jasmine.createSpyObj('QuotesService', ['getQuoteById', 'obtenerSgc', 'origen']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    router = jasmine.createSpyObj('Router', ['navigate']);

    quotesService.getQuoteById.and.returnValue(of(mockCabecera));
    quotesService.obtenerSgc.and.returnValue(throwError(() => new Error('Error al cargar SGC')));
    quotesService.origen.and.returnValue(of(mockOrigen));

    TestBed.configureTestingModule({
      imports: [CotizacionDetalleDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { cotizacionProductosId: 311 } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: QuotesService, useValue: quotesService },
        { provide: Router, useValue: router }
      ]
    });

    fixture = TestBed.createComponent(CotizacionDetalleDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(q('error-sgc')).not.toBeNull();
    expect(q('folio-cotizacion')?.textContent).toContain('COT-1234');
    expect(fixture.nativeElement.textContent).toContain('REQ-2026-0057');
  });

  it('Una_informativa_no_pide_el_SGC_y_lo_dice', () => {
    crearComponente({ cotizacionProductosId: 311, informativa: true });

    expect(quotesService.obtenerSgc).not.toHaveBeenCalled();
    expect(q('aviso-informativa')).not.toBeNull();
    expect(q('aviso-informativa')?.textContent).toContain('Informativa');
  });

  it('Muestra_los_datos_del_lead_y_del_requerimiento', () => {
    crearComponente();

    const text = fixture.nativeElement.textContent;

    // Requerimiento
    expect(text).toContain('REQ-2026-0057');
    expect(text).toContain('Modernización de tablero');
    expect(text).toContain('Instalación');
    expect(text).toContain('Suministro de tableros');
    expect(text).toContain('Técnica');
    expect(text).toContain('Aprobado para cotización');

    // Lead
    expect(text).toContain('Contacto Ficticio');
    expect(text).toContain('Cliente Ficticio SA de CV');
    expect(text).toContain('5512345678');
    expect(text).toContain('contacto@ficticio.test');
    expect(text).toContain('WhatsApp');
    expect(text).toContain('Campaña Fin de Año');
    expect(text).toContain('Motor trifásico');
    expect(text).toContain('Querétaro');
    expect(text).toContain('Oportunidad');
    expect(text).toContain('Industrial');
    expect(text).toContain('Producto');
    expect(text).toContain('Alta');
  });

  it('Sin_requerimiento_dice_que_la_cotizacion_no_viene_de_un_requerimiento', () => {
    quotesService = jasmine.createSpyObj('QuotesService', ['getQuoteById', 'obtenerSgc', 'origen']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    router = jasmine.createSpyObj('Router', ['navigate']);

    quotesService.getQuoteById.and.returnValue(of(mockCabecera));
    quotesService.obtenerSgc.and.returnValue(of(mockSgc));
    quotesService.origen.and.returnValue(of({ cotizacionProductosId: 311, requerimiento: null, lead: null }));

    TestBed.configureTestingModule({
      imports: [CotizacionDetalleDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { cotizacionProductosId: 311 } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: QuotesService, useValue: quotesService },
        { provide: Router, useValue: router }
      ]
    });

    fixture = TestBed.createComponent(CotizacionDetalleDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(q('sin-requerimiento')).not.toBeNull();
    expect(q('sin-requerimiento')?.textContent).toContain('no proviene de un requerimiento');
  });

  it('Sin_lead_dice_que_el_requerimiento_no_tiene_lead', () => {
    quotesService = jasmine.createSpyObj('QuotesService', ['getQuoteById', 'obtenerSgc', 'origen']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    router = jasmine.createSpyObj('Router', ['navigate']);

    quotesService.getQuoteById.and.returnValue(of(mockCabecera));
    quotesService.obtenerSgc.and.returnValue(of(mockSgc));
    quotesService.origen.and.returnValue(of({
      cotizacionProductosId: 311,
      requerimiento: mockOrigen.requerimiento,
      lead: null
    }));

    TestBed.configureTestingModule({
      imports: [CotizacionDetalleDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { cotizacionProductosId: 311 } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: QuotesService, useValue: quotesService },
        { provide: Router, useValue: router }
      ]
    });

    fixture = TestBed.createComponent(CotizacionDetalleDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(q('sin-lead')).not.toBeNull();
    expect(q('sin-lead')?.textContent).toContain('no tiene lead');
  });

  it('Muestra_el_folio_SGC_y_el_folio_de_la_cotizacion', () => {
    crearComponente();

    expect(q('folio-sgc')?.textContent).toContain('COT-2026-0042');
    expect(q('folio-cotizacion')?.textContent).toContain('COT-1234');
  });

  it('Muestra_las_partidas_y_el_total', () => {
    crearComponente();

    expect(fixture.nativeElement.textContent).toContain('Transformador 500 kVA');
    expect(q('total-cotizacion')?.textContent).toContain('25,000');
  });

  it('El_texto_con_etiquetas_html_se_muestra_literal', () => {
    quotesService = jasmine.createSpyObj('QuotesService', ['getQuoteById', 'obtenerSgc', 'origen']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    router = jasmine.createSpyObj('Router', ['navigate']);

    const origenConHtml: CotizacionOrigen = {
      cotizacionProductosId: 311,
      requerimiento: {
        ...mockOrigen.requerimiento!,
        descripcion: 'Texto con <b>etiqueta negrita</b> y <script>alert(1)</script>'
      },
      lead: null
    };

    quotesService.getQuoteById.and.returnValue(of(mockCabecera));
    quotesService.obtenerSgc.and.returnValue(of(mockSgc));
    quotesService.origen.and.returnValue(of(origenConHtml));

    TestBed.configureTestingModule({
      imports: [CotizacionDetalleDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { cotizacionProductosId: 311 } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: QuotesService, useValue: quotesService },
        { provide: Router, useValue: router }
      ]
    });

    fixture = TestBed.createComponent(CotizacionDetalleDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('p b')).toBeNull();
    expect(compiled.textContent).toContain('<b>etiqueta negrita</b>');
  });

  it('Abrir_cotizacion_navega_a_dashboards_quote_products_id_y_cierra', () => {
    crearComponente();

    const btnAbrir = q('btn-abrir-cotizacion') as HTMLButtonElement;
    expect(btnAbrir).not.toBeNull();
    btnAbrir.click();

    expect(router.navigate).toHaveBeenCalledWith(['dashboards/quote-products', 311]);
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('Informativa_con_forma_real_del_API_muestra_nombre_del_producto_e_importe_con_descuento', () => {
    quotesService = jasmine.createSpyObj('QuotesService', ['getQuoteById', 'obtenerSgc', 'origen']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    router = jasmine.createSpyObj('Router', ['navigate']);

    const respuestaRealApi = {
      code: 200,
      message: '',
      data: {
        cotizacionProductosId: 400,
        nombreCliente: 'Cliente Real',
        folioContpaq: 'COT-99',
        total: 180,
        createdDate: '2026-11-20',
        detalles: [
          {
            cantidad: 2,
            precioUnitario: 100,
            descuento: 20,
            producto: { nombreProducto: 'Interruptor', codigoProducto: 'P-1' }
          }
        ]
      }
    };

    quotesService.getQuoteById.and.returnValue(of(respuestaRealApi));
    quotesService.origen.and.returnValue(of({ cotizacionProductosId: 400, requerimiento: null, lead: null }));

    TestBed.configureTestingModule({
      imports: [CotizacionDetalleDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { cotizacionProductosId: 400, informativa: true } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: QuotesService, useValue: quotesService },
        { provide: Router, useValue: router }
      ]
    });

    fixture = TestBed.createComponent(CotizacionDetalleDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const desc = fixture.nativeElement.querySelector('[data-testid="descripcion-partida"]');
    const imp = fixture.nativeElement.querySelector('[data-testid="importe-partida"]');

    expect(desc?.textContent?.trim()).toBe('Interruptor');
    expect(imp?.textContent).toContain('180.00');
  });

  it('Partida_SGC_con_descuento_calcula_importe_restando_descuento', () => {
    quotesService = jasmine.createSpyObj('QuotesService', ['getQuoteById', 'obtenerSgc', 'origen']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    router = jasmine.createSpyObj('Router', ['navigate']);

    const sgcConDescuento: RespuestaObtenerSgc = {
      ...mockSgc,
      partidas: [
        {
          partida: 1,
          materialServicio: 'Cable UTP Cat6',
          cantidad: 10,
          unidad: 'MTR',
          precioUnitario: 50,
          descuento: 50,
          tipoConcepto: 'Material',
          tiempoEntregaDias: 1
        }
      ]
    };

    quotesService.getQuoteById.and.returnValue(of(mockCabecera));
    quotesService.obtenerSgc.and.returnValue(of(sgcConDescuento));
    quotesService.origen.and.returnValue(of(mockOrigen));

    TestBed.configureTestingModule({
      imports: [CotizacionDetalleDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { cotizacionProductosId: 311 } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: QuotesService, useValue: quotesService },
        { provide: Router, useValue: router }
      ]
    });

    fixture = TestBed.createComponent(CotizacionDetalleDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const imp = fixture.nativeElement.querySelector('[data-testid="importe-partida"]');
    expect(imp?.textContent).toContain('450.00');
  });

  it('Unidad_de_negocio_se_muestra_desde_los_datos_del_dialogo', () => {
    crearComponente({ cotizacionProductosId: 311, unidadNombre: 'Sucursal Matriz' });

    expect(q('unidad-negocio')?.textContent?.trim()).toBe('Sucursal Matriz');
  });

  it('La_celda_muestra_Folio_CONTPAQ_o_Sin_folio', () => {
    crearComponente();
    expect(q('folio-cotizacion')?.textContent?.trim()).toBe('COT-1234');
    expect(q('btn-agregar-folio')).toBeNull();

    TestBed.resetTestingModule();
    const cabeceraSinFolio = {
      ...mockCabecera,
      data: { ...mockCabecera.data, folioContpaq: null }
    };
    quotesService = jasmine.createSpyObj('QuotesService', ['getQuoteById', 'obtenerSgc', 'origen']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    quotesService.getQuoteById.and.returnValue(of(cabeceraSinFolio));
    quotesService.obtenerSgc.and.returnValue(of(mockSgc));
    quotesService.origen.and.returnValue(of(mockOrigen));

    TestBed.configureTestingModule({
      imports: [CotizacionDetalleDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { cotizacionProductosId: 311 } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: QuotesService, useValue: quotesService },
        { provide: Router, useValue: router }
      ]
    });

    fixture = TestBed.createComponent(CotizacionDetalleDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(q('folio-cotizacion')?.textContent?.trim()).toBe('Sin folio');
    expect(q('btn-agregar-folio')).toBeNull();
  });
});
