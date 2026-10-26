import { HttpErrorResponse } from '@angular/common/http';
import { Cuenta, MovimientoConciliacion, ResultadoImportacion } from './finanzas.types';
import { CLASES_MOVIMIENTO, ESTADOS_MOVIMIENTO, altasPendientes, clasesDeConfianza, etiquetaClase, etiquetaCuenta, etiquetaEstadoMovimiento, etiquetaRegla, fechaLocalISO, fechaUtc, hayAdvertencias, mensajeDeError, motivoArchivoInvalido, partir, periodoValido, primerDiaDelMes, referenciaCfdi, textoResumen, textoSugerir } from './finanzas.utils';

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
    describe('fechas y periodo', () => {
        it('fechaLocalISO formatea yyyy-MM-dd con partes locales tanto al inicio como al fin del día', () => {
            expect(fechaLocalISO(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
            expect(fechaLocalISO(new Date(2026, 0, 5, 0, 30))).toBe('2026-01-05');
        });

        it('primerDiaDelMes devuelve el primer día del mes dado', () => {
            expect(primerDiaDelMes(new Date(2026, 2, 17))).toBe('2026-03-01');
        });

        it('periodoValido valida presencia, orden y máximo 366 días', () => {
            expect(periodoValido('', '2026-01-31')).toBe('Indica el periodo (desde y hasta).');
            expect(periodoValido('2026-01-01', '')).toBe('Indica el periodo (desde y hasta).');
            expect(periodoValido('2026-02-01', '2026-01-31')).toBe('La fecha inicial no puede ser posterior a la final.');
            expect(periodoValido('2026-01-01', '2027-01-03')).toBe('El periodo no puede pasar de 366 días.');
            expect(periodoValido('2026-01-01', '2027-01-02')).toBeNull();
            expect(periodoValido('2026-01-01', '2026-01-01')).toBeNull();
        });
    });

    describe('etiquetas y catálogo de conciliación', () => {
        it('ESTADOS_MOVIMIENTO contiene los 5 estados', () => {
            expect(ESTADOS_MOVIMIENTO).toEqual(['SinConciliar', 'ConSugerencia', 'Parcial', 'Conciliado', 'Clasificado']);
        });

        it('CLASES_MOVIMIENTO contiene las 6 clases', () => {
            expect(CLASES_MOVIMIENTO).toEqual(['TransferenciaPropia', 'PagoTarjeta', 'Nomina', 'Comision', 'Tpv', 'Personal']);
        });

        it('etiquetaEstadoMovimiento traduce cada estado conocido y preserva desconocidos', () => {
            expect(etiquetaEstadoMovimiento('SinConciliar')).toBe('Sin conciliar');
            expect(etiquetaEstadoMovimiento('ConSugerencia')).toBe('Con sugerencia');
            expect(etiquetaEstadoMovimiento('Parcial')).toBe('Parcial');
            expect(etiquetaEstadoMovimiento('Conciliado')).toBe('Conciliado');
            expect(etiquetaEstadoMovimiento('Clasificado')).toBe('Clasificado');
            expect(etiquetaEstadoMovimiento('OtroEstado')).toBe('OtroEstado');
        });

        it('etiquetaClase traduce cada clase conocida y preserva desconocidas', () => {
            expect(etiquetaClase('TransferenciaPropia')).toBe('Transferencia entre cuentas propias');
            expect(etiquetaClase('PagoTarjeta')).toBe('Pago de tarjeta');
            expect(etiquetaClase('Nomina')).toBe('Nómina');
            expect(etiquetaClase('Comision')).toBe('Comisión');
            expect(etiquetaClase('Tpv')).toBe('Cobro de terminal (TPV)');
            expect(etiquetaClase('Personal')).toBe('Personal');
            expect(etiquetaClase('Desconocida')).toBe('Desconocida');
        });

        it('etiquetaRegla traduce cada regla conocida y preserva desconocidas', () => {
            expect(etiquetaRegla('SALDO_EXACTO')).toBe('Importe exacto');
            expect(etiquetaRegla('PPD_SALDO')).toBe('Saldo de factura a crédito (PPD)');
            expect(etiquetaRegla('TARJETA_RFC')).toBe('Compra con tarjeta (RFC coincide)');
            expect(etiquetaRegla('REP_EXACTO')).toBe('Complemento de pago');
            expect(etiquetaRegla('SUMA_EXACTA')).toBe('Suma de varias facturas');
            expect(etiquetaRegla('MANUAL')).toBe('Manual');
            expect(etiquetaRegla('OTRA_REGLA')).toBe('OTRA_REGLA');
        });

        it('clasesDeConfianza devuelve clases css con emerald, amber o gray', () => {
            expect(clasesDeConfianza('Alta')).toContain('emerald');
            expect(clasesDeConfianza('Media')).toContain('amber');
            expect(clasesDeConfianza('Baja')).toContain('gray');
            expect(clasesDeConfianza(null)).toContain('gray');
        });
    });

    describe('utilidades de conciliación', () => {
        it('referenciaCfdi formatea serie-folio, solo folio, solo serie o 8 chars del uuid', () => {
            expect(referenciaCfdi({ serie: 'A', folio: '123', uuid: '12345678-90ab-cdef-1234-567890abcdef' })).toBe('A-123');
            expect(referenciaCfdi({ serie: null, folio: '456', uuid: '12345678-90ab-cdef-1234-567890abcdef' })).toBe('456');
            expect(referenciaCfdi({ serie: 'B', folio: null, uuid: '12345678-90ab-cdef-1234-567890abcdef' })).toBe('B');
            expect(referenciaCfdi({ serie: null, folio: null, uuid: 'abcdef01-90ab-cdef-1234-567890abcdef' })).toBe('abcdef01');
        });

        it('textoSugerir arma el resumen en el formato esperado', () => {
            expect(textoSugerir({ sugerenciasNuevas: 3, movimientosAnalizados: 15, cfdiConsiderados: 20 })).toBe(
                '3 sugerencias nuevas · 15 movimientos analizados · 20 facturas consideradas'
            );
        });

        it('altasPendientes extrae sugerencias de confianza Alta en orden ignorando otras', () => {
            const vAlta1: any = { conciliacionId: 1, estado: 'Sugerida', confianza: 'Alta' };
            const vMedia: any = { conciliacionId: 2, estado: 'Sugerida', confianza: 'Media' };
            const vConfirmada: any = { conciliacionId: 3, estado: 'Confirmada', confianza: 'Alta' };
            const vAlta2: any = { conciliacionId: 4, estado: 'Sugerida', confianza: 'Alta' };

            const items: MovimientoConciliacion[] = [
                {
                    movimientoId: 10, cuentaId: 1, fecha: '2026-01-01', descripcion: 'Mov 1', importe: 100,
                    saldo: null, tipoOperacion: null, clase: null, estado: 'ConSugerencia', pendiente: 100,
                    sugerencias: [vAlta1, vMedia], confirmadas: [vConfirmada]
                },
                {
                    movimientoId: 20, cuentaId: 1, fecha: '2026-01-02', descripcion: 'Mov 2', importe: 200,
                    saldo: null, tipoOperacion: null, clase: null, estado: 'ConSugerencia', pendiente: 200,
                    sugerencias: [vAlta2], confirmadas: []
                }
            ];

            expect(altasPendientes(items)).toEqual([vAlta1, vAlta2]);
        });

        it('partir divide arreglos en bloques del tamaño indicado', () => {
            expect(partir([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
            expect(partir([], 3)).toEqual([]);
        });
    });
});
