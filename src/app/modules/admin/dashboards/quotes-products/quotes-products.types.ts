import { ProductoBuscadorDto } from 'app/modules/admin/administration/solicitudes-compra/models/solicitud-compra.types';

export interface CatalogoItem {
    codigo: string;
    nombre: string;
}

/** Tipos de cotización SGC: CS comercial simple, CT técnico-comercial, CE estratégica. */
export type TipoCotizacionSgc = 'CS' | 'CT' | 'CE';

/** Campos que el listado trae por cada cotización (contrato v1.1 §5). */
export interface CotizacionListadoSgcCampos {
    /** `null` si la cotización solo viene de CONTPAQ y no tiene capa SGC. */
    tipoSgc: TipoCotizacionSgc | null;
    /** `true` ⇔ sin capa SGC: se muestra como Comercial, solo informativa y sin flujo. */
    informativa: boolean;
}

export interface CatalogosSgc {
    tipos: CatalogoItem[];
    monedas: CatalogoItem[];
    tiposConcepto: CatalogoItem[];
    entregables: CatalogoItem[];
    ivaTasa: number;
    etapas?: CatalogoItem[];
    mediosEnvio?: CatalogoItem[];
    roles?: CatalogoItem[];
    puntosRevision?: CatalogoItem[];
    puntosRequeridosPorRol?: { [rol: string]: string[] };
    clasesCambio?: string[];
    tiposSeguimiento?: CatalogoItem[];
    motivosCierre?: CatalogoItem[];
    tiposEvidencia?: CatalogoItem[];
    resultadosCierre?: CatalogoItem[];
    plazosEmisionHoras?: { [tipo: string]: number };
}

export interface CotizacionSgcCabecera {
    cotizacionProductosId: number;
    clienteId?: number | null;
    unidadDeNegocioId?: number | null;
    requisitosEspeciales: boolean;
    nombreCliente?: string | null;
    nombreEmpresa?: string | null;
    correo?: string | null;
    telefono?: string | null;
    rfc?: string | null;
    direccionCompleta?: string | null;
    estado?: string | null;
    estatus?: number | null;
    observaciones?: string | null;
}

// Contrato de lectura del encabezado: CotizacionSgcEncabezadoVistaDto del API
export interface EncabezadoCotizacionSgc {
    cotizacionProductosId: number;
    clienteId?: number | null;
    unidadDeNegocioId?: number | null;
    usuarioId?: number | null;
    requisitosEspeciales: boolean;
    createdDate?: string | Date | null;
    updatedDate?: string | Date | null;
    nombreCliente?: string | null;
    nombreEmpresa?: string | null;
    correo?: string | null;
    telefono?: string | null;
    rfc?: string | null;
    direccionCompleta?: string | null;
    estado?: string | null;
    estatus?: number | null;
    observaciones?: string | null;
}

export interface CotizacionSgcDatos {
    requerimientoId?: number | null;
    tipo: string;
    moneda: string;
    tipoCambio?: number | null;
    vigenciaDias: number;
    penalizacionCancelacion?: string | null;
    /** obsoleto: ya no se muestra ni se envía (§5.3 contrato v1.8) */
    formaPago?: string | null;
    condicionesPago?: string | null;
    puntoEntrega?: string | null;
    condicionesEntrega?: string | null;
    cuentaDeposito?: string | null;
    exclusiones?: string | null;
    observacionesRelevantes?: string | null;
    contactoNombre?: string | null;
    contactoCorreo?: string | null;
    contactoTelefono?: string | null;
    anexosTecnicos?: string | null;
    alcanceTecnico?: string | null;
    recursosRequeridos?: string | null;
    personalInvolucrado?: string | null;
    tiemposEstimados?: string | null;
    supuestosOperativos?: string | null;
    condicionesEjecucion?: string | null;
    riesgosLimitaciones?: string | null;
    entregables: string[];
    costosIndirectos?: number | null;
    margenAutorizadoPorcentaje?: number | null;
}

export interface CotizacionSgcVista extends CotizacionSgcDatos {
    folio: string;
    version: number;
    etapa: string;
    subtotal: number;
    iva: number;
    total: number;
    creadoPorUsuarioId: number;
    creadoPorNombre?: string | null;
    fechaCreacion: string | Date;
    fechaModificacion?: string | Date | null;
    fechaPrimeraEmision?: string | Date | null;
    fechaEmision?: string | Date | null;
    fechaVencimiento?: string | Date | null;
    medioEnvio?: string | null;
    clienteReceptor?: string | null;
    correoReceptor?: string | null;
    claseCambioVersion?: string | null;
    cambioResumen?: string | null;
    probabilidadPorcentaje?: number | null;
    fechaCierre?: string | Date | null;
    motivoCierre?: string | null;
    comentarioCierre?: string | null;
    tipoEvidencia?: string | null;
    referenciaEvidencia?: string | null;
    montoVendido?: number | null;
}

