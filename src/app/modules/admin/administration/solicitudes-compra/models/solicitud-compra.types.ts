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
    rfc?: string;
    monto?: number;
    cuadranteId?: number;
    idEstatus: number;
    nombreEstatus: string;
    datosFacturaContpaqi?: any;
    estadoLiquidacion: number;

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
    monto?: number;
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
    rfc?: string;
    monto?: number;
    cuadranteId?: number;
    detalles: SolicitudCompraDetalleCreateDto[];
}

export interface SolicitudCompraDetalleCreateDto {
    partida: number;
    materialServicio: string;
    descripcionEspecificacion?: string;
    cantidad: number;
    unidad: string;
    observaciones?: string;
    monto?: number;
}

export interface ProductoBuscadorDto {
    productoId: number;
    idRemoto?: number;
    codigoProducto: string;
    nombreProducto: string;
    unidadMedida: string;
}

export interface HistorialEstatusDto {
    idHistorial: number;
    idEstatus: number;
    nombreEstatus: string;
    idUsuario: number;
    fechaCambio: string | Date;
    comentarios?: string;
}
