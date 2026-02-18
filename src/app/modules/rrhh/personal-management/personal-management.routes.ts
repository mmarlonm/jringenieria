import { Routes } from '@angular/router';
import { PersonalManagementDashboardComponent } from 'app/modules/rrhh/personal-management/dashboard/dashboard.component';

export default [
    {
        path: '', // view project progress report
        component: PersonalManagementDashboardComponent
    }
] as Routes;