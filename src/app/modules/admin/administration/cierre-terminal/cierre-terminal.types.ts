export interface CierreTerminalResponse {
    detalle: {
        datosCierre: CierreTerminal;
        facturasContpaqi: FacturaContpaqi[];
    };
    evidencias: string[];
}

export interface CierreTerminal {
    id?: number;
    sucursal: string;
    fechaCierre: string | Date;
    afiliacion: string;
    montoTotal: number;
    foliosFacturas: string; 
    observaciones?: string;
    usuarioId?: number;
    fechaRegistro?: string | Date;
    unidadDeNegocioId?: number;
    nombreUnidadNegocio?: string;
}

export interface CierreTerminalEvidencia {
    id: number;
    nombreArchivo: string;
    url?: string;
}

export interface FacturaContpaqi {
    serie: string;
    folio: string;
    tipo_Factura: string;
    fecha: string | Date;
    cliente_Proveedor: string;
    subtotal: number;
    iva: number;
    total: number;
    saldo_Pendiente: number;
    estatus: string;
    banco: string | null;
    cuenta: string | null;
    clabe: string | null;
}
