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

