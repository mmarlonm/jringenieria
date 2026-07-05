import { Routes } from '@angular/router';

export default [
    {
        path: 'solicitantes',
        loadComponent: () => import('./solicitantes/solicitantes.component').then(m => m.SolicitantesComponent)
    },
    {
        path: 'tablero-proyectos',
        loadComponent: () => import('./tablero-proyectos/tablero-proyectos.component').then(m => m.TableroProyectosComponent)
    },
    {
        path: 'control-ejecucion',
        loadComponent: () => import('./control-ejecucion/control-ejecucion.component').then(m => m.ControlEjecucionComponent)
    },
    {
        path: 'control-ejecucion/editar/:id',
        loadComponent: () => import('./control-ejecucion/control-ejecucion-form/control-ejecucion-form.component').then(m => m.ControlEjecucionFormComponent)
    },
    {
        path: 'gantt-general',
        loadComponent: () => import('./gantt-general/gantt-general.component').then(m => m.GanttGeneralComponent)
    },
    {
        path: 'seguimiento-tareas',
        loadComponent: () => import('./seguimiento-tareas/task-segmentation.component').then(m => m.EngineeringSeguimientoTareasComponent)
    }
] as Routes;