export interface PartidaSgc {
    partida: number;
    tipoConcepto: string;
    materialServicio: string;
    descripcion?: string | null;
    codigoProducto?: string | null;
    productoId?: number | null;
    unidad: string;
    cantidad: number;
    precioUnitario: number;
    descuento: number;
    costoUnitario?: number | null;
    tiempoEntregaDias?: number | null;
    notas?: string | null;
    heredada?: boolean;
}

export interface TotalesSgc {
    subtotal: number;
    iva: number;
    total: number;
    costoDirecto: number;
    utilidad: number | null;
    margenPorcentaje: number | null;
    margenBajo: boolean;
    partidasSinCosto: number;
}

export interface GuardarCotizacionSgc {
    cotizacion: CotizacionSgcCabecera;
    sgc: CotizacionSgcDatos;
    partidas: PartidaSgc[];
}

export interface RespuestaGuardadoSgc {
    code: number;
    message: string;
    data: {
        cotizacionProductosId: number;
        folio: string;
        version: number;
        subtotal: number;
        iva: number;
        total: number;
        faltantes: string[];
    };
}

export interface AccionesSgc {
    editar: boolean;
    enviarRevision: boolean;
    volverBorrador: boolean;
    revisar: string[];
    emitir: boolean;
    nuevaVersion: boolean;
    seguimiento?: boolean;
    cerrar?: string[];
}

export interface RequerimientoResumen {
    id: number;
    folio: string;
    empresa?: string | null;
    nombreContacto?: string | null;
    estatus: string;
    fechaCalificacion?: string | Date | null;
    descripcion?: string | null;
}

export interface RegistrarRevisionDto {
    rol: string;
    resultado: string;
    checklist?: { [codigo: string]: boolean };
    comentarios?: string | null;
}

export interface RevisionSgc {
    id: number;
    version: number;
    rol: string;
    resultado: string;
    usuarioId: number;
    usuarioNombre?: string | null;
    fecha: string | Date;
    comentarios?: string | null;
    checklist?: { [codigo: string]: boolean };
    descartada: boolean;
}

export interface EmitirCotizacionDto {
    medioEnvio: string;
    clienteReceptor: string;
    correoReceptor?: string | null;
}

export interface EmisionResultado {
    folio: string;
    version: number;
    fechaEmision: string | Date;
    fechaVencimiento?: string | Date | null;
}

export interface NuevaVersionDto {
    claseCambio: string;
    cambioResumen: string;
}

export interface NuevaVersionResultado {
    version: number;
    etapa: string;
}

// Forma exacta de GET .../sgc/versiones (VersionCotizacionItemDto del API)
export interface VersionSgcItem {
    version: number;
    estado: string; // 'Vigente' | 'Sustituida'
    claseCambio: string; // 'Inicial' | 'Menor' | 'Alcance'
    cambioResumen?: string | null;
    fechaEmision: string | Date;
    emitidaPorUsuarioId: number;
    emitidaPorNombre?: string | null;
    medioEnvio: string;
    clienteReceptor: string;
    total: number;
    moneda: string;
}

// Lo congelado al emitir: CotizacionInstantaneaDto del API
export interface InstantaneaSgc {
    folio: string;
    version: number;
    cabecera?: Partial<CotizacionSgcCabecera> | null;
    sgc?: Partial<CotizacionSgcDatos> | null;
    partidas?: PartidaSgc[] | null;
    totales?: TotalesSgc | null;
}

export interface VersionSgcDetalle extends VersionSgcItem {
    instantanea?: InstantaneaSgc | null;
}

export interface RespuestaObtenerSgc {
    cotizacionProductosId: number;
    cotizacion?: EncabezadoCotizacionSgc | null;
    sgc: CotizacionSgcVista | null;
    partidas: PartidaSgc[];
    partidasHeredadas: boolean;
    totales: TotalesSgc;
    faltantes: string[];
    requerimiento?: RequerimientoResumen | null;
    revisionesRequeridas?: string[];
    revisiones?: RevisionSgc[];
    acciones?: AccionesSgc;
    seguimiento?: ResumenSeguimiento | null;
    /** Contrato v1.2: `true` ⇔ la cotización no tiene capa SGC (solo viene de CONTPAQ): se ve solo como consulta. Si no viene, es `false`. */
    informativa?: boolean;
}

