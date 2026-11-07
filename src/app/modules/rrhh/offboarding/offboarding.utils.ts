import {
    EstatusOffboarding,
    EstatusTareaOffboarding,
    GrupoResponsable,
    NivelAlertaBajaImss,
    TareaOffboarding
} from './offboarding.types';

export type AccionOffboarding = 'editar' | 'autorizar' | 'registrarBaja' | 'cerrar' | 'cancelar';

const ETIQUETAS_CAUSA: Record<string, string> = {
    RenunciaConAviso: 'Renuncia con aviso',
    RenunciaInmediata: 'Renuncia inmediata',
    DespidoJustificado: 'Despido justificado (Art. 47)',
    DespidoInjustificadoConvenio: 'Despido injustificado / convenio',
    TerminoContratoObra: 'Término de contrato u obra',
    PeriodoPruebaNoAprobado: 'Periodo de prueba no aprobado',
    MutuoConsentimiento: 'Mutuo consentimiento',
    Defuncion: 'Defunción',
    Incapacidad: 'Incapacidad (Art. 53)'
};

const ETIQUETAS_ESTATUS: Record<EstatusOffboarding, string> = {
    Abierto: 'Abierto',
    BajaRegistrada: 'Baja registrada',
    Cerrado: 'Cerrado',
    Cancelado: 'Cancelado'
};

const ETIQUETAS_TAREA: Record<EstatusTareaOffboarding, string> = {
    Pendiente: 'Pendiente',
    EnProceso: 'En proceso',
    Hecha: 'Hecha',
    NoAplica: 'No aplica'
};

const ETIQUETAS_RECONTRATABLE: Record<string, string> = {
    SI: 'Sí',
    CON_RESERVAS: 'Con reservas',
    NO: 'No'
};

export function etiquetaCausa(causa: string): string {
    return ETIQUETAS_CAUSA[causa] ?? causa;
}

export function etiquetaEstatus(estatus: string): string {
    return ETIQUETAS_ESTATUS[estatus as EstatusOffboarding] ?? estatus;
}

export function etiquetaTarea(estatus: string): string {
    return ETIQUETAS_TAREA[estatus as EstatusTareaOffboarding] ?? estatus;
}

export function etiquetaRecontratable(valor?: string | null): string {
    return valor ? (ETIQUETAS_RECONTRATABLE[valor] ?? valor) : '—';
}

export function claseEstatus(estatus: string): string {
    switch (estatus) {
        case 'Abierto': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
        case 'BajaRegistrada': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
        case 'Cerrado': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
        case 'Cancelado': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
        default: return 'bg-gray-100 text-gray-800';
    }
}

export function claseTarea(estatus: string): string {
    switch (estatus) {
        case 'Hecha': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
        case 'EnProceso': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
        case 'NoAplica': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
        default: return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    }
}

export function textoAlertaImss(nivel: NivelAlertaBajaImss): string {
    switch (nivel) {
        case 'Vencida': return 'Plazo de baja IMSS vencido';
        case 'PorVencer': return 'Baja IMSS por vencer';
        case 'EnTiempo': return 'Baja IMSS en tiempo';
        case 'Registrada': return 'Baja IMSS registrada';
        default: return '';
    }
}

export function claseAlertaImss(nivel: NivelAlertaBajaImss): string {
    switch (nivel) {
        case 'Vencida': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
        case 'PorVencer': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
        case 'EnTiempo': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
        case 'Registrada': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
        default: return '';
    }
}

/**
 * Acciones del caso. El API vuelve a validar todo: aquí solo se oculta lo que no procede.
 * Ninguna tarea del checklist condiciona registrar la baja; el API informa las condiciones legales pendientes.
 */
export function accionesDisponibles(
    caso: { estatus: EstatusOffboarding; ruta: number; autorizadaDireccion: boolean },
    puedeAutorizar: boolean
): AccionOffboarding[] {
    if (caso.estatus === 'BajaRegistrada') return ['cerrar'];
    if (caso.estatus !== 'Abierto') return [];

    const acciones: AccionOffboarding[] = ['editar'];
    if (caso.ruta === 4 && !caso.autorizadaDireccion && puedeAutorizar) acciones.push('autorizar');
    acciones.push('registrarBaja', 'cancelar');
    return acciones;
}

/** Agrupa el checklist por responsable (RRHH, TI, Finanzas...) en el orden en que aparecen. */
export function agruparPorResponsable(tareas: TareaOffboarding[]): GrupoResponsable[] {
    const grupos = new Map<string, GrupoResponsable>();
    for (const t of tareas) {
        let g = grupos.get(t.responsable);
        if (!g) {
            g = { responsable: t.responsable, tareas: [], pendientes: 0 };
            grupos.set(t.responsable, g);
        }
        g.tareas.push(t);
        if (t.estatus !== 'Hecha' && t.estatus !== 'NoAplica') g.pendientes++;
    }
    return Array.from(grupos.values());
}

export function porcentajeAvance(total: number, resueltas: number): number {
    if (total <= 0) return 0;
    return Math.min(100, Math.round((resueltas / total) * 100));
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
