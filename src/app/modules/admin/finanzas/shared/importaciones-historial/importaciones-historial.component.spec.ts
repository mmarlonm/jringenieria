import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { of } from 'rxjs';
import { environment } from 'environments/environment';
import { Importacion } from '../../finanzas.types';
import { ImportacionesHistorialComponent } from './importaciones-historial.component';

describe('ImportacionesHistorialComponent', () => {
    const base = `${environment.apiUrl}/Finanzas/importaciones`;
    let fixture: ComponentFixture<ImportacionesHistorialComponent>;
    let httpMock: HttpTestingController;
    let confirmacion: { open: jasmine.Spy };

    const imp = (importacionId: number, anulada: boolean): Importacion => ({
        importacionId,
        empresaId: 3,
        cuentaId: null,
        fuente: 'OneFacturaExcel',
        nombreArchivo: `ficticio-${importacionId}.xlsx`,
        hoja: null,
        usuarioId: 1,
        fecha: '2026-10-24T17:12:39',
        nuevos: 4,
        actualizados: 0,
        sinCambios: 1,
        rechazados: 0,
        anulada
    });

    const respuesta = (...items: Importacion[]) => ({ pagina: 1, tamano: 10, total: items.length, items });

    beforeEach(() => {
        confirmacion = { open: jasmine.createSpy('open').and.returnValue({ afterClosed: () => of('confirmed') }) };
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [provideNoopAnimations(), { provide: FuseConfirmationService, useValue: confirmacion }]
        });
        httpMock = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(ImportacionesHistorialComponent);
        fixture.componentRef.setInput('fuente', 'OneFacturaExcel');
        fixture.componentRef.setInput('empresaId', 3);
        fixture.detectChanges();
    });

    afterEach(() => httpMock.verify());

    it('pide la primera página de la fuente y la empresa, y ofrece «Anular» solo en las que no están anuladas', () => {
        const req = httpMock.expectOne((r) => r.url === base);
        expect(req.request.params.get('fuente')).toBe('OneFacturaExcel');
        expect(req.request.params.get('empresaId')).toBe('3');
        expect(req.request.params.get('pagina')).toBe('1');
        req.flush(respuesta(imp(1, false), imp(2, true)));
        fixture.detectChanges();

        const filas = fixture.nativeElement.querySelectorAll('tbody tr');
        expect(filas.length).toBe(2);
        expect(filas[0].textContent).toContain('Anular');
        expect(filas[1].textContent).toContain('Anulada');
        expect(filas[1].querySelector('button')).toBeNull();
    });

    it('anular confirma, llama al API y recarga el historial', () => {
        httpMock.expectOne((r) => r.url === base).flush(respuesta(imp(1, false)));
        const anulada = jasmine.createSpy('anulada');
        fixture.componentInstance.anulada.subscribe(anulada);

        fixture.componentInstance.anular(imp(1, false));

        expect(confirmacion.open).toHaveBeenCalled();
        const post = httpMock.expectOne(`${base}/1/anular`);
        expect(post.request.method).toBe('POST');
        post.flush(null, { status: 204, statusText: 'No Content' });
        expect(anulada).toHaveBeenCalled();
        httpMock.expectOne((r) => r.url === base).flush(respuesta(imp(1, true)));
    });

    it('si el API rechaza la anulación no recarga ni avisa al padre', () => {
        httpMock.expectOne((r) => r.url === base).flush(respuesta(imp(1, false)));
        const anulada = jasmine.createSpy('anulada');
        fixture.componentInstance.anulada.subscribe(anulada);

        fixture.componentInstance.anular(imp(1, false));
        httpMock.expectOne(`${base}/1/anular`).flush({ mensaje: 'Hay conciliaciones confirmadas.' }, { status: 409, statusText: 'Conflict' });

        expect(anulada).not.toHaveBeenCalled();
        expect(fixture.componentInstance.anulando()).toBeNull();
    });

    it('un error de carga muestra el mensaje del API y «Reintentar»', () => {
        httpMock.expectOne((r) => r.url === base).flush({ mensaje: 'No tienes acceso.' }, { status: 403, statusText: 'Forbidden' });
        fixture.detectChanges();

        const texto: string = fixture.nativeElement.textContent;
        expect(texto).toContain('No tienes acceso.');
        expect(texto).toContain('Reintentar');
    });
});
