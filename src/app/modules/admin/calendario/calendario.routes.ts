import { Routes } from '@angular/router';

export default [
    {
        path: '',
        loadComponent: () => import('./calendario.component').then(m => m.CalendarioComponent),
    },
] as Routes;
