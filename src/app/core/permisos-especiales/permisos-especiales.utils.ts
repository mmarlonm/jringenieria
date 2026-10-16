import { GrupoPermisos, PermisoEspecial, UsuarioBasico } from './permisos-especiales.types';

/** Minúsculas y sin acentos, para comparar texto escrito por personas. */
const normalizar = (texto: string | null | undefined): string =>
    (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Agrupa los permisos por módulo (orden alfabético) y los filtra por nombre, código o descripción. */
export function agruparPorModulo(permisos: PermisoEspecial[], busqueda: string): GrupoPermisos[] {
    const texto = normalizar(busqueda);
    const filtrados = texto
        ? permisos.filter(p =>
            normalizar(p.nombre).includes(texto) ||
            normalizar(p.codigo).includes(texto) ||
            normalizar(p.descripcion).includes(texto))
        : permisos;

    const porModulo = new Map<string, PermisoEspecial[]>();
    for (const permiso of filtrados) {
        porModulo.set(permiso.modulo, [...(porModulo.get(permiso.modulo) ?? []), permiso]);
    }

    return [...porModulo.entries()]
        .sort(([a], [b]) => a.localeCompare(b, 'es'))
        .map(([modulo, lista]) => ({
            modulo,
            permisos: [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
        }));
}

/** Usuarios que coinciden con el texto (nombre o correo), sin los ya asignados y limitados a `maximo`. */
export function filtrarUsuarios(
    usuarios: UsuarioBasico[], busqueda: string, excluirIds: number[], maximo: number
): UsuarioBasico[] {
    const texto = normalizar(busqueda);
    if (!texto) return [];

    return usuarios
        .filter(u => !excluirIds.includes(Number(u.usuarioId)))
        .filter(u => normalizar(u.nombreUsuario).includes(texto) || normalizar(u.email).includes(texto))
        .slice(0, maximo);
}
