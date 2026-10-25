import { HttpErrorResponse } from '@angular/common/http';
import { Cuenta, ResultadoImportacion } from './finanzas.types';

const MAX_BYTES_ARCHIVO = 10 * 1024 * 1024;
const TEXTO_ARCHIVO_GRANDE = 'El archivo es demasiado grande (máximo 10 MB).';

export const textoResumen = (r: ResultadoImportacion): string =>
    `${r.nuevos} nuevos · ${r.actualizados} actualizados · ${r.sinCambios} sin cambios · ${r.rechazados.length} rechazados`;

export const hayAdvertencias = (r: ResultadoImportacion): boolean => r.advertencias.length > 0;

/** Texto en español de cualquier fallo HTTP: el `mensaje` del API si trae uno; 413 sin cuerpo (Kestrel); sin conexión; genérico. */
export function mensajeDeError(err: HttpErrorResponse | unknown): string {
    const e = err as { status?: number; error?: { mensaje?: unknown } | null } | null | undefined;
    const mensaje = e?.error?.mensaje;
    if (typeof mensaje === 'string' && mensaje.trim() !== '') {
        return mensaje;
    }
    if (e?.status === 413) {
        return TEXTO_ARCHIVO_GRANDE;
    }
    if (e?.status === 0) {
        return 'No se pudo conectar con el servidor.';
    }
    return 'Ocurrió un error inesperado.';
}

/** La `Fecha` de una importación es UTC pero llega sin «Z» (EF la lee sin zona): se le marca para que el pipe `date` la muestre en hora local. */
export const fechaUtc = (texto: string): string => (/(Z|[+-]\d{2}:?\d{2})$/i.test(texto) ? texto : `${texto}Z`);

/**
 * Revisión previa en el navegador: por encima de ~12 MB el servidor corta la conexión sin cuerpo ni cabeceras CORS y la pantalla
 * solo vería «sin conexión» después de subir todo el archivo. Devuelve el motivo, o null si se puede subir.
 */
export function motivoArchivoInvalido(archivo: { name: string; size: number }): string | null {
    if (!/\.(xlsx|xls)$/i.test(archivo.name)) return 'Solo se aceptan archivos de Excel (.xlsx o .xls).';
    return archivo.size > MAX_BYTES_ARCHIVO ? TEXTO_ARCHIVO_GRANDE : null;
}

/** «Empresa · alias ····terminación · moneda». Sin la empresa si no se conoce: la cuenta sola sigue siendo identificable. */
export function etiquetaCuenta(cuenta: Cuenta, nombresEmpresa: ReadonlyMap<number, string>): string {
    const texto = `${cuenta.alias} ····${cuenta.terminacion} · ${cuenta.moneda}`;
    const empresa = nombresEmpresa.get(cuenta.empresaId);
    return empresa ? `${empresa} · ${texto}` : texto;
}
