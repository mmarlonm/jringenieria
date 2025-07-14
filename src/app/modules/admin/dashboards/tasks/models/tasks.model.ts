export interface Task {
  id?: number;
  nombre: string;
  comentarios?: string;
  fechaInicioEstimada?: Date;
  fechaFinEstimada?: Date;
  fechaInicioReal?: Date;
  fechaFinReal?: Date;
  links?: string[];
  usuarioIds: number[]; // IDs de usuarios asignados a la tarea (equipo)
  creadorId: number; // 👈 importante
}
