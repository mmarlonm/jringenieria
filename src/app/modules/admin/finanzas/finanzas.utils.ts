import { ResultadoImportacion } from './finanzas.types';

export const textoResumen = (r: ResultadoImportacion): string =>
    `${r.nuevos} nuevos · ${r.actualizados} actualizados · ${r.sinCambios} sin cambios · ${r.rechazados.length} rechazados`;

export const hayAdvertencias = (r: ResultadoImportacion): boolean => r.advertencias.length > 0;
