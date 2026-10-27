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

/** Lo que borró (o dejó anulado) la eliminación de una cuenta: sus movimientos, las conciliaciones no confirmadas de esos movimientos y sus importaciones. */
export interface ResultadoEliminarCuenta { movimientos: number; conciliaciones: number; importaciones: number; }

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
    clase?: ClaseMovimiento | null;
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

export type EstadoMovimiento = 'SinConciliar' | 'ConSugerencia' | 'Parcial' | 'Conciliado' | 'Clasificado';
export type EstadoVinculo = 'Sugerida' | 'Confirmada' | 'Rechazada' | 'Deshecha';
export type Confianza = 'Alta' | 'Media' | 'Baja';
export type ClaseMovimiento = 'TransferenciaPropia' | 'PagoTarjeta' | 'Nomina' | 'Comision' | 'Tpv' | 'Personal';
export interface SugerirConciliacion { empresaId: number; desde: string; hasta: string; cuentaId?: number | null; }
export interface ResultadoSugerir { movimientosAnalizados: number; sugerenciasNuevas: number; cfdiConsiderados: number; }
export interface FiltroConciliacion { empresaId: number; cuentaId?: number | null; desde?: string | null; hasta?: string | null; estado?: string | null; q?: string | null; pagina?: number; tamano?: number; }
export interface Vinculo { conciliacionId: number; cfdiId: number; uuid: string; serie: string | null; folio: string | null; contraparte: string; total: number; saldo: number; moneda: string; regla: string; confianza: Confianza | null; estado: EstadoVinculo; importeAplicado: number; }
export interface MovimientoConciliacion { movimientoId: number; cuentaId: number; fecha: string; descripcion: string; importe: number; saldo: number | null; tipoOperacion: string | null; clase: ClaseMovimiento | null; estado: EstadoMovimiento; pendiente: number; sugerencias: Vinculo[]; confirmadas: Vinculo[]; }
export interface ManualConciliacion { movimientoId: number; cfdiId: number; importeAplicado: number; }
export interface FalloLote { conciliacionId: number; motivo: string; }
export interface ResultadoLote { confirmadas: number[]; fallidas: FalloLote[]; }
export interface ClasificarMovimientos { movimientoIds: number[]; clase: ClaseMovimiento | null; }
export interface ResultadoClasificar { clasificados: number; }
export interface FiltroClases { empresaId: number; cuentaId?: number | null; desde: string; hasta: string; }
export interface ClaseSugerida { movimientoId: number; clase: ClaseMovimiento; motivo: string; }
export interface CfdiCandidato { cfdiId: number; uuid: string; serie: string | null; folio: string | null; fechaEmision: string; contraparte: string; tipoComprobante: string; metodoPago: string | null; total: number; saldo: number; moneda: string; }
export interface ResumenMovimientos { total: number; sinConciliar: number; conSugerencia: number; parcial: number; conciliado: number; clasificado: number; }
export interface ResumenCfdi { pendiente: number; parcial: number; pagado: number; pagadoEnEfectivo: number; cancelado: number; }
export interface ResumenConciliacion { movimientos: ResumenMovimientos; cfdi: ResumenCfdi; }

export interface GenerarPaquete { empresaId: number; anio: number; mes: number; }
export interface CuentaPaquete { cuentaId: number; etiqueta: string; movimientos: number; }
export interface VistaPreviaPaquete { empresaId: number; anio: number; mes: number; cfdiEmitidos: number; cfdiRecibidos: number; movimientos: number; movimientosPendientes: number; cfdiPendientes: number; cfdiSinDatosOriginales: number; cuentas: CuentaPaquete[]; }
export interface PaqueteDespacho { paqueteId: number; empresaId: number; anio: number; mes: number; usuarioId: number; fecha: string; cfdiEmitidos: number; cfdiRecibidos: number; movimientos: number; pendientes: number; }

export type TipoIndicador = 'Dinero' | 'Cantidad' | 'Porcentaje';
export interface ValorIndicador { moneda: string | null; valor: number; }
export interface IndicadorDashboard {
    clave: string; nombre: string; tipo: TipoIndicador; definicion: string; origen: string; frecuencia: string; observaciones: string;
    disponible: boolean; pendienteDe: string | null; valores: ValorIndicador[]; datosAl: string | null; calidad: string[];
}
export interface Dashboard { fechaCorte: string; empresaId: number | null; empresasIncluidas: number; indicadores: IndicadorDashboard[]; }
