import { Routes } from '@angular/router';
import { ReportVentasProductDashboardComponent } from 'app/modules/reports/report-ventas-product/dashboard/dashboard.component';

export default [
    {
        path: '', // view project progress report
        component: ReportVentasProductDashboardComponent
    }
] as Routes;