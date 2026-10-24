import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CotizacionEtapasService } from './cotizacion-etapas.service';
import { environment } from 'environments/environment';
import { CrearCasoDto, GuardarEtapaDto, CambiarEstatusDto } from './cotizacion-etapas.models';

describe('CotizacionEtapasService', () => {
    let service: CotizacionEtapasService;
    let httpMock: HttpTestingController;
    const baseUrl = `${environment.apiUrl}/CotizacionEtapas`;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [CotizacionEtapasService]
        });
        service = TestBed.inject(CotizacionEtapasService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('listar() debe llamar GET con parametros etapa e incluirProcesados', () => {
        service.listar(2, true).subscribe();
        const req = httpMock.expectOne(`${baseUrl}?etapa=2&incluirProcesados=true`);
        expect(req.request.method).toBe('GET');
        req.flush([]);
    });

    it('obtener() debe llamar GET con el id', () => {
        service.obtener(42).subscribe();
        const req = httpMock.expectOne(`${baseUrl}/42`);
        expect(req.request.method).toBe('GET');
        req.flush({});
    });

    it('crear() debe llamar POST con el payload', () => {
        const dto: CrearCasoDto = {
            idSolicitante: 1,
            tipo: 'PROYECTO',
            titulo: 'Prueba',
            descripcion: 'Actividad',
            esAliado: false
        };
        service.crear(dto).subscribe();
        const req = httpMock.expectOne(baseUrl);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(dto);
        req.flush({});
    });

    it('guardar() debe llamar PUT a la etapa indicada', () => {
        const dto: GuardarEtapaDto = {
            observacionesInformacion: 'Nota prueba'
        };
        service.guardar(10, 3, dto).subscribe();
        const req = httpMock.expectOne(`${baseUrl}/10/etapas/3`);
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual(dto);
        req.flush({});
    });

    it('cambiarEstatus() debe llamar POST estatus con payload', () => {
        const dto: CambiarEstatusDto = {
            estatus: 3,
            etapaSiguiente: 4
        };
        service.cambiarEstatus(7, 3, dto).subscribe();
        const req = httpMock.expectOne(`${baseUrl}/7/etapas/3/estatus`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(dto);
        req.flush({});
    });

    it('iniciarRevision() debe llamar POST revisiones', () => {
        service.iniciarRevision(5, 2).subscribe();
        const req = httpMock.expectOne(`${baseUrl}/5/etapas/2/revisiones`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({});
        req.flush({});
    });

    it('reactivar() debe llamar POST reactivar', () => {
        service.reactivar(8).subscribe();
        const req = httpMock.expectOne(`${baseUrl}/8/reactivar`);
        expect(req.request.method).toBe('POST');
        req.flush({});
    });

    it('eliminar() debe llamar DELETE sobre el caso', () => {
        service.eliminar(8).subscribe();
        const req = httpMock.expectOne(`${baseUrl}/8`);
        expect(req.request.method).toBe('DELETE');
        req.flush({ success: true });
    });

    it('cancelar() debe llamar POST cancelar con el motivo', () => {
        service.cancelar(8, 'Cliente declino').subscribe();
        const req = httpMock.expectOne(`${baseUrl}/8/cancelar`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ motivo: 'Cliente declino' });
        req.flush({});
    });

    it('archivos() debe llamar GET a la revision', () => {
        service.archivos(5, 2, 1).subscribe();
        const req = httpMock.expectOne(`${baseUrl}/5/etapas/2/revisiones/1/archivos`);
        expect(req.request.method).toBe('GET');
        req.flush([]);
    });

    it('subirArchivos() debe enviar FormData con clave archivos', () => {
        const blob = new Blob(['contenido'], { type: 'text/plain' });
        const file = new File([blob], 'prueba.txt', { type: 'text/plain' });

        service.subirArchivos(5, 2, 1, [file]).subscribe();
        const req = httpMock.expectOne(`${baseUrl}/5/etapas/2/revisiones/1/archivos`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body instanceof FormData).toBeTrue();
        expect(req.request.body.has('archivos')).toBeTrue();
        req.flush({ success: true });
    });

    it('descargarArchivo() debe llamar GET con responseType blob', () => {
        service.descargarArchivo(5, 2, 1, 'plano con espacios.pdf').subscribe();
        const req = httpMock.expectOne(`${baseUrl}/5/etapas/2/revisiones/1/archivos/plano%20con%20espacios.pdf`);
        expect(req.request.method).toBe('GET');
        expect(req.request.responseType).toBe('blob');
        req.flush(new Blob());
    });

    it('eliminarArchivo() debe llamar DELETE con el nombre codificado', () => {
        service.eliminarArchivo(5, 2, 1, 'plano #1.pdf').subscribe();
        const req = httpMock.expectOne(`${baseUrl}/5/etapas/2/revisiones/1/archivos/plano%20%231.pdf`);
        expect(req.request.method).toBe('DELETE');
        req.flush({ success: true });
    });
});
