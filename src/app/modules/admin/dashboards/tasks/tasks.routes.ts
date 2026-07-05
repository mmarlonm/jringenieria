import { Routes } from '@angular/router';
import { TaskListComponent } from 'app/modules/admin/dashboards/tasks/list/tasks-list.component';
import { TaskSegmentationComponent } from 'app/modules/admin/dashboards/tasks/segmentation/task-segmentation.component';

export default [
    {
        path: '',
        component: TaskListComponent,
    },
    {
        path: 'seguimiento',
        component: TaskSegmentationComponent,
    }
] as Routes;