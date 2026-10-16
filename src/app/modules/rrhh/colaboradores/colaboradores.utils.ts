/** Fecha local → 'yyyy-MM-dd' (sin pasar por UTC, que corre el día en algunas zonas). */
export function aFechaIso(fecha: Date | null | undefined): string | null {
    if (!fecha) return null;
    const dos = (n: number) => String(n).padStart(2, '0');
    return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

/** 'yyyy-MM-ddTHH:mm:ss' del API → Date local (null si viene vacío). */
export function desdeIso(texto: string | null | undefined): Date | null {
    return texto ? new Date(texto) : null;
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
