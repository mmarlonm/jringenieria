import { HttpErrorResponse } from '@angular/common/http';
import { Cuenta, ResultadoImportacion } from './finanzas.types';
import { etiquetaCuenta, fechaUtc, hayAdvertencias, mensajeDeError, motivoArchivoInvalido, textoResumen } from './finanzas.utils';

function resultado(parcial: Partial<ResultadoImportacion>): ResultadoImportacion {
    return {
        importacionId: 1,
        empresaId: 1,
        cuentaId: null,
        nombreArchivo: 'cfdi-ficticio.xlsx',
        hoja: null,
        filasLeidas: 0,
        nuevos: 0,
        actualizados: 0,
        sinCambios: 0,
        rechazados: [],
        advertencias: [],
        periodoDesde: null,
        periodoHasta: null,
        soloValidar: false,
        primerSaldo: null,
        ultimoSaldo: null,
        ultimoSaldoGuardado: null,
        ...parcial
    };
}

describe('finanzas.utils', () => {
    it('textoResumen junta los cuatro conteos en una línea', () => {
        const r = resultado({
            nuevos: 12,
            actualizados: 3,
            sinCambios: 40,
            rechazados: [{ fila: 5, motivo: 'x' }, { fila: 9, motivo: 'y' }]
        });

        expect(textoResumen(r)).toBe('12 nuevos · 3 actualizados · 40 sin cambios · 2 rechazados');
    });

    it('hayAdvertencias es verdadero solo con al menos una advertencia', () => {
        expect(hayAdvertencias(resultado({ advertencias: [] }))).toBeFalse();
        expect(hayAdvertencias(resultado({ advertencias: ['Falta la columna Folio'] }))).toBeTrue();
        expect(hayAdvertencias(resultado({ advertencias: ['a', 'b'] }))).toBeTrue();
    });

    describe('mensajeDeError', () => {
        it('usa el mensaje del cuerpo en 400, 404 y 409', () => {
            for (const status of [400, 404, 409]) {
                const err = new HttpErrorResponse({ status, error: { mensaje: `Motivo ${status}` } });

                expect(mensajeDeError(err)).toBe(`Motivo ${status}`);
            }
        });

        it('prefiere el mensaje del servidor en un 413 con cuerpo (p. ej. el tope de filas)', () => {
            const err = new HttpErrorResponse({ status: 413, error: { mensaje: 'El archivo tiene más de 20,000 filas.' } });

            expect(mensajeDeError(err)).toBe('El archivo tiene más de 20,000 filas.');
        });

        it('413 sin cuerpo (Kestrel) da el texto de tamaño máximo', () => {
            expect(mensajeDeError(new HttpErrorResponse({ status: 413 }))).toBe('El archivo es demasiado grande (máximo 10 MB).');
            expect(mensajeDeError(new HttpErrorResponse({ status: 413, error: '' }))).toBe('El archivo es demasiado grande (máximo 10 MB).');
        });

        it('estado 0 es falta de conexión', () => {
            const err = new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') });

            expect(mensajeDeError(err)).toBe('No se pudo conectar con el servidor.');
        });

        it('cualquier otra forma da el texto genérico', () => {
            const generico = 'Ocurrió un error inesperado.';

            expect(mensajeDeError(new HttpErrorResponse({ status: 500 }))).toBe(generico);
            expect(mensajeDeError(new HttpErrorResponse({ status: 500, error: { mensaje: '  ' } }))).toBe(generico);
            expect(mensajeDeError(new Error('boom'))).toBe(generico);
            expect(mensajeDeError('texto')).toBe(generico);
            expect(mensajeDeError(null)).toBe(generico);
            expect(mensajeDeError(undefined)).toBe(generico);
        });
    });

    describe('motivoArchivoInvalido', () => {
        const DIEZ_MB = 10 * 1024 * 1024;

        it('acepta un Excel de exactamente 10 MB', () => {
            expect(motivoArchivoInvalido({ name: 'movimientos.xlsx', size: DIEZ_MB })).toBeNull();
            expect(motivoArchivoInvalido({ name: 'movimientos.xls', size: 1 })).toBeNull();
        });

        it('rechaza 10 MB más un byte', () => {
            expect(motivoArchivoInvalido({ name: 'movimientos.xlsx', size: DIEZ_MB + 1 })).toBe('El archivo es demasiado grande (máximo 10 MB).');
        });

        it('la extensión no distingue mayúsculas', () => {
            expect(motivoArchivoInvalido({ name: 'MOVIMIENTOS.XLSX', size: 10 })).toBeNull();
            expect(motivoArchivoInvalido({ name: 'Libro.Xls', size: 10 })).toBeNull();
        });

        it('rechaza lo que no es Excel: .csv, sin extensión, doble extensión y .xlsx solo como parte del nombre', () => {
            const texto = 'Solo se aceptan archivos de Excel (.xlsx o .xls).';

            expect(motivoArchivoInvalido({ name: 'movimientos.csv', size: 10 })).toBe(texto);
            expect(motivoArchivoInvalido({ name: 'movimientos', size: 10 })).toBe(texto);
            expect(motivoArchivoInvalido({ name: 'movimientos.xlsx.exe', size: 10 })).toBe(texto);
            expect(motivoArchivoInvalido({ name: 'xlsx', size: 10 })).toBe(texto);
            expect(motivoArchivoInvalido({ name: '', size: 10 })).toBe(texto);
        });
    });

    describe('etiquetaCuenta', () => {
        const cuenta: Cuenta = { cuentaId: 5, empresaId: 3, banco: 'BBVA', alias: 'Cheques principal', tipo: 'Cheques', moneda: 'MXN', terminacion: '1234', activa: true };

        it('antepone la empresa a «alias ····terminación · moneda»', () => {
            expect(etiquetaCuenta(cuenta, new Map([[3, 'Empresa Ficticia']]))).toBe('Empresa Ficticia · Cheques principal ····1234 · MXN');
        });

        it('si la empresa no se conoce da la etiqueta sin empresa', () => {
            expect(etiquetaCuenta(cuenta, new Map())).toBe('Cheques principal ····1234 · MXN');
            expect(etiquetaCuenta(cuenta, new Map([[4, 'Otra']]))).toBe('Cheques principal ····1234 · MXN');
        });
    });

    it('fechaUtc marca como UTC solo las fechas sin zona', () => {
        expect(fechaUtc('2026-10-24T17:12:39.1234567')).toBe('2026-10-24T17:12:39.1234567Z');
        expect(fechaUtc('2026-10-24T17:12:39Z')).toBe('2026-10-24T17:12:39Z');
        expect(fechaUtc('2026-10-24T11:12:39-06:00')).toBe('2026-10-24T11:12:39-06:00');
    });
});
