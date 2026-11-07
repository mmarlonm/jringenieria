export type EstatusOffboarding = 'Abierto' | 'BajaRegistrada' | 'Cerrado' | 'Cancelado';

export type EstatusTareaOffboarding = 'Pendiente' | 'EnProceso' | 'Hecha' | 'NoAplica';

export type NivelAlertaBajaImss = 'Ninguna' | 'Registrada' | 'EnTiempo' | 'PorVencer' | 'Vencida';

export interface OffboardingResumen {
    bajaId: number;
    folio: string;
    colaboradorId: number;
    colaboradorNombre: string;
    puestoArea?: string | null;
    causa: string;
    ruta: number;
    rutaNombre: string;
    fechaApertura: string;
    ultimoDiaLaborado: string;
    fechaBajaImss?: string | null;
    estatus: EstatusOffboarding;
    tareasTotal: number;
    tareasResueltas: number;
    tareasVencidas: number;
    limiteBajaImss: string;
    alertaBajaImss: NivelAlertaBajaImss;
}

export interface TareaOffboarding {
    tareaId: number;
    orden: number;
    clave: string;
    plazo: string;
    tarea: string;
    responsable: string;
    evidencia: string;
    estatus: EstatusTareaOffboarding;
    fechaCompromiso?: string | null;
    evidenciaCapturada?: string | null;
    observaciones?: string | null;
    completadaEn?: string | null;
    vencida: boolean;
}

export interface OffboardingDetalle extends OffboardingResumen {
    razonSocial?: string | null;
    fechaAvisoRescision?: string | null;
    limiteNotificacionTribunal?: string | null;
    actaId?: number | null;
    actaFolio?: string | null;
    autorizadaDireccion: boolean;
    fechaAutorizacion?: string | null;
    recontratable?: string | null;
    fechaRetencionHasta?: string | null;
    notas?: string | null;
    motivoCancelacion?: string | null;
    fechaCierre?: string | null;
    documento: string;
    conceptosPago: string;
    controles: string;
    requiereValidacionLegal: boolean;
    requiereAutorizacionDireccion: boolean;
    motivoBloqueoBaja?: string | null;
    tareas: TareaOffboarding[];
}

export interface ColaboradorBaja {
    colaboradorId: number;
    codigo: string;
    nombre: string;
    puesto?: string | null;
    departamento?: string | null;
}

export interface CausaBaja {
    codigo: string;
    ruta: number;
}

export interface RutaBaja {
    numero: number;
    nombre: string;
    documento: string;
    conceptosPago: string;
    controles: string;
}

export interface OffboardingCatalogos {
    causas: CausaBaja[];
    rutas: RutaBaja[];
    estatus: string[];
    estatusTarea: string[];
    recontratable: string[];
}

export interface AbrirOffboardingDto {
    colaboradorId: number;
    causa: string;
    ultimoDiaLaborado: string;
    fechaAvisoRescision?: string | null;
    razonSocial?: string | null;
    notas?: string | null;
}

export interface ActualizarOffboardingDto {
    ultimoDiaLaborado: string;
    fechaAvisoRescision?: string | null;
    razonSocial?: string | null;
    notas?: string | null;
}

export interface ActualizarTareaDto {
    estatus: string;
    evidenciaCapturada?: string | null;
    observaciones?: string | null;
    fechaCompromiso?: string | null;
}

export interface GrupoResponsable {
    responsable: string;
    tareas: TareaOffboarding[];
    pendientes: number;
}
