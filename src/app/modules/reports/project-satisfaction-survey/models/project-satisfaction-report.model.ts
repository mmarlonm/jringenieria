export interface ServiceSatisfactionReport {
  sucursalId: number | null;
  sucursalNombre: string;

  totalRespuestas: number;

  promotores: number;
  neutros: number;
  detractores: number;

  porcentajePromotores: number;
  porcentajeDetractores: number;
  nps: number;

  servicioPersonal: number;
  recomendarServicios: number;
  ayudaProblema: number;
  desarrolloServicios: number;
  calidadTiempo: number;
}
