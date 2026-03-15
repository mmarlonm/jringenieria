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
    }
] as Routes;
