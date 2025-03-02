import { Routes } from '@angular/router';
import { ClientsListComponent } from 'app/modules/admin/catalogs/clients/list/clients-list.component';
import { ClientsDetailsComponent } from 'app/modules/admin/catalogs/clients/details/clients-details.component';

export default [
    {
        path: '',
        component: ClientsListComponent, // Página principal con la lista de proyectos
    },
    {
        path: 'new', // Nueva ruta para crear un proyecto
        component: ClientsDetailsComponent
    },
    {
        path: ':id', // Editar un proyecto existente
        component: ClientsDetailsComponent
    }
] as Routes;