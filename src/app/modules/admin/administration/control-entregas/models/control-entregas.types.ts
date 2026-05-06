export interface EntregaDetalleDto {
    idEntrega?: number;
    cantidadEntregada: number;
    fechaEntrega: string | Date;
    observaciones?: string;
    idUsuario?: number;
    nombreUsuario?: string;
}

export interface MaterialEntregaDto {
    folioFactura: string;
    nombreCliente: string;
    idPartida: number;
    numeroPartida: number;
    codigoProducto: string;
    descripcion: string;
    cantidadFacturada: number;
    historialSurtidos: number[];
    surtidoAcumulado: number;
    surtidoPendiente: number;
    status: 'COMPLETO' | 'PARCIAL' | 'PENDIENTE';
}

export interface MaestroEntregaDto {
    idFacturaMaestro?: number;
    folio: string;
    cliente: string;
    itemsCount: number;
    cantidadTotal: number;
    entregadoTotal: number;
    saldoTotal: number;
    estatus: 'COMPLETO' | 'PARCIAL' | 'PENDIENTE';
    ultimaSincronizacion: string | Date;
    fechaFacturacion?: string | Date;
    sincronizadoDesdeContpaq?: boolean;
}

export interface ControlFacturaMaestro {
    idFacturaMaestro: number;
    folioFactura: string;
    nombreCliente: string;
    fechaFacturacion?: string | Date;
    sincronizadoDesdeContpaq: boolean;
    createdBy: number;
    createdDate: string | Date;
    updatedBy?: number;
    updatedDate?: string | Date;
    partidas: ControlFacturaPartida[];
}

export interface ControlFacturaPartida {
    idPartida: number;
    idFacturaMaestro: number;
    numeroPartida: number;
    codigoProducto: string;
    descripcion: string;
    cantidadFacturada: number;
    surtidos: any[]; // Historial de entregas
}

export interface RegistroEntregaDto {
    idPartida: number;
    cantidadEntregada: number;
    idUsuarioAlmacen: number;
    observaciones?: string;
}
