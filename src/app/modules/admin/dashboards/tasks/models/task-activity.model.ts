export interface TareaActividad {
  id?: number;
  tareaId: number;
  nombre: string;
  /** Responsable principal (el primero de `responsableIds`). Se conserva por compatibilidad. */
  responsableId: number;
  /** Nombres de todos los responsables separados por coma. */
  nombreResponsable: string;
  /** Todos los responsables de la actividad, con el principal primero. */
  responsableIds: number[];
  /** Nombres en el mismo orden que `responsableIds`. */
  nombresResponsables?: string[];
  fechaInicio: Date | string;
  fechaFin: Date | string;
  estatus: number; // 1:Pendiente (Ambar), 2:Proceso (Azul), 3:Hecho (Verde)
  progreso: number; // 0-100
  predecesoraId?: number;
}
