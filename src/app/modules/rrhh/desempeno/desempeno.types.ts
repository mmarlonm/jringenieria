export type ClasificacionBrecha = 'SinBrecha' | 'BrechaMenor' | 'BrechaCritica';

export interface EvaluacionDesempeno {
    desempenoId: number;
    colaboradorId: number;
    colaboradorNombre: string;
    periodo: string;
    objetivo: string;
    resultado?: string | null;
    calificacion?: number | null;
    planAccion?: string | null;
    tipoEvaluacion: string;
    evaluador: string;
    cicloCerrado: boolean;
    fechaCierre?: string | null;
    resultadoLiberado: boolean;
    fechaLiberacion?: string | null;
    razonSocial?: string | null;
    creadoEn: string;
}

export interface GuardarEvaluacionDesempeno {
    colaboradorId: number;
    periodo: string;
    objetivo: string;
    resultado?: string | null;
    calificacion?: number | null;
    planAccion?: string | null;
    tipoEvaluacion: string;
    evaluador: string;
    razonSocial?: string | null;
}

export interface PlanDesarrollo {
    planId: number;
    colaboradorId: number;
    colaboradorNombre: string;
    competencia: string;
    accion: string;
    fechaCompromiso: string;
    seguimiento?: string | null;
    estatus: string;
    visibleParaColaborador: boolean;
    evaluacionCompetenciaId?: number | null;
    razonSocial?: string | null;
}

export interface GuardarPlanDesarrollo {
    colaboradorId: number;
    competencia: string;
    accion: string;
    fechaCompromiso: string;
    seguimiento?: string | null;
    estatus: string;
    evaluacionCompetenciaId?: number | null;
    razonSocial?: string | null;
}

export interface MatrizCompetencia {
    matrizId: number;
    puesto: string;
    competencia: string;
    nivelRequerido: number;
    descripcion?: string | null;
}

export interface GuardarMatrizCompetencia {
    puesto: string;
    competencia: string;
    nivelRequerido: number;
    descripcion?: string | null;
}

export interface EvaluacionCompetencia {
    evaluacionId: number;
    colaboradorId: number;
    colaboradorNombre: string;
    puesto?: string | null;
    area?: string | null;
    sucursal?: string | null;
    competencia: string;
    nivelRequerido: number;
    nivelActual: number;
    brecha: number;
    clasificacion: ClasificacionBrecha;
    requiereCapacitacion: boolean;
    accion?: string | null;
    responsable?: string | null;
    fechaCompromiso?: string | null;
    evidencia?: string | null;
    estatus: string;
    capacitacionId?: number | null;
    capacitacionFolio?: string | null;
    razonSocial?: string | null;
    creadoEn: string;
}

export interface GuardarEvaluacionCompetencia {
    colaboradorId: number;
    competencia: string;
    nivelRequerido?: number | null;
    nivelActual: number;
    accion?: string | null;
    responsable?: string | null;
    fechaCompromiso?: string | null;
    evidencia?: string | null;
    estatus: string;
    razonSocial?: string | null;
}

export interface ColaboradorDesempeno {
    colaboradorId: number;
    codigo: string;
    nombre: string;
    puesto?: string | null;
    departamento?: string | null;
}

export interface MiDesempeno {
    colaboradorNombre: string;
    evaluaciones: EvaluacionDesempeno[];
    planes: PlanDesarrollo[];
}

export interface DesempenoCatalogos {
    tiposEvaluacion: string[];
    evaluadores: string[];
    estatusCompetencia: string[];
    estatusPlan: string[];
    nivelMinimo: number;
    nivelMaximo: number;
    calificacionMinima: number;
    calificacionMaxima: number;
}

export interface GrupoPuesto {
    puesto: string;
    competencias: MatrizCompetencia[];
}

export interface ResumenBrechas {
    total: number;
    conBrecha: number;
    criticas: number;
    sinCapacitacion: number;
}
