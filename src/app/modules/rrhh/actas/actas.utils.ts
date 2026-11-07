import { EstatusActa, NivelAlertaActa, ValidacionActa } from './actas.types';

export type AccionActa = 'editar' | 'citar' | 'audiencia' | 'sancion' | 'firma' | 'cerrar' | 'anular';

/** Pasos del procedimiento, en orden. Anulada queda fuera del flujo. */
export const PASOS_ACTA: EstatusActa[] = [
    'Borrador',
    'Citado',
    'AudienciaRealizada',
    'PendienteFirmas',
    'SancionAplicada',
    'Cerrada'
];

const ETIQUETAS_ESTATUS: Record<EstatusActa, string> = {
    Borrador: 'Borrador',
    Citado: 'Citado',
    AudienciaRealizada: 'Audiencia realizada',
    PendienteFirmas: 'Pendiente de firmas',
    SancionAplicada: 'Sanción aplicada',
    Cerrada: 'Cerrada',
    Anulada: 'Anulada'
};

export const ETIQUETAS_GRAVEDAD: Record<string, string> = {
    Leve: 'Leve',
    Grave: 'Grave',
    CausalRescision: 'Causal de rescisión'
};

export const ETIQUETAS_SANCION: Record<string, string> = {
    SinSancion: 'Sin sanción',
    AmonestacionVerbal: 'Amonestación verbal',
    AmonestacionEscrita: 'Amonestación escrita',
    Suspension: 'Suspensión sin goce (1-8 días)',
    Rescision: 'Rescisión (Art. 47)'
};

export const ETIQUETAS_FIRMA: Record<string, string> = {
    Firmo: 'Firmó',
    SeNego: 'Se negó (constancia con 2 testigos)',
    NoComparecio: 'No compareció'
};

export function etiquetaEstatus(estatus: string): string {
    return ETIQUETAS_ESTATUS[estatus as EstatusActa] ?? estatus;
}

export function indicePaso(estatus: string): number {
    return PASOS_ACTA.indexOf(estatus as EstatusActa);
}

export function claseEstatus(estatus: string): string {
    switch (estatus) {
        case 'Borrador': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
        case 'Citado': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
        case 'AudienciaRealizada': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
        case 'PendienteFirmas': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
        case 'SancionAplicada': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
        case 'Cerrada': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
        case 'Anulada': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
        default: return 'bg-gray-100 text-gray-800';
    }
}

/**
 * Acciones que se ofrecen en el detalle. El API vuelve a validar todo: aquí solo se oculta lo que no procede.
 * Quien no es gestor únicamente edita su borrador (el API solo le muestra las actas que él inició).
 */
export function accionesDisponibles(estatus: EstatusActa, editable: boolean, esGestor: boolean): AccionActa[] {
    const acciones: AccionActa[] = [];

    if (editable && (esGestor || estatus === 'Borrador')) acciones.push('editar');
    if (!esGestor) return acciones;

    switch (estatus) {
        case 'Borrador': acciones.push('citar'); break;
        case 'Citado': acciones.push('audiencia'); break;
        case 'AudienciaRealizada': acciones.push('sancion'); break;
        case 'PendienteFirmas': acciones.push('firma'); break;
        case 'SancionAplicada': acciones.push('cerrar'); break;
    }
    if (estatus !== 'Cerrada' && estatus !== 'Anulada') acciones.push('anular');
    return acciones;
}

export function textoAlerta(nivel: NivelAlertaActa, diasRestantes?: number | null): string {
    switch (nivel) {
        case 'PlazoVencido':
            return 'Plazo vencido (30 días, Art. 517 LFT)';
        case 'Cerrar': {
            const n = diasRestantes ?? 0;
            return `Cerrar: quedan ${n} ${n === 1 ? 'día' : 'días'}`;
        }
        case 'EnPlazo':
            return 'En plazo';
        default:
            return '';
    }
}

export function claseAlerta(nivel: NivelAlertaActa): string {
    switch (nivel) {
        case 'PlazoVencido': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
        case 'Cerrar': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
        case 'EnPlazo': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
        default: return '';
    }
}

export function textoValidacion(validacion: ValidacionActa): string {
    switch (validacion) {
        case 'FaltanDescargos': return 'Faltan los descargos del colaborador (Art. 423 fr. X)';
        case 'SuspensionMayorA8Dias': return 'La suspensión no puede ser mayor a 8 días';
        case 'FaltanTestigos': return 'Faltan testigos: el acta necesita los dos testigos';
        default: return '';
    }
}
