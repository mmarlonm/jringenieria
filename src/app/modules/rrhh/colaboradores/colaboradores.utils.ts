import { DateTime } from 'luxon';

// Las fechas de los datepicker son Luxon DateTime: la app registra LuxonDateAdapter (locale es, formato día/mes/año).
// No importar MatNativeDateModule en estos componentes: sustituye ese adaptador y una fecha tecleada se lee mes/día.

/** Fecha local del datepicker → 'yyyy-MM-dd' (null si está vacía o es inválida). */
export function aFechaIso(fecha: DateTime | null | undefined): string | null {
    return fecha?.isValid ? (fecha.toISODate() ?? null) : null;
}

/** 'yyyy-MM-ddTHH:mm:ss' del API (sin zona) → DateTime local a medianoche (null si viene vacío o inválido). */
export function desdeIso(texto: string | null | undefined): DateTime | null {
    if (!texto) return null;
    const fecha = DateTime.fromISO(texto);
    return fecha.isValid ? fecha.startOf('day') : null;
}

/** Texto vacío → null, para no mandar cadenas vacías al API. */
export function textoONull(valor: string | null | undefined): string | null {
    const limpio = (valor ?? '').trim();
    return limpio === '' ? null : limpio;
}

/** Mensaje del API ({ mensaje }) o uno por defecto; 403 tiene texto propio. */
export function mensajeError(error: any, porDefecto: string): string {
    if (error?.status === 403) return error?.error?.mensaje || 'No tienes permiso para esta acción.';
    return error?.error?.mensaje || porDefecto;
}
