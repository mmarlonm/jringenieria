export interface CapacitacionResumen {
    capacitacionId: number;
    folio: string;
    areaOProceso: string;
    puestoImpactado: string;
    competencia: string;
    tipo: string;
    origen: string;
    objetivo?: string;
    proveedorOInstructor: string;
    fechaProgramada: string;
    fechaTermino?: string | null;
    duracionHoras: number;
    costoEstimado?: number | null;
    costoReal?: number | null;
    estatus: string;
    evaluacionEficaciaPorcentaje?: number | null;
    resultadoEficacia: string;
    vigenciaMeses?: number | null;
    fechaVencimiento?: string | null;
    semaforoVencimiento: 'Rojo' | 'Amarillo' | 'Verde' | 'SinVigencia' | string;
    dc3Emitida: boolean;
    agenteCapacitadorDc5: string;
    razonSocial: string;
    totalParticipantes: number;
    totalAprobados: number;
    creadoEn: string;
}

export interface CapacitacionDetalle extends CapacitacionResumen {
    retroalimentacionColaborador?: string | null;
    motivoCancelacion?: string | null;
    actualizadoEn?: string | null;
    participantes: CapacitacionParticipante[];
}

export interface CapacitacionParticipante {
    participanteId: number;
    capacitacionId: number;
    colaboradorId?: number | null;
    colaboradorNombre: string;
    asistio: boolean;
    aprobado?: boolean | null;
    calificacion?: number | null;
    constanciaEntregada: boolean;
    dc3Entregada: boolean;
    observaciones?: string | null;
    creadoEn: string;
}

export interface CrearCapacitacionDto {
    areaOProceso: string;
    puestoImpactado: string;
    competencia: string;
    tipo: string;
    origen: string;
    objetivo?: string | null;
    proveedorOInstructor: string;
    fechaProgramada: string;
    fechaTermino?: string | null;
    duracionHoras: number;
    costoEstimado?: number | null;
    costoReal?: number | null;
    vigenciaMeses?: number | null;
    dc3Emitida?: boolean;
    agenteCapacitadorDc5?: string | null;
    razonSocial: string;
}

export interface ActualizarCapacitacionDto extends CrearCapacitacionDto {}

export interface CambiarEstatusCapacitacionDto {
    nuevoEstatus: string;
    motivoCancelacion?: string | null;
    fechaTermino?: string | null;
}

export interface RegistrarEficaciaDto {
    evaluacionEficaciaPorcentaje?: number | null;
    retroalimentacionColaborador?: string | null;
}

export interface AgregarParticipanteDto {
    colaboradorId?: number | null;
    colaboradorNombre: string;
    asistio: boolean;
    aprobado?: boolean | null;
    calificacion?: number | null;
    constanciaEntregada: boolean;
    dc3Entregada: boolean;
    observaciones?: string | null;
}

export interface ActualizarParticipanteDto extends AgregarParticipanteDto {}

export const ESTATUS_CAPACITACION = [
    'Programada',
    'EnCurso',
    'Completada',
    'Cancelada'
] as const;

export const TIPOS_CAPACITACION = [
    'Interna',
    'Externa',
    'En línea',
    'Mixta'
] as const;

export const ORIGENES_CAPACITACION = [
    'DNC',
    'Plan Anual',
    'Inducción',
    'Requisito Legal',
    'Auditoría',
    'Solicitud Jefe'
] as const;

export const SEMAFOROS_VENCIMIENTO = {
    Rojo: { label: 'Vencida', class: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    Amarillo: { label: 'Por Vencer (≤30d)', class: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
    Verde: { label: 'Vigente', class: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    SinVigencia: { label: 'Sin Vigencia', class: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400' }
} as const;
