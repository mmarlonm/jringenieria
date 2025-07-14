import { Routes } from '@angular/router';
import { TaskListComponent } from 'app/modules/admin/dashboards/tasks/list/tasks-list.component';

export default [
    {
        path: '',
        component: TaskListComponent, // Página principal con la lista de proyectos
    }
] as Routes;