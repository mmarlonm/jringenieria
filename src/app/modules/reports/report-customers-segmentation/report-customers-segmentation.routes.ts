import { Routes } from '@angular/router';
import { ReportCustomersDashboardComponent } from 'app/modules/reports/report-customers-segmentation/dashboard/dashboard.component';

export default [
    {
        path: '', // view project progress report
        component: ReportCustomersDashboardComponent
    }
] as Routes;