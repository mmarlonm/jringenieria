// Espejo de jr_api/DTOs/Finanzas/FinanzasDtos.cs (el API serializa en camelCase; DateTime viaja como texto ISO).

export interface RechazoFila {
    fila: number;
    motivo: string;
}

export interface ResultadoImportacion {
    importacionId: number | null;
    empresaId: number;
    cuentaId: number | null;
    nombreArchivo: string;
    hoja: string | null;
    filasLeidas: number;
    nuevos: number;
    actualizados: number;
    sinCambios: number;
    rechazados: RechazoFila[];
    advertencias: string[];
    periodoDesde: string | null;
    periodoHasta: string | null;
    soloValidar: boolean;
    primerSaldo: number | null;
    ultimoSaldo: number | null;
    ultimoSaldoGuardado: number | null;
}

/** Paginado genérico de Finanzas; el API recorta el tamaño de página a 200. */
export interface Pagina<T> {
    pagina: number;
    tamano: number;
    total: number;
    items: T[];
}

export interface Empresa {
    empresaId: number;
    rfc: string;
    nombre: string;
    /** Se deduce del RFC: de 13 caracteres "F", de 12 "M". */
    tipo: string;
    activa: boolean;
}

export interface EmpresaGuardar {
    rfc: string;
    nombre: string;
    activa?: boolean;
}

export interface Cuenta {
    cuentaId: number;
    empresaId: number;
    banco: string;
    alias: string;
    tipo: string;
    moneda: string;
    terminacion: string;
    activa: boolean;
}

export interface CuentaGuardar {
    empresaId: number;
    alias: string;
    tipo: string;
    moneda: string;
    terminacion: string;
    activa?: boolean;
}

export interface Cfdi {
    cfdiId: number;
    uuid: string;
    direccion: string;
    tipoComprobante: string;
    serie: string | null;
    folio: string | null;
    fechaEmision: string;
    rfcEmisor: string;
    nombreEmisor: string;
    rfcReceptor: string;
    nombreReceptor: string;
    metodoPago: string | null;
    formaPago: string | null;
    moneda: string;
    tipoCambio: number | null;
    total: number;
    estado: string;
    revisar: boolean;
}

/** Los nombres son los de la query string; null/undefined/'' no se envían. */
export interface FiltroCfdi {
    empresaId: number;
    direccion?: string | null;
    tipo?: string | null;
    estado?: string | null;
    desde?: string | null;
    hasta?: string | null;
    q?: string | null;
    pagina?: number;
    tamano?: number;
}

export interface Movimiento {
    movimientoId: number;
    cuentaId: number;
    fecha: string;
    descripcion: string;
    importe: number;
    saldo: number | null;
    tipoOperacion: string | null;
    referencia: string | null;
    rfcComercio: string | null;
}

export interface FiltroMovimientos {
    cuentaId: number;
    desde?: string | null;
    hasta?: string | null;
    q?: string | null;
    pagina?: number;
    tamano?: number;
}

export interface Importacion {
    importacionId: number;
    empresaId: number;
    cuentaId: number | null;
    fuente: string;
    nombreArchivo: string;
    hoja: string | null;
    usuarioId: number;
    fecha: string;
    nuevos: number;
    actualizados: number;
    sinCambios: number;
    rechazados: number;
    anulada: boolean;
}

export interface FiltroImportaciones {
    empresaId?: number | null;
    fuente?: string | null;
    pagina?: number;
    tamano?: number;
}

export interface HojaInfo {
    nombre: string;
    filas: number;
    formatoDetectado: 'CFDI' | 'BancoA' | 'BancoB' | 'Desconocido';
}
