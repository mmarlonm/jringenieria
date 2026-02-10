import { Routes } from '@angular/router';
import { ReportProductExistenceDashboardComponent } from 'app/modules/reports/report-product-existence/dashboard/dashboard.component';

export default [
    {
        path: '', // view project progress report
        component: ReportProductExistenceDashboardComponent
    }
] as Routes;