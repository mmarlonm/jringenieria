import { Routes } from '@angular/router';
import { LoginTableComponent } from 'app/modules/reports/login-logs/login-table/login-table.component';

export default [
    {
        path: '', // view project progress report
        component: LoginTableComponent
    }
] as Routes;