import { Routes } from '@angular/router';

export default [
    {
        path: 'solicitudes-compra',
        loadChildren: () => import('./solicitudes-compra/solicitud-compra.routes').then(m => m.default)
    },
    {
        path: 'tablero-compras',
        loadChildren: () => import('./tablero-compras/tablero-compras.routes').then(m => m.default)
    },
    {
        path: 'historico-compras',
        loadChildren: () => import('./historico-compras/historico-compras.routes').then(m => m.default)
    },
    {
        path: 'recepcion-compras',
        loadComponent: () => import('app/modules/admin/administration/purchase-reception/purchase-reception.component').then(m => m.PurchaseReceptionComponent)
    },
    {
        path: 'cierre-terminal',
        loadChildren: () => import('./cierre-terminal/cierre-terminal.routes').then(m => m.default)
    },
    {
        path: 'resumen-compras',
        loadComponent: () => import('./resumen-compras/resumen-compras.component').then(m => m.ResumenComprasComponent)
    },
    {
        path: 'control-entregas',
        loadChildren: () => import('./control-entregas/control-entregas.routes').then(m => m.default)
    }
] as Routes;
