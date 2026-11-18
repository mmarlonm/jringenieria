// Linea del proceso comercial: Lead -> Requerimiento -> Ingenieria / Cotizacion.
// Lo arma el API (GET api/ProcesoComercial/{tipo}/{id}); aqui solo se muestra.

export type ProcesoTipo = 'lead' | 'requerimiento' | 'caso' | 'cotizacion';

export type ProcesoClave = 'lead' | 'requerimiento' | 'ingenieria' | 'cotizacion';

export type ProcesoEstadoPaso = 'completado' | 'actual' | 'pendiente' | 'noAplica' | 'detenido';

export interface ProcesoPaso {
  clave: ProcesoClave;
  titulo: string;
  estado: ProcesoEstadoPaso;
  detalle: string;
  id?: number | null;
}

export interface ProcesoComercial {
  actual: ProcesoClave;
  mensaje: string;
  pasos: ProcesoPaso[];
}
