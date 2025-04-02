import { Routes } from '@angular/router';
import { ProductsListComponent } from 'app/modules/admin/catalogs/products/list/products-list.component';
import { ProductsDetailsComponent } from 'app/modules/admin/catalogs/products/details/products-details.component';

export default [
    {
        path: '',
        component: ProductsListComponent, // Página principal con la lista de proyectos
    },
    {
        path: 'new', // Nueva ruta para crear un proyecto
        component: ProductsDetailsComponent
    },
    {
        path: ':id', // Editar un proyecto existente
        component: ProductsDetailsComponent
    }
] as Routes;