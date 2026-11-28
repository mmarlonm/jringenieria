import { LectorPdfMateriales } from './lector-pdf-materiales';

describe('LectorPdfMateriales', () => {
    it('parseNumber_conserva_el_comportamiento_original', () => {
        expect(LectorPdfMateriales.parseNumber('')).toBe(0);
        expect(LectorPdfMateriales.parseNumber('$ 1,234.56')).toBe(1234.56);
        expect(LectorPdfMateriales.parseNumber('1.234,56')).toBe(1.23456); // Rareza original fijada
        expect(LectorPdfMateriales.parseNumber('1,234')).toBe(1234);
        expect(LectorPdfMateriales.parseNumber('12,34')).toBe(12.34);
        expect(LectorPdfMateriales.parseNumber('invalido')).toBe(0);
    });

    it('isNumeric_conserva_el_comportamiento_original', () => {
        expect(LectorPdfMateriales.isNumeric('123')).toBeTrue();
        expect(LectorPdfMateriales.isNumeric('$ 1,234.50')).toBeTrue();
        expect(LectorPdfMateriales.isNumeric('abc')).toBeFalse();
        expect(LectorPdfMateriales.isNumeric('')).toBeFalse();
        expect(LectorPdfMateriales.isNumeric('   ')).toBeFalse();
    });

    it('normalizeUnidad_conserva_el_comportamiento_original', () => {
        expect(LectorPdfMateriales.normalizeUnidad('piezas')).toBe('PZA');
        expect(LectorPdfMateriales.normalizeUnidad('P.Z.A.')).toBe('PZA');
        expect(LectorPdfMateriales.normalizeUnidad('Cjas')).toBe('CAJA');
        expect(LectorPdfMateriales.normalizeUnidad('METROS')).toBe('METRO');
        expect(LectorPdfMateriales.normalizeUnidad('kg')).toBe('KILO');
        expect(LectorPdfMateriales.normalizeUnidad('')).toBe('PZA');
        expect(LectorPdfMateriales.normalizeUnidad(null as any)).toBe('PZA');
        expect(LectorPdfMateriales.normalizeUnidad('BIDON')).toBe('BIDON');
    });

    it('getClosestColumn_conserva_el_comportamiento_original', () => {
        const mapping = { articulo: 50, nombre: 150, cantidad: 350, precio: 450, total: 550 };
        expect(LectorPdfMateriales.getClosestColumn(52, mapping)).toBe('articulo');
        expect(LectorPdfMateriales.getClosestColumn(160, mapping)).toBe('nombre');
        expect(LectorPdfMateriales.getClosestColumn(900, mapping)).toBe('');
    });

    describe('interpretarElementos', () => {
        const t = (text: string, x: number, y: number, width: number) => ({ text, x, y, width, height: 8, page: 1 });

        /**
         * Posiciones tomadas de una cotización de CONTPAQi (Cantidad | Unidad | Código | Descripción | T.E. | Valor unit. | Importe).
         * pdf.js junta los títulos pegados en un solo texto: «Cantidad Unidad Código» y «Valor unit. Importe».
         */
        const formatoContpaqi = (): any[] => [
            t('Cotización', 277, 702, 51),
            t('Cliente:', 70, 599, 33), t('MOSTRADOR', 132, 598, 58),
            t('Cantidad Unidad Código', 67.2, 524.1, 133.3), t('Descripción', 274.8, 524.1, 57.2), t('T.E.', 420.9, 524.1, 18.3), t('Valor unit. Importe', 466.4, 524.1, 92.2),
            t('130', 80, 510.2, 16.7), t('PIEZA', 122.2, 510.2, 28.9), t('VAE116', 165.7, 510.2, 36.7), t('CABLE 1+1 CAL 6 AEREO', 243.1, 510.2, 120.9), t('16.00', 478.4, 510.2, 25), t('2,080.00', 521.1, 510.2, 38.9),
            t('25', 84, 496, 10), t('METROS', 122, 496, 30), t('CT-12', 166, 496, 25), t('CABLE THW CAL 12', 243.1, 496, 80), t('3 días', 425, 496, 25), t('10.50', 478.4, 496, 25), t('262.50', 524, 496, 35),
            t('COLOR NEGRO', 243.1, 484, 60),
            t('Importe con letra', 195, 470, 81), t('Subtotal', 445, 470, 40), t('2,342.50', 532, 470, 39),
            t('I.V.A.', 460, 458, 25), t('374.80', 540, 458, 31),
            t('Total', 462, 428, 24), t('$2,717.30', 527, 428, 44),
            t('Datos bancarios', 189, 393, 78),
            t('Nombre:', 69, 377, 37), t('TITULAR DE LA CUENTA', 143, 379, 120),
            t('Cuenta:', 69, 360, 34), t('0000000000', 143, 360, 50),
            t('Clabe:', 69, 344, 28), t('000000000000000000', 143, 346, 90),
        ];

        it('Detecta_los_materiales_del_formato_de_CONTPAQi_con_los_titulos_pegados', () => {
            const res = LectorPdfMateriales.interpretarElementos(formatoContpaqi());

            expect(res.length).toBe(2);
            expect(res[0]).toEqual(jasmine.objectContaining({ materialServicio: 'VAE116', descripcion: 'CABLE 1+1 CAL 6 AEREO', unidad: 'PZA', cantidad: 130, costoUnitario: 16, total: 2080 }));
            expect(res[1]).toEqual(jasmine.objectContaining({ materialServicio: 'CT-12', unidad: 'METRO', cantidad: 25, costoUnitario: 10.5, total: 262.5 }));
        });

        it('La_descripcion_en_dos_renglones_se_junta_y_el_tiempo_de_entrega_no_se_toma_por_precio', () => {
            const res = LectorPdfMateriales.interpretarElementos(formatoContpaqi());
            expect(res[1].descripcion).toBe('CABLE THW CAL 12 COLOR NEGRO');
            expect(res[1].costoUnitario).toBe(10.5); // «3 días» (T.E.) no pisa el precio
        });

        it('Los_datos_bancarios_y_los_totales_de_abajo_no_se_vuelven_materiales', () => {
            const res = LectorPdfMateriales.interpretarElementos(formatoContpaqi());
            expect(res.map(m => m.materialServicio)).toEqual(['VAE116', 'CT-12']);
        });

        it('Sin_encabezado_reconocible_no_inventa_materiales', () => {
            const sinTabla = [t('Cotización', 277, 702, 51), t('Cliente:', 70, 599, 33), t('MOSTRADOR', 132, 598, 58), t('Total', 462, 428, 24), t('$10.00', 527, 428, 44)];
            expect(LectorPdfMateriales.interpretarElementos(sinTabla)).toEqual([]);
            expect(LectorPdfMateriales.interpretarElementos([])).toEqual([]);
        });

        it('El_formato_clasico_con_titulos_separados_sigue_leyendose_igual', () => {
            const clasico = [
                t('ARTÍCULO', 50, 700, 40), t('DESCRIPCIÓN', 150, 700, 60), t('CANTIDAD', 350, 700, 40), t('PRECIO', 450, 700, 30), t('TOTAL', 550, 700, 30),
                t('ABC-1', 50, 680, 30), t('Cable de cobre', 150, 680, 70), t('10', 355, 680, 10), t('5.00', 455, 680, 20), t('50.00', 555, 680, 25),
                t('SUBTOTAL', 450, 600, 40), t('50.00', 555, 600, 25),
            ];
            const res = LectorPdfMateriales.interpretarElementos(clasico);
            expect(res.length).toBe(1);
            expect(res[0]).toEqual(jasmine.objectContaining({ materialServicio: 'ABC-1', descripcion: 'Cable de cobre', unidad: 'PZA', cantidad: 10, costoUnitario: 5, total: 50 }));
        });

        it('buscarEncabezadoPegado_no_toma_una_fila_de_datos_ni_un_titulo_suelto_por_encabezado', () => {
            const filaDeDatos = [[t('130', 80, 510, 17), t('PIEZA', 122, 510, 29), t('VAE116', 166, 510, 37), t('CABLE', 243, 510, 121), t('16.00', 478, 510, 25), t('2,080.00', 521, 510, 39)]];
            const tituloSuelto = [[t('Cantidad', 67, 524, 43), t('Descripción', 275, 524, 57)]];
            const KEYWORDS = {
                articulo: ['ARTICULO', 'ARTÍCULO', 'CODIGO', 'CÓDIGO', 'PARTIDA', 'REF', 'CLAVE', 'SKU', 'ID'],
                nombre: ['NOMBRE', 'DESCRIPCION', 'DESCRIPCIÓN', 'CONCEPTO', 'DETALLE', 'PRODUCTO'],
                unidad: ['UNIDAD', 'U.MED', 'U.M', 'UM', 'MEDIDA'],
                cantidad: ['CANTIDAD', 'UNIDADES', 'CANT', 'QTY'],
                precio: ['PRECIO', 'COSTO', 'UNITARIO'],
                total: ['TOTAL', 'IMPORTE', 'SUBTOTAL'],
            };
            expect(LectorPdfMateriales.buscarEncabezadoPegado(filaDeDatos, KEYWORDS)).toBeNull();
            expect(LectorPdfMateriales.buscarEncabezadoPegado(tituloSuelto, KEYWORDS)).toBeNull();
        });
    });
});
