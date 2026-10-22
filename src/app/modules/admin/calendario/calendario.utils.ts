import { CalendarioGoogle, EventoGoogle } from './calendario.service';

const CLAVE_SELECCION = 'calendarioSeleccionados';

/** Lunes 00:00 de la semana que contiene la fecha. */
export function inicioSemana(d: Date): Date {
    const dia = (d.getDay() + 6) % 7; // lunes = 0
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - dia);
}

export function sumarDias(d: Date, dias: number): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias);
}

/** Clave de día "yyyy-MM-dd" en hora local. */
export function claveDia(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function horaCorta(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

/** Ids de calendarios elegidos; si no hay nada guardado, se usa el principal. */
export function leerSeleccion(calendarios: CalendarioGoogle[]): string[] {
    let guardados: string[] | null = null;
    try {
        const raw = localStorage.getItem(CLAVE_SELECCION);
        guardados = raw ? JSON.parse(raw) : null;
    } catch {
        guardados = null;
    }
    return calendarios
        .filter(c => (guardados ? guardados.includes(c.id) : c.esPrincipal))
        .map(c => c.id);
}

export function guardarSeleccion(ids: string[]): void {
    try {
        localStorage.setItem(CLAVE_SELECCION, JSON.stringify(ids));
    } catch {
        // Sin almacenamiento disponible: la selección solo dura la sesión de la página
    }
}

/** Eventos agrupados por día local; los de todo el día primero. */
export function agruparPorDia(eventos: EventoGoogle[]): Map<string, EventoGoogle[]> {
    const mapa = new Map<string, EventoGoogle[]>();
    for (const e of eventos) {
        const clave = claveDia(new Date(e.inicio));
        if (!mapa.has(clave)) mapa.set(clave, []);
        mapa.get(clave)!.push(e);
    }
    for (const lista of mapa.values()) {
        lista.sort((a, b) => Number(b.esTodoElDia) - Number(a.esTodoElDia)
            || new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
    }
    return mapa;
}
