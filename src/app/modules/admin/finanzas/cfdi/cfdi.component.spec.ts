import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from 'environments/environment';
import { Cfdi, Empresa, ResultadoImportacion } from '../finanzas.types';
import { CfdiComponent } from './cfdi.component';

describe('CfdiComponent', () => {
    const base = `${environment.apiUrl}/Finanzas`;
    const empresa: Empresa = { empresaId: 3, rfc: 'AAA010101AAA', nombre: 'Empresa Ficticia', tipo: 'M', activa: true };
    let fixture: ComponentFixture<CfdiComponent>;
    let componente: CfdiComponent;
    let httpMock: HttpTestingController;

    const cfdi: Cfdi = {
        cfdiId: 1,
        uuid: '00000000-0000-0000-0000-000000000001',
        direccion: 'Emitido',
        tipoComprobante: 'I',
        serie: 'A',
        folio: '10',
        fechaEmision: '2026-01-05T10:20:30',
        rfcEmisor: 'AAA010101AAA',
        nombreEmisor: 'Empresa Ficticia',
        rfcReceptor: 'BBB020202BB2',
        nombreReceptor: 'Cliente Ficticio',
        metodoPago: 'PUE',
        formaPago: '03',
        moneda: 'MXN',
        tipoCambio: null,
        total: 1234.56,
        estado: 'Vigente',
        revisar: false
    };

    const resultado = (parcial: Partial<ResultadoImportacion>): ResultadoImportacion => ({
        importacionId: null,
        empresaId: 3,
        cuentaId: null,
        nombreArchivo: 'ficticio.xlsx',
        hoja: 'Datos Cfdis',
        filasLeidas: 3,
        nuevos: 2,
        actualizados: 0,
        sinCambios: 0,
        rechazados: [{ fila: 4, motivo: 'Tipo no válido: X' }],
        advertencias: ['Columna «Folio» no encontrada'],
        periodoDesde: '2026-01-05T00:00:00',
        periodoHasta: '2026-01-31T00:00:00',
        soloValidar: true,
        primerSaldo: null,
        ultimoSaldo: null,
        ultimoSaldoGuardado: null,
        ...parcial
    });

    const vacia = { pagina: 1, tamano: 10, total: 0, items: [] };

    /** Elige la empresa y contesta las dos cargas que eso dispara (lista de CFDI e historial). */
    function elegirEmpresa(): void {
        componente.elegirEmpresa(3);
        fixture.detectChanges();
        const lista = httpMock.expectOne((r) => r.url === `${base}/cfdi`);
        expect(lista.request.params.get('empresaId')).toBe('3');
        expect(lista.request.params.get('pagina')).toBe('1');
        expect(lista.request.params.get('tamano')).toBe('50');
        lista.flush({ pagina: 1, tamano: 50, total: 1, items: [cfdi] });
        httpMock.expectOne((r) => r.url === `${base}/importaciones`).flush(vacia);
        fixture.detectChanges();
    }

    function elegirArchivo(): void {
        const archivo = new File(['x'], 'ficticio.xlsx');
        componente.alElegirArchivo({ target: { files: [archivo], value: '' } } as unknown as Event);
        httpMock.expectOne(`${base}/importaciones/hojas`).flush([
            { nombre: 'Resumen', filas: 3, formatoDetectado: 'Desconocido' },
            { nombre: 'Datos Cfdis', filas: 10, formatoDetectado: 'CFDI' }
        ]);
    }

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [provideNoopAnimations()] });
        httpMock = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(CfdiComponent);
        componente = fixture.componentInstance;
        fixture.detectChanges();
        httpMock.expectOne(`${base}/empresas`).flush([empresa]);
        fixture.detectChanges();
    });

    afterEach(() => httpMock.verify());

    it('sin empresa elegida pide elegir una y no consulta CFDI', () => {
        expect(fixture.nativeElement.textContent).toContain('Elige una empresa');
    });

    it('al elegir la empresa muestra los CFDI con importes en pesos y fechas dd/MM/yyyy', () => {
        elegirEmpresa();

        const texto: string = fixture.nativeElement.textContent;
        expect(texto).toContain('$1,234.56');
        expect(texto).toContain('05/01/2026');
        expect(texto).toContain('Cliente Ficticio');
    });

    it('con varias hojas preselecciona la primera con formato CFDI y «Validar» manda soloValidar sin refrescar nada', () => {
        elegirEmpresa();
        elegirArchivo();
        expect(componente.hoja()).toBe('Datos Cfdis');

        componente.ejecutar(true);
        const req = httpMock.expectOne(`${base}/cfdi/importar`);
        const cuerpo = req.request.body as FormData;
        expect(cuerpo.get('soloValidar')).toBe('true');
        expect(cuerpo.get('hoja')).toBe('Datos Cfdis');
        expect(cuerpo.get('empresaId')).toBe('3');
        req.flush(resultado({ soloValidar: true }));
        fixture.detectChanges();

        const texto: string = fixture.nativeElement.textContent;
        expect(texto).toContain('no se guardó nada');
        expect(texto).toContain('2 nuevos · 0 actualizados · 0 sin cambios · 1 rechazados');
        expect(texto).toContain('Columna «Folio» no encontrada');
        expect(texto).toContain('Tipo no válido: X');
        // httpMock.verify() (afterEach) falla si «Validar» hubiera pedido la lista o el historial.
    });

    it('«Importar» de verdad refresca la lista y el historial', () => {
        elegirEmpresa();
        elegirArchivo();

        componente.ejecutar(false);
        const req = httpMock.expectOne(`${base}/cfdi/importar`);
        expect((req.request.body as FormData).get('soloValidar')).toBe('false');
        req.flush(resultado({ soloValidar: false, importacionId: 9 }));

        httpMock.expectOne((r) => r.url === `${base}/cfdi`).flush({ pagina: 1, tamano: 50, total: 1, items: [cfdi] });
        httpMock.expectOne((r) => r.url === `${base}/importaciones`).flush(vacia);
    });

    it('un 413 sin cuerpo da el texto de tamaño máximo con «Reintentar»', () => {
        elegirEmpresa();
        elegirArchivo();

        componente.ejecutar(true);
        httpMock.expectOne(`${base}/cfdi/importar`).flush(null, { status: 413, statusText: 'Payload Too Large' });
        fixture.detectChanges();

        const texto: string = fixture.nativeElement.textContent;
        expect(texto).toContain('El archivo es demasiado grande (máximo 10 MB).');
        expect(texto).toContain('Reintentar');
    });
});
