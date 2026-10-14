export interface SolicitudSalidaAlmacen {
    id: number;
    folio: string;
    fechaSolicitud: string | Date;
    idProyecto?: number;
    nombreProyecto?: string;
    idUsuarioSolicita?: number;
    nombreSolicitante?: string;
    observacionesNotas?: string;
    estatus: 'Pendiente' | 'Surtido Parcial' | 'Surtido Completo' | 'Cancelada';
    fechaEntrega?: string | Date;
    idUsuarioEntrega?: number;
    nombreUsuarioEntrega?: string;
    folioSalidaContpaq?: string;
    createdDate: string | Date;
    totalPartidas: number;
    partidasCompletas: number;
    partidasParciales: number;
    partidasSinSurtir: number;
    porcentajeSurtido: number;
    detalles: SolicitudSalidaAlmacenDetalle[];
}

export interface SolicitudSalidaAlmacenDetalle {
    id: number;
    codigoProducto?: string;
    descripcion: string;
    unidadMedida: string;
    cantidadSolicitada: number;
    cantidadEntregada: number;
    diferencia: number;
    esManual: boolean;
    estatusPartida: 'Surtido Completo' | 'Surtido Parcial' | 'No Surtido';
    notas?: string;
}

export interface SolicitudSalidaAlmacenCreateDto {
    idProyecto?: number;
    nombreProyecto?: string;
    idUsuarioSolicita?: number;
    nombreSolicitante?: string;
    observacionesNotas?: string;
    detalles: {
        codigoProducto?: string;
        descripcion: string;
        unidadMedida: string;
        cantidadSolicitada: number;
        esManual: boolean;
        notas?: string;
    }[];
}

export interface RegistrarEntregaSalidaDto {
    fechaEntrega?: string | Date;
    idUsuarioEntrega?: number;
    nombreUsuarioEntrega?: string;
    folioSalidaContpaq?: string;
    partidas: {
        idDetalle: number;
        cantidadEntregada: number;
        notas?: string;
    }[];
}

export interface MaterialAlmacenDto {
    codigo: string;
    nombre: string;
    existencia: number;
    unidad: string;
    almacen: string;
    estatus?: string;
}
