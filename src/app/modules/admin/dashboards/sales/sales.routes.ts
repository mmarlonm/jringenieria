import { Routes } from '@angular/router';
import { SalesListComponent } from 'app/modules/admin/dashboards/sales/list/sales-list.component';
import { SalesDetailsComponent } from 'app/modules/admin/dashboards/sales/details/sales-details.component';

export default [
    {
        path: '',
        component: SalesListComponent, // Página principal con la lista de proyectos
    },
    {
        path: 'new', // Nueva ruta para crear un cotización
        component: SalesDetailsComponent
    },
    {
        path: ':id', // Editar un proyecto cotización
        component: SalesDetailsComponent
    }
] as Routes;