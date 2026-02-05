import { Routes } from '@angular/router';
import { ReportPortfolioOverdueDashboardComponent } from 'app/modules/reports/report-portfolio-overdue/dashboard/dashboard.component';

export default [
    {
        path: '', // view project progress report
        component: ReportPortfolioOverdueDashboardComponent
    }
] as Routes;