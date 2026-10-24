import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from 'environments/environment';
import { FinanzasService } from './finanzas.service';

describe('FinanzasService', () => {
    let service: FinanzasService;
    let httpMock: HttpTestingController;
    const base = `${environment.apiUrl}/Finanzas`;
    const archivo = new File(['x'], 'ficticio.xlsx');

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
        service = TestBed.inject(FinanzasService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('listarCfdi envía el filtro como query string y omite null, undefined y vacío', () => {
        service.listarCfdi({ empresaId: 2, direccion: 'Emitido', estado: null, q: '', desde: '2026-01-01', pagina: 1 }).subscribe();

        const req = httpMock.expectOne((r) => r.url === `${base}/cfdi`);
        expect(req.request.method).toBe('GET');
        expect(req.request.params.keys().sort()).toEqual(['desde', 'direccion', 'empresaId', 'pagina']);
        expect(req.request.params.get('empresaId')).toBe('2');
        req.flush({});
    });

    it('cuentas sin empresa no manda parámetros', () => {
        service.cuentas().subscribe();

        const req = httpMock.expectOne((r) => r.url === `${base}/cuentas`);
        expect(req.request.params.keys()).toEqual([]);
        req.flush([]);
    });

    it('importarCfdi manda multipart con archivo, empresaId, hoja y soloValidar', () => {
        service.importarCfdi(3, archivo, 'Hoja1', true).subscribe();

        const req = httpMock.expectOne(`${base}/cfdi/importar`);
        const datos = req.request.body as FormData;
        expect(req.request.method).toBe('POST');
        expect((datos.get('archivo') as File).name).toBe('ficticio.xlsx');
        expect(datos.get('empresaId')).toBe('3');
        expect(datos.get('hoja')).toBe('Hoja1');
        expect(datos.get('soloValidar')).toBe('true');
        req.flush({});
    });

    it('importarMovimientos usa cuentaId y no manda hoja cuando es null', () => {
        service.importarMovimientos(7, archivo, null, false).subscribe();

        const req = httpMock.expectOne(`${base}/movimientos/importar`);
        const datos = req.request.body as FormData;
        expect(datos.get('cuentaId')).toBe('7');
        expect(datos.has('empresaId')).toBeFalse();
        expect(datos.has('hoja')).toBeFalse();
        expect(datos.get('soloValidar')).toBe('false');
        req.flush({});
    });

    it('hojas y anularImportacion apuntan a las rutas del controlador', () => {
        service.hojas(archivo).subscribe();
        const hojas = httpMock.expectOne(`${base}/importaciones/hojas`);
        expect((hojas.request.body as FormData).has('archivo')).toBeTrue();
        hojas.flush([]);

        service.anularImportacion(9).subscribe();
        const anular = httpMock.expectOne(`${base}/importaciones/9/anular`);
        expect(anular.request.method).toBe('POST');
        anular.flush(null);
    });
});
