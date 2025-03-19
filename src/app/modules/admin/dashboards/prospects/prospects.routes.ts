import { Routes } from '@angular/router';
import { ProspectListComponent } from 'app/modules/admin/dashboards/prospects/list/prospects-list.component';
import { ProspectDetailsComponent } from 'app/modules/admin/dashboards/prospects/details/prospects-details.component';

export default [
    {
        path: '',
        component: ProspectListComponent, // Página principal con la lista de proyectos
    },
    {
        path: 'new', // Nueva ruta para crear un cotización
        component: ProspectDetailsComponent
    },
    {
        path: ':id', // Editar un proyecto cotización
        component: ProspectDetailsComponent
    }
] as Routes;