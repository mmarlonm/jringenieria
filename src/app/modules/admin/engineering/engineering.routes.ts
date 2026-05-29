import { Routes } from '@angular/router';

export default [
    {
        path: 'solicitantes',
        loadComponent: () => import('./solicitantes/solicitantes.component').then(m => m.SolicitantesComponent)
    },
    {
        path: 'tablero-proyectos',
        loadComponent: () => import('./tablero-proyectos/tablero-proyectos.component').then(m => m.TableroProyectosComponent)
    }
] as Routes;
