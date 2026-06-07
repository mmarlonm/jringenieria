import { Routes } from '@angular/router';
import { CuestionarioComponent } from './cuestionario/cuestionario.component';

export default [
    {
        path: 'cuestionario',
        component: CuestionarioComponent
    },
    {
        path: 'maestro',
        loadComponent: () => import('./maestro/maestro.component').then(m => m.MaestroComponent)
    },
    {
        path: 'reportes/resumen',
        loadComponent: () => import('./reportes/resumen/resumen.component').then(m => m.ResumenComponent)
    }
] as Routes;
