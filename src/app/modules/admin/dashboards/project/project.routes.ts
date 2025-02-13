import { Routes } from '@angular/router';
import { ProjectListComponent } from 'app/modules/admin/dashboards/project/list/project-list.component';
import { ProjectDetailsComponent } from 'app/modules/admin/dashboards/project/details/project-details.component';

export default [
    {
        path: '',
        component: ProjectListComponent, // Página principal con la lista de proyectos
    },
    {
        path: 'new', // Nueva ruta para crear un proyecto
        component: ProjectDetailsComponent
    },
    {
        path: ':id', // Editar un proyecto existente
        component: ProjectDetailsComponent
    }
] as Routes;