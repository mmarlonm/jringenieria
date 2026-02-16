export interface Expense {
    gastoId: number;
    fecha: string | Date;
    nombreGasto: string;
    cantidad: number;
    impuestos: number;
    // IDs (ya los tenías)
    tipoId: number;
    conceptoId: number;
    subtipoId: number;
    areaId: number;
    proveedorId: number;
    formaPagoId: number;
    cuentaId: number;
    tasaId: number;
    unidadId: number;
    usuarioId: number;
    factura?: string;
    descripcion?: string;
    tipoMovimiento?: string;

    fechaRegistro?: string | Date;

    // 🔹 AGREGAR ESTO (Objetos de navegación del Backend)
    gastoTipo?: { nombre: string };
    gastoConcepto?: { nombre: string };
    gastoSubtipo?: { nombre: string };
    gastoArea?: { nombre: string };
    gastoProveedor?: { nombre: string };
    gastoFormaPago?: { nombre: string };
    gastoCuenta?: { nombre: string };
    gastoTasa?: { valor: number; etiqueta: string };
    gastoUnidad?: { nombre: string };
}

export interface ExpenseCatalogs {
    tipos: any[];
    conceptos: any[];
    subtipos: any[];
    areas: any[];
    proveedores: any[];
    formasPago: any[];
    cuentas: any[];
    tasas: any[];
}