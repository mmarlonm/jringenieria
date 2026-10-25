import { HttpErrorResponse } from '@angular/common/http';
import { ResultadoImportacion } from './finanzas.types';

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
        return 'El archivo es demasiado grande (máximo 10 MB).';
    }
    if (e?.status === 0) {
        return 'No se pudo conectar con el servidor.';
    }
    return 'Ocurrió un error inesperado.';
}

/** La `Fecha` de una importación es UTC pero llega sin «Z» (EF la lee sin zona): se le marca para que el pipe `date` la muestre en hora local. */
export const fechaUtc = (texto: string): string => (/(Z|[+-]\d{2}:?\d{2})$/i.test(texto) ? texto : `${texto}Z`);
