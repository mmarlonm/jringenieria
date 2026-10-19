export type EstatusSolicitud = 'PENDIENTE_JEFE' | 'PENDIENTE_RRHH' | 'APROBADA' | 'RECHAZADA' | 'CANCELADA';
export type CodigoTipoAusencia = 'VACACIONES' | 'PERMISO_CON_GOCE' | 'PERMISO_SIN_GOCE';

export interface TipoAusencia {
    tipoAusenciaId: number;
    codigo: CodigoTipoAusencia;
    nombre: string;
    requiereMotivo: boolean;
}

/** Saldo de vacaciones del periodo (de un aniversario al siguiente). Fechas como 'yyyy-MM-ddT00:00:00'. */
export interface SaldoVacaciones {
    colaboradorId: number;
    nombre: string;
    aniosAntiguedad: number;
    periodoDesde: string;
    /** Último día del periodo; el siguiente aniversario es el día después. */
    periodoHasta: string;
    derechos: number;
    ajustes: number;
    aprobados: number;
    pendientes: number;
    disponible: number;
}

export interface SolicitudGuardar {
    tipoAusenciaId: number;
    /** 'yyyy-MM-dd' (con aFechaIso de colaboradores.utils). */
    fechaInicio: string;
    fechaFin: string;
    motivo: string | null;
}

/** Cálculo en vivo del formulario: nunca falla por reglas de negocio; el motivo va en `error`. */
export interface Previsualizacion {
    diasHabiles: number;
    disponible: number;
    quedarian: number;
    error: string | null;
}

export interface SolicitudAusencia {
    solicitudId: number;
    colaboradorId: number;
    colaborador: string;
    area: string | null;
    tipo: string;
    tipoCodigo: CodigoTipoAusencia;
    fechaInicio: string;
    fechaFin: string;
    diasHabiles: number;
    motivo: string | null;
    estatus: EstatusSolicitud;
    jefeComentario: string | null;
    rrhhComentario: string | null;
    creadoEn: string;
    /** Solo en la bandeja y solo para vacaciones (0 en lo demás). */
    disponible: number;
    /** Solo en la bandeja: nombres de quienes del mismo jefe ya estarán fuera esos días. */
    traslapes: string[];
}

export type TipoCalendario = CodigoTipoAusencia | 'INCAPACIDAD' | 'FALTA';

export interface CalendarioItem {
    colaboradorId: number;
    colaborador: string;
    tipo: TipoCalendario;
    inicio: string;
    fin: string;
    estatus: 'APROBADA' | 'PENDIENTE';
}

export interface Ajuste {
    ajusteId: number;
    fecha: string;
    /** Positivo suma, negativo resta. */
    dias: number;
    motivo: string;
    registradoPor: string;
}

export interface AjusteGuardar {
    fecha: string;
    dias: number;
    motivo: string;
}

export type TipoIncidencia = 'FALTA' | 'INCAPACIDAD';
export type SubtipoIncapacidad = 'Enfermedad general' | 'Riesgo de trabajo' | 'Maternidad';

export interface Incidencia {
    incidenciaId: number;
    tipo: TipoIncidencia;
    fechaInicio: string;
    fechaFin: string;
    dias: number;
    subtipo: string | null;
    folio: string | null;
    notas: string | null;
}

export interface IncidenciaGuardar {
    tipo: TipoIncidencia;
    fechaInicio: string;
    fechaFin: string;
    subtipo: string | null;
    folio: string | null;
    notas: string | null;
}

export interface DiaNoLaborable {
    fecha: string;
    nombre: string;
}

export interface MensajeApi {
    mensaje: string;
}
