import { Routes } from '@angular/router';
import { ProjectsReportViewComponent } from 'app/modules/reports/project-progress/view-report/view-report.component';

export default [
    {
        path: '', // view project progress report
        component: ProjectsReportViewComponent
    }
] as Routes;