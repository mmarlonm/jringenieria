import { Routes } from '@angular/router';
import { ReportVentasAgenteDashboardComponent } from 'app/modules/reports/report-ventas-agente/dashboard/dashboard.component';

export default [
    {
        path: '', // view project progress report
        component: ReportVentasAgenteDashboardComponent
    }
] as Routes;