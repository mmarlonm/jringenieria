import { ConteoPorEstatus, MaterialEstatus, SeguimientoMaterial } from '../../../engineering.service';

/** Clases de color de cada estatus (píldora de la tabla, tarjeta de KPI y selector). */
export const CLASES_ESTATUS: Record<MaterialEstatus, { pildora: string; tarjeta: string; barra: string }> = {
  EnProceso: { pildora: 'bg-amber-100 text-amber-800 border-amber-200', tarjeta: 'text-amber-700', barra: 'bg-amber-500' },
  Listo: { pildora: 'bg-emerald-100 text-emerald-800 border-emerald-200', tarjeta: 'text-emerald-700', barra: 'bg-emerald-500' },
  PendienteRecoleccion: { pildora: 'bg-blue-100 text-blue-800 border-blue-200', tarjeta: 'text-blue-700', barra: 'bg-blue-500' },
  Anulado: { pildora: 'bg-rose-100 text-rose-800 border-rose-200', tarjeta: 'text-rose-700', barra: 'bg-rose-500' },
  Recolectado: { pildora: 'bg-teal-100 text-teal-800 border-teal-200', tarjeta: 'text-teal-700', barra: 'bg-teal-500' }
};

/** Nombre de cada estatus en `ConteoPorEstatus`. */
export const CLAVE_CONTEO: Record<MaterialEstatus, keyof ConteoPorEstatus> = {
  EnProceso: 'enProceso',
  Listo: 'listo',
  PendienteRecoleccion: 'pendienteRecoleccion',
  Anulado: 'anulado',
  Recolectado: 'recolectado'
};

export const CONTEO_VACIO: ConteoPorEstatus = { total: 0, enProceso: 0, listo: 0, pendienteRecoleccion: 0, anulado: 0, recolectado: 0 };

/** Cuenta los productos por estatus (el total incluye los anulados, igual que el API). */
export function contarPorEstatus(materiales: Pick<SeguimientoMaterial, 'estatus'>[]): ConteoPorEstatus {
  const conteo: ConteoPorEstatus = { ...CONTEO_VACIO };
  for (const m of materiales) {
    const clave = CLAVE_CONTEO[m.estatus];
    if (clave) {
      conteo[clave]++;
    }
    conteo.total++;
  }
  return conteo;
}
