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
    cliente?: string;
    esRecurrente: boolean;
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
    rfc?: string; // Provider RFC (flattened for display)
    banco?: string; // Provider Bank (flattened for display)
    cuenta?: string; // Provider Account (flattened for display)
    clabe?: string; // Provider CLABE (flattened for display)
    monto?: number;
    cuadranteId?: number;
    idEstatus: number;
    nombreEstatus: string;
    datosFacturaContpaqi?: any;
    estadoLiquidacion: number;

    idAprobador?: number;
    esAprobada: boolean;
    fechaAprobacion?: string | Date;

    // Aprobación de Crédito
    idAprobadorCredito?: number;
    nombreAprobadorCredito?: string;
    esAprobadaCredito: boolean;
    fechaAprobacionCredito?: string | Date;

    // Auditoría
    createdDate?: string | Date;
    idUsuarioLogueado?: number;
    nombreUsuarioCreacion?: string;

    // Relaciones
    estatus: CatEstatusCompra;
    detalles: SolicitudCompraDetalle[];
    proveedores: SolicitudCompraProveedor[];
    anticipos?: AnticipoDto[];
}

export interface SolicitudCompraProveedor {
    idSolicitudProveedor?: number;
    idSolicitud?: number;
    razonSocial: string;
    rfc?: string;
    banco?: string;
    cuenta?: string;
    clabe?: string;
    esSeleccionado: boolean;
    comentarios?: string;
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
    cliente?: string;
    esRecurrente: boolean;
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
    monto?: number;
    cuadranteId?: number;
    idAprobador?: number;
    idAprobadorCredito?: number;
    IdUsuarioLogueado?: number;
    detalles: SolicitudCompraDetalleCreateDto[];
    proveedores: SolicitudCompraProveedor[];
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
    existencia?: number;
    almacen?: string;
}

export interface HistorialEstatusDto {
    idHistorial: number;
    idEstatus: number;
    nombreEstatus: string;
    idUsuario: number;
    fechaCambio: string | Date;
    comentarios?: string;
}

export interface ProveedorDto {
    codigo: string;
    nombre: string;
    rfc: string;
    cuenta_Bancaria?: string;
    email?: string;
    tipo?: string;
    banco?: string;
    cuenta?: string;
    clabe?: string;
}

export interface ContpaqiMaterialDto {
    materialServicio: string;
    descripcion: string;
    unidad: string;
    cantidad: number;
    costoUnitario: number;
    iva: number;
    total: number;
    selected?: boolean; // UI only
}

export interface AnticipoDto {
    idAnticipo?: number;
    monto: number;
    fechaProgramada: string | Date;
    comentarios?: string;
    idEstatusPago?: number;
    fechaRegistro?: string | Date;
}
