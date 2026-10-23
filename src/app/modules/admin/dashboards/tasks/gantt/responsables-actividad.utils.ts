import { TareaActividad } from '../models/task-activity.model';

export interface ResponsableVista {
  id: number;
  nombre: string;
  avatar: string | null;
}

/**
 * Responsables de una actividad con su nombre y avatar, en el orden de la actividad (el principal primero).
 * Una actividad anterior a los responsables múltiples solo trae `responsableId`; el nombre sale de la lista de usuarios
 * y, si el usuario no está en ella, del que mandó el API.
 */
export function responsablesDeActividad(actividad: TareaActividad, usuarios: any[]): ResponsableVista[] {
  const ids = actividad.responsableIds?.length ? actividad.responsableIds : actividad.responsableId ? [actividad.responsableId] : [];

  return ids.map((id, i) => {
    const usuario = usuarios?.find(u => Number(u.usuarioId ?? u.id) === Number(id));
    const delApi = actividad.nombresResponsables?.[i] || (ids.length === 1 ? actividad.nombreResponsable : '');
    return { id, nombre: usuario?.nombreUsuario || delApi || '', avatar: usuario?.avatar || null };
  });
}
