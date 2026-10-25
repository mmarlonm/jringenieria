import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { MatOption } from '@angular/material/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSelect } from '@angular/material/select';
import { of } from 'rxjs';
import { environment } from 'environments/environment';
import { Cuenta, Empresa, HojaInfo, Movimiento, ResultadoImportacion } from '../finanzas.types';
import { ImportacionesHistorialComponent } from '../shared/importaciones-historial/importaciones-historial.component';
import { BancosComponent } from './bancos.component';

describe('BancosComponent', () => {
    const base = `${environment.apiUrl}/Finanzas`;
    const cuentaA: Cuenta = { cuentaId: 5, empresaId: 3, banco: 'BBVA', alias: 'Cheques principal', tipo: 'Cheques', moneda: 'MXN', terminacion: '1234', activa: true };
    const cuentaB: Cuenta = { cuentaId: 6, empresaId: 3, banco: 'BBVA', alias: 'Tarjeta dólares', tipo: 'TarjetaCredito', moneda: 'USD', terminacion: '56789', activa: true };
    // Misma etiqueta de cuenta (alias y terminación) en la otra empresa: lo único que las distingue es el nombre de la empresa.
    const cuentaC: Cuenta = { cuentaId: 7, empresaId: 4, banco: 'BBVA', alias: 'Cheques principal', tipo: 'Cheques', moneda: 'MXN', terminacion: '1234', activa: true };
    const empresas: Empresa[] = [
        { empresaId: 3, rfc: 'AAA010101AAA', nombre: 'Empresa Ficticia', tipo: 'M', activa: true },
        { empresaId: 4, rfc: 'BBB020202BB2', nombre: 'Otra Empresa Ficticia', tipo: 'M', activa: true }
    ];
    const hojasLibro: HojaInfo[] = [
        { nombre: 'Resumen', filas: 3, formatoDetectado: 'Desconocido' },
        { nombre: 'Enero', filas: 40, formatoDetectado: 'BancoA' },
        { nombre: 'Febrero', filas: 35, formatoDetectado: 'BancoB' }
    ];
    const abono: Movimiento = {
        movimientoId: 1, cuentaId: 5, fecha: '2026-01-05T00:00:00', descripcion: 'SPEI RECIBIDO cliente ficticio', importe: 1234.56, saldo: 5000,
        tipoOperacion: 'SPEI recibido', referencia: '0012345', rfcComercio: null
    };
    const cargo: Movimiento = {
        movimientoId: 2, cuentaId: 5, fecha: '2026-01-06T00:00:00', descripcion: 'COMPRA ficticia', importe: -50, saldo: null,
        tipoOperacion: null, referencia: null, rfcComercio: null
    };
    const paginaMovs = (items: Movimiento[], total = items.length, pagina = 1) => ({ pagina, tamano: 50, total, items });
    const vacia = { pagina: 1, tamano: 10, total: 0, items: [] };

    const resultado = (parcial: Partial<ResultadoImportacion> = {}): ResultadoImportacion => ({
        importacionId: null,
        empresaId: 3,
        cuentaId: 5,
        nombreArchivo: 'ficticio.xlsx',
        hoja: 'Enero',
        filasLeidas: 40,
        nuevos: 38,
        actualizados: 0,
        sinCambios: 2,
        rechazados: [{ fila: 7, motivo: 'Fecha no válida' }],
        advertencias: ['El archivo no empieza donde terminó el último saldo guardado.'],
        periodoDesde: '2026-01-02T00:00:00',
        periodoHasta: '2026-01-30T00:00:00',
        soloValidar: true,
        primerSaldo: 1000,
        ultimoSaldo: 1500.5,
        ultimoSaldoGuardado: 900,
        ...parcial
    });

    let fixture: ComponentFixture<BancosComponent>;
    let componente: BancosComponent;
    let httpMock: HttpTestingController;

    const el = (): HTMLElement => fixture.nativeElement;
    const texto = (): string => el().textContent ?? '';
    const esLista = (r: { url: string }): boolean => r.url === `${base}/movimientos`;
    const esHistorial = (r: { url: string }): boolean => r.url === `${base}/importaciones`;
    const boton = (etiqueta: string): HTMLButtonElement =>
        Array.from(el().querySelectorAll('button')).find((b) => b.textContent?.includes(etiqueta)) as HTMLButtonElement;
    const selector = (etiqueta: string): HTMLElement =>
        Array.from(el().querySelectorAll('mat-form-field'))
            .find((f) => f.querySelector('mat-label')?.textContent?.trim() === etiqueta)!
            .querySelector('mat-select') as HTMLElement;

    /** Texto del `dd` de la cifra de la vista previa cuyo `dt` es exactamente `etiqueta` (así cada cifra queda atada a su etiqueta). */
    const dato = (etiqueta: string): string | undefined => {
        const dt = Array.from(el().querySelectorAll('dt')).find((d) => d.textContent?.trim() === etiqueta);
        return dt?.parentElement?.querySelector('dd')?.textContent?.replace(/\s+/g, ' ').trim();
    };

    /** Pulsa el selector con ese nombre, como lo haría una persona, y devuelve sus opciones. */
    function abrir(etiqueta: string): MatOption[] {
        const host = selector(etiqueta);
        (host.querySelector('.mat-mdc-select-trigger') as HTMLElement).click();
        fixture.detectChanges();
        const select = fixture.debugElement.queryAll(By.directive(MatSelect)).find((d) => d.nativeElement === host)!.componentInstance as MatSelect;
        expect(select.panelOpen).withContext(`selector «${etiqueta}» abierto`).toBeTrue();
        return select.options.toArray();
    }

    /** Abre un mat-select y pulsa la opción cuyo texto contiene `opcion`. */
    function elegirOpcion(etiqueta: string, opcion: string): void {
        const o = abrir(etiqueta).find((x) => x.viewValue.includes(opcion));
        expect(o).withContext(`opción «${opcion}»`).toBeDefined();
        o!._getHostElement().click();
        fixture.detectChanges();
    }

    const opcionesDe = (etiqueta: string): string[] => abrir(etiqueta).map((o) => o.viewValue.trim());

    /** Elige la primera cuenta y contesta las dos cargas que eso dispara (movimientos e historial). */
    function elegirCuentaA(): void {
        elegirOpcion('Cuenta', 'Cheques principal');
        const lista = httpMock.expectOne(esLista);
        expect(lista.request.params.get('cuentaId')).toBe('5');
        expect(lista.request.params.get('pagina')).toBe('1');
        expect(lista.request.params.get('tamano')).toBe('50');
        lista.flush(paginaMovs([abono, cargo]));
        fixture.detectChanges();
        const historial = httpMock.expectOne(esHistorial);
        expect(historial.request.params.get('fuente')).toBe('BbvaExcel');
        expect(historial.request.params.get('empresaId')).toBe('3');
        historial.flush(vacia);
        fixture.detectChanges();
    }

    /** Pone el archivo en el selector del navegador y dispara su evento `change`. */
    function ponerArchivo(archivo: File): HTMLInputElement {
        const entrada = el().querySelector('input[type=file]') as HTMLInputElement;
        const datos = new DataTransfer();
        datos.items.add(archivo);
        entrada.files = datos.files;
        entrada.dispatchEvent(new Event('change'));
        return entrada;
    }

    function elegirArchivo(nombre = 'ficticio.xlsx', hojas: HojaInfo[] = hojasLibro): void {
        ponerArchivo(new File(['x'], nombre));
        httpMock.expectOne(`${base}/importaciones/hojas`).flush(hojas);
        fixture.detectChanges();
    }

    /** Pulsa «Validar» y contesta con una vista previa; devuelve el formulario enviado. */
    function validar(r: ResultadoImportacion = resultado()): FormData {
        boton('Validar').click();
        const req = httpMock.expectOne(`${base}/movimientos/importar`);
        const cuerpo = req.request.body as FormData;
        req.flush(r);
        fixture.detectChanges();
        return cuerpo;
    }

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [provideNoopAnimations()] });
        httpMock = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(BancosComponent);
        componente = fixture.componentInstance;
        fixture.detectChanges();
        httpMock.expectOne(`${base}/cuentas`).flush([cuentaA, cuentaB, cuentaC]);
        httpMock.expectOne(`${base}/empresas`).flush(empresas);
        fixture.detectChanges();
    });

    afterEach(() => httpMock.verify());

    it('sin cuenta elegida pide elegir una y no consulta movimientos', () => {
        expect(texto()).toContain('Elige una cuenta');
    });

    it('al elegir la cuenta muestra los movimientos con fecha dd/MM/yyyy, importes en verde y rojo y saldo o «—»', () => {
        elegirCuentaA();

        expect(texto()).toContain('05/01/2026');
        expect(texto()).toContain('SPEI recibido');
        const celdas = Array.from(el().querySelectorAll<HTMLElement>('tbody td'));
        const positivo = celdas.find((c) => c.textContent?.includes('1,234.56'))!;
        const negativo = celdas.find((c) => c.textContent?.includes('50.00') && c.textContent.includes('-'))!;
        expect(positivo.textContent).toContain('$1,234.56');
        expect(positivo.querySelector('.text-emerald-600')).not.toBeNull();
        expect(negativo.querySelector('.text-rose-600')).not.toBeNull();
        expect(celdas.find((c) => c.textContent?.includes('$5,000.00'))).toBeDefined();
        expect(celdas.filter((c) => c.textContent?.trim() === '—').length).toBeGreaterThan(0); // el cargo no trae saldo
    });

    it('las opciones de cuenta llevan la empresa: dos cuentas con el mismo alias y terminación de empresas distintas se distinguen', () => {
        expect(opcionesDe('Cuenta')).toEqual([
            'Empresa Ficticia · Cheques principal ····1234 · MXN',
            'Empresa Ficticia · Tarjeta dólares ····56789 · USD',
            'Otra Empresa Ficticia · Cheques principal ····1234 · MXN'
        ]);
    });

    it('la cuenta elegida se ve con su empresa en el selector', async () => {
        elegirCuentaA();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(selector('Cuenta').textContent).toContain('Empresa Ficticia · Cheques principal ····1234 · MXN');
    });

    it('si no se pueden cargar las empresas las cuentas salen sin empresa y la página sigue funcionando', () => {
        const otro = TestBed.createComponent(BancosComponent);
        otro.detectChanges();
        httpMock.expectOne(`${base}/cuentas`).flush([cuentaA]);
        httpMock.expectOne(`${base}/empresas`).flush({ mensaje: 'No tienes acceso.' }, { status: 403, statusText: 'Forbidden' });
        otro.detectChanges();

        expect(otro.componentInstance.etiquetaCuenta(cuentaA)).toBe('Cheques principal ····1234 · MXN');
    });

    it('los importes de una cuenta en dólares salen con la moneda de la cuenta', () => {
        elegirOpcion('Cuenta', 'Tarjeta dólares');
        httpMock.expectOne(esLista).flush(paginaMovs([{ ...abono, cuentaId: 6, importe: 99.5 }]));
        httpMock.expectOne(esHistorial).flush(vacia);
        fixture.detectChanges();

        expect(texto()).toContain('USD99.50'); // es-MX escribe el dólar como «USD»; el peso, «$»
    });

    describe('filtros y paginación', () => {
        beforeEach(() => elegirCuentaA());

        it('escribir una fecha desde o una búsqueda vuelve a pedir la página 1 con esos filtros', () => {
            const desde = el().querySelector('input[type=date]') as HTMLInputElement;
            desde.value = '2026-01-05';
            desde.dispatchEvent(new Event('input'));
            desde.dispatchEvent(new Event('change'));
            let req = httpMock.expectOne(esLista);
            expect(req.request.params.get('desde')).toBe('2026-01-05');
            expect(req.request.params.get('hasta')).toBeNull();
            expect(req.request.params.get('pagina')).toBe('1');
            req.flush(paginaMovs([abono]));
            fixture.detectChanges();

            const q = el().querySelector('input[type=search]') as HTMLInputElement;
            q.value = ' SPEI ';
            q.dispatchEvent(new Event('input'));
            q.dispatchEvent(new Event('change'));
            req = httpMock.expectOne(esLista);
            expect(req.request.params.get('q')).toBe('SPEI');
            expect(req.request.params.get('desde')).toBe('2026-01-05');
            req.flush(paginaMovs([abono]));
        });

        it('«Siguiente» pide la página 2 con tamaño 50', () => {
            componente.cargarLista(1);
            httpMock.expectOne(esLista).flush(paginaMovs([abono], 120));
            fixture.detectChanges();

            boton('Siguiente').click();
            const req = httpMock.expectOne(esLista);
            expect(req.request.params.get('pagina')).toBe('2');
            expect(req.request.params.get('tamano')).toBe('50');
            req.flush(paginaMovs([abono], 120, 2));
        });

        it('si la lista falla muestra el error con «Reintentar», que vuelve a pedirla', () => {
            componente.cargarLista(1);
            httpMock.expectOne(esLista).flush({ mensaje: 'La cuenta no existe.' }, { status: 404, statusText: 'Not Found' });
            fixture.detectChanges();
            expect(texto()).toContain('La cuenta no existe.');

            boton('Reintentar').click();
            httpMock.expectOne(esLista).flush(paginaMovs([]));
            fixture.detectChanges();
            expect(texto()).toContain('Esta cuenta todavía no tiene movimientos');
        });

        it('si desde es posterior a hasta avisa y no consulta', () => {
            const [desde, hasta] = Array.from(el().querySelectorAll<HTMLInputElement>('input[type=date]'));
            desde.value = '2026-02-01';
            desde.dispatchEvent(new Event('input'));
            desde.dispatchEvent(new Event('change'));
            httpMock.expectOne(esLista).flush(paginaMovs([]));

            hasta.value = '2026-01-01';
            hasta.dispatchEvent(new Event('input'));
            hasta.dispatchEvent(new Event('change'));
            fixture.detectChanges();

            expect(texto()).toContain('La fecha inicial no puede ser posterior a la final.');
            // httpMock.verify() (afterEach) falla si con fechas invertidas hubiera pedido la lista.
        });

        it('«anulada» del historial vuelve a pedir la lista de movimientos', () => {
            const historial = fixture.debugElement.query(By.directive(ImportacionesHistorialComponent)).componentInstance as ImportacionesHistorialComponent;

            historial.anulada.emit();

            httpMock.expectOne(esLista).flush(paginaMovs([]));
        });
    });

    it('cambiar de cuenta cancela la petición de lista que seguía en vuelo', () => {
        elegirOpcion('Cuenta', 'Cheques principal');
        const primera: TestRequest = httpMock.expectOne(esLista);

        elegirOpcion('Cuenta', 'Tarjeta dólares');

        expect(primera.cancelled).toBeTrue();
        const segunda = httpMock.expectOne(esLista);
        expect(segunda.request.params.get('cuentaId')).toBe('6');
        segunda.flush(paginaMovs([]));
        fixture.detectChanges();
        httpMock.expectOne(esHistorial).flush(vacia);
    });

    it('«Nueva cuenta» abre el diálogo y la cuenta creada se agrega y se elige', () => {
        const creada: Cuenta = { cuentaId: 9, empresaId: 4, banco: 'BBVA', alias: 'Ahorro nuevo', tipo: 'Ahorro', moneda: 'MXN', terminacion: '4321', activa: true };
        const abrir = spyOn(TestBed.inject(MatDialog), 'open').and.returnValue({ afterClosed: () => of(creada) } as MatDialogRef<unknown, Cuenta>);

        boton('Nueva cuenta').click();

        expect(abrir).toHaveBeenCalledTimes(1);
        expect(componente.cuentaId()).toBe(9);
        const lista = httpMock.expectOne(esLista);
        expect(lista.request.params.get('cuentaId')).toBe('9');
        lista.flush(paginaMovs([]));
        fixture.detectChanges();
        expect(opcionesDe('Cuenta')).toContain('Otra Empresa Ficticia · Ahorro nuevo ····4321 · MXN');
        expect(httpMock.expectOne(esHistorial).request.params.get('empresaId')).toBe('4');
    });

    describe('importación con vista previa obligatoria', () => {
        beforeEach(() => elegirCuentaA());

        it('sin archivo «Validar» y «Confirmar importación» están deshabilitados', () => {
            expect(boton('Validar').disabled).toBeTrue();
            expect(boton('Confirmar importación').disabled).toBeTrue();
        });

        it('con varias hojas preselecciona la primera con formato bancario, la manda y «Confirmar» sigue deshabilitado', () => {
            elegirArchivo();
            expect(componente.hoja()).toBe('Enero');
            expect(opcionesDe('Hoja a importar')).toEqual([
                'Resumen · Formato no reconocido · 3 filas',
                'Enero · Movimientos bancarios (formato A) · 40 filas',
                'Febrero · Movimientos bancarios (formato B) · 35 filas'
            ]);
            expect(boton('Validar').disabled).toBeFalse();
            expect(boton('Confirmar importación').disabled).toBeTrue();
        });

        it('«Validar» manda soloValidar=true con cuenta y hoja, muestra la vista previa y no guarda ni recarga nada', () => {
            elegirArchivo();

            const cuerpo = validar();

            expect(cuerpo.get('soloValidar')).toBe('true');
            expect(cuerpo.get('cuentaId')).toBe('5');
            expect(cuerpo.get('hoja')).toBe('Enero');
            expect(texto()).toContain('Vista previa: no se guardó nada');
            expect(texto()).not.toContain('Importación realizada');
            // httpMock.verify() (afterEach) falla si «Validar» hubiera pedido la lista o el historial.
        });

        it('la vista previa muestra cada cifra bajo su etiqueta: cuenta destino, periodo, filas y los tres saldos, además de advertencias y rechazos', () => {
            elegirArchivo();
            // Valores distintos entre sí y que no aparecen en ningún otro lugar de la pantalla (lista, hojas…).
            validar(resultado({ filasLeidas: 77, primerSaldo: 2345.67, ultimoSaldo: 8765.43, ultimoSaldoGuardado: 3456.78 }));

            expect(dato('Cuenta destino')).toBe('Empresa Ficticia · Cheques principal ····1234 · MXN');
            expect(dato('Periodo')).toBe('02/01/2026 al 30/01/2026');
            expect(dato('Filas leídas')).toBe('77');
            expect(dato('Primer saldo del archivo')).toBe('$2,345.67');
            expect(dato('Último saldo del archivo')).toBe('$8,765.43');
            expect(dato('Último saldo guardado')).toBe('$3,456.78');
            expect(texto()).toContain('Vista previa: no se guardó nada.');
            expect(texto()).toContain('38 nuevos · 0 actualizados · 2 sin cambios · 1 rechazados');
            expect(texto()).toContain('El archivo no empieza donde terminó el último saldo guardado.');
            expect(texto()).toContain('Fecha no válida');
        });

        it('si no hay último saldo guardado (cuenta sin movimientos) lo muestra como «—»', () => {
            elegirArchivo();
            validar(resultado({ ultimoSaldoGuardado: null }));

            expect(dato('Último saldo guardado')).toBe('—');
        });

        it('«Confirmar importación» se habilita solo tras una vista previa correcta', () => {
            elegirArchivo();
            expect(boton('Confirmar importación').disabled).toBeTrue();

            validar();

            expect(boton('Confirmar importación').disabled).toBeFalse();
        });

        it('si la vista previa falla con 413 sin cuerpo muestra el texto en español y «Confirmar» sigue deshabilitado', () => {
            elegirArchivo();

            boton('Validar').click();
            httpMock.expectOne(`${base}/movimientos/importar`).flush(null, { status: 413, statusText: 'Payload Too Large' });
            fixture.detectChanges();

            expect(texto()).toContain('El archivo es demasiado grande (máximo 10 MB).');
            expect(boton('Confirmar importación').disabled).toBeTrue();
            expect(boton('Validar').disabled).toBeFalse(); // se puede volver a intentar
        });

        it('un archivo de más de 10 MB no se sube: muestra el motivo, descarta archivo y vista previa y no pide las hojas', () => {
            elegirArchivo();
            validar();
            expect(boton('Confirmar importación').disabled).toBeFalse();

            const entrada = ponerArchivo(new File([new ArrayBuffer(10 * 1024 * 1024 + 1)], 'grande.xlsx'));
            fixture.detectChanges();

            // httpMock.verify() (afterEach) falla si se hubiera pedido /importaciones/hojas.
            expect(texto()).toContain('El archivo es demasiado grande (máximo 10 MB).');
            expect(componente.archivo()).toBeNull();
            expect(entrada.files!.length).toBe(0);
            expect(texto()).not.toContain('Vista previa: no se guardó nada');
            expect(boton('Validar').disabled).toBeTrue();
            expect(boton('Confirmar importación').disabled).toBeTrue();
        });

        it('cambiar de cuenta después de la vista previa la invalida', () => {
            elegirArchivo();
            validar();
            expect(boton('Confirmar importación').disabled).toBeFalse();

            elegirOpcion('Cuenta', 'Tarjeta dólares');
            httpMock.expectOne(esLista).flush(paginaMovs([])); // misma empresa: el historial no se recarga
            fixture.detectChanges();

            expect(boton('Confirmar importación').disabled).toBeTrue();
            expect(texto()).not.toContain('Vista previa: no se guardó nada');
        });

        it('elegir otro archivo después de la vista previa la invalida', () => {
            elegirArchivo();
            validar();
            expect(boton('Confirmar importación').disabled).toBeFalse();

            elegirArchivo('otro.xlsx');

            expect(boton('Confirmar importación').disabled).toBeTrue();
            expect(texto()).not.toContain('Vista previa: no se guardó nada');
        });

        it('cambiar de hoja después de la vista previa la invalida', () => {
            elegirArchivo();
            validar();
            expect(boton('Confirmar importación').disabled).toBeFalse();

            elegirOpcion('Hoja a importar', 'Febrero');

            expect(componente.hoja()).toBe('Febrero');
            expect(boton('Confirmar importación').disabled).toBeTrue();
            expect(texto()).not.toContain('Vista previa: no se guardó nada');
        });

        it('«Confirmar importación» manda soloValidar=false, muestra lo guardado y recarga la lista y el historial', () => {
            elegirArchivo();
            validar();

            boton('Confirmar importación').click();
            const req = httpMock.expectOne(`${base}/movimientos/importar`);
            const cuerpo = req.request.body as FormData;
            expect(cuerpo.get('soloValidar')).toBe('false');
            expect(cuerpo.get('cuentaId')).toBe('5');
            expect(cuerpo.get('hoja')).toBe('Enero');
            req.flush(resultado({ soloValidar: false, importacionId: 9 }));

            httpMock.expectOne(esLista).flush(paginaMovs([abono, cargo]));
            httpMock.expectOne(esHistorial).flush(vacia);
            fixture.detectChanges();

            expect(texto()).toContain('Importación realizada');
            expect(texto()).toContain('38 nuevos · 0 actualizados · 2 sin cambios · 1 rechazados');
            expect(texto()).not.toContain('Vista previa: no se guardó nada');
            expect(boton('Confirmar importación').disabled).toBeTrue(); // lo guardado ya no se puede volver a confirmar sin otra vista previa
        });

        it('si «Confirmar» falla deja la vista previa para reintentar y muestra el motivo', () => {
            elegirArchivo();
            validar();

            boton('Confirmar importación').click();
            httpMock.expectOne(`${base}/movimientos/importar`).flush({ mensaje: 'La cuenta del archivo no termina en 1234.' }, { status: 400, statusText: 'Bad Request' });
            fixture.detectChanges();

            expect(texto()).toContain('La cuenta del archivo no termina en 1234.');
            expect(boton('Confirmar importación').disabled).toBeFalse();
        });

        it('un doble clic en «Validar» manda una sola petición', () => {
            elegirArchivo();

            boton('Validar').click();
            boton('Validar').click(); // el botón aún no se deshabilitó en pantalla: lo frena el método
            fixture.detectChanges();

            const req = httpMock.expectOne(`${base}/movimientos/importar`);
            expect(boton('Validar').disabled).toBeTrue();
            expect(boton('Confirmar importación').disabled).toBeTrue();
            req.flush(resultado());
        });

        it('un doble clic en «Confirmar importación» manda una sola petición', () => {
            elegirArchivo();
            validar();

            boton('Confirmar importación').click();
            boton('Confirmar importación').click();

            const req = httpMock.expectOne(`${base}/movimientos/importar`);
            req.flush(resultado({ soloValidar: false }));
            httpMock.expectOne(esLista).flush(paginaMovs([]));
            httpMock.expectOne(esHistorial).flush(vacia);
        });
    });
});
