export interface CatalogoItem {
    codigo: string;
    nombre: string;
}

export interface TipoServicioCatalogoItem extends CatalogoItem {
    area: string;
}

export interface PedidoCatalogos {
    estatus: CatalogoItem[];
    tipos: CatalogoItem[];
    tiposServicio: TipoServicioCatalogoItem[];
    prioridades: CatalogoItem[];
    tiposArchivo: CatalogoItem[];
    areasValidacion: CatalogoItem[];
    puntosVerificacion: CatalogoItem[];
    estatusFacturacion: CatalogoItem[];
    tiposBitacora: CatalogoItem[];
    motivosCancelacion?: CatalogoItem[];
}

export interface ImportePorMoneda {
    moneda: string;
    importe: number;
}

export interface KpiPorEstatus {
    estatus: string;
    cantidad: number;
    importes: ImportePorMoneda[];
}

export interface KpiPorResponsable {
    usuarioId: number;
    nombre: string;
    cantidad: number;
    importes: ImportePorMoneda[];
}

export interface KpiPorSucursal {
    unidadId: number;
    nombre: string;
    cantidad: number;
    importes: ImportePorMoneda[];
}

export interface PedidoKpis {
    total: number;
    porEstatus: KpiPorEstatus[];
    porResponsable: KpiPorResponsable[];
    porSucursal: KpiPorSucursal[];
}

export interface PedidoFiltros {
    desde?: string;
    hasta?: string;
    unidadId?: number;
    estatus?: string;
    responsableId?: number;
    texto?: string;
    page?: number;
    size?: number;
}

export interface PedidoResumen {
    id: number;
    folio: string;
    estatus: string;
    tipo: string;
    tipoServicio: string;
    prioridad: string;
    clienteNombre: string;
    unidadId: number;
    sucursalNombre: string;
    moneda: string;
    montoPedido: number;
    responsableUsuarioId: number;
    responsableNombre: string;
    cotizacionProductosId: number;
    cotizacionFolio: string;
    requerimientoId?: number | null;
    requerimientoFolio?: string | null;
    numeroOC?: string | null;
    fechaRegistro: string;
    fechaLiberacion?: string | null;
    alertas: string[];
}

export interface PedidoListaRespuesta {
    total: number;
    items: PedidoResumen[];
}

export interface PedidoPartida {
    id: number;
    partida: number;
    descripcion: string;
    codigo?: string | null;
    unidad?: string | null;
    cantidad: number;
    precioUnitario: number;
    descuento: number;
    importe: number;
}

export interface PedidoVerificacionItem {
    punto: string;
    nombre: string;
    cumple?: boolean | null;
    discrepanciaAclarada?: boolean | null;
    comentario?: string | null;
}

export interface PedidoValidacionItem {
    id?: number;
    area: string;
    nombre: string;
    estatus: string;
    usuarioNombre?: string | null;
    fecha?: string | null;
    comentario?: string | null;
}

export interface PedidoArchivoItem {
    id: number;
    tipo: string;
    tipoNombre: string;
    nombreOriginal: string;
    tamanoBytes: number;
    contentType: string;
    comentario?: string | null;
    subidoPorNombre: string;
    fechaSubida: string;
    activo: boolean;
    modificacionId?: number | null;
}

export interface FacturacionFila {
    id: number;
    concepto: string;
    fechaProgramada: string;
    monto: number;
    estatus: string;
    folioFactura?: string | null;
    fechaFactura?: string | null;
    fechaCobro?: string | null;
}

export interface PedidoFacturacionResumen {
    programado: number;
    facturado: number;
    cobrado: number;
    pendientePorProgramar: number;
    filas: FacturacionFila[];
}

export interface PedidoModificacionItem {
    id: number;
    consecutivo: number;
    descripcion: string;
    impactoTecnico?: string | null;
    impactoEconomico: number;
    requiereActualizarCotizacion: boolean;
    cotizacionActualizadaFolio?: string | null;
    estatus: string;
    referenciaAprobacion?: string | null;
    fechaAprobacion?: string | null;
    fechaAplicacion?: string | null;
    registradaPorNombre: string;
    fechaRegistro: string;
}

