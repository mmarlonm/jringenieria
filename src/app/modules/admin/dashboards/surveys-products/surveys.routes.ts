import { Routes } from '@angular/router';
import { SurveysListComponent } from 'app/modules/admin/dashboards/surveys-products/list/surveys-list.component';

export default [
    {
        path: '',
        component: SurveysListComponent, // Página principal con la lista de proyectos
    }
] as Routes;