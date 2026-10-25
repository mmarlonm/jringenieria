import { registerLocaleData } from '@angular/common';
import localeEsMx from '@angular/common/locales/es-MX';

// Los importes de Finanzas se muestran con separadores de México (1,234.56); la app solo registra `es`, que usa los de España.
// Cada página de Finanzas se carga por separado (loadComponent), así que todo componente que formatee con 'es-MX'
// debe importar este archivo por su efecto (`import '../finanzas.locale';`). Registrar dos veces es inofensivo.
registerLocaleData(localeEsMx, 'es-MX');
