import type { FuseNavigationItem } from '@fuse/components/navigation';

/** Una pantalla del menú a la que se le asignan permisos. */
export interface VistaRol {
    /** Nombre de la vista tal como se guarda en el API (el `id` del menú, p. ej. «administracion.tablero-compras»). */
    id: string;
    titulo: string;
    icono?: string;
    /** Subcarpeta del menú dentro del módulo (p. ej. «Proveedores»). */
    grupo?: string;
}

/** Sección principal del menú con las vistas que contiene. */
export interface ModuloRol {
    id: string;
    titulo: string;
    icono?: string;
    vistas: VistaRol[];
}

export interface PermisoCatalogo {
    permisoId: number;
    descripcionPermiso: string;
}

/** Permisos elegidos por vista: `{ 'administracion.tablero-compras': [1, 2, 3] }`. */
export type Seleccion = { [vistaId: string]: number[] };

export type ModoAsignacion = 'agregar' | 'quitar';

export interface PedidoMasivo {
    rolIds: number[];
    modo: ModoAsignacion;
    vistas: { vistaId: string; permisos: number[] | null }[];
}

const MODULO_GENERAL = '__general';

// ------------------------------------------------------------------ menú → módulos

/**
 * Agrupa el menú en módulos: cada sección principal con todas sus vistas (también las de sus subcarpetas) y, aparte,
 * las vistas sueltas de la raíz. Una vista que aparece dos veces cuenta una sola vez; las secciones sin vistas se omiten.
 */
export function construirModulos(menu: FuseNavigationItem[]): ModuloRol[] {
    const vistos = new Set<string>();
    const modulos: ModuloRol[] = [];
    const sueltas: VistaRol[] = [];

    const recorrer = (nodos: FuseNavigationItem[] | undefined, destino: VistaRol[], grupo?: string): void => {
        for (const nodo of nodos ?? []) {
            if (nodo.type === 'basic') {
                if (!nodo.id || vistos.has(nodo.id)) continue;
                vistos.add(nodo.id);
                destino.push({ id: nodo.id, titulo: nodo.title ?? nodo.id, icono: nodo.icon, ...(grupo ? { grupo } : {}) });
            } else if (nodo.type === 'collapsable' || nodo.type === 'group') {
                recorrer(nodo.children, destino, grupo ? `${grupo} › ${nodo.title}` : nodo.title);
            }
        }
    };

    for (const nodo of menu ?? []) {
        if (nodo.type === 'basic') {
            recorrer([nodo], sueltas);
        } else if (nodo.type === 'collapsable' || nodo.type === 'group') {
            const vistas: VistaRol[] = [];
            recorrer(nodo.children, vistas);
            if (vistas.length > 0) modulos.push({ id: nodo.id ?? nodo.title ?? '', titulo: nodo.title ?? '', icono: nodo.icon, vistas });
        }
    }

    if (sueltas.length > 0) {
        modulos.unshift({ id: MODULO_GENERAL, titulo: 'Accesos generales', icono: 'heroicons_outline:squares-2x2', vistas: sueltas });
    }
    return modulos;
}

// ------------------------------------------------------------------ permisos que aplican a cada vista

const VISTA_ISO = 'administracion.iso-documentacion';
const VISTA_CUESTIONARIO = 'administracion.proveedores.cuestionario';
const PERMISOS_ISO = [1002, 2, 1003, 3, 1];
const ETIQUETAS_ISO: { [id: number]: string } = { 1002: 'Agregar', 2: 'Agregar Carpetas', 1003: 'Descargar', 3: 'Eliminar', 1: 'Ver' };

const esPermisoDeSeccion = (id: number) => id >= 101 && id <= 108;

/** Documentación ISO usa los mismos números con otro significado (p. ej. el 2 es «Agregar carpetas»). */
export function tienePermisosPropios(vistaId: string): boolean {
    return vistaId === VISTA_ISO;
}

/** Permisos que se ofrecen para una vista (mismas reglas que tenía el árbol de permisos). */
export function permisosVisibles(vistaId: string, catalogo: PermisoCatalogo[]): PermisoCatalogo[] {
    if (vistaId === VISTA_CUESTIONARIO) return catalogo;
    if (vistaId === VISTA_ISO) return catalogo.filter(p => PERMISOS_ISO.includes(p.permisoId));
    return catalogo.filter(p => !esPermisoDeSeccion(p.permisoId) && p.permisoId !== 1003);
}

export function etiquetaPermiso(vistaId: string, permiso: PermisoCatalogo): string {
    return (vistaId === VISTA_ISO && ETIQUETAS_ISO[permiso.permisoId]) || permiso.descripcionPermiso;
}

// ------------------------------------------------------------------ selección (siempre devuelve objetos nuevos)

export function seleccionarVista(sel: Seleccion, vistaId: string, activar: boolean, catalogo: PermisoCatalogo[]): Seleccion {
    return { ...sel, [vistaId]: activar ? permisosVisibles(vistaId, catalogo).map(p => p.permisoId) : [] };
}

export function alternarPermiso(sel: Seleccion, vistaId: string, permisoId: number): Seleccion {
    const actuales = sel[vistaId] ?? [];
    return { ...sel, [vistaId]: actuales.includes(permisoId) ? actuales.filter(id => id !== permisoId) : [...actuales, permisoId] };
}

