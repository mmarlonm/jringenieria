import { ResultadoImportacion } from './finanzas.types';
import { hayAdvertencias, textoResumen } from './finanzas.utils';

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
});
