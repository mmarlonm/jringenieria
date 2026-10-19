import { MatDateFormats } from '@angular/material/core';

/**
 * dd/MM/yyyy en los campos de fecha de los diálogos angostos: el formato global de la aplicación es largo
 * («18 de noviembre de 2026») y se corta dentro de un campo de media pantalla.
 */
export const FORMATOS_FECHA_CORTA: MatDateFormats = {
    parse: { dateInput: 'D' },
    display: { dateInput: 'dd/MM/yyyy', monthYearLabel: 'LLLL yyyy', dateA11yLabel: 'DD', monthYearA11yLabel: 'LLLL yyyy' }
};
