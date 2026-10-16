import { ColorChip, ResumenDocumentacion } from './documentos-requisicion.types';

interface FilaConDocumentacion {
    estadoLiquidacion?: number;
    documentacion?: ResumenDocumentacion | null;
}

/**
 * Chip de la columna «Documentos» del tablero. null = no se muestra (fuera de etapa documental o sin resumen).
 * Verde: completa. Rojo: ya está liquidada y falta documentación (es lo único que impide cerrarla). Ámbar: falta algo y aún no se liquida.
 */
export function chipDocumentacion(
    resumen: ResumenDocumentacion | null | undefined, estadoLiquidacion: number | null | undefined
): { texto: string; color: ColorChip } | null {
    if (!resumen || !resumen.aplica) return null;
    const texto = `${resumen.requeridosCompletos}/${resumen.requeridosTotal}`;
    if (resumen.completa) return { texto, color: 'verde' };
    return { texto, color: estadoLiquidacion === 1 ? 'rojo' : 'ambar' };
}

/** Liquidada y con documentación incompleta (filtro «Pagadas sin documentación»). */
export function esPagadaSinDocumentos(fila: FilaConDocumentacion): boolean {
    const d = fila.documentacion;
    return !!d && d.aplica && !d.completa && fila.estadoLiquidacion === 1;
}

/** El tipo es requerido por la requisición, está en etapa documental y todavía no está completo. */
export function tipoIncompleto(fila: FilaConDocumentacion, tipo: string): boolean {
    const d = fila.documentacion;
    if (!d || !d.aplica) return false;
    const requerido = d.requeridos.find(r => r.tipo === tipo);
    return !!requerido && requerido.estado !== 'Completo';
}

/** Texto del estado de un tipo de documento para el Excel; «NO APLICA» si no se pide o aún no es etapa documental. */
export function estadoTipo(resumen: ResumenDocumentacion | null | undefined, tipo: string): string {
    if (!resumen || !resumen.aplica) return 'NO APLICA';
    const r = resumen.requeridos.find(x => x.tipo === tipo);
    if (!r) return 'NO APLICA';
    return ({ Completo: 'APROBADA', EnRevision: 'EN REVISIÓN', Rechazado: 'RECHAZADA', Falta: 'PENDIENTE' } as Record<string, string>)[r.estado] ?? r.estado;
}

/** Valor del atributo `accept` de un input de archivo. */
export function aceptarArchivos(tipo: { extensiones: string[] } | null | undefined): string {
    return tipo ? tipo.extensiones.join(',') : '';
}

export function formatearTamano(bytes: number | null | undefined): string {
    if (bytes === null || bytes === undefined) return '';
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${bytes === 0 ? 0 : Math.max(1, Math.round(bytes / 1024))} KB`;
}
