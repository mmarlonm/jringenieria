import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { of } from 'rxjs';
import { environment } from 'environments/environment';
import { Cuenta, Importacion } from '../../finanzas.types';
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

    // ignoreCancelled: la prueba de «destruir con la anulación en vuelo» cancela a propósito una petición.
    afterEach(() => httpMock.verify({ ignoreCancelled: true }));

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

    it('el historial de CFDI no tiene columna de cuenta', () => {
        httpMock.expectOne((r) => r.url === base).flush(respuesta(imp(1, false)));
        fixture.detectChanges();

        const encabezados = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('thead th')).map((th) => th.textContent?.trim());
        expect(encabezados).not.toContain('Cuenta');
    });

    it('anular confirma, llama al API una sola vez, recarga el historial y avisa al padre', () => {
        httpMock.expectOne((r) => r.url === base).flush(respuesta(imp(1, false)));
        const anulada = jasmine.createSpy('anulada');
        fixture.componentInstance.anulada.subscribe(anulada);

        fixture.componentInstance.anular(imp(1, false));

        expect(confirmacion.open).toHaveBeenCalledTimes(1);
        const post = httpMock.expectOne(`${base}/1/anular`); // expectOne: falla si hubiera más de una
        expect(post.request.method).toBe('POST');
        expect(fixture.componentInstance.anulando()).toBe(1);
        post.flush(null, { status: 204, statusText: 'No Content' });
        expect(fixture.componentInstance.anulando()).toBeNull();
        expect(anulada).toHaveBeenCalledTimes(1);
        httpMock.expectOne((r) => r.url === base).flush(respuesta(imp(1, true)));
    });

    it('el mensaje de la confirmación es fijo: no lleva el nombre del archivo (Fuse lo pinta como HTML)', () => {
        httpMock.expectOne((r) => r.url === base).flush(respuesta(imp(1, false)));
        const conMarcas = { ...imp(1, false), nombreArchivo: '<img src=x onerror=alert(1)>.xlsx' };

        fixture.componentInstance.anular(conMarcas);

        const mensaje: string = confirmacion.open.calls.mostRecent().args[0].message;
        expect(mensaje).not.toContain('<img');
        expect(mensaje).not.toContain('.xlsx');
        httpMock.expectOne(`${base}/1/anular`).flush(null, { status: 204, statusText: 'No Content' });
        httpMock.expectOne((r) => r.url === base).flush(respuesta());
    });

    it('si se cancela la confirmación no se llama al API, no se recarga y anulando sigue en null', () => {
        httpMock.expectOne((r) => r.url === base).flush(respuesta(imp(1, false)));
        confirmacion.open.and.returnValue({ afterClosed: () => of('cancelled') });
        const anulada = jasmine.createSpy('anulada');
        fixture.componentInstance.anulada.subscribe(anulada);

        fixture.componentInstance.anular(imp(1, false));

        expect(confirmacion.open).toHaveBeenCalledTimes(1);
        httpMock.expectNone(`${base}/1/anular`);
        expect(fixture.componentInstance.anulando()).toBeNull();
        expect(anulada).not.toHaveBeenCalled();
        httpMock.expectNone((r) => r.url === base); // tampoco recarga el historial
    });

    it('un segundo anular mientras hay uno en vuelo no hace nada', () => {
        httpMock.expectOne((r) => r.url === base).flush(respuesta(imp(1, false), imp(2, false)));

        fixture.componentInstance.anular(imp(1, false));
        const primero = httpMock.expectOne(`${base}/1/anular`);
        fixture.componentInstance.anular(imp(2, false));

        expect(confirmacion.open).toHaveBeenCalledTimes(1);
        httpMock.expectNone(`${base}/2/anular`);
        expect(fixture.componentInstance.anulando()).toBe(1);

        primero.flush(null, { status: 204, statusText: 'No Content' });
        httpMock.expectOne((r) => r.url === base).flush(respuesta(imp(1, true), imp(2, false)));
    });

    it('si el componente se destruye con la anulación en vuelo, la petición se cancela y no se recarga ni se avisa al padre', () => {
        httpMock.expectOne((r) => r.url === base).flush(respuesta(imp(1, false)));
        const anulada = jasmine.createSpy('anulada');
        fixture.componentInstance.anulada.subscribe(anulada);

        fixture.componentInstance.anular(imp(1, false));
        const post = httpMock.expectOne(`${base}/1/anular`);
        fixture.destroy();

        expect(post.cancelled).toBeTrue();
        expect(anulada).not.toHaveBeenCalled();
        httpMock.expectNone((r) => r.url === base); // no hubo recarga
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

describe('ImportacionesHistorialComponent (BbvaExcel)', () => {
    const base = `${environment.apiUrl}/Finanzas/importaciones`;
    const cuenta = (cuentaId: number, alias: string, terminacion: string, moneda = 'MXN'): Cuenta => ({
        cuentaId, empresaId: 3, banco: 'BBVA', alias, tipo: 'Cheques', moneda, terminacion, activa: true
    });
    const cuentas = [cuenta(5, 'Cheques principal', '1234'), cuenta(6, 'Tarjeta dólares', '56789', 'USD')];
    const nombres = new Map([[3, 'Empresa Ficticia']]);
    let fixture: ComponentFixture<ImportacionesHistorialComponent>;
    let httpMock: HttpTestingController;

    const imp = (importacionId: number, cuentaId: number | null): Importacion => ({
        importacionId,
        empresaId: 3,
        cuentaId,
        fuente: 'BbvaExcel',
        nombreArchivo: 'mismo-archivo.xlsx',
        hoja: 'Enero',
        usuarioId: 1,
        fecha: '2026-10-24T17:12:39',
        nuevos: 4,
        actualizados: 0,
        sinCambios: 1,
        rechazados: 0,
        anulada: false
    });

    /** Texto de la celda de la columna «Cuenta» de cada fila. */
    const celdasDeCuenta = (): (string | undefined)[] => {
        const encabezados = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('thead th')).map((th) => th.textContent?.trim());
        const columna = encabezados.indexOf('Cuenta');
        expect(columna).withContext('columna «Cuenta»').toBeGreaterThanOrEqual(0);
        return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('tbody tr')).map((tr) => tr.querySelectorAll('td')[columna].textContent?.trim());
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [provideNoopAnimations(), { provide: FuseConfirmationService, useValue: { open: jasmine.createSpy('open') } }]
        });
        httpMock = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(ImportacionesHistorialComponent);
        fixture.componentRef.setInput('fuente', 'BbvaExcel');
        fixture.componentRef.setInput('empresaId', 3);
        fixture.componentRef.setInput('cuentas', cuentas);
        fixture.componentRef.setInput('nombresEmpresa', nombres);
        fixture.detectChanges();
    });

    afterEach(() => httpMock.verify());

    it('el mismo archivo importado a dos cuentas se ve en dos filas con cuentas distintas', () => {
        httpMock.expectOne((r) => r.url === base).flush({ pagina: 1, tamano: 10, total: 2, items: [imp(2, 6), imp(1, 5)] });
        fixture.detectChanges();

        expect(celdasDeCuenta()).toEqual([
            'Empresa Ficticia · Tarjeta dólares ····56789 · USD',
            'Empresa Ficticia · Cheques principal ····1234 · MXN'
        ]);
    });

    it('una importación sin cuenta o con una cuenta que no se conoce muestra «—»', () => {
        httpMock.expectOne((r) => r.url === base).flush({ pagina: 1, tamano: 10, total: 2, items: [imp(2, null), imp(1, 99)] });
        fixture.detectChanges();

        expect(celdasDeCuenta()).toEqual(['—', '—']);
    });

    it('cambiar las cuentas o los nombres no recarga el historial, pero cambiar de empresa sí', () => {
        httpMock.expectOne((r) => r.url === base).flush({ pagina: 1, tamano: 10, total: 0, items: [] });

        fixture.componentRef.setInput('cuentas', [...cuentas, cuenta(7, 'Ahorro', '4321')]);
        fixture.componentRef.setInput('nombresEmpresa', new Map([[3, 'Empresa Ficticia'], [4, 'Otra']]));
        fixture.detectChanges();
        httpMock.expectNone((r) => r.url === base);

        fixture.componentRef.setInput('empresaId', 4);
        fixture.detectChanges();
        expect(httpMock.expectOne((r) => r.url === base).request.params.get('empresaId')).toBe('4');
    });
});
