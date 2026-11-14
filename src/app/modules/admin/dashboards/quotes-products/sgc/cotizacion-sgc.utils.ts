import { TotalesSgc } from '../quotes-products.types';

/**
 * Redondeo AwayFromZero equivalente a Math.Round(val, decimals, MidpointRounding.AwayFromZero) de .NET
 */
export function roundAwayFromZero(num: number, decimals: number = 2): number {
    if (isNaN(num) || !isFinite(num)) {
        return 0;
    }
    const sign = num < 0 ? -1 : 1;
    // toFixed(8) quita el ruido binario (1.005 se guarda como 1.00499999999999989...) y la notacion
    // exponencial mueve la coma sin multiplicar: asi coincide con el decimal AwayFromZero del API.
    const limpio = Math.abs(num).toFixed(8);
    const redondeado = Math.round(Number(limpio + 'e' + decimals));
    const resultado = Number(redondeado + 'e-' + decimals);
    return resultado === 0 ? 0 : sign * resultado;
}

/**
 * Calcula el importe de una partida redondeando alejándose del cero a 2 decimales.
 */
export function importeLinea(cantidad: number, precio: number, descuento: number = 0): number {
    const raw = (cantidad || 0) * (precio || 0) - (descuento || 0);
    return roundAwayFromZero(raw, 2);
}

/**
 * Calcula los totales SGC a partir de una lista de partidas, costos indirectos y margen autorizado.
 * Coincide exactamente con la lógica de CotizacionSgcCalculo en el API.
 */
export function totalesSgc(
    partidas: Array<{
        cantidad: number;
        precioUnitario: number;
        descuento?: number;
        costoUnitario?: number | null;
    }>,
    costosIndirectos?: number | null,
    margenAutorizado?: number | null
): TotalesSgc {
    if (!partidas || partidas.length === 0) {
        return {
            subtotal: 0,
            iva: 0,
            total: 0,
            costoDirecto: 0,
            utilidad: null,
            margenPorcentaje: null,
            margenBajo: false,
            partidasSinCosto: 0,
        };
    }

    let subtotal = 0;
    let costoDirecto = 0;
    let partidasSinCosto = 0;
    let partidasConCosto = 0;

    for (const p of partidas) {
        const cant = p.cantidad || 0;
        const precio = p.precioUnitario || 0;
        const desc = p.descuento || 0;
        const imp = importeLinea(cant, precio, desc);
        subtotal = roundAwayFromZero(subtotal + imp, 2);

        if (p.costoUnitario !== null && p.costoUnitario !== undefined) {
            costoDirecto = roundAwayFromZero(
                costoDirecto + roundAwayFromZero(cant * p.costoUnitario, 2),
                2
            );
            partidasConCosto++;
        } else {
            partidasSinCosto++;
        }
    }

    const iva = roundAwayFromZero(subtotal * 0.16, 2);
    const total = roundAwayFromZero(subtotal + iva, 2);

    let utilidad: number | null = null;
    let margenPorcentaje: number | null = null;
    let margenBajo = false;

    if (partidasConCosto > 0) {
        const indirectos = costosIndirectos ?? 0;
        utilidad = roundAwayFromZero(subtotal - costoDirecto - indirectos, 2);

        if (subtotal !== 0) {
            margenPorcentaje = roundAwayFromZero((utilidad / subtotal) * 100, 2);
        }

        if (
            margenPorcentaje !== null &&
            margenAutorizado !== null &&
            margenAutorizado !== undefined &&
            margenPorcentaje < margenAutorizado
        ) {
            margenBajo = true;
        }
    }

    return {
        subtotal,
        iva,
        total,
        costoDirecto,
        utilidad,
        margenPorcentaje,
        margenBajo,
        partidasSinCosto,
    };
}
