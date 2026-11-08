import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from 'environments/environment';
import { PersonalManagementService } from './personal-management.service';

describe('PersonalManagementService.registrarAsistencia', () => {
    let servicio: PersonalManagementService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
        servicio = TestBed.inject(PersonalManagementService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('marca desde el CRM con origen WEB para que el reporte lo distinga de la app móvil', () => {
        servicio.registrarAsistencia({ usuarioId: 7, tipo: 'ENTRADA' }).subscribe();

        const req = http.expectOne(`${environment.apiUrl}/RRHH/checador`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body.origen).toBe('WEB');
        req.flush({ success: true });
    });

    it('conserva usuario, tipo y ubicación que manda el checador', () => {
        servicio.registrarAsistencia({ usuarioId: 7, tipo: 'SALIDA', latitud: 20.5, longitud: -100.4, ubicacionNombre: 'Obra Norte' }).subscribe();

        const req = http.expectOne(`${environment.apiUrl}/RRHH/checador`);
        expect(req.request.body).toEqual({
            origen: 'WEB', usuarioId: 7, tipo: 'SALIDA', latitud: 20.5, longitud: -100.4, ubicacionNombre: 'Obra Norte',
        });
        req.flush({ success: true });
    });
});
