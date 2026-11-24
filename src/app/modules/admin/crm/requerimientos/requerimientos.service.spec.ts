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

  it('buscarFolioContpaq_hace_GET_con_folio_y_sin_unidad_si_no_se_da', () => {
    service.buscarFolioContpaq('1234').subscribe(r => {
      expect(r.coincidencias.length).toBe(1);
      expect(r.coincidencias[0].cliente).toBe('Cliente Ficticio SA de CV');
    });

    const req = httpMock.expectOne(r => r.url === `${environment.apiUrl}/CotizacionProductos/contpaq/buscar-folio`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('folio')).toBe('1234');
    expect(req.request.params.has('unidadDeNegocioId')).toBeFalse();
    req.flush({
      folio: '1234',
      coincidencias: [{
        unidadDeNegocioId: 2, unidadDeNegocioNombre: 'Unidad Ficticia', idDocumento: 98765, serie: 'COT', folio: '1234',
        fecha: '2026-11-20T00:00:00', cliente: 'Cliente Ficticio SA de CV', rfc: 'XAXX010101000', total: 15234.5,
        cotizacionProductosId: null, yaVinculadaARequerimiento: false, requerimientoFolio: null
      }]
    });
  });

  it('buscarFolioContpaq_con_unidad_manda_unidadDeNegocioId', () => {
    service.buscarFolioContpaq('1234', 2).subscribe();

    const req = httpMock.expectOne(r => r.url === `${environment.apiUrl}/CotizacionProductos/contpaq/buscar-folio`);
    expect(req.request.params.get('unidadDeNegocioId')).toBe('2');
    req.flush({ folio: '1234', coincidencias: [] });
  });

  it('convertirACotizacion_hace_POST_con_requerimiento_folio_tipo_y_unidad', () => {
    service.convertirACotizacion({ requerimientoId: 57, folioContpaq: '1234', unidadDeNegocioId: 2, tipo: 'CT' }).subscribe(r => {
      expect(r.folioSgc).toBe('COT-2026-0042');
      expect(r.etapa).toBe('Borrador');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/CotizacionProductos/convertir-desde-requerimiento`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ requerimientoId: 57, folioContpaq: '1234', unidadDeNegocioId: 2, tipo: 'CT' });
    req.flush({
      cotizacionProductosId: 311, folioSgc: 'COT-2026-0042', tipo: 'CT', etapa: 'Borrador',
      folioContpaq: 'COT-1234', requerimientoId: 57, requerimientoFolio: 'REQ-2026-0057'
    });
  });

  it('getRequerimiento_conserva_cotizacionVinculada_y_acepta_null', () => {
    service.getRequerimiento(57).subscribe(r => {
      expect(r.cotizacionVinculada?.folioSgc).toBe('COT-2026-0042');
    });
    httpMock.expectOne(`${environment.apiUrl}/Requerimiento/57`).flush({
      id: 57, folio: 'REQ-2026-0057',
      cotizacionVinculada: { cotizacionProductosId: 311, folioSgc: 'COT-2026-0042', folioContpaq: 'COT-1234', tipo: 'CT', etapa: 'Borrador' }
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

