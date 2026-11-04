import { Type } from '@angular/core';
import { Route } from '@angular/router';
import { NoAuthGuard } from 'app/core/auth/guards/noAuth.guard';

/**
 * Rutas que se abren sin el menú de la aplicación (layout 'empty').
 * El diseño llega como parámetro para poder probar estas rutas sin cargar el de la aplicación completa.
 */
export function rutasDeInvitados(layout: Type<unknown>): Route[] {
    return [
        // Pantallas de acceso: quien ya tiene sesión no debe volver a verlas, NoAuthGuard lo manda al inicio.
        {
            path: '',
            canActivate: [NoAuthGuard],
            canActivateChild: [NoAuthGuard],
            component: layout,
            data: {
                layout: 'empty'
            },
            children: [
                { path: 'confirmation-required', loadChildren: () => import('app/modules/auth/confirmation-required/confirmation-required.routes') },
                { path: 'forgot-password', loadChildren: () => import('app/modules/auth/forgot-password/forgot-password.routes') },
                { path: 'reset-password', loadChildren: () => import('app/modules/auth/reset-password/reset-password.routes') },
                { path: 'sign-in', loadChildren: () => import('app/modules/auth/sign-in/sign-in.routes') },
                { path: 'sign-up', loadChildren: () => import('app/modules/auth/sign-up/sign-up.routes') }
            ]
        },

        // Páginas para visitantes externos (encuestas, cuestionario de proveedor, pase y registro de staff):
        // se abren siempre, con o sin sesión. Con NoAuthGuard, quien tenía la sesión abierta caía en analytics
        // en lugar de ver el link que le habían mandado (o el que quería probar).
        {
            path: '',
            component: layout,
            data: {
                layout: 'empty'
            },
            children: [
                { path: 'survey', loadChildren: () => import('app/modules/survey/survey.routes') }, // Survey module route
                { path: 'survey-productos', loadChildren: () => import('app/modules/survey_productos/survey_productos.routes') }, // Survey module route
                { path: 'public/cuestionario-proveedor/:id', loadComponent: () => import('app/modules/public/cuestionario-proveedor/cuestionario-proveedor.component').then(m => m.PublicCuestionarioProveedorComponent) },
                { path: 'eventos/ver-pase', loadComponent: () => import('app/modules/public/ver-pase/ver-pase.component').then(m => m.PublicVerPaseComponent) },
                { path: 'eventos/ver-pase/:token', loadComponent: () => import('app/modules/public/ver-pase/ver-pase.component').then(m => m.PublicVerPaseComponent) },
                { path: 'public/registro-staff/:eventoId', loadComponent: () => import('app/modules/public/registro-staff/registro-staff.component').then(m => m.RegistroStaffComponent) }
            ]
        }
    ];
}