export function seleccionarModulo(sel: Seleccion, modulo: ModuloRol, activar: boolean, catalogo: PermisoCatalogo[]): Seleccion {
    return modulo.vistas.reduce((acc, v) => seleccionarVista(acc, v.id, activar, catalogo), sel);
}

export function resumenModulo(modulo: ModuloRol, sel: Seleccion): { activas: number; total: number; estado: 'todo' | 'parcial' | 'nada' } {
    const activas = modulo.vistas.filter(v => (sel[v.id]?.length ?? 0) > 0).length;
    const total = modulo.vistas.length;
    return { activas, total, estado: activas === 0 ? 'nada' : activas === total ? 'todo' : 'parcial' };
}

/** Cantidad de permisos que cambiaron entre dos selecciones (agregados + quitados). */
export function contarCambios(original: Seleccion, actual: Seleccion): number {
    const pares = (s: Seleccion) => new Set(Object.entries(s).flatMap(([vista, ids]) => (ids ?? []).map(id => `${vista}|${id}`)));
    const a = pares(original);
    const b = pares(actual);
    let cambios = 0;
    a.forEach(p => { if (!b.has(p)) cambios++; });
    b.forEach(p => { if (!a.has(p)) cambios++; });
    return cambios;
}

// ------------------------------------------------------------------ rol del API ↔ selección

/** Convierte un rol como lo entrega el API (`permisos` con su vista y `vistas`) a la selección por vista. */
export function seleccionDeRol(rol: any): Seleccion {
    const sel: Seleccion = {};
    const nombreDe = (x: any): string | null => {
        const candidato = x?.nombreVista ?? (typeof x?.vistaId === 'string' ? x.vistaId : null);
        return typeof candidato === 'string' && candidato ? candidato : null;
    };

    for (const p of rol?.permisos ?? []) {
        const vista = nombreDe(p?.vista) ?? nombreDe(p);
        const id = Number(p?.permisoId);
        if (!vista || isNaN(id)) continue;
        sel[vista] = sel[vista] ?? [];
        if (!sel[vista].includes(id)) sel[vista].push(id);
    }
    for (const v of rol?.vistas ?? []) {
        const vista = nombreDe(v);
        if (vista) sel[vista] = sel[vista] ?? [];
    }
    return sel;
}

/** Lo que espera el API al guardar un rol: solo las vistas que tienen al menos un permiso. */
export function vistasParaGuardar(sel: Seleccion): { vistaId: string; permisos: number[] }[] {
    return Object.keys(sel).filter(k => (sel[k]?.length ?? 0) > 0).map(k => ({ vistaId: k, permisos: sel[k] }));
}

// ------------------------------------------------------------------ búsqueda

const sinAcentos = (t: string) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Módulos y vistas que coinciden con el texto (título, nombre o subcarpeta); si coincide el módulo se muestran todas sus vistas. */
export function filtrarModulos(modulos: ModuloRol[], texto: string): ModuloRol[] {
    const q = sinAcentos(texto);
    if (!q) return modulos;
    return modulos
        .map(m => sinAcentos(m.titulo).includes(q)
            ? m
            : { ...m, vistas: m.vistas.filter(v => sinAcentos(`${v.titulo} ${v.id} ${v.grupo ?? ''}`).includes(q)) })
        .filter(m => m.vistas.length > 0);
}

// ------------------------------------------------------------------ asignación a varios roles

/** Permisos que se pueden asignar en masa a una vista: los generales (sin los de sección ni «Descargar»); en Documentación ISO solo «Ver». */
function permisosEnMasa(vistaId: string, catalogo: PermisoCatalogo[]): number[] {
    const generales = catalogo.map(p => p.permisoId).filter(id => !esPermisoDeSeccion(id) && id !== 1003);
    return tienePermisosPropios(vistaId) ? generales.filter(id => id === 1) : generales;
}

export function permisosParaAsignacionMasiva(vistas: VistaRol[], catalogo: PermisoCatalogo[]): PermisoCatalogo[] {
    const aplican = new Set(vistas.flatMap(v => permisosEnMasa(v.id, catalogo)));
    return catalogo.filter(p => aplican.has(p.permisoId));
}

/**
 * Arma el pedido para el API. `todos` (solo al quitar) retira todos los permisos de las vistas y con ello su acceso.
 * Los permisos que no aplican a una vista se omiten, y una vista sin permisos aplicables no se envía.
 */
export function construirPedidoMasivo(
    modo: ModoAsignacion, rolIds: number[], vistas: VistaRol[], permisos: number[], todos: boolean, catalogo: PermisoCatalogo[]
): PedidoMasivo {
    const elegidos = [...new Set(permisos)];
    const unicas = vistas.filter((v, i) => vistas.findIndex(x => x.id === v.id) === i);
    const resultado: PedidoMasivo['vistas'] = [];

    for (const vista of unicas) {
        if (modo === 'quitar' && todos) {
            resultado.push({ vistaId: vista.id, permisos: null });
            continue;
        }
        const aplicables = permisosEnMasa(vista.id, catalogo);
        const aEnviar = elegidos.filter(id => aplicables.includes(id));
        if (aEnviar.length > 0) resultado.push({ vistaId: vista.id, permisos: aEnviar });
    }
    return { rolIds: [...new Set(rolIds)], modo, vistas: resultado };
}
