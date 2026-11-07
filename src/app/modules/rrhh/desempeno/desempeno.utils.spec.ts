import {
    accionesCompetencia,
    accionesEvaluacion,
    agruparMatrizPorPuesto,
    claseClasificacion,
    estadoEvaluacion,
    etiquetaClasificacion,
    etiquetaEstatus,
    etiquetaEvaluador,
    etiquetaTipo,
    resumenBrechas
} from './desempeno.utils';
import { EvaluacionCompetencia, MatrizCompetencia } from './desempeno.types';

function competencia(parcial: Partial<EvaluacionCompetencia>): EvaluacionCompetencia {
    return {
        evaluacionId: 1,
        colaboradorId: 1,
        colaboradorNombre: 'ANA',
        competencia: 'NOM-029',
        nivelRequerido: 4,
        nivelActual: 2,
        brecha: 2,
        clasificacion: 'BrechaCritica',
        requiereCapacitacion: true,
        estatus: 'Pendiente',
        creadoEn: '2026-11-01',
        ...parcial
    };
}

describe('estadoEvaluacion', () => {
    it('abierta, cerrada o liberada según el ciclo', () => {
        expect(estadoEvaluacion({ cicloCerrado: false, resultadoLiberado: false })).toBe('Abierta');
        expect(estadoEvaluacion({ cicloCerrado: true, resultadoLiberado: false })).toBe('Cerrada');
        expect(estadoEvaluacion({ cicloCerrado: true, resultadoLiberado: true })).toBe('Liberada');
    });
});

describe('accionesEvaluacion', () => {
    it('mientras el ciclo está abierto se edita y se cierra, sea o no gestor', () => {
        expect(accionesEvaluacion({ cicloCerrado: false, resultadoLiberado: false }, false)).toEqual(['editar', 'cerrar']);
        expect(accionesEvaluacion({ cicloCerrado: false, resultadoLiberado: false }, true)).toEqual(['editar', 'cerrar']);
    });

    it('cerrada: solo RRHH puede liberarla o reabrirla', () => {
        expect(accionesEvaluacion({ cicloCerrado: true, resultadoLiberado: false }, true)).toEqual(['liberar', 'reabrir']);
        expect(accionesEvaluacion({ cicloCerrado: true, resultadoLiberado: false }, false)).toEqual([]);
    });

    it('liberada: solo RRHH puede retirar la liberación o reabrirla', () => {
        expect(accionesEvaluacion({ cicloCerrado: true, resultadoLiberado: true }, true)).toEqual(['retirarLiberacion', 'reabrir']);
        expect(accionesEvaluacion({ cicloCerrado: true, resultadoLiberado: true }, false)).toEqual([]);
    });
});

describe('accionesCompetencia', () => {
    it('se edita mientras no esté cerrada', () => {
        expect(accionesCompetencia(competencia({ estatus: 'Pendiente' }), false)).toEqual(['editar']);
        expect(accionesCompetencia(competencia({ estatus: 'Cerrada' }), false)).toEqual([]);
    });

    it('RRHH puede generar la capacitación cuando hay brecha y aún no se generó', () => {
        expect(accionesCompetencia(competencia({}), true)).toEqual(['editar', 'generarCapacitacion']);
        expect(accionesCompetencia(competencia({ capacitacionId: 8 }), true)).toEqual(['editar']);
        expect(accionesCompetencia(competencia({ requiereCapacitacion: false, brecha: 0, clasificacion: 'SinBrecha' }), true)).toEqual(['editar']);
    });

    it('quien no es RRHH nunca genera capacitaciones', () => {
        expect(accionesCompetencia(competencia({}), false)).not.toContain('generarCapacitacion');
    });

    it('una cerrada con brecha pendiente de capacitar todavía puede generarla (RRHH)', () => {
        expect(accionesCompetencia(competencia({ estatus: 'Cerrada' }), true)).toEqual(['generarCapacitacion']);
    });
});

describe('agruparMatrizPorPuesto', () => {
    const fila = (id: number, puesto: string, comp: string): MatrizCompetencia => ({ matrizId: id, puesto, competencia: comp, nivelRequerido: 3 });

    it('agrupa por puesto ordenando puestos y competencias', () => {
        const grupos = agruparMatrizPorPuesto([
            fila(1, 'Técnico', 'NOM-029'),
            fila(2, 'Almacenista', 'Inventarios'),
            fila(3, 'Técnico', 'Alturas')
        ]);

        expect(grupos.map((g) => g.puesto)).toEqual(['Almacenista', 'Técnico']);
        expect(grupos[1].competencias.map((c) => c.competencia)).toEqual(['Alturas', 'NOM-029']);
    });

    it('sin filas devuelve una lista vacía', () => {
        expect(agruparMatrizPorPuesto([])).toEqual([]);
    });
});

describe('resumenBrechas', () => {
    it('cuenta evaluaciones, brechas, críticas y las que faltan por capacitar', () => {
        const r = resumenBrechas([
            competencia({ evaluacionId: 1 }),                                                        // crítica, sin capacitación
            competencia({ evaluacionId: 2, brecha: 1, clasificacion: 'BrechaMenor', capacitacionId: 5 }), // menor, ya capacitada
            competencia({ evaluacionId: 3, brecha: 0, clasificacion: 'SinBrecha', requiereCapacitacion: false })
        ]);

        expect(r).toEqual({ total: 3, conBrecha: 2, criticas: 1, sinCapacitacion: 1 });
    });
});

describe('textos y clases', () => {
    it('etiquetas de clasificación y color', () => {
        expect(etiquetaClasificacion('SinBrecha')).toBe('Sin brecha');
        expect(etiquetaClasificacion('BrechaMenor')).toBe('Brecha menor');
        expect(etiquetaClasificacion('BrechaCritica')).toBe('Brecha crítica');
        expect(claseClasificacion('SinBrecha')).toContain('green');
        expect(claseClasificacion('BrechaMenor')).toContain('amber');
        expect(claseClasificacion('BrechaCritica')).toContain('red');
    });

    it('etiquetas de las listas del Excel', () => {
        expect(etiquetaTipo('ObjetivosKpis')).toBe('Objetivos/KPIs');
        expect(etiquetaTipo('Evaluacion360')).toBe('360°');
        expect(etiquetaEvaluador('Autoevaluacion')).toBe('Autoevaluación');
        expect(etiquetaEvaluador('ColaboradorACargo')).toBe('Colaborador a cargo');
        expect(etiquetaEstatus('EnProceso')).toBe('En proceso');
        expect(etiquetaEstatus('Completado')).toBe('Completado');
        expect(etiquetaTipo('Otro')).toBe('Otro');
    });
});
