import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { of } from 'rxjs';
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

    describe('eliminar CFDI', () => {
        const confirmar = (resultado: 'confirmed' | 'cancelled') =>
            spyOn(TestBed.inject(FuseConfirmationService), 'open').and.returnValue({ afterClosed: () => of(resultado) } as never);
        const botonesEliminar = (): HTMLButtonElement[] => Array.from(fixture.nativeElement.querySelectorAll('button[aria-label="Eliminar CFDI"]'));

        it('cada fila trae su botón «Eliminar CFDI»', () => {
            elegirEmpresa();

            expect(botonesEliminar().length).toBe(1);
        });

        it('el botón de eliminar va en la primera columna, para verse sin desplazarse a la derecha en una tabla ancha', () => {
            elegirEmpresa();

            const fila = fixture.nativeElement.querySelector('tbody tr') as HTMLElement;
            expect(fila.querySelector('td:first-child button[aria-label="Eliminar CFDI"]')).not.toBeNull();
            expect(fila.querySelectorAll('button[aria-label="Eliminar CFDI"]').length).toBe(1);
            const encabezado = fixture.nativeElement.querySelector('thead tr th:first-child') as HTMLElement;
            expect(encabezado.textContent).toContain('Acciones');
        });

        it('pide confirmar con un texto fijo y, si se cancela, no manda nada', () => {
            elegirEmpresa();
            const abrir = confirmar('cancelled');

            botonesEliminar()[0].click();

            const config = abrir.calls.mostRecent().args[0]!;
            expect(config.title).toBe('Eliminar CFDI');
            expect(config.message).toContain('No se puede deshacer');
            expect(config.message).toContain('vuelves a importar');
            expect(config.message).toContain('conciliaciones confirmadas');
            expect(config.message).not.toContain(cfdi.uuid); // nada capturado se interpola: Fuse pinta el mensaje con innerHTML
            expect(config.actions?.confirm?.label).toBe('Eliminar');
            // httpMock.verify() (afterEach) falla si hubiera mandado un DELETE.
        });

        it('al confirmar manda DELETE, avisa y recarga la misma página', () => {
            elegirEmpresa();
            confirmar('confirmed');
            const aviso = spyOn(TestBed.inject(MatSnackBar), 'open');

            botonesEliminar()[0].click();
            const req = httpMock.expectOne(`${base}/cfdi/${cfdi.cfdiId}`);
            expect(req.request.method).toBe('DELETE');
            expect(componente.eliminandoCfdi()).toBe(cfdi.cfdiId);
            req.flush(null, { status: 204, statusText: 'No Content' });

            const recarga = httpMock.expectOne((r) => r.url === `${base}/cfdi`);
            expect(recarga.request.params.get('pagina')).toBe('1');
            recarga.flush({ pagina: 1, tamano: 50, total: 0, items: [] });
            fixture.detectChanges();

            expect(aviso.calls.mostRecent().args[0]).toBe('CFDI eliminado.');
            expect(componente.eliminandoCfdi()).toBeNull();
        });

        it('si era el único CFDI de la última página vuelve a la página anterior', () => {
            elegirEmpresa();
            componente.cargarLista(2);
            httpMock.expectOne((r) => r.url === `${base}/cfdi`).flush({ pagina: 2, tamano: 50, total: 51, items: [cfdi] });
            fixture.detectChanges();
            confirmar('confirmed');
            spyOn(TestBed.inject(MatSnackBar), 'open');

            botonesEliminar()[0].click();
            httpMock.expectOne(`${base}/cfdi/${cfdi.cfdiId}`).flush(null, { status: 204, statusText: 'No Content' });

            const recarga = httpMock.expectOne((r) => r.url === `${base}/cfdi`);
            expect(recarga.request.params.get('pagina')).toBe('1');
            recarga.flush({ pagina: 1, tamano: 50, total: 50, items: [cfdi] });
        });

        it('si el API rechaza la eliminación (409) muestra su mensaje y no recarga', () => {
            elegirEmpresa();
            confirmar('confirmed');
            const aviso = spyOn(TestBed.inject(MatSnackBar), 'open');

            botonesEliminar()[0].click();
            httpMock.expectOne(`${base}/cfdi/${cfdi.cfdiId}`).flush(
                { mensaje: 'El CFDI tiene 1 conciliación confirmada; deshazla antes de eliminarlo.' },
                { status: 409, statusText: 'Conflict' }
            );

            expect(aviso.calls.mostRecent().args[0]).toContain('deshazla');
            expect(componente.eliminandoCfdi()).toBeNull();
            // httpMock.verify() (afterEach) falla si hubiera pedido la lista otra vez.
        });

        it('mientras se elimina uno, los botones se bloquean y un segundo intento no manda otra petición', () => {
            elegirEmpresa();
            confirmar('confirmed');
            spyOn(TestBed.inject(MatSnackBar), 'open');

            botonesEliminar()[0].click();
            fixture.detectChanges();
            expect(botonesEliminar()[0].disabled).toBeTrue();
            componente.eliminarCfdi(cfdi);

            httpMock.expectOne(`${base}/cfdi/${cfdi.cfdiId}`).flush(null, { status: 204, statusText: 'No Content' }); // expectOne falla si hubiera dos
            httpMock.expectOne((r) => r.url === `${base}/cfdi`).flush({ pagina: 1, tamano: 50, total: 0, items: [] });
        });
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

    it('un archivo de más de 10 MB no se sube: muestra el motivo, descarta el archivo y no pide las hojas', () => {
        elegirEmpresa();
        const entrada = fixture.nativeElement.querySelector('input[type=file]') as HTMLInputElement;
        const datos = new DataTransfer();
        datos.items.add(new File([new ArrayBuffer(10 * 1024 * 1024 + 1)], 'grande.xlsx'));
        entrada.files = datos.files;

        entrada.dispatchEvent(new Event('change'));
        fixture.detectChanges();

        // httpMock.verify() (afterEach) falla si se hubiera pedido /importaciones/hojas.
        expect(fixture.nativeElement.textContent).toContain('El archivo es demasiado grande (máximo 10 MB).');
        expect(componente.archivo()).toBeNull();
        expect(entrada.files!.length).toBe(0);
        expect(componente.puedeImportar()).toBeFalse();
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
