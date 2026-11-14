import { importeLinea, totalesSgc, roundAwayFromZero } from './cotizacion-sgc.utils';

describe('CotizacionSgcUtils', () => {
    it('importeLinea_redondea_alejandose_del_cero', () => {
        // 3 * 0.335 = 1.005 -> con AwayFromZero redondea a 1.01
        const imp = importeLinea(3, 0.335, 0);
        expect(imp).toBe(1.01);

        // Descuento resta de la línea
        const conDesc = importeLinea(2, 100, 30);
        expect(conDesc).toBe(170);
    });

    it('Subtotal_iva_y_total_coinciden_con_el_API', () => {
        const partidas1 = [
            { cantidad: 3, precioUnitario: 0.335, descuento: 0 },
            { cantidad: 3, precioUnitario: 0.335, descuento: 0 },
        ];
        const tot1 = totalesSgc(partidas1);
        expect(tot1.subtotal).toBe(2.02);

        const partidas2 = [
            { cantidad: 1, precioUnitario: 100, descuento: 0 },
        ];
        const tot2 = totalesSgc(partidas2);
        expect(tot2.subtotal).toBe(100);
        expect(tot2.iva).toBe(16);
        expect(tot2.total).toBe(116);

        // Subtotal 10.05 * 0.16 = 1.608 -> 1.61
        const partidas3 = [
            { cantidad: 1, precioUnitario: 10.05, descuento: 0 },
        ];
        const tot3 = totalesSgc(partidas3);
        expect(tot3.subtotal).toBe(10.05);
        expect(tot3.iva).toBe(1.61);
        expect(tot3.total).toBe(11.66);
    });

    it('Costo_directo_utilidad_y_margen_coinciden_con_el_API', () => {
        const sinCostos = [
            { cantidad: 1, precioUnitario: 100, descuento: 0, costoUnitario: null },
        ];
        const totSin = totalesSgc(sinCostos);
        expect(totSin.costoDirecto).toBe(0);
        expect(totSin.utilidad).toBeNull();
        expect(totSin.margenPorcentaje).toBeNull();
        expect(totSin.partidasSinCosto).toBe(1);

        const conCostos = [
            { cantidad: 2, precioUnitario: 100, descuento: 0, costoUnitario: 50 },
            { cantidad: 1, precioUnitario: 200, descuento: 0, costoUnitario: null },
            { cantidad: 3, precioUnitario: 10, descuento: 0, costoUnitario: 5.005 },
        ];
        const totCon = totalesSgc(conCostos);
        expect(totCon.costoDirecto).toBe(115.02);
        expect(totCon.partidasSinCosto).toBe(1);

        const conIndirectos = [
            { cantidad: 1, precioUnitario: 100, descuento: 0, costoUnitario: 50 },
        ];
        const totInd = totalesSgc(conIndirectos, 15, null);
        expect(totInd.utilidad).toBe(35);
        expect(totInd.margenPorcentaje).toBe(35);
    });

    it('Margen_bajo_si_es_menor_al_autorizado', () => {
        const partidas = [
            { cantidad: 1, precioUnitario: 100, descuento: 0, costoUnitario: 70 },
        ]; // utilidad = 30, margen = 30%

        const totBajo = totalesSgc(partidas, null, 35);
        expect(totBajo.margenBajo).toBeTrue();

        const totOk = totalesSgc(partidas, null, 30);
        expect(totOk.margenBajo).toBeFalse();

        const totSinMargen = totalesSgc(partidas, null, null);
        expect(totSinMargen.margenBajo).toBeFalse();
    });

    it('Sin_partidas_todo_es_cero', () => {
        const tot = totalesSgc([], 10, 20);
        expect(tot.subtotal).toBe(0);
        expect(tot.iva).toBe(0);
        expect(tot.total).toBe(0);
        expect(tot.costoDirecto).toBe(0);
        expect(tot.utilidad).toBeNull();
        expect(tot.margenPorcentaje).toBeNull();
        expect(tot.margenBajo).toBeFalse();
        expect(tot.partidasSinCosto).toBe(0);
    });
});
