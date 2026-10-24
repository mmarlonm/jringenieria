import { Routes } from '@angular/router';

export default [
    {
        path: 'solicitantes',
        loadComponent: () => import('./solicitantes/solicitantes.component').then(m => m.SolicitantesComponent)
    },
    {
        path: 'solicitud-cliente',
        loadComponent: () => import('./cotizacion-etapas/etapa-lista/etapa-lista.component').then(m => m.EtapaListaComponent),
        data: { etapa: 1 }
    },
    {
        path: 'levantamiento-tecnico',
        loadComponent: () => import('./cotizacion-etapas/etapa-lista/etapa-lista.component').then(m => m.EtapaListaComponent),
        data: { etapa: 2 }
    },
    {
        path: 'diseno-calculo',
        loadComponent: () => import('./cotizacion-etapas/etapa-lista/etapa-lista.component').then(m => m.EtapaListaComponent),
        data: { etapa: 3 }
    },
    {
        path: 'presupuesto-tecnico',
        loadComponent: () => import('./cotizacion-etapas/etapa-lista/etapa-lista.component').then(m => m.EtapaListaComponent),
        data: { etapa: 4 }
    },
    {
        path: 'propuesta-tecnico-comercial',
        loadComponent: () => import('./cotizacion-etapas/etapa-lista/etapa-lista.component').then(m => m.EtapaListaComponent),
        data: { etapa: 5 }
    },
    {
        path: 'tablero-proyectos',
        redirectTo: 'solicitud-cliente',
        pathMatch: 'full'
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
    },
    {
        path: 'aliados',
        loadComponent: () => import('./subcontratacion/subcontratacion.component').then(m => m.SubcontratacionComponent)
    },
    {
        path: 'tickets',
        loadChildren: () => import('../administration/tickets/tickets.routes').then(m => m.ticketsRoutes)
    }
] as Routes;
