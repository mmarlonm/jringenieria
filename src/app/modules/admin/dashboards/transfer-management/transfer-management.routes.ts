import { Routes } from '@angular/router';
import { TransferManagementDashboardComponent } from './dashboard/dashboard.component';

export default [
    {
        path: '', // view project progress report
        component: TransferManagementDashboardComponent
    }
] as Routes;