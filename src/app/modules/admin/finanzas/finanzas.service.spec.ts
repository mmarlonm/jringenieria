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
    it('movimientosConciliacion envía el filtro como query string y omite null, undefined y vacío', () => {
        service.movimientosConciliacion({ empresaId: 1, cuentaId: null, desde: '2026-01-01', hasta: '2026-01-31', estado: '', q: '', pagina: 2, tamano: 50 }).subscribe();

        const req = httpMock.expectOne((r) => r.url === `${base}/conciliacion/movimientos`);
        expect(req.request.method).toBe('GET');
        expect(req.request.params.keys().sort()).toEqual(['desde', 'empresaId', 'hasta', 'pagina', 'tamano']);
        expect(req.request.params.get('empresaId')).toBe('1');
        expect(req.request.params.get('pagina')).toBe('2');
        expect(req.request.params.get('tamano')).toBe('50');
        req.flush({ pagina: 2, tamano: 50, total: 0, items: [] });
    });

    it('resumenConciliacion manda empresaId, desde y hasta sin cuentaId cuando es null, y con cuentaId si viene', () => {
        service.resumenConciliacion(1, null, '2026-01-01', '2026-01-31').subscribe();
        const reqSinCuenta = httpMock.expectOne((r) => r.url === `${base}/conciliacion/resumen`);
        expect(reqSinCuenta.request.method).toBe('GET');
        expect(reqSinCuenta.request.params.keys().sort()).toEqual(['desde', 'empresaId', 'hasta']);
        reqSinCuenta.flush({});

        service.resumenConciliacion(1, 7, '2026-01-01', '2026-01-31').subscribe();
        const reqConCuenta = httpMock.expectOne((r) => r.url === `${base}/conciliacion/resumen`);
        expect(reqConCuenta.request.params.keys().sort()).toEqual(['cuentaId', 'desde', 'empresaId', 'hasta']);
        expect(reqConCuenta.request.params.get('cuentaId')).toBe('7');
        reqConCuenta.flush({});
    });

    it('candidatosCfdi manda movimientoId y omite q cuando está vacío', () => {
        service.candidatosCfdi(9, '').subscribe();
        const reqVacio = httpMock.expectOne((r) => r.url === `${base}/conciliacion/cfdi-candidatos`);
        expect(reqVacio.request.method).toBe('GET');
        expect(reqVacio.request.params.keys()).toEqual(['movimientoId']);
        expect(reqVacio.request.params.get('movimientoId')).toBe('9');
        reqVacio.flush([]);

        service.candidatosCfdi(9, 'F-100').subscribe();
        const reqConQ = httpMock.expectOne((r) => r.url === `${base}/conciliacion/cfdi-candidatos`);
        expect(reqConQ.request.params.keys().sort()).toEqual(['movimientoId', 'q']);
        expect(reqConQ.request.params.get('q')).toBe('F-100');
        reqConQ.flush([]);
    });

    it('clasesSugeridas manda empresaId, desde y hasta y omite cuentaId cuando es null', () => {
        service.clasesSugeridas({ empresaId: 3, cuentaId: null, desde: '2026-01-01', hasta: '2026-01-31' }).subscribe();
        const req = httpMock.expectOne((r) => r.url === `${base}/conciliacion/clases-sugeridas`);
        expect(req.request.method).toBe('GET');
        expect(req.request.params.keys().sort()).toEqual(['desde', 'empresaId', 'hasta']);
        req.flush([]);
    });

    it('sugerirConciliaciones hace POST a conciliacion/sugerir con el cuerpo dto', () => {
        const dto = { empresaId: 2, desde: '2026-01-01', hasta: '2026-01-31', cuentaId: 5 };
        service.sugerirConciliaciones(dto).subscribe();
        const req = httpMock.expectOne(`${base}/conciliacion/sugerir`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(dto);
        req.flush({ movimientosAnalizados: 10, sugerenciasNuevas: 2, cfdiConsiderados: 5 });
    });

    it('confirmarVinculo, rechazarVinculo y deshacerVinculo hacen POST con cuerpo null', () => {
        service.confirmarVinculo(7).subscribe();
        const conf = httpMock.expectOne(`${base}/conciliacion/7/confirmar`);
        expect(conf.request.method).toBe('POST');
        expect(conf.request.body).toBeNull();
        conf.flush({});

        service.rechazarVinculo(8).subscribe();
        const rech = httpMock.expectOne(`${base}/conciliacion/8/rechazar`);
        expect(rech.request.method).toBe('POST');
        expect(rech.request.body).toBeNull();
        rech.flush(null);

        service.deshacerVinculo(9).subscribe();
        const desh = httpMock.expectOne(`${base}/conciliacion/9/deshacer`);
        expect(desh.request.method).toBe('POST');
        expect(desh.request.body).toBeNull();
        desh.flush(null);
    });

    it('confirmarLote hace POST a conciliacion/confirmar-lote con ids', () => {
        service.confirmarLote([4, 5]).subscribe();
        const req = httpMock.expectOne(`${base}/conciliacion/confirmar-lote`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ ids: [4, 5] });
        req.flush({ confirmadas: [4, 5], fallidas: [] });
    });

    it('conciliarManual hace POST a conciliacion/manual con el dto', () => {
        const dto = { movimientoId: 10, cfdiId: 20, importeAplicado: 1500.5 };
        service.conciliarManual(dto).subscribe();
        const req = httpMock.expectOne(`${base}/conciliacion/manual`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(dto);
        req.flush({});
    });

    it('clasificar hace POST a movimientos/clasificar con el dto', () => {
        const dto = { movimientoIds: [1, 2], clase: null };
        service.clasificar(dto).subscribe();
        const req = httpMock.expectOne(`${base}/movimientos/clasificar`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(dto);
        req.flush({ clasificados: 2 });
    });

    it('vistaPreviaDespacho, historialDespacho y generarDespacho apuntan a las rutas del controlador', () => {
        service.vistaPreviaDespacho(1, 2026, 10).subscribe();
        const vp = httpMock.expectOne((r) => r.url === `${base}/despacho/vista-previa`);
        expect(vp.request.method).toBe('GET');
        expect(vp.request.params.get('empresaId')).toBe('1');
        expect(vp.request.params.get('anio')).toBe('2026');
        expect(vp.request.params.get('mes')).toBe('10');
        vp.flush({ empresaId: 1, anio: 2026, mes: 10, cfdiEmitidos: 0, cfdiRecibidos: 0, movimientos: 0, movimientosPendientes: 0, cfdiPendientes: 0, cfdiSinDatosOriginales: 0, cuentas: [] });

        service.historialDespacho(1, 2, 20).subscribe();
        const hist = httpMock.expectOne((r) => r.url === `${base}/despacho/historial`);
        expect(hist.request.method).toBe('GET');
        expect(hist.request.params.get('empresaId')).toBe('1');
        expect(hist.request.params.get('pagina')).toBe('2');
        expect(hist.request.params.get('tamano')).toBe('20');
        hist.flush({ pagina: 2, tamano: 20, total: 0, items: [] });

        const blob = new Blob(['test']);
        service.generarDespacho({ empresaId: 1, anio: 2026, mes: 10 }).subscribe();
        const gen = httpMock.expectOne(`${base}/despacho/generar`);
        expect(gen.request.method).toBe('POST');
        expect(gen.request.body).toEqual({ empresaId: 1, anio: 2026, mes: 10 });
        expect(gen.request.responseType).toBe('blob');
        gen.flush(blob);
    });
});
