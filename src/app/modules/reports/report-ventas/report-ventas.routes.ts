import { Routes } from '@angular/router';
import { ReportVentasDashboardComponent } from 'app/modules/reports/report-ventas/dashboard/dashboard.component';

export default [
    {
        path: '', // view project progress report
        component: ReportVentasDashboardComponent
    }
] as Routes;