export interface CotizacionArchivoItem {
    id: number;
    version?: number;
    nombreOriginal: string;
    fechaSubida: string;
}

export interface PedidoPermisos {
    puedeEditar: boolean;
    puedeVerificar: boolean;
    puedeValidar: string[];
    puedeLiberar: boolean;
    puedeFacturar: boolean;
    puedeCerrar: boolean;
    puedeCancelar: boolean;
}

export interface PedidoBitacoraItem {
    id: number;
    fechaUtc: string;
    tipo: string;
    usuarioId: number;
    usuarioNombre: string;
    resumen: string;
    detalle?: string | null;
}

export interface PedidoDetalle extends PedidoResumen {
    cotizacionVersion: number;
    cotizacionFolioContpaq?: string | null;
    tipoCambio: number;
    subtotal: number;
    iva: number;
    total: number;
    contactoNombre?: string | null;
    contactoCorreo?: string | null;
    contactoTelefono?: string | null;
    rfc?: string | null;
    direccionFiscal?: string | null;
    condicionesPago?: string | null;
    metodoPago?: string | null;
    cuentaDeposito?: string | null;
    puntoEntrega?: string | null;
    condicionesEntrega?: string | null;
    tiemposRequeridos?: string | null;
    creadoPorUsuarioId: number;
    creadoPorNombre?: string | null;
    fechaOC?: string | null;
    requiereAnticipo: boolean;
    anticipoMonto?: number | null;
    tieneContrato: boolean;
    observaciones?: string | null;
    fechaEntrega?: string | null;
    fechaCierre?: string | null;
    areaResponsable?: string | null;
    responsableOperacionUsuarioId?: number | null;
    responsableOperacionNombre?: string | null;
    instruccionInicio?: string | null;
    condicionesCumplidas?: boolean | null;
    partidas: PedidoPartida[];
    verificacion: PedidoVerificacionItem[];
    validaciones: PedidoValidacionItem[];
    archivos: PedidoArchivoItem[];
    facturacion: PedidoFacturacionResumen;
    modificaciones: PedidoModificacionItem[];
    cotizacionArchivos: CotizacionArchivoItem[];
    permisos: PedidoPermisos;
}

export interface ActualizarPedidoDto {
    numeroOC?: string | null;
    fechaOC?: string | null;
    tipoServicio?: string | null;
    prioridad?: string | null;
    condicionesPago?: string | null;
    requiereAnticipo?: boolean | null;
    anticipoMonto?: number | null;
    tieneContrato?: boolean | null;
    responsableUsuarioId?: number | null;
    observaciones?: string | null;
}

export interface ValidarAreaDto {
    resultado: 'Aprobada' | 'Rechazada';
    comentario?: string | null;
}

export interface LiberarPedidoDto {
    responsableOperacionUsuarioId?: number | null;
    instruccionInicio: string;
}

export interface EntregarPedidoDto {
    fechaEntrega?: string | null;
    comentario?: string | null;
}

export interface ReabrirEjecucionDto {
    comentario: string;
}

export interface CerrarPedidoDto {
    condicionesCumplidas: boolean;
    comentario: string;
}

export interface CancelarPedidoDto {
    motivo: string;
}

export interface GuardarFacturacionFilaDto {
    concepto: string;
    fechaProgramada: string;
    monto: number;
    estatus?: string;
    folioFactura?: string | null;
    fechaFactura?: string | null;
    fechaCobro?: string | null;
}

export interface RegistrarModificacionDto {
    descripcion: string;
    impactoTecnico?: string | null;
    impactoEconomico: number;
    requiereActualizarCotizacion: boolean;
    cotizacionActualizadaFolio?: string | null;
}

export interface AprobarModificacionDto {
    referencia: string;
    fecha: string;
}

export interface AgregarBitacoraDto {
    tipo: 'Observacion' | 'Avance' | 'Incidencia';
    texto: string;
}
