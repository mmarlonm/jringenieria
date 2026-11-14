import { ProductoBuscadorDto } from 'app/modules/admin/administration/solicitudes-compra/models/solicitud-compra.types';

export function agruparExistencias(raw: any): ProductoBuscadorDto[] {
    const rawData = raw?.data !== undefined ? raw.data : raw;
    const data = Array.isArray(rawData) ? rawData : [];

    const grouped = new Map<string, ProductoBuscadorDto>();

    data.forEach(p => {
        const codigo = p.codigo || p.codigoProducto || '';
        const cantidad = p.cantidadReal !== undefined ? p.cantidadReal : (p.existencia || 0);
        const almacen = p.almacen || p.warehouse || '';

        if (!grouped.has(codigo)) {
            grouped.set(codigo, {
                productoId: 0,
                codigoProducto: codigo,
                nombreProducto: p.producto || p.nombreProducto || '',
                existencia: 0,
                almacen: '',
                unidadMedida: p.unidadMedida || 'PZ',
                existenciasDesglosadas: []
            });
        }

        const prod = grouped.get(codigo)!;
        prod.existencia += cantidad;
        if (almacen) {
            prod.existenciasDesglosadas.push({ almacen, cantidad });
        }
    });

    return Array.from(grouped.values());
}

