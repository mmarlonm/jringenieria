export interface Task {
  id?: number;
  nombre: string;
  responsable?: any; // Puede ser un objeto Usuario con foto
  asignados?: any[]; // Array de usuarios asignados
  comentarios?: string;
  fechaInicioEstimada?: Date;
  fechaFinEstimada?: Date;
  fechaInicioReal?: Date;
  fechaFinReal?: Date;
  links?: string[];
  usuarioIds: number[]; // IDs de usuarios asignados a la tarea (equipo)
  creadorId: number; // 👈 importante
  estatus: number; // 👈 nuevo campo de estatus
  imagenes?: string[]; // 👈 nuevo campo para multimedia
}
