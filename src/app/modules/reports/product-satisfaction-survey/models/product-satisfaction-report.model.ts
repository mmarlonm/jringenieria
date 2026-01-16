export interface ProductSatisfactionReport {
  sucursalId: number;
  sucursalNombre: string;

  totalRespuestas: number;

  promotores: number;
  neutros: number;
  detractores: number;

  porcentajePromotores: number;
  porcentajeDetractores: number;
  nps: number;

  servicioPersonal: number;
  ayudaProducto: number;
  tiempoEntrega: number;
}
