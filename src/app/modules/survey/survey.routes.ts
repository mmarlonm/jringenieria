import { Routes } from '@angular/router';
import { DetailComponent } from 'app/modules/survey/detail/detail.component';

export default [
    {
        path: ':id', // Editar un proyecto existente
        component: DetailComponent
    }
] as Routes;