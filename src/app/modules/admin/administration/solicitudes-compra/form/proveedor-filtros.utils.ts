/** Campos por los que se filtra el buscador de proveedores. */
export interface ProveedorFiltrable {
    regimenFiscal?: string | null;
    usoCfdi?: string | null;
}

/**
 * Proveedores que cumplen los filtros de régimen fiscal y uso de CFDI. Un filtro vacío (null o '') no restringe.
 */
export function filtrarProveedores<T extends ProveedorFiltrable>(
    lista: T[] | null | undefined, regimen: string | null, uso: string | null
): T[] {
    return (lista ?? []).filter(p =>
        (!regimen || (p.regimenFiscal ?? '') === regimen) &&
        (!uso || (p.usoCfdi ?? '') === uso)
    );
}

/** Valores distintos y ordenados de un campo, sin vacíos, para llenar un filtro. */
export function opcionesDe(lista: ProveedorFiltrable[] | null | undefined, campo: 'regimenFiscal' | 'usoCfdi'): string[] {
    const valores = (lista ?? []).map(p => (p[campo] ?? '').trim()).filter(v => v !== '');
    return [...new Set(valores)].sort((a, b) => a.localeCompare(b, 'es'));
}
