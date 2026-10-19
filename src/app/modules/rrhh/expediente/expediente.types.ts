/** Estatus del renglón de un tipo de documento; PENDIENTE es la ausencia de archivos y VENCIDO que solo hay constancias vencidas. */
export type EstatusRenglon = 'PENDIENTE' | 'EN_REVISION' | 'VALIDADO' | 'RECHAZADO' | 'VENCIDO' | 'NO_APLICA';

export interface ExpedienteDocumento {
    documentoId: number;
    estatus: 'EN_REVISION' | 'VALIDADO' | 'RECHAZADO';
    /** Nombre del curso (DC-3). */
    descripcion: string | null;
    fechaVigencia: string | null;
    porVencer: boolean;
    nombreOriginal: string;
    tamanoBytes: number;
    motivoRechazo: string | null;
    subidoEn: string;
}

export interface ExpedienteRenglon {
    tipoDocumentoId: number;
    nombre: string;
    descripcion: string | null;
    permiteVarios: boolean;
    permiteNoAplica: boolean;
    requiereVigencia: boolean;
    tieneFormato: boolean;
    estatus: EstatusRenglon;
    porVencer: boolean;
    documentos: ExpedienteDocumento[];
}

export interface Expediente {
    colaboradorId: number;
    nombre: string;
    porcentaje: number;
    validados: number;
    aplicables: number;
    renglones: ExpedienteRenglon[];
}

export interface ExpedienteLista {
    colaboradorId: number;
    codigo: string;
    nombre: string;
    sucursal: string | null;
    estatus: string;
    porcentaje: number;
    faltan: number;
    porRevisar: number;
    porVencer: number;
}

export interface ExpedienteTipo {
    tipoDocumentoId: number;
    nombre: string;
    tieneFormato: boolean;
}

export interface MensajeApi {
    mensaje: string;
}
