import {
    ClasificacionBrecha,
    EvaluacionCompetencia,
    GrupoPuesto,
    MatrizCompetencia,
    ResumenBrechas
} from './desempeno.types';

export type AccionEvaluacion = 'editar' | 'cerrar' | 'liberar' | 'retirarLiberacion' | 'reabrir';
export type AccionCompetencia = 'editar' | 'generarCapacitacion';
export type EstadoEvaluacion = 'Abierta' | 'Cerrada' | 'Liberada';

const ETIQUETAS_TIPO: Record<string, string> = {
    Competencias: 'Competencias',
    ObjetivosKpis: 'Objetivos/KPIs',
    Evaluacion360: '360°',
    Mixta: 'Mixta'
};

const ETIQUETAS_EVALUADOR: Record<string, string> = {
    Jefe: 'Jefe',
    Autoevaluacion: 'Autoevaluación',
    Par: 'Par',
    ColaboradorACargo: 'Colaborador a cargo'
};

const ETIQUETAS_ESTATUS: Record<string, string> = {
    Pendiente: 'Pendiente',
    EnProceso: 'En proceso',
    Cerrada: 'Cerrada',
    Completado: 'Completado'
};

export function etiquetaTipo(tipo: string): string {
    return ETIQUETAS_TIPO[tipo] ?? tipo;
}

export function etiquetaEvaluador(evaluador: string): string {
    return ETIQUETAS_EVALUADOR[evaluador] ?? evaluador;
}

/** Estatus de una evaluación de competencia o de un plan de desarrollo. */
export function etiquetaEstatus(estatus: string): string {
    return ETIQUETAS_ESTATUS[estatus] ?? estatus;
}

export function claseEstatus(estatus: string): string {
    switch (estatus) {
        case 'Cerrada':
        case 'Completado': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
        case 'EnProceso': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
        default: return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    }
}

export function etiquetaClasificacion(clasificacion: ClasificacionBrecha): string {
    switch (clasificacion) {
        case 'BrechaCritica': return 'Brecha crítica';
        case 'BrechaMenor': return 'Brecha menor';
        default: return 'Sin brecha';
    }
}

export function claseClasificacion(clasificacion: ClasificacionBrecha): string {
    switch (clasificacion) {
        case 'BrechaCritica': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
        case 'BrechaMenor': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
        default: return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    }
}

export function estadoEvaluacion(ev: { cicloCerrado: boolean; resultadoLiberado: boolean }): EstadoEvaluacion {
    if (!ev.cicloCerrado) return 'Abierta';
    return ev.resultadoLiberado ? 'Liberada' : 'Cerrada';
}

export function claseEstadoEvaluacion(estado: EstadoEvaluacion): string {
    switch (estado) {
        case 'Liberada': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
        case 'Cerrada': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
        default: return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    }
}

/**
 * Acciones de una evaluación de desempeño. El API vuelve a validar todo: aquí solo se oculta lo que no procede.
 * Liberar el resultado al colaborador y reabrir el ciclo son de RRHH.
 */
export function accionesEvaluacion(ev: { cicloCerrado: boolean; resultadoLiberado: boolean }, esGestor: boolean): AccionEvaluacion[] {
    if (!ev.cicloCerrado) return ['editar', 'cerrar'];
    if (!esGestor) return [];
    return ev.resultadoLiberado ? ['retirarLiberacion', 'reabrir'] : ['liberar', 'reabrir'];
}

export function accionesCompetencia(
    ev: Pick<EvaluacionCompetencia, 'estatus' | 'requiereCapacitacion' | 'capacitacionId'>,
    esGestor: boolean
): AccionCompetencia[] {
    const acciones: AccionCompetencia[] = [];
    if (ev.estatus !== 'Cerrada') acciones.push('editar');
    if (esGestor && ev.requiereCapacitacion && !ev.capacitacionId) acciones.push('generarCapacitacion');
    return acciones;
}

export function agruparMatrizPorPuesto(filas: MatrizCompetencia[]): GrupoPuesto[] {
    const mapa = new Map<string, MatrizCompetencia[]>();
    for (const f of filas) {
        const lista = mapa.get(f.puesto) ?? [];
        lista.push(f);
        mapa.set(f.puesto, lista);
    }
    return Array.from(mapa.entries())
        .sort(([a], [b]) => a.localeCompare(b, 'es'))
        .map(([puesto, competencias]) => ({
            puesto,
            competencias: [...competencias].sort((a, b) => a.competencia.localeCompare(b.competencia, 'es'))
        }));
}

export function resumenBrechas(evaluaciones: EvaluacionCompetencia[]): ResumenBrechas {
    return {
        total: evaluaciones.length,
        conBrecha: evaluaciones.filter((e) => e.requiereCapacitacion).length,
        criticas: evaluaciones.filter((e) => e.clasificacion === 'BrechaCritica').length,
        sinCapacitacion: evaluaciones.filter((e) => e.requiereCapacitacion && !e.capacitacionId).length
    };
}

/** Fecha de hoy en formato yyyy-MM-dd según el reloj local del navegador. */
export function hoyIso(): string {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Recorta una fecha del API ("2026-11-06T00:00:00") a yyyy-MM-dd para un input de fecha. */
export function aFechaInput(fecha?: string | null): string {
    return fecha ? fecha.substring(0, 10) : '';
}
