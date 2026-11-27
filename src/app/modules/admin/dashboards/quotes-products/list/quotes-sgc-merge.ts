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
  q.estatusCotizacion = r.estatusCotizacion;
  q.motivoRechazo = r.motivoRechazo;
  q.comentarioRechazo = r.comentarioRechazo;
  q.prospecto = r.prospecto;
  q.fechaEmision = r.fechaEmision;
  q.fechaVencimiento = r.fechaVencimiento;
  q.creadoPorNombre = r.creadoPorNombre;
  q.requerimientoFolio = r.requerimientoFolio;
  q.seguimientoAtrasado = r.seguimientoAtrasado;
  q.vencida = r.vencida;
  q.probabilidadPorcentaje = r.probabilidadPorcentaje;
  q.proximaAccionFecha = r.proximaAccionFecha;
  q.pedido = r.pedido;
  q.puedeConvertirAPedido = r.puedeConvertirAPedido;
}

export function mapearEtapaAEstatus(etapa: string | null | undefined): string | null {
  if (!etapa) return null;
  switch (etapa) {
    case 'Borrador':
    case 'EnRevision':
    case 'Aprobada':
      return 'EnProceso';
    case 'Emitida':
    case 'EnSeguimiento':
      return 'EnviadaACliente';
    case 'Ganada':
      return 'AprobadaPorCliente';
    case 'Perdida':
    case 'Cancelada':
    case 'Vencida':
    case 'CerradaSinRespuesta':
      return 'Rechazada';
    default:
      return null;
  }
}

export function obtenerEstatusCotizacion(q: any): string | null {
  if (q?.informativa) {
    return null;
  }
  return q?.estatusCotizacion || mapearEtapaAEstatus(q?.etapa) || null;
}

export function obtenerTituloCliente(q: any): string {
  return q?.prospecto?.empresa || q?.prospecto?.nombreContacto || q?.nombreCliente || 'Sin cliente';
}

export function tieneLead(q: any): boolean {
  return !!(q?.prospecto && (q.prospecto.leadId || q.prospecto.empresa || q.prospecto.nombreContacto));
}

export function tieneCapaSgc(q: any): boolean {
  if (q?.informativa === false) {
    return true;
  }
  return !!(q?.tieneSgc || q?.folio || (q?.etapa && q?.version !== undefined));
}

export function puedeEliminarCotizacion(q: any): boolean {
  if (!tieneCapaSgc(q)) {
    return true;
  }
  if (!q?.etapa) {
    return false;
  }
  const version = q.version ?? 1;
  return q.etapa === 'Borrador' && version <= 1;
}
