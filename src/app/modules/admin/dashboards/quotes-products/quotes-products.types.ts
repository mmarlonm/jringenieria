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
    subtotal: number;
    iva: number;
    total: number;
    creadoPorUsuarioId: number;
    creadoPorNombre?: string | null;
    fechaCreacion: string | Date;
    fechaModificacion?: string | Date | null;
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

export interface RespuestaObtenerSgc {
    cotizacionProductosId: number;
    sgc: CotizacionSgcVista | null;
    partidas: PartidaSgc[];
    partidasHeredadas: boolean;
    totales: TotalesSgc;
    faltantes: string[];
}

export interface ResumenSgc {
    cotizacionProductosId: number;
    folio: string;
    tipo: string;
    version: number;
    total: number;
    moneda: string;
}

export type ExistenciaMaterial = ProductoBuscadorDto;
