import { Routes } from '@angular/router';
import { SolicitudCompraListComponent } from './list/list.component';
import { SolicitudCompraFormComponent } from './form/form.component';

export default [
    {
        path: '',
        component: SolicitudCompraListComponent
    },
    {
        path: 'new',
        component: SolicitudCompraFormComponent
    },
    {
        path: 'edit/:id',
        component: SolicitudCompraFormComponent
    },
    {
        path: ':id',
        component: SolicitudCompraFormComponent
    }
] as Routes;
