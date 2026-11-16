import { Routes } from '@angular/router';
import { QuoteListComponent } from 'app/modules/admin/dashboards/quotes-products/list/quotes-list.component';
import { QuoteDetailsComponent } from 'app/modules/admin/dashboards/quotes-products/details/quotes-details.component';
import { IndicadoresComponent } from 'app/modules/admin/dashboards/quotes-products/indicadores/indicadores.component';

export default [
    {
        path: '',
        component: QuoteListComponent, // Página principal con la lista de proyectos
    },
    {
        path: 'new', // Nueva ruta para crear un cotización
        component: QuoteDetailsComponent
    },
    {
        path: 'indicadores', // Indicadores del procedimiento SGC (antes de :id)
        component: IndicadoresComponent
    },
    {
        path: ':id', // Editar un proyecto cotización
        component: QuoteDetailsComponent
    }
] as Routes;