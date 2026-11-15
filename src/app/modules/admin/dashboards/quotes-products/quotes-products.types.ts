import { ProductoBuscadorDto } from 'app/modules/admin/administration/solicitudes-compra/models/solicitud-compra.types';

export interface CatalogoItem {
    codigo: string;
    nombre: string;
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

export interface CotizacionSgcDatos {
    requerimientoId?: number | null;
    tipo: string;
    moneda: string;
    tipoCambio?: number | null;
    vigenciaDias: number;
    penalizacionCancelacion?: string | null;
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

export interface VersionSgcItem {
    version: number;
    estado: string;
    claseCambio: string;
    cambioResumen?: string | null;
    fechaEmision: string | Date;
    emitidaPorUsuarioId: number;
    emitidaPorNombre?: string | null;
    medioEnvio: string;
    clienteReceptor: string;
    total: number;
    moneda: string;
}

export interface VersionSgcDetalle extends VersionSgcItem {
    instantanea?: any;
}

export interface RespuestaObtenerSgc {
    cotizacionProductosId: number;
    sgc: CotizacionSgcVista | null;
    partidas: PartidaSgc[];
    partidasHeredadas: boolean;
    totales: TotalesSgc;
    faltantes: string[];
    requerimiento?: RequerimientoResumen | null;
    revisionesRequeridas?: string[];
    revisiones?: RevisionSgc[];
    acciones?: AccionesSgc;
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
}

export type ExistenciaMaterial = ProductoBuscadorDto;
