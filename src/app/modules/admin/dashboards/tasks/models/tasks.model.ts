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
  dependencies?: string; // 👈 nuevo campo para dependencias de Gantt
  empresa: string;
  ubicacion: string;
  cuadranteId?: number | null;
}

export interface TareaComentario {
  idComentario: number;
  idTarea: number;
  idUsuario: number;
  nombreUsuario: string;
  mensaje: string;
  fechaCreacion: Date | string;
  esMio: boolean;
}
