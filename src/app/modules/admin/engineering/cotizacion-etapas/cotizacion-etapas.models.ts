export const ESTATUS_ETAPA = {
    Pendiente: 1,
    EnProceso: 2,
    Autorizada: 3,
    Rechazada: 4,
    NoAplica: 5,
    AutorizadaInterna: 6
} as const;

export const INFORMACION = {
    Suficiente: 1,
    Insuficiente: 2,
    NoHay: 3
} as const;

export interface CotizacionEtapasListItemDto {
    idSeguimiento: number;
    titulo: string;
    solicitanteNombre: string;
    empresa: string;
    tipo: string;
    sucursalId?: number | null;
    etapaActual: number;
    estatusEtapa: number;
    revisionActual: number;
    responsableNombre?: string | null;
    monto?: number | null;
    fechaRegistro: string;
    cancelado: boolean;
}

export interface CotizacionEtapaArchivoVersionDto {
    version: number;
    observacion?: string | null;
    subidoPorNombre?: string | null;
    fecha?: string | null;
    tamanoBytes?: number;
}

export interface CotizacionEtapasArchivoDto {
    nombreArchivo: string;
    version?: number;
    observacion?: string | null;
    subidoPorNombre?: string | null;
    fecha?: string | null;
    tamanoBytes?: number;
    versiones?: CotizacionEtapaArchivoVersionDto[];
}

/** Archivo de evidencia subido en una revisión de una etapa (la API lista los de todas las etapas del caso). */
export interface CotizacionEtapasArchivoCasoDto {
    etapa: number;
    revision: number;
    nombreArchivo: string;
    version?: number;
    observacion?: string | null;
}

export interface CotizacionEtapasRevisionDto {
    numero: number;
    fechaElaboracion?: string | null;
    elaboradoPorUsuarioId?: number | null;
    elaboradoPorNombre?: string | null;
    queCambio?: string | null;
    monto?: number | null;
    resultado: number;
    observacionesAutorizacion?: string | null;
    autorizadoPorNombre?: string | null;
    fechaAutorizacion?: string | null;
    enviadaAutorizarFecha?: string | null;
    enviadaAutorizarPorNombre?: string | null;
    clienteResultado?: number | null;
    clienteFecha?: string | null;
    clienteReferencia?: string | null;
    clienteObservaciones?: string | null;
    clienteRegistradoPorNombre?: string | null;
    historica: boolean;
    carpetaLegada?: string | null;
}

export interface AutorizacionClienteDto {
    resultado: 3 | 4;
    fecha?: string | null;
    referencia?: string | null;
    observaciones?: string | null;
}

export interface CotizacionEtapaDto {
    etapa: number;
    estatus: number;
    fechaProgramada?: string | null;
    responsableUsuarioId?: number | null;
    responsableNombre?: string | null;
    responsableAliadoId?: number | null;
    esAliado: boolean;
    autorizaUsuarioId?: number | null;
    autorizaNombre?: string | null;
    informacionSuficiente?: number | null;
    observacionesInformacion?: string | null;
    revisiones: CotizacionEtapasRevisionDto[];
}

export interface CotizacionEtapasDetalleDto {
    idSeguimiento: number;
    titulo: string;
    descripcion: string;
    tipo: string;
    idSolicitante: number;
    solicitanteNombre: string;
    empresa: string;
    sucursalId?: number | null;
    fechaRequisicion?: string | null;
    /** Quien registró el caso: junto con los administradores, puede eliminarlo si se cancela. */
    idUsuarioRegistro: number;
    etapaActual: number;
    cancelado: boolean;
    motivoRechazo?: string | null;
    montoTotalEstimado?: number | null;
    etapas: CotizacionEtapaDto[];
}

export interface CrearCasoDto {
    idSolicitante: number;
    titulo: string;
    descripcion: string;
    tipo: string;
    sucursalId?: number | null;
    fechaRequisicion?: string | null;
    responsableUsuarioId?: number | null;
    responsableAliadoId?: number | null;
    esAliado: boolean;
}

export interface GuardarEtapaDto {
    responsableUsuarioId?: number | null;
    responsableAliadoId?: number | null;
    esAliado?: boolean;
    autorizaUsuarioId?: number | null;
    fechaProgramada?: string | null;
    informacionSuficiente?: number | null;
    observacionesInformacion?: string | null;
    fechaElaboracion?: string | null;
    queCambio?: string | null;
    monto?: number | null;
}

export interface CambiarEstatusDto {
    estatus: number;
    observaciones?: string | null;
    etapaSiguiente?: number | null;
    montoTotalEstimado?: number | null;
}
