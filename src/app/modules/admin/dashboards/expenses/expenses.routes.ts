import { Routes } from '@angular/router';
import { ExpensesListComponent } from 'app/modules/admin/dashboards/expenses/expenses-list/expenses-list.component';

export default [
    {
        path: '',
        component: ExpensesListComponent, // Página principal con la lista de gastos
    }
] as Routes;