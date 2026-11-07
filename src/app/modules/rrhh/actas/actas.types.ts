export type EstatusActa =
    | 'Borrador'
    | 'Citado'
    | 'AudienciaRealizada'
    | 'PendienteFirmas'
    | 'SancionAplicada'
    | 'Cerrada'
    | 'Anulada';

export type NivelAlertaActa = 'Ninguna' | 'EnPlazo' | 'Cerrar' | 'PlazoVencido';

export type ValidacionActa = 'Ok' | 'FaltanDescargos' | 'SuspensionMayorA8Dias' | 'FaltanTestigos';

export interface ActaResumen {
    actaId: number;
    folio: string;
    colaboradorId: number;
    colaboradorNombre: string;
    puestoArea?: string | null;
    fechaHechos: string;
    fechaConocimiento: string;
    tipoFalta: string;
    gravedad: string;
    estatus: EstatusActa;
    sancion?: string | null;
    razonSocial?: string | null;
    diasTranscurridos?: number | null;
    alertaNivel: NivelAlertaActa;
    diasRestantes?: number | null;
    validacion: ValidacionActa;
    creadoEn: string;
}

export interface ActaDetalle extends ActaResumen {
    lugar: string;
    narracion: string;
    testigo1?: string | null;
    testigo2?: string | null;
    fechaCitatorio?: string | null;
    descargos?: string | null;
    fechaAudiencia?: string | null;
    resultadoFirma?: string | null;
    diasSuspension?: number | null;
    fundamento?: string | null;
    motivoAnulacion?: string | null;
    fechaSancion?: string | null;
    fechaCierre?: string | null;
    creadoPorUsuarioId: number;
    editable: boolean;
}

export interface ColaboradorActa {
    colaboradorId: number;
    codigo: string;
    nombre: string;
    puesto?: string | null;
    departamento?: string | null;
}

export interface CrearActaDto {
    colaboradorId: number;
    fechaHechos: string;
    lugar: string;
    fechaConocimiento: string;
    tipoFalta: string;
    gravedad: string;
    narracion: string;
    testigo1?: string | null;
    testigo2?: string | null;
    razonSocial?: string | null;
}

export type ActualizarActaDto = Omit<CrearActaDto, 'colaboradorId'>;

export interface AplicarSancionDto {
    sancion: string;
    diasSuspension?: number | null;
    fundamento?: string | null;
}

export interface ActasCatalogos {
    estatus: string[];
    gravedades: string[];
    sanciones: string[];
    resultadosFirma: string[];
    maximoDiasSuspension: number;
    plazoPrescripcionDias: number;
}
