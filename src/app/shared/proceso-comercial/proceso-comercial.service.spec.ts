import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from 'environments/environment';
import { ProcesoComercialService } from './proceso-comercial.service';
import { ProcesoComercial } from './proceso-comercial.types';

describe('ProcesoComercialService', () => {
  let servicio: ProcesoComercialService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    servicio = TestBed.inject(ProcesoComercialService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pide el proceso por tipo e id a la ruta ProcesoComercial', () => {
    const respuesta: ProcesoComercial = { actual: 'lead', mensaje: 'Lead nuevo', pasos: [] };
    let resultado: ProcesoComercial | undefined;

    servicio.obtener('requerimiento', 7).subscribe(p => (resultado = p));

    const req = http.expectOne(`${environment.apiUrl}/ProcesoComercial/requerimiento/7`);
    expect(req.request.method).toBe('GET');
    req.flush(respuesta);
    expect(resultado).toEqual(respuesta);
  });

  it('acepta los cuatro tipos', () => {
    for (const tipo of ['lead', 'requerimiento', 'caso', 'cotizacion'] as const) {
      servicio.obtener(tipo, 1).subscribe();
      const req = http.expectOne(`${environment.apiUrl}/ProcesoComercial/${tipo}/1`);
      expect(req.request.method).toBe('GET');
      req.flush({ actual: 'lead', mensaje: '', pasos: [] });
    }
  });
});
