import { FuseNavigationItem } from '@fuse/components/navigation';
import { cloneDeep } from 'lodash-es';

/**
 * Módulos cuyos nombres de vista son exactamente los ids del menú (la pantalla de Roles guarda la vista con el id del menú).
 * Sus nombres solo coinciden de forma exacta: con la regla antigua por último segmento, `eventos.dashboard` encendía
 * `finanzas.dashboard` (y al revés) y el menú de Finanzas aparecía para quien no tenía ninguna vista de Finanzas.
 * El API ya compara el nombre exacto; esto solo alinea el menú con él.
 */
const MODULOS_CON_NOMBRE_EXACTO = ['finanzas.'];

/** Entradas del menú que se muestran siempre, sin importar los permisos. */
const SIEMPRE_VISIBLES = ['dashboards.identidad', 'dashboards.neural-graph'];

/**
 * ¿La vista `permiso` habilita la entrada del menú `idItem`?
 * Fuera de los módulos con nombre exacto se conserva la regla antigua: coincide el nombre completo o su último segmento
 * (hay vistas guardadas con nombres abreviados de antes).
 */
export function coincideVista(permiso: string, idItem: string): boolean {
    if (!permiso) return false;
    if (permiso === idItem) return true;
    if (MODULOS_CON_NOMBRE_EXACTO.some((modulo) => permiso.startsWith(modulo) || idItem.startsWith(modulo))) return false;
    return permiso.split('.').pop() === idItem.split('.').pop();
}

/** Deja del menú solo lo que habilitan las vistas del usuario; un grupo sin hijos visibles desaparece. No modifica el original. */
export function filtrarMenuPorVistas(navigation: FuseNavigationItem[], vistasPermitidas: string[]): FuseNavigationItem[] {
    return navigation
        .map((item) => {
            const nuevo = cloneDeep(item);
            if (nuevo.children && nuevo.children.length > 0) {
                nuevo.children = filtrarMenuPorVistas(nuevo.children, vistasPermitidas);
            }
            if (nuevo.type === 'group' || nuevo.type === 'collapsable' || nuevo.type === 'aside') {
                return nuevo.children && nuevo.children.length > 0 ? nuevo : null;
            }
            if (SIEMPRE_VISIBLES.includes(nuevo.id as string)) {
                return nuevo;
            }
            return vistasPermitidas.some((permiso) => coincideVista(permiso, nuevo.id as string)) ? nuevo : null;
        })
        .filter((item): item is FuseNavigationItem => item !== null);
}
