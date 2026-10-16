// Espejo de los DTOs de api/rrhh/colaboradores y api/rrhh/parametros (camelCase). Fechas: ISO 8601 (string).

export type EstatusColaborador = 'ACTIVO' | 'INACTIVO';
export type EstatusContrato = 'VIGENTE' | 'POR VENCER' | 'VENCIDO' | 'N/A';

export interface CatalogoItem {
    id: number;
    nombre: string;
}

export interface TipoContrato {
    id: number;
    nombre: string;
    baseLegal: string;
    uso: string;
    requiereFechaFin: boolean;
    permiteFechaFin: boolean;
    requiereProyecto: boolean;
    duracionMaximaDias: number | null;
}

export interface Catalogos {
    sucursales: CatalogoItem[];
    departamentos: CatalogoItem[];
    tiposContrato: TipoContrato[];
}

export interface ColaboradorLista {
    colaboradorId: number;
    codigo: string;
    nombre: string;
    sucursal: string | null;
    departamento: string | null;
    puesto: string | null;
    estatus: EstatusColaborador;
    estatusContrato: EstatusContrato;
    fechaVencimientoContrato: string | null;
}

export interface Beneficiario {
    nombre: string;
    curp: string | null;
    porcentaje: number;
    parentesco: string | null;
}

export interface ColaboradorGuardar {
    codigo: string | null;
    nombre: string;
    usuarioId: number | null;
    sucursalId: number | null;
    departamentoId: number | null;
    puesto: string | null;
    jefeInmediatoId: number | null;
    estatus: EstatusColaborador;
    fechaAltaImss: string | null;
    fechaBajaImss: string | null;
    fechaIngresoReal: string | null;
    fechaAntiguedadReconocida: string | null;
    rfc: string | null;
    curp: string | null;
    nss: string | null;
    correoPersonal: string | null;
    correoEmpresa: string | null;
    direccionHogar: string | null;
    contactoEmergenciaNombre: string | null;
    contactoEmergenciaTelefono: string | null;
    contactoEmergenciaParentesco: string | null;
    tallaCamisa: string | null;
    tallaPantalon: string | null;
    tallaCalzado: string | null;
    nivelAcademico: string | null;
    estatusAcademico: string | null;
    cedulaProfesional: string | null;
    idiomas: string | null;
    experienciaPrevia: string | null;
    observaciones: string | null;
}

export interface ColaboradorDetalle extends ColaboradorGuardar {
    colaboradorId: number;
    codigo: string;
    estatusContrato: EstatusContrato;
    fechaVencimientoContrato: string | null;
    beneficiarios: Beneficiario[];
}

export interface ContratoGuardar {
    tipoContratoId: number;
    fechaEmision: string;
    fechaVencimiento: string | null;
    proyectoId: number | null;
    notas: string | null;
}

export interface Contrato extends ContratoGuardar {
    contratoId: number;
    tipoContrato: string;
    estatus: EstatusContrato;
}

export interface ColaboradorNomina {
    salarioDiario: number | null;
    sueldoSemanal: number | null;
    banco: string | null;
    clabe: string | null;
    infonavit: boolean;
    fonacot: boolean;
    fechaUltimoIncremento: string | null;
}

export interface ColaboradorSalud {
    lentes: boolean;
    alergias: boolean;
    nombreAlergia: string | null;
    tipoSangre: string | null;
    fechaUltimoExamenMedico: string | null;
    pesoKg: number | null;
    estaturaM: number | null;
    vacunas: string | null;
}

export interface BitacoraItem {
    fecha: string;
    usuario: string | null;
    campo: string;
    anterior: string | null;
    nuevo: string | null;
}

export interface Parametro {
    clave: string;
    valor: string;
    descripcion: string;
}

/** Códigos de permisos especiales que gobiernan las pestañas sensibles de la ficha. */
export const PERMISO_NOMINA = 'rrhh.colaboradores.nomina';
export const PERMISO_SALUD = 'rrhh.colaboradores.salud';
