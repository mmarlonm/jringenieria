import { Routes } from '@angular/router';
import { ProductsSatisfactionSurveyReportViewComponent } from 'app/modules/reports/product-satisfaction-survey/view-report/view-report.component';

export default [
    {
        path: '', // view project progress report
        component: ProductsSatisfactionSurveyReportViewComponent
    }
] as Routes;