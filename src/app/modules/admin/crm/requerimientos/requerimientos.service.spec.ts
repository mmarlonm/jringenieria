import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RequerimientosService } from './requerimientos.service';
import { environment } from 'environments/environment';

describe('RequerimientosService - Aprobación', () => {
  let service: RequerimientosService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RequerimientosService]
    });
    service = TestBed.inject(RequerimientosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('El_servicio_aprobar_hace_POST_a_aprobar', () => {
    service.aprobarRequerimiento(8).subscribe(res => {
      expect(res.idSeguimiento).toBe(42);
      expect(res.folio).toBe('#42');
      expect(res.estatus).toBe('Aprobado para cotización');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/Requerimiento/8/aprobar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ idSeguimiento: 42, folio: '#42', estatus: 'Aprobado para cotización' });
  });

  it('El_servicio_aprobar_manda_el_tipo_y_el_titulo_capturados_al_aprobar', () => {
    service.aprobarRequerimiento(8, { tipoProyecto: 'Instalación', titulo: 'Modernización de subestación' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/Requerimiento/8/aprobar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ tipoProyecto: 'Instalación', titulo: 'Modernización de subestación' });
    req.flush({ idSeguimiento: 42, folio: '#42', estatus: 'Aprobado para cotización' });
  });

  it('convertirACotizacion_hace_POST_solo_con_requerimiento_tipo_y_unidad', () => {
    service.convertirACotizacion({ requerimientoId: 57, tipo: 'CT', unidadDeNegocioId: 2 }).subscribe(r => {
      expect(r.folioSgc).toBe('COT-2026-0042');
      expect(r.etapa).toBe('Borrador');
      expect((r as any).folioContpaq).toBeUndefined();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/CotizacionProductos/convertir-desde-requerimiento`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ requerimientoId: 57, tipo: 'CT', unidadDeNegocioId: 2 });
    req.flush({
      cotizacionProductosId: 311, folioSgc: 'COT-2026-0042', tipo: 'CT', etapa: 'Borrador',
      requerimientoId: 57, requerimientoFolio: 'REQ-2026-0057'
    });
  });

  it('El_servicio_ya_no_busca_folios_de_CONTPAQ', () => {
    expect((service as any).buscarFolioContpaq).toBeUndefined();
  });

  it('getRequerimiento_conserva_cotizacionVinculada_y_acepta_null', () => {
    service.getRequerimiento(57).subscribe(r => {
      expect(r.cotizacionVinculada?.folioSgc).toBe('COT-2026-0042');
    });
    httpMock.expectOne(`${environment.apiUrl}/Requerimiento/57`).flush({
      id: 57, folio: 'REQ-2026-0057',
      cotizacionVinculada: { cotizacionProductosId: 311, folioSgc: 'COT-2026-0042', folioContpaq: null, tipo: 'CT', etapa: 'Borrador' }
    });

    service.getRequerimiento(58).subscribe(r => expect(r.cotizacionVinculada).toBeNull());
    httpMock.expectOne(`${environment.apiUrl}/Requerimiento/58`).flush({ id: 58, folio: 'REQ-2026-0058', cotizacionVinculada: null });
  });

  // El API exige sesión: una navegación directa a la URL (<a href>, window.open) no lleva el token y da 401.
  it('Descargar_un_archivo_lo_pide_como_blob_por_HttpClient_para_llevar_la_sesion', () => {
    let recibido: Blob | null = null;
    service.descargarArchivo(8, 5).subscribe(b => (recibido = b));

    const req = httpMock.expectOne(`${environment.apiUrl}/Requerimiento/8/archivos/5/descargar`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['contenido']));

    expect(recibido).not.toBeNull();
  });
});

