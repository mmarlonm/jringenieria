export interface TareaActividad {
  id?: number;
  tareaId: number;
  nombre: string;
  responsableId: number;
  nombreResponsable: string;
  fechaInicio: Date | string;
  fechaFin: Date | string;
  estatus: number; // 1:Pendiente (Ambar), 2:Proceso (Azul), 3:Hecho (Verde)
  progreso: number; // 0-100
  predecesoraId?: number;
}
