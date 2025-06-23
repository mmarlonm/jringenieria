import { Route } from '@angular/router';
import { initialDataResolver } from 'app/app.resolvers';
import { AuthGuard } from 'app/core/auth/guards/auth.guard';
import { NoAuthGuard } from 'app/core/auth/guards/noAuth.guard';
import { LayoutComponent } from 'app/layout/layout.component';

// @formatter:off
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
export const appRoutes: Route[] = [

    // Redirect empty path to '/example'
    {path: '', pathMatch : 'full', redirectTo: '/dashboards/analytics'},

    // Redirect signed-in user to the '/example'
    //
    // After the user signs in, the sign-in page will redirect the user to the 'signed-in-redirect'
    // path. Below is another redirection for that path to redirect the user to the desired
    // location. This is a small convenience to keep all main routes together here on this file.
    {path: 'signed-in-redirect', pathMatch : 'full', redirectTo: '/dashboards/analytics'},

    // Auth routes for guests
    {
        path: '',
        canActivate: [NoAuthGuard],
        canActivateChild: [NoAuthGuard],
        component: LayoutComponent,
        data: {
            layout: 'empty'
        },
        children: [
            {path: 'confirmation-required', loadChildren: () => import('app/modules/auth/confirmation-required/confirmation-required.routes')},
            {path: 'forgot-password', loadChildren: () => import('app/modules/auth/forgot-password/forgot-password.routes')},
            {path: 'reset-password', loadChildren: () => import('app/modules/auth/reset-password/reset-password.routes')},
            {path: 'sign-in', loadChildren: () => import('app/modules/auth/sign-in/sign-in.routes')},
            {path: 'sign-up', loadChildren: () => import('app/modules/auth/sign-up/sign-up.routes')}
        ]
    },

    // Auth routes for authenticated users
    {
        path: '',
        canActivate: [AuthGuard],
        canActivateChild: [AuthGuard],
        component: LayoutComponent,
        data: {
            layout: 'empty'
        },
        children: [
            {path: 'sign-out', loadChildren: () => import('app/modules/auth/sign-out/sign-out.routes')},
            {path: 'unlock-session', loadChildren: () => import('app/modules/auth/unlock-session/unlock-session.routes')}
        ]
    },

    // Landing routes
    {
        path: '',
        component: LayoutComponent,
        data: {
            layout: 'empty'
        },
        children: [
            {path: 'home', loadChildren: () => import('app/modules/landing/home/home.routes')},
        ]
    },

    // Admin routes
    {
        path: '',
        canActivate: [AuthGuard],
        canActivateChild: [AuthGuard],
        component: LayoutComponent,
        resolve: {
            initialData: initialDataResolver
        },
        children: [
            // Dashboards
            {path: 'dashboards', children: [
                {path: 'project', loadChildren: () => import('app/modules/admin/dashboards/project/project.routes')},
                {path: 'quote', loadChildren: () => import('app/modules/admin/dashboards/quotes/quotes.routes')},
                {path: 'prospects', loadChildren: () => import('app/modules/admin/dashboards/prospects/prospects.routes')},
                {path: 'analytics', loadChildren: () => import('app/modules/admin/dashboards/analytics/analytics.routes')},
                {path: 'sales', loadChildren: () => import('app/modules/admin/dashboards/sales/sales.routes')},
                {path: 'quote-products', loadChildren: () => import('app/modules/admin/dashboards/quotes-products/quotes-products.routes')},
            ]},
            {path: 'catalogs', children: [
                {path: 'clients', loadChildren: () => import('app/modules/admin/catalogs/clients/clients.routes')},
                {path: 'products', loadChildren: () => import('app/modules/admin/catalogs/products/products.routes')}
            ]},
            {path: 'security', children: [
                {path: 'users', loadChildren: () => import('app/modules/admin/security/users/users.routes')},
                {path: 'roles', loadChildren: () => import('app/modules/admin/security/roles/roles.routes')}
            ]},
            {path: 'example', loadChildren: () => import('app/modules/admin/example/example.routes')},
            {path: 'profile', loadChildren: () => import('app/modules/admin/pages/profile/profile.routes')}
        ]
    }
];
