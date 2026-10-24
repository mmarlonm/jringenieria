import { CotizacionEtapaDto } from './cotizacion-etapas.models';

/**
 * Determina si el usuario actual tiene permisos para autorizar o rechazar una etapa.
 * Regla:
 * - Los administradores siempre pueden autorizar.
 * - Si no hay etapa definida, false.
 * - Si no hay un autorizador designado específicamente, cualquier usuario con acceso a la vista puede autorizar.
 * - Si hay un autorizador designado, solo ese usuario (o un administrador) puede autorizar.
 */
export function puedeAutorizar(
    etapa: CotizacionEtapaDto | null | undefined,
    usuarioActualId: number,
    esAdmin: boolean = false
): boolean {
    if (esAdmin) {
        return true;
    }

    if (!etapa) {
        return false;
    }

    if (!etapa.autorizaUsuarioId) {
        return true;
    }

    return etapa.autorizaUsuarioId === usuarioActualId;
}
