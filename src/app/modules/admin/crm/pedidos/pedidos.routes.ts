import { Routes } from '@angular/router';

export default [
    {
        path: '',
        loadComponent: () => import('./pedidos-list/pedidos-list.component').then(m => m.PedidosListComponent)
    },
    {
        path: ':id',
        loadComponent: () => import('./pedido-detalle/pedido-detalle.component').then(m => m.PedidoDetalleComponent)
    }
] as Routes;
