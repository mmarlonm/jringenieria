export type EstadoClientes = 'activos' | 'inactivos' | 'todos';

export type EstadoCorreo = 'valido' | 'sinCorreo' | 'invalido';

export type ResultadoEnvio = 'enviado' | 'omitido' | 'fallido';

export interface DestinatarioClienteDto {
    clienteId: number;
    nombre: string;
    empresa: string | null;
    correo: string | null;
    estadoCorreo: EstadoCorreo;
    correoRepetido: boolean;
    activo: boolean;
}

export interface EnvioEncuestaSolicitud {
    clienteIds: number[];
    correosLibres: string[];
}

export interface EnvioEncuestaDetalle {
    clienteId: number | null;
    nombre: string;
    resultado: ResultadoEnvio;
    motivo: string | null;
}

export interface EnvioEncuestaResultadoDto {
    totalProcesados: number;
    enviados: number;
    omitidos: number;
    fallidos: number;
    detalle: EnvioEncuestaDetalle[];
}

