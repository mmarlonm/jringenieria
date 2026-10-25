import { formatCurrency } from '@angular/common';
import './finanzas.locale';

describe('finanzas.locale', () => {
    it('registra es-MX: los importes llevan coma de millares y punto decimal, sin NG0701', () => {
        expect(formatCurrency(1234.56, 'es-MX', '$', 'MXN', '1.2-2')).toBe('$1,234.56');
        expect(formatCurrency(1234567.5, 'es-MX', '$', 'MXN', '1.2-2')).toBe('$1,234,567.50');
    });
});
