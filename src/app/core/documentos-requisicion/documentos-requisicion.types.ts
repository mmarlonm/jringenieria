export type EstadoTipoDocumento = 'Completo' | 'EnRevision' | 'Rechazado' | 'Falta';
export type EstatusDocumento = 'Pendiente' | 'Aprobado' | 'Rechazado';

export interface DocumentoRequisicion {
    idDocumento: number;
    tipoDocumento: string;
    nombreOriginal: string;
    tamanoBytes: number;
    estatus: EstatusDocumento;
    subidoPor: number;
    nombreSubidoPor?: string | null;
    fechaSubida: string;
    revisadoPor?: number | null;
    nombreRevisor?: string | null;
    fechaRevision?: string | null;
    comentarioRevision?: string | null;
    aprobadoAutomaticamente: boolean;
}

export interface TipoRequerido {
    tipo: string;
    nombre: string;
    extensiones: string[];
    estado: EstadoTipoDocumento;
    total: number;
    aprobados: number;
    pendientes: number;
    rechazados: number;
}

export interface DocumentacionRequisicion {
    idSolicitud: number;
    aplica: boolean;
    completa: boolean;
    cerrada: boolean;
    estadoLiquidacion: number;
    requeridos: TipoRequerido[];
    documentos: DocumentoRequisicion[];
    motivoNoCierre?: string | null;
}

export interface ResumenTipo {
    tipo: string;
    nombre: string;
    estado: EstadoTipoDocumento;
}

/** Resumen que trae cada requisición en la lista del tablero. */
export interface ResumenDocumentacion {
    aplica: boolean;
    completa: boolean;
    requeridosCompletos: number;
    requeridosTotal: number;
    requeridos: ResumenTipo[];
}

export type ColorChip = 'verde' | 'ambar' | 'rojo';
