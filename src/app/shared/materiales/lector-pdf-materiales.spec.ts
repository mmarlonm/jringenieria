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
});
