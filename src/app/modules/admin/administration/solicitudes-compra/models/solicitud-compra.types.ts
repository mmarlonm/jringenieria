export interface CatEstatusCompra {
    idEstatus: number;
    nombreEstatus: string;
    descripcion?: string;
    requiereAccion: boolean;
}

export interface SolicitudCompra {
    idSolicitud: number;
    folioOC?: string;
    fechaSolicitud: string | Date;
    sucursal: string;
    areaSolicitante: string;
    idPersonaSolicitante: number;
    proyectoCliente?: string;
    lugarEntrega?: string;
    datosBancariosProveedor?: string;
    comentariosObservaciones?: string;
    prioridad: string;
    proveedorSugerido?: string;
    fechaRequerida: string | Date;
    tipoCompra: string;
    centroCosto: string;
    folioProyecto?: string;
    moneda: string;
    formaPago?: string;
    razonSocial: string;
    idEstatus: number;
    nombreEstatus: string;

    // Relaciones
    estatus: CatEstatusCompra;
    detalles: SolicitudCompraDetalle[];
}

export interface SolicitudCompraDetalle {
    idDetalle: number;
    idSolicitud: number;
    partida: number;
    materialServicio: string;
    descripcionEspecificacion?: string;
    cantidad: number;
    unidad: string;
    observaciones?: string;
    idEstatusInicial: number;
    pendiente: number;
}

export interface SolicitudCompraCreateDto {
    idSolicitud?: number;
    folioOC?: string;
    sucursal: string;
    areaSolicitante: string;
    idPersonaSolicitante: number;
    proyectoCliente?: string;
    lugarEntrega?: string;
    datosBancariosProveedor?: string;
    comentariosObservaciones?: string;
    prioridad: string;
    proveedorSugerido?: string;
    fechaRequerida: string | Date;
    tipoCompra: string;
    centroCosto: string;
    folioProyecto?: string;
    moneda: string;
    formaPago?: string;
    razonSocial: string;
    detalles: SolicitudCompraDetalleCreateDto[];
}

export interface SolicitudCompraDetalleCreateDto {
    partida: number;
    materialServicio: string;
    descripcionEspecificacion?: string;
    cantidad: number;
    unidad: string;
    observaciones?: string;
}

export interface ProductoBuscadorDto {
    productoId: number;
    idRemoto?: number;
    codigoProducto: string;
    nombreProducto: string;
    unidadMedida: string;
}
