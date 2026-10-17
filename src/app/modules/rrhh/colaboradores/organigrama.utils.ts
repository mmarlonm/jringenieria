import { RADIAL_DEPARTAMENTOS, RADIAL_NODES, RadialNode } from '../../admin/dashboards/roadmap/identidad.data';
import { ColaboradorLista } from './colaboradores.types';

/** Colaborador de la lista con su lugar en el organigrama (puesto y nivel jerárquico dentro de su grupo). */
export interface FilaColaborador extends ColaboradorLista {
    esGrupo: false;
    /** Puesto según el organigrama; null si la persona no aparece en él. */
    puestoOrganigrama: string | null;
    /** 0 = cabeza del grupo, 1 = su equipo directo… (solo si aparece en el organigrama). */
    nivel: number;
}

export interface FilaGrupo {
    esGrupo: true;
    clave: string;
    titulo: string;
    total: number;
}

export type FilaLista = FilaColaborador | FilaGrupo;

export interface GrupoOrganigrama {
    clave: string;
    titulo: string;
    colaboradores: FilaColaborador[];
}

const SIN_CLASIFICAR = 'sin-clasificar';

/** Mayúsculas sin acentos ni signos («Méndez, Ñ.» → «MENDEZ N»), para comparar nombres. */
function normalizar(texto: string): string {
    return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

interface PersonaOrganigrama {
    nodo: RadialNode;
    nombre: string; // «CATALINA»
    apellido: string; // «M» (inicial) o el apellido completo («DILL»)
    orden: number;
    nivel: number;
}

/** Posición de cada nodo en el organigrama: recorrido padre → hijos, para listar primero al jefe y luego a su equipo. */
function recorrerOrganigrama(): Map<string, { orden: number; nivel: number }> {
    const hijos = new Map<string, RadialNode[]>();
    for (const n of RADIAL_NODES) {
        if (!n.parentId) continue;
        hijos.set(n.parentId, [...(hijos.get(n.parentId) ?? []), n]);
    }
    const posicion = new Map<string, { orden: number; nivel: number }>();
    const visitar = (n: RadialNode, nivel: number): void => {
        posicion.set(n.id, { orden: posicion.size, nivel });
        (hijos.get(n.id) ?? []).forEach((h) => visitar(h, nivel + 1));
    };
    RADIAL_NODES.filter((n) => !n.parentId && !n.isCore).forEach((raiz) => visitar(raiz, 0));
    return posicion;
}

/**
 * Personas del organigrama. En el organigrama cada persona aparece como «NOMBRE I» (nombre + inicial del apellido) y puede
 * haber varias en un puesto («DIEGO B / OSVALDO R»). Los cuadros de área, el cliente y los nombres sin apellido se omiten.
 */
function personasDelOrganigrama(): PersonaOrganigrama[] {
    const posicion = recorrerOrganigrama();
    const personas: PersonaOrganigrama[] = [];
    for (const nodo of RADIAL_NODES) {
        if (nodo.isDepartmentHub || nodo.isCore) continue;
        const lugar = posicion.get(nodo.id);
        if (!lugar) continue;
        for (const persona of nodo.person.split('/')) {
            const palabras = normalizar(persona).split(' ').filter(Boolean);
            if (palabras.length < 2) continue; // sin apellido no se puede distinguir a un «Juan» de otro
            personas.push({ nodo, nombre: palabras[0], apellido: palabras[palabras.length - 1], ...lugar });
        }
    }
    return personas;
}

/** «GUILLE» ↔ «GUILLERMO», «MONSE» ↔ «MONSERRAT»; «ANGEL» no es «ANGELES» (la diferencia mínima evita falsos positivos). */
function esDiminutivo(abreviado: string, completo: string): boolean {
    return abreviado.length >= 5 && completo.length - abreviado.length >= 3 && completo.startsWith(abreviado);
}

/** ¿El nombre completo del colaborador (en cualquier orden: «Nombre Apellido» o «Apellido Nombre») es esta persona? */
function coincide(palabrasColaborador: string[], p: PersonaOrganigrama): boolean {
    return palabrasColaborador.some((palabra, i) =>
        (palabra === p.nombre || esDiminutivo(p.nombre, palabra)) &&
        palabrasColaborador.some((otra, j) => j !== i && otra.startsWith(p.apellido)));
}

/** Grupo del organigrama según lo capturado en la ficha (área o sucursal), si se reconoce. */
function categoriaDelArea(texto: string | null): string | null {
    const t = normalizar(texto ?? '');
    if (t.includes('ADMIN')) return 'administracion';
    if (t.includes('COMERCIAL') || t.includes('VENTAS') || t.includes('MARKETING')) return 'comercial';
    if (t.includes('INGENIER')) return 'ingenieria';
    return null;
}

function categoriaDeLaSucursal(texto: string | null): string | null {
    const t = normalizar(texto ?? '');
    if (t.includes('PUEBLA')) return 'puebla';
    if (t.includes('PACHUCA')) return 'pachuca';
    if (t.includes('QUERETARO')) return 'queretaro';
    return null;
}

/**
 * Clasifica a los colaboradores como en el organigrama (Administración, Ingeniería, Desarrollo Comercial y las sucursales),
 * con el jefe primero y luego su equipo. Prioridad de cada persona:
 *  1. el área capturada en su ficha, si es una de las del organigrama (lo que RRHH corrige a mano gana);
 *  2. aparecer en el organigrama por nombre (así se le pone también su puesto);
 *  3. su sucursal; 4. el área capturada aunque no sea del organigrama; 5. «Sin clasificar».
 */
export function agruparSegunOrganigrama(colaboradores: ColaboradorLista[]): GrupoOrganigrama[] {
    const personas = personasDelOrganigrama();
    const grupos = new Map<string, GrupoOrganigrama>();
    const posiciones = new Map<string, number>(); // orden en el organigrama dentro de su grupo

    const agregar = (clave: string, titulo: string, fila: FilaColaborador, orden: number): void => {
        if (!grupos.has(clave)) grupos.set(clave, { clave, titulo, colaboradores: [] });
        grupos.get(clave)!.colaboradores.push(fila);
        posiciones.set(`${clave}|${fila.colaboradorId}`, orden);
    };
    const titulos = new Map(RADIAL_DEPARTAMENTOS.filter((d) => d.id !== 'todos').map((d) => [d.id, d.name]));

    for (const c of colaboradores) {
        const palabras = normalizar(c.nombre).split(' ').filter(Boolean);
        // en el organigrama, la persona aparece en su puesto más alto si tiene varios
        const coincidencias = personas.filter((p) => coincide(palabras, p)).sort((a, b) => a.nivel - b.nivel || a.orden - b.orden);
        const enOrganigrama = coincidencias[0];

        const categoria = categoriaDelArea(c.departamento) ?? enOrganigrama?.nodo.category ?? categoriaDeLaSucursal(c.sucursal);
        const mismaCategoria = enOrganigrama && enOrganigrama.nodo.category === categoria;
        const fila: FilaColaborador = {
            ...c, esGrupo: false,
            puestoOrganigrama: enOrganigrama?.nodo.role ?? null,
            nivel: mismaCategoria ? Math.max(enOrganigrama.nivel - 1, 0) : 0
        };
        const orden = mismaCategoria ? enOrganigrama.orden : Number.MAX_SAFE_INTEGER;

        if (categoria && titulos.has(categoria)) agregar(categoria, titulos.get(categoria)!, fila, orden);
        else if (c.departamento?.trim()) agregar(`area:${normalizar(c.departamento)}`, c.departamento.trim(), fila, Number.MAX_SAFE_INTEGER);
        else agregar(SIN_CLASIFICAR, 'Sin clasificar', fila, Number.MAX_SAFE_INTEGER);
    }

    const ordenGrupos = [...titulos.keys()];
    const peso = (g: GrupoOrganigrama): number =>
        ordenGrupos.includes(g.clave) ? ordenGrupos.indexOf(g.clave)
            : g.clave === SIN_CLASIFICAR ? 1_000_000 : 1_000 + 0; // áreas propias después del organigrama, «Sin clasificar» al final

    for (const g of grupos.values()) {
        g.colaboradores.sort((a, b) =>
            (posiciones.get(`${g.clave}|${a.colaboradorId}`)! - posiciones.get(`${g.clave}|${b.colaboradorId}`)!) ||
            a.nombre.localeCompare(b.nombre, 'es'));
    }
    return [...grupos.values()].sort((a, b) => peso(a) - peso(b) || a.titulo.localeCompare(b.titulo, 'es'));
}

/** Lista plana para la tabla: un encabezado por grupo seguido de sus colaboradores. */
export function aplanarGrupos(grupos: GrupoOrganigrama[]): FilaLista[] {
    return grupos.flatMap((g) => [
        { esGrupo: true, clave: g.clave, titulo: g.titulo, total: g.colaboradores.length } as FilaGrupo,
        ...g.colaboradores
    ]);
}
