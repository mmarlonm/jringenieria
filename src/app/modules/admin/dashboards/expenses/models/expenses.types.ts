export interface GastoSubtipo {
    subtipoId: number;
    nombre: string;
    conceptoId: number; // 👈 NUEVO: Ahora indica a qué concepto pertenece
    activo: boolean;
}

export interface Expense {
    gastoId: number;
    fecha: string | Date;
    nombreGasto: string;
    cantidad: number;
    impuestos: number;

    // IDs de catálogos
    tipoId: number;
    conceptoId: number;
    subtipoId: number;
    areaId: number;
    proveedor: any;
    formaPagoId: number;
    cuentaId: number;
    tasaId: number;
    unidadId: number;
    usuarioId: number;
    factura?: string;
    descripcion?: string;
    tipoMovimiento?: number;
    esIngreso?: boolean;

    // 👈 NUEVOS CAMPOS FISCALES
    folioFiscal?: string;       // UUID del SAT
    tipoComprobante?: string;   // I, E, P
    moneda: string;             // MXN, USD, EUR
    numeroCuenta?: string;      // Terminación de cuenta

    fechaRegistro?: string | Date;

    // 🔹 Objetos de navegación del Backend (Include activados)
    gastoTipo?: any;
    gastoConcepto?: any;
    gastoSubtipo?: any;  // Ahora viene el objeto completo
    gastoArea?: any;
    gastoProveedor?: any;
    gastoFormaPago?: any;
    gastoCuenta?: any;
    gastoTasa?: { valor: number; etiqueta: string };
    gastoUnidad?: { nombre: string };
    estatusPago?: number; // 0: PENDIENTE, 1: TRANSFERENCIA, 2: EFECTIVO
}

export interface ExpenseCatalogs {
    tipos: any[];
    conceptos: any[];
    subtipos: GastoSubtipo[]; // 👈 Actualizado para incluir conceptoId
    areas: any[];
    proveedores: any[];
    formasPago: any[];
    cuentas: any[];
    tasas: any[];
    unidades?: any[];
}
