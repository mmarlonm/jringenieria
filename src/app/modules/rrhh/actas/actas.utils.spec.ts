import {
    accionesDisponibles,
    claseAlerta,
    etiquetaEstatus,
    indicePaso,
    PASOS_ACTA,
    textoAlerta,
    textoValidacion
} from './actas.utils';
import { EstatusActa } from './actas.types';

describe('accionesDisponibles', () => {
    it('quien no es gestor solo puede editar el borrador', () => {
        expect(accionesDisponibles('Borrador', true, false)).toEqual(['editar']);
        expect(accionesDisponibles('Citado', true, false)).toEqual([]);
        expect(accionesDisponibles('Cerrada', false, false)).toEqual([]);
    });

    it('el gestor en borrador puede editar, citar y anular', () => {
        expect(accionesDisponibles('Borrador', true, true)).toEqual(['editar', 'citar', 'anular']);
    });

    it('el gestor con el acta citada puede editar, registrar la audiencia y anular', () => {
        expect(accionesDisponibles('Citado', true, true)).toEqual(['editar', 'audiencia', 'anular']);
    });

    it('despues de la audiencia solo se puede sancionar o anular', () => {
        expect(accionesDisponibles('AudienciaRealizada', false, true)).toEqual(['sancion', 'anular']);
    });

    it('con la sancion pendiente de firmas solo se registra la firma o se anula', () => {
        expect(accionesDisponibles('PendienteFirmas', false, true)).toEqual(['firma', 'anular']);
    });

    it('con la sancion aplicada se puede cerrar o anular', () => {
        expect(accionesDisponibles('SancionAplicada', false, true)).toEqual(['cerrar', 'anular']);
    });

    it('un acta cerrada o anulada no admite acciones ni siquiera del gestor', () => {
        expect(accionesDisponibles('Cerrada', false, true)).toEqual([]);
        expect(accionesDisponibles('Anulada', false, true)).toEqual([]);
    });
});

describe('textoAlerta', () => {
    it('plazo vencido', () => {
        expect(textoAlerta('PlazoVencido', 0)).toContain('vencido');
    });

    it('cerrar indica los dias que quedan, en singular y plural', () => {
        expect(textoAlerta('Cerrar', 10)).toContain('10 días');
        expect(textoAlerta('Cerrar', 1)).toContain('1 día');
        expect(textoAlerta('Cerrar', 1)).not.toContain('1 días');
    });

    it('en plazo y sin alerta', () => {
        expect(textoAlerta('EnPlazo', 15)).toBe('En plazo');
        expect(textoAlerta('Ninguna', null)).toBe('');
    });
});

describe('claseAlerta', () => {
    it('distingue vencido, por cerrar y en plazo', () => {
        const vencida = claseAlerta('PlazoVencido');
        const cerrar = claseAlerta('Cerrar');
        const enPlazo = claseAlerta('EnPlazo');
        expect(vencida).toContain('red');
        expect(cerrar).toContain('amber');
        expect(enPlazo).toContain('green');
        expect(claseAlerta('Ninguna')).toBe('');
    });
});

describe('textoValidacion', () => {
    it('Ok no muestra nada y los demas casos explican el problema', () => {
        expect(textoValidacion('Ok')).toBe('');
        expect(textoValidacion('FaltanDescargos')).toContain('423');
        expect(textoValidacion('SuspensionMayorA8Dias')).toContain('8');
        expect(textoValidacion('FaltanTestigos')).toContain('testigos');
    });
});

describe('pasos del acta', () => {
    it('el indice avanza con el flujo y los estados fuera de flujo no tienen paso', () => {
        const indices = PASOS_ACTA.map((p) => indicePaso(p));
        expect(indices).toEqual([0, 1, 2, 3, 4, 5]);
        expect(indicePaso('Anulada')).toBe(-1);
    });

    it('cada estatus tiene etiqueta legible', () => {
        const todos: EstatusActa[] = ['Borrador', 'Citado', 'AudienciaRealizada', 'PendienteFirmas', 'SancionAplicada', 'Cerrada', 'Anulada'];
        for (const e of todos) {
            expect(etiquetaEstatus(e).length).toBeGreaterThan(0);
        }
        expect(etiquetaEstatus('AudienciaRealizada')).toBe('Audiencia realizada');
        expect(etiquetaEstatus('PendienteFirmas')).toBe('Pendiente de firmas');
    });
});
