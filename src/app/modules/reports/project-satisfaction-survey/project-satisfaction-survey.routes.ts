import { Routes } from '@angular/router';
import { ProjectSatisfactionSurveyReportViewComponent } from 'app/modules/reports/project-satisfaction-survey/view-report/view-report.component';

export default [
    {
        path: '', // view project progress report
        component: ProjectSatisfactionSurveyReportViewComponent
    }
] as Routes;