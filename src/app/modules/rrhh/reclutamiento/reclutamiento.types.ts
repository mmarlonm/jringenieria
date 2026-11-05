export interface RequisicionResumen {
    requisicionId: number;
    folio: string;
    areaOSolicitante: string;
    puesto: string;
    sucursalId?: number | null;
    sucursalNombre?: string | null;
    tipo: string;
    fechaSolicitud: string;
    estatus: string;
    diasEnProceso: number;
    numeroPlazas: number;
    plazasCubiertas: number;
    salarioPropuesto?: number | null;
    razonSocial: string;
    validacionRrhh: boolean;
    aprobacionAdminGeneral: boolean;
    aprobacionDireccion: boolean;
    fechaPublicacion?: string | null;
    totalCandidatos: number;
}

export interface RequisicionDetalle extends RequisicionResumen {
    perfilRequerido?: string | null;
    duracionContratoPropuesta?: string | null;
    centroCostos?: string | null;
    motivoCancelacion?: string | null;
    fechaIngresoAcordada?: string | null;
    creadoEn: string;
    candidatos: Candidato[];
}

export interface CrearRequisicionDto {
    areaOSolicitante: string;
    puesto: string;
    sucursalId?: number | null;
    tipo: string;
    perfilRequerido?: string | null;
    numeroPlazas: number;
    duracionContratoPropuesta?: string | null;
    salarioPropuesto?: number | null;
    centroCostos?: string | null;
    razonSocial: string;
}

export interface ActualizarRequisicionDto extends CrearRequisicionDto {
    plazasCubiertas: number;
    fechaIngresoAcordada?: string | null;
}

export interface Candidato {
    candidatoId: number;
    requisicionId: number;
    requisicionFolio: string;
    requisicionPuesto: string;
    nombre: string;
    email?: string | null;
    telefono?: string | null;
    fuente: string;
    avisoPrivacidadAceptado: boolean;
    fechaAvisoPrivacidad?: string | null;
    fechaPrimerContacto: string;
    expectativaSalarial?: number | null;
    estatus: string;
    motivoDescarte?: string | null;
    calificacionGeneral?: number | null;
    calificacionIncompleta: boolean;
    promedioEntrevistas?: number | null;
    promedioPsicometrica?: number | null;
    promedioPractica?: number | null;
    notas?: string | null;
    creadoEn: string;
    entrevistas: Entrevista[];
    evaluaciones: Evaluacion[];
}

export interface CrearCandidatoDto {
    requisicionId: number;
    nombre: string;
    email?: string | null;
    telefono?: string | null;
    fuente: string;
    avisoPrivacidadAceptado: boolean;
    fechaAvisoPrivacidad?: string | null;
    fechaPrimerContacto?: string | null;
    expectativaSalarial?: number | null;
    notas?: string | null;
}

export interface ActualizarCandidatoDto {
    nombre: string;
    email?: string | null;
    telefono?: string | null;
    fuente: string;
    avisoPrivacidadAceptado: boolean;
    fechaAvisoPrivacidad?: string | null;
    expectativaSalarial?: number | null;
    notas?: string | null;
}

export interface CambiarEstatusCandidatoDto {
    nuevoEstatus: string;
    motivoDescarte?: string | null;
}

export interface Entrevista {
    entrevistaId: number;
    candidatoId: number;
    entrevistadorId?: number | null;
    entrevistadorNombre: string;
    fecha: string;
    tipo: string; // "RRHH" | "Tecnica"
    calificacionComunicacion: number;
    calificacionExperiencia: number;
    calificacionCompetenciasTecnicas: number;
    promedioEntrevista: number;
    resultado: string; // "Favorable" | "Desfavorable" | "EnEspera"
    notasStar?: string | null;
    creadoEn: string;
}

export interface RegistrarEntrevistaDto {
    candidatoId: number;
    entrevistadorId?: number | null;
    entrevistadorNombre: string;
    fecha?: string | null;
    tipo: string;
    calificacionComunicacion: number;
    calificacionExperiencia: number;
    calificacionCompetenciasTecnicas: number;
    resultado: string;
    notasStar?: string | null;
}

export interface Evaluacion {
    evaluacionId: number;
    candidatoId: number;
    tipo: string; // "Psicometrica" | "Practica"
    evaluadorId?: number | null;
    evaluadorNombre?: string | null;
    fecha: string;
    calificacion: number;
    observaciones?: string | null;
    creadoEn: string;
}

export interface RegistrarEvaluacionDto {
    candidatoId: number;
    tipo: string;
    evaluadorId?: number | null;
    evaluadorNombre?: string | null;
    fecha?: string | null;
    calificacion: number;
    observaciones?: string | null;
}

export interface CatalogosReclutamiento {
    sucursales: { sucursalId: number; nombre: string }[];
    tiposRequisicion: string[];
    estatusRequisicion: string[];
    estatusCandidato: string[];
}

