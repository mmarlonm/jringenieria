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
}

export interface CierreTerminalEvidencia {
    id: number;
    nombreArchivo: string;
    url?: string;
}

export interface FacturaContpaqi {
    folio: string;
    proveedor: string;
    rfc: string;
    total: number;
    fecha: string | Date;
}