export interface ResumenSgc {
    cotizacionProductosId: number;
    folio: string;
    tipo: string;
    version: number;
    total: number;
    moneda: string;
    etapa?: string;
    fechaEmision?: string | Date | null;
    fechaVencimiento?: string | Date | null;
    creadoPorNombre?: string | null;
    requerimientoFolio?: string | null;
    seguimientoAtrasado?: boolean;
    vencida?: boolean;
    probabilidadPorcentaje?: number | null;
    proximaAccionFecha?: string | Date | null;
}

export type ExistenciaMaterial = ProductoBuscadorDto;

export interface SeguimientoItemSgc {
    id: number;
    version: number;
    fecha: string | Date;
    usuarioId: number;
    usuarioNombre?: string | null;
    tipo: string;
    notas?: string | null;
    proximaAccion?: string | null;
    fechaProximaAccion?: string | null;
}
export type SeguimientoSgc = SeguimientoItemSgc;

export interface ResumenSeguimiento {
    total: number;
    ultimaFecha?: string | Date | null;
    proximaAccion?: string | null;
    fechaProximaAccion?: string | null;
    atrasado: boolean;
    vencida: boolean;
    diasParaVencer?: number | null;
}

export interface RegistrarSeguimientoDto {
    tipo: string;
    notas?: string | null;
    proximaAccion?: string | null;
    fechaProximaAccion?: string | null;
    probabilidadPorcentaje?: number | null;
}

export interface CierreSgcDto {
    resultado: string;
    motivo?: string | null;
    comentario?: string | null;
    tipoEvidencia?: string | null;
    referenciaEvidencia?: string | null;
    montoVendido?: number | null;
}

export interface CierreResultado {
    etapa: string;
    fechaCierre: string | Date;
}
export type CierreSgc = CierreResultado;

export interface FiltroIndicadoresSgc {
    desde: string; // yyyy-MM-dd
    hasta: string; // yyyy-MM-dd
    tipo?: string | null;
    unidadDeNegocioId?: number | null;
}

export interface TiempoPromedioEmisionDto {
    cs?: number | null;
    ct?: number | null;
    ce?: number | null;
    general?: number | null;
}

export interface EnTiempoDetalleDto {
    emitidas: number;
    enPlazo: number;
    porcentaje?: number | null;
    plazoHoras: number;
}

export interface EnTiempoTipoDto {
    cs?: EnTiempoDetalleDto | null;
    ct?: EnTiempoDetalleDto | null;
    ce?: EnTiempoDetalleDto | null;
}

export interface MontoMonedaDto {
    moneda: string;
    cotizado: number;
    vendido: number;
    captacionPorcentaje?: number | null;
}

export interface MotivoPerdidaDto {
    motivo: string;
    cantidad: number;
}

export interface IndicadoresSgc {
    emitidas: number;
    ganadas: number;
    perdidas: number;
    canceladas: number;
    vencidas: number;
    cerradasSinRespuesta: number;
    abiertas: number;
    tasaConversionPorcentaje?: number | null;
    tiempoPromedioEmisionHoras: TiempoPromedioEmisionDto;
    enTiempo: EnTiempoTipoDto;
    montos: MontoMonedaDto[];
    motivosPerdida: MotivoPerdidaDto[];
}

export interface OrigenRequerimiento {
    id: number;
    folio: string;
    titulo?: string | null;
    tipoProyecto?: string | null;
    descripcion: string;
    estatus: string;
    rutaAtencion?: string | null;
    empresa: string;
    nombreContacto: string;
    telefono?: string | null;
    email?: string | null;
    fechaRecepcion?: string | null;
}

export interface OrigenLead {
    id: number;
    nombreContacto: string;
    empresa?: string | null;
    telefono?: string | null;
    email?: string | null;
    fuenteLead?: string | null;
    campana?: string | null;
    necesidadInicial?: string | null;
    sucursalQueRecibe?: string | null;
    estatus?: string | null;
    tipoCliente?: string | null;
    tipoNecesidad?: string | null;
    zonaAtencion?: string | null;
    nivelPrioridad?: string | null;
    fechaRegistro: string;
}

export interface CotizacionOrigen {
    cotizacionProductosId: number;
    requerimiento?: OrigenRequerimiento | null;
    lead?: OrigenLead | null;
}
