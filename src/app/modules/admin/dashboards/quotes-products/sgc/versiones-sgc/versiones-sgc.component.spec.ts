import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { VersionesSgcComponent } from './versiones-sgc.component';
import { QuotesService } from '../../quotes-products.service';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { QuotePdfDialogComponent } from '../../quote-pdf-dialog/quote-pdf-dialog.component';
import { VersionSgcItem, CotizacionArchivoDto } from '../../quotes-products.types';
import Swal from 'sweetalert2';

describe('VersionesSgcComponent', () => {
  let component: VersionesSgcComponent;
  let fixture: ComponentFixture<VersionesSgcComponent>;
  let mockQuotesService: any;
  let mockDialog: any;

  // Forma EXACTA de GET api/CotizacionProductos/{id}/sgc/versiones (orden descendente por versión)
  const versionesDelApi: VersionSgcItem[] = [
    {
      version: 2,
      estado: 'Vigente',
      claseCambio: 'Menor',
      cambioResumen: 'Descuento 5% comercial',
      fechaEmision: '2026-11-12T15:30:00Z',
      emitidaPorUsuarioId: 3,
      emitidaPorNombre: 'Ana',
      medioEnvio: 'DocumentoControlado',
      clienteReceptor: 'Ing. López',
      total: 14250,
      moneda: 'MXN',
    },
    {
      version: 1,
      estado: 'Sustituida',
      claseCambio: 'Inicial',
      cambioResumen: null,
      fechaEmision: '2026-11-10T10:00:00Z',
      emitidaPorUsuarioId: 3,
      emitidaPorNombre: 'Ana',
      medioEnvio: 'Correo',
      clienteReceptor: 'Ing. López',
      total: 15000,
      moneda: 'MXN',
    },
  ];

  const archivosDelApi: CotizacionArchivoDto[] = [
    {
      id: 2,
      cotizacionProductosId: 55,
      version: 2,
      nombreOriginal: 'Cotizacion_v2_corregida.pdf',
      rutaArchivo: 'cotizaciones/55/Cotizacion_v2.pdf',
      tamanoBytes: 204800,
      extension: '.pdf',
      comentario: 'Se corrigió precio y tiempo de entrega',
      subidoPorUsuarioId: 3,
      subidoPorNombre: 'Ana García',
      fechaSubida: '2026-11-27T10:00:00Z',
      esVigente: true,
    },
    {
      id: 1,
      cotizacionProductosId: 55,
      version: 1,
      nombreOriginal: 'Cotizacion_v1_inicial.pdf',
      rutaArchivo: 'cotizaciones/55/Cotizacion_v1.pdf',
      tamanoBytes: 102400,
      extension: '.pdf',
      comentario: 'Versión inicial emitida',
      subidoPorUsuarioId: 3,
      subidoPorNombre: 'Ana García',
      fechaSubida: '2026-11-20T10:00:00Z',
      esVigente: false,
    },
  ];

  beforeEach(async () => {
    mockQuotesService = {
      versiones: jasmine.createSpy('versiones').and.returnValue(of(versionesDelApi)),
      version: jasmine.createSpy('version').and.returnValue(
        of({
          ...versionesDelApi[0],
          instantanea: { folio: 'COT-2026-0001', version: 2, cabecera: {}, sgc: {}, partidas: [], totales: { total: 14250 } },
        })
      ),
      getArchivos: jasmine.createSpy('getArchivos').and.returnValue(of([])),
      subirArchivo: jasmine.createSpy('subirArchivo').and.returnValue(of({ id: 10, version: 3, esVigente: true })),
      descargarArchivo: jasmine.createSpy('descargarArchivo').and.returnValue(of(new Blob(['test content'], { type: 'application/pdf' }))),
    };

    mockDialog = {
      open: jasmine.createSpy('open').and.returnValue({
        afterClosed: () => of({ guardado: true }),
      }),
    };

    await TestBed.configureTestingModule({
      imports: [VersionesSgcComponent, NoopAnimationsModule],
      providers: [
        { provide: QuotesService, useValue: mockQuotesService },
        { provide: MatDialog, useValue: mockDialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VersionesSgcComponent);
    component = fixture.componentInstance;
    component.cotizacionId = 55;
    component.versionActual = 2;
    component.etapa = 'Emitida';
    component.acciones = {
      editar: false,
      enviarRevision: false,
      volverBorrador: false,
      revisar: [],
      emitir: false,
      nuevaVersion: true,
    };
    fixture.detectChanges();
  });

  it('La_tabla_de_versiones_destaca_la_vigente_segun_el_estado_del_API', () => {
    const filas = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(filas.length).toBe(2);

    const filaV2 = filas[0];
    const filaV1 = filas[1];

    expect(filaV2.classList.contains('version-vigente')).toBeTrue();
    expect(filaV1.classList.contains('version-vigente')).toBeFalse();
    expect(filaV2.querySelector('.badge-vigente').textContent.trim()).toBe('Vigente');
    expect(filaV1.querySelector('.badge-vigente')).toBeNull();
    expect(filaV1.textContent).toContain('Sustituida');
  });

  it('La_vigente_es_la_que_dice_el_API_aunque_la_version_en_pantalla_sea_un_borrador_nuevo', () => {
    // Se creó la v3 como borrador: la v2 sigue vigente hasta que se emita la v3
    component.versionActual = 3;
    component.etapa = 'Borrador';
    fixture.detectChanges();

    const filas = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(filas[0].classList.contains('version-vigente')).toBeTrue();
    expect(fixture.nativeElement.querySelectorAll('.badge-vigente').length).toBe(1);
  });

  it('Muestra_el_resumen_del_cambio_y_el_medio_con_su_nombre', () => {
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Descuento 5% comercial');
    expect(texto).toContain('Documento controlado');
    expect(texto).not.toContain('DocumentoControlado');
    expect(texto).toContain('Ing. López');
  });

  it('Ver_PDF_abre_el_dialogo_con_el_detalle_de_esa_version', () => {
    const botonesVerPdf = fixture.nativeElement.querySelectorAll('.btn-ver-pdf');
    expect(botonesVerPdf.length).toBe(2);

    botonesVerPdf[0].click();

    expect(mockQuotesService.version).toHaveBeenCalledWith(55, 2);
    expect(mockDialog.open).toHaveBeenCalledWith(
      QuotePdfDialogComponent,
      jasmine.objectContaining({
        data: jasmine.objectContaining({
          version: 2,
          instantanea: jasmine.objectContaining({
            version: 2,
            instantanea: jasmine.objectContaining({ folio: 'COT-2026-0001' }),
          }),
        }),
      })
    );
  });

  it('Si_falla_la_lectura_de_la_version_avisa_al_usuario', () => {
    const swal = spyOn(Swal, 'fire').and.returnValue(Promise.resolve({} as any));
    mockQuotesService.version.and.returnValue(throwError(() => ({ status: 404, error: { mensaje: 'Versión no encontrada.' } })));

    fixture.nativeElement.querySelectorAll('.btn-ver-pdf')[1].click();

    expect(swal).toHaveBeenCalledWith(jasmine.objectContaining({ icon: 'error', text: 'Versión no encontrada.' }));
    expect(component.cargandoPdf).toBeFalse();
  });

  it('Al_emitir_o_crear_una_version_la_lista_se_vuelve_a_pedir_una_sola_vez', () => {
    mockQuotesService.versiones.calls.reset();

    // El padre recarga la cotización: cambian la etapa y la versión en el mismo ciclo
    component.etapa = 'Borrador';
    component.versionActual = 3;
    component.ngOnChanges({
      etapa: new SimpleChange('Emitida', 'Borrador', false),
      versionActual: new SimpleChange(2, 3, false),
    });

    expect(mockQuotesService.versiones).toHaveBeenCalledTimes(1);
  });

  it('Despues_de_Nueva_version_avisa_al_padre_y_no_pide_la_lista_por_su_cuenta', () => {
    const recargar = jasmine.createSpy('recargar');
    component.recargar.subscribe(recargar);
    mockQuotesService.versiones.calls.reset();

    component.abrirNuevaVersion();

    expect(recargar).toHaveBeenCalledTimes(1);
    expect(mockQuotesService.versiones).not.toHaveBeenCalled();
  });

  it('Los_textos_del_API_se_muestran_escapados', () => {
    const xss = '<img src=x onerror=alert(1)>';
    component.versiones = [
      { ...versionesDelApi[0], cambioResumen: xss, clienteReceptor: 'Receptor <script>alert(1)</script>' },
    ];
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img[src="x"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('script')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(xss);
  });

  it('Subir_archivo_corregido_manda_archivo_y_comentario', () => {
    const dummyFile = new File(['dummy content'], 'cotizacion_v3.pdf', { type: 'application/pdf' });
    component.archivoSeleccionado = dummyFile;
    component.comentarioArchivoControl.setValue('Se actualizó costo indirecto y margen');
    fixture.detectChanges();

    const btnSubir = fixture.nativeElement.querySelector('.btn-subir-archivo');
    expect(btnSubir.disabled).toBeFalse();
    btnSubir.click();

    expect(mockQuotesService.subirArchivo).toHaveBeenCalledWith(
      55,
      dummyFile,
      'Se actualizó costo indirecto y margen'
    );
  });

  it('Historial_con_vigente_en_la_mas_reciente', () => {
    component.archivos = archivosDelApi;
    fixture.detectChanges();

    const filas = fixture.nativeElement.querySelectorAll('.fila-archivo');
    expect(filas.length).toBe(2);

    // Primera fila (v2) es vigente
    const filaV2 = filas[0];
    const badgeV2 = filaV2.querySelector('.badge-vigente-archivo');
    expect(badgeV2).not.toBeNull();
    expect(badgeV2.textContent.trim()).toBe('Vigente');
    expect(filaV2.textContent).toContain('Cotizacion_v2_corregida.pdf');
    expect(filaV2.textContent).toContain('Se corrigió precio y tiempo de entrega');
    expect(filaV2.textContent).toContain('Ana García');
    expect(filaV2.textContent).toContain('200 KB');

    // Segunda fila (v1) no es vigente
    const filaV1 = filas[1];
    expect(filaV1.querySelector('.badge-vigente-archivo')).toBeNull();
  });

  it('Descargar_usa_blob_con_sesion', () => {
    component.archivos = archivosDelApi;
    fixture.detectChanges();

    const btnDescargar = fixture.nativeElement.querySelector('.btn-descargar-archivo');
    expect(btnDescargar).not.toBeNull();

    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:dummy');
    spyOn(window.URL, 'revokeObjectURL');

    btnDescargar.click();

    expect(mockQuotesService.descargarArchivo).toHaveBeenCalledWith(55, 2);
  });

  it('Comentario_corto_no_deja_subir', () => {
    component.archivoSeleccionado = new File(['dummy'], 'archivo.pdf');
    component.comentarioArchivoControl.setValue('corto'); // 5 caracteres < 10
    fixture.detectChanges();

    const btnSubir = fixture.nativeElement.querySelector('.btn-subir-archivo');
    expect(btnSubir.disabled).toBeTrue();

    component.subirArchivoCorregido();
    expect(mockQuotesService.subirArchivo).not.toHaveBeenCalled();
  });
});
