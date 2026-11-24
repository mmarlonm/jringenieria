/**
 * Copia a una cotización del listado los datos de su capa SGC (resumen). Lo comparten la lista y el tablero
 * para que ambos muestren lo mismo.
 */
export function aplicarResumenSgc(q: any, r: any): void {
  q.tieneSgc = true;
  q.folio = r.folio;
  if (r.folioContpaq !== undefined) {
    q.folioContpaq = r.folioContpaq;
  }
  q.tipo = r.tipo;
  q.version = r.version;
  q.totalSgc = r.total;
  q.moneda = r.moneda;
  q.etapa = r.etapa;
  q.fechaEmision = r.fechaEmision;
  q.fechaVencimiento = r.fechaVencimiento;
  q.creadoPorNombre = r.creadoPorNombre;
  q.requerimientoFolio = r.requerimientoFolio;
  q.seguimientoAtrasado = r.seguimientoAtrasado;
  q.vencida = r.vencida;
  q.probabilidadPorcentaje = r.probabilidadPorcentaje;
  q.proximaAccionFecha = r.proximaAccionFecha;
}

export function tieneCapaSgc(q: any): boolean {
  return !!(q?.tieneSgc || q?.folio || (q?.etapa && q?.version !== undefined));
}

export function puedeEliminarCotizacion(q: any): boolean {
  if (!tieneCapaSgc(q)) {
    return true;
  }
  const etapa = q.etapa || 'Borrador';
  const version = q.version ?? 1;
  return etapa === 'Borrador' && version <= 1;
}
