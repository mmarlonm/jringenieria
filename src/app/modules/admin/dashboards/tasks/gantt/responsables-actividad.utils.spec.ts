import { TareaActividad } from '../models/task-activity.model';
import { responsablesDeActividad } from './responsables-actividad.utils';

const USUARIOS = [
  { usuarioId: 18, nombreUsuario: 'Jimena Cervantes', avatar: 'data:image/png;base64,AAAA' },
  { usuarioId: 52, nombreUsuario: 'Yohana Monroy' }
];

function actividad(parcial: Partial<TareaActividad>): TareaActividad {
  return { tareaId: 1, nombre: 'Compartir firmas', responsableId: 0, nombreResponsable: '', fechaInicio: '2026-10-23', fechaFin: '2026-10-30', estatus: 1, progreso: 0, responsableIds: [], ...parcial };
}

describe('responsablesDeActividad', () => {
  it('devuelve a todos los responsables en el orden de la actividad, con su nombre y avatar', () => {
    const lista = responsablesDeActividad(actividad({ responsableId: 52, responsableIds: [52, 18] }), USUARIOS);

    expect(lista.map(r => r.id)).toEqual([52, 18]);
    expect(lista.map(r => r.nombre)).toEqual(['Yohana Monroy', 'Jimena Cervantes']);
    expect(lista[1].avatar).toBe('data:image/png;base64,AAAA');
    expect(lista[0].avatar).toBeNull();
  });

  it('una actividad antigua que solo trae responsableId se muestra con ese responsable', () => {
    const lista = responsablesDeActividad(actividad({ responsableId: 18, responsableIds: undefined as any }), USUARIOS);

    expect(lista.map(r => r.id)).toEqual([18]);
    expect(lista[0].nombre).toBe('Jimena Cervantes');
  });

  it('si el usuario no está en la lista usa el nombre que mandó el API', () => {
    const lista = responsablesDeActividad(
      actividad({ responsableId: 99, responsableIds: [99, 98], nombresResponsables: ['Externo Uno', 'Externo Dos'] }), USUARIOS);

    expect(lista.map(r => r.nombre)).toEqual(['Externo Uno', 'Externo Dos']);
  });

  it('una actividad sin responsables devuelve una lista vacía', () => {
    expect(responsablesDeActividad(actividad({}), USUARIOS)).toEqual([]);
  });
});
