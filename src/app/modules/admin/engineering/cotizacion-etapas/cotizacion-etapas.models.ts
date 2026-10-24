export const ESTATUS_ETAPA = {
    Pendiente: 1,
    EnProceso: 2,
    Autorizada: 3,
    Rechazada: 4,
    NoAplica: 5
} as const;

export const INFORMACION = {
    Suficiente: 1,
    Insuficiente: 2,
    NoHay: 3
} as const;

export interface CotizacionEtapasListItemDto {
    idSeguimiento: number;
    etapaActual: number;
    idSolicitante: number;
    solicitanteNombre?: string;
    solicitanteEmpresa?: string;
    actividad: string;
    tituloProyecto?: string;
    tipo?: string;
    sucursalId?: number | null;
    estatusEtapaActual: number;
    responsableEtapaActualId?: number | null;
    responsableEtapaActualNombre?: string;
    esAliado: boolean;
    revisionActualNumero: number;
    montoTotalEstimado?: number | null;
    fechaRegistro?: string;
    cancelado: boolean;
    motivoCancelacion?: string | null;
}

export interface CotizacionEtapasArchivoDto {
    nombreArchivo: string;
}

export interface CotizacionEtapasRevisionDto {
    idRevision: number;
    idEtapa: number;
    numero: number;
    fechaElaboracion?: string | null;
    resultado: number;
    monto?: number | null;
    queCambio?: string | null;
    autorizadorUsuarioId?: number | null;
    autorizadorNombre?: string | null;
    fechaAutorizacion?: string | null;
    motivoRechazo?: string | null;
    historica: boolean;
    carpetaLegada?: string | null;
    fechaCreacion: string;
}

export interface CotizacionEtapaDto {
    idEtapa: number;
    idSeguimiento: number;
    etapa: number;
    estatus: number;
    responsableUsuarioId?: number | null;
    responsableNombre?: string | null;
    responsableAliadoId?: number | null;
    responsableAliadoNombre?: string | null;
    esAliado: boolean;
    autorizadorDesignadoUsuarioId?: number | null;
    autorizadorDesignadoNombre?: string | null;
    informacionBrindada?: number | null;
    fechaProgramada?: string | null;
    montoTotalEstimado?: number | null;
    fechaInicio?: string | null;
    fechaFin?: string | null;
    notas?: string | null;
    revisiones: CotizacionEtapasRevisionDto[];
}

export interface CotizacionEtapasDetalleDto {
    idSeguimiento: number;
    idSolicitante: number;
    solicitanteNombre?: string | null;
    solicitanteEmpresa?: string | null;
    actividad: string;
    tituloProyecto?: string | null;
    tipo?: string | null;
    sucursalId?: number | null;
    etapaActual: number;
    cancelado: boolean;
    motivoCancelacion?: string | null;
    fechaRequisicion?: string | null;
    fechaRegistro?: string;
    montoTotalEstimado?: number | null;
    etapas: CotizacionEtapaDto[];
}

export interface CrearCasoDto {
    idSolicitante: number;
    fechaRequisicion?: string | null;
    tipo: string;
    sucursalId?: number | null;
    tituloProyecto: string;
    actividad: string;
    responsableUsuarioId?: number | null;
    responsableAliadoId?: number | null;
    esAliado: boolean;
}

export interface GuardarEtapaDto {
    responsableUsuarioId?: number | null;
    responsableAliadoId?: number | null;
    esAliado?: boolean;
    autorizadorDesignadoUsuarioId?: number | null;
    informacionBrindada?: number | null;
    fechaProgramada?: string | null;
    montoTotalEstimado?: number | null;
    notas?: string | null;
    queCambioUltimaRevision?: string | null;
}

export interface CambiarEstatusDto {
    nuevoEstatus: number;
    etapaSiguiente?: number | null;
    motivoRechazo?: string | null;
    montoTotalEstimado?: number | null;
}
