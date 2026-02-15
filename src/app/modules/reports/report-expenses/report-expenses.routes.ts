import { Routes } from '@angular/router';
import { ReportExpensesDashboardComponent } from 'app/modules/reports/report-expenses/dashboard/dashboard.component';

export default [
    {
        path: '', // view project progress report
        component: ReportExpensesDashboardComponent
    }
] as Routes;