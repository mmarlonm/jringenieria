/* eslint-disable */
import { FuseNavigationItem } from '@fuse/components/navigation';

export const defaultNavigation: FuseNavigationItem[] = [
    // --- SECCIÓN INGENIERÍA ---
    {
        id: 'ingenieria',
        title: 'INGENIERIA',
        subtitle: 'Gestión técnica y proyectos',
        type: 'group',
        icon: 'heroicons_outline:home',
        children: [
            {
                id: 'dashboards.quote',
                title: 'Cotización de Proyectos',
                type: 'basic',
                icon: 'heroicons_outline:banknotes',
                link: '/dashboards/quote'
            },
            {
                id: 'dashboards.tasjks',
                title: 'Tareas',
                type: 'basic',
                icon: 'heroicons_outline:check-circle',
                link: '/dashboards/tasks'
            },
            {
                id: 'ingenieria.catalogos',
                title: 'Catalogos',
                type: 'collapsable',
                icon: 'heroicons_outline:book-open',
                children: [
                    {
                        id: 'catalogs.clients',
                        title: 'Clientes',
                        type: 'basic',
                        icon: 'heroicons_outline:user', // Icono añadido
                        link: '/catalogs/clients'
                    },
                    {
                        id: 'dashboards.prospects',
                        title: 'Prospectos',
                        type: 'basic',
                        icon: 'heroicons_outline:user-group', // Icono añadido
                        link: '/dashboards/prospects'
                    }
                ]
            },
            {
                id: 'ingenieria.reportes',
                title: 'Reportes',
                type: 'collapsable',
                icon: 'heroicons_outline:clipboard-document-list',
                children: [
                    {
                        id: 'reports.report-product-existence',
                        title: 'Reporte de Existencias',
                        type: 'basic',
                        icon: 'heroicons_outline:list-bullet', // Icono añadido
                        link: '/reports/report-product-existence'
                    },
                    {
                        id: 'dashboards.analytics',
                        title: 'Analytics',
                        type: 'basic',
                        icon: 'heroicons_outline:chart-pie', // Icono añadido
                        link: '/dashboards/analytics'
                    }
                ]
            }
        ]
    },

    // --- SECCIÓN COMERCIALIZACIÓN ---
    {
        id: 'comercializacion',
        title: 'COMERCIALIZACION',
        subtitle: 'Ventas y atención comercial',
        type: 'group',
        icon: 'heroicons_outline:briefcase',
        children: [
            {
                id: 'dashboards.quote-products',
                title: 'Cotización',
                type: 'basic',
                icon: 'heroicons_outline:banknotes',
                link: '/dashboards/quote-products'
            },
            {
                id: 'dashboards.tasjks',
                title: 'Tareas',
                type: 'basic',
                icon: 'heroicons_outline:check-circle',
                link: '/dashboards/tasks'
            },
            {
                id: 'comercializacion.catalogos',
                title: 'Catalogos',
                type: 'collapsable',
                icon: 'heroicons_outline:book-open',
                children: [
                    {
                        id: 'catalogs.clients',
                        title: 'Clientes',
                        type: 'basic',
                        icon: 'heroicons_outline:user', // Icono añadido
                        link: '/catalogs/clients'
                    },
                    {
                        id: 'dashboards.prospects',
                        title: 'Prospectos',
                        type: 'basic',
                        icon: 'heroicons_outline:user-group', // Icono añadido
                        link: '/dashboards/prospects'
                    }
                ]
            },
            {
                id: 'comercializacion.reportes',
                title: 'Reportes',
                type: 'collapsable',
                icon: 'heroicons_outline:chart-bar',
                children: [
                    { id: 'reports.report-ventas', title: 'Reporte de Ventas', type: 'basic', icon: 'heroicons_outline:presentation-chart-line', link: '/reports/report-venta' },
                    { id: 'reports.project-progress', title: 'Reporte de Clientes', type: 'basic', icon: 'heroicons_outline:document-chart-bar', link: '/reports/project-progress' },
                    { id: 'reports.login-logs', title: 'Reporte de Vendedores', type: 'basic', icon: 'heroicons_outline:identification', link: '/reports/login-logs' },
                    { id: 'reports.report-portfolio-overdue', title: 'Reporte de Cuentas por cobrar', type: 'basic', icon: 'heroicons_outline:currency-dollar', link: '/reports/report-portfolio-overdue' },
                    { id: 'reports.report-ventas-product', title: 'Reporte de ventas por producto', type: 'basic', icon: 'heroicons_outline:shopping-cart', link: '/reports/report-venta-product' },
                    { id: 'reports.report-product-existence', title: 'Reporte de Existencias', type: 'basic', icon: 'heroicons_outline:archive-box', link: '/reports/report-product-existence' }
                ]
            }
        ]
    },

    // --- SECCIÓN MARKETING ---
    {
        id: 'marketing',
        title: 'MARKETING',
        subtitle: 'Prospección y satisfacción',
        type: 'group',
        icon: 'heroicons_outline:megaphone',
        children: [
            {
                id: 'dashboards.surveys',
                title: 'Encuestas',
                type: 'basic',
                icon: 'heroicons_outline:clipboard-document-list',
                link: '/dashboards/surveys'
            },
            {
                id: 'dashboards.tasjks',
                title: 'Tareas',
                type: 'basic',
                icon: 'heroicons_outline:check-circle',
                link: '/dashboards/tasks'
            },
            {
                id: 'marketing.catalogos',
                title: 'Catalogos',
                type: 'collapsable',
                icon: 'heroicons_outline:book-open',
                children: [
                    { id: 'catalogs.clients', title: 'Clientes', type: 'basic', icon: 'heroicons_outline:user', link: '/catalogs/clients' },
                    { id: 'dashboards.prospects', title: 'Prospectos', type: 'basic', icon: 'heroicons_outline:user-group', link: '/dashboards/prospects' }
                ]
            }
        ]
    },

    // --- SECCIÓN SEGURIDAD ---
    {
        id: 'apps',
        title: 'Seguridad',
        type: 'group',
        icon: 'heroicons_outline:shield-check',
        children: [
            { id: 'apps.contacts', title: 'Usuarios', type: 'basic', icon: 'heroicons_outline:user-group', link: '/security/users' },
            { id: 'apps.roles', title: 'Roles', type: 'basic', icon: 'heroicons_outline:lock-closed', link: '/security/roles' },
            {
                id: 'reports.login-logs', // ID Original según tu localStorage
                title: 'Historial de Inicios de Sesión',
                type: 'basic',
                icon: 'heroicons_outline:finger-print',
                link: '/reports/login-logs'
            }
        ]
    }
];

export const compactNavigation: FuseNavigationItem[] = [
    {
        id: 'ingenieria',
        title: 'Ingeniería',
        tooltip: 'Ingeniería',
        type: 'aside',
        icon: 'heroicons_outline:cog',
        children: []
    },
    {
        id: 'comercializacion',
        title: 'Comercial',
        tooltip: 'Comercialización',
        type: 'aside',
        icon: 'heroicons_outline:briefcase',
        children: []
    },
    {
        id: 'marketing',
        title: 'Marketing',
        tooltip: 'Marketing',
        type: 'aside',
        icon: 'heroicons_outline:megaphone',
        children: []
    },
    {
        id: 'apps',
        title: 'Seguridad',
        tooltip: 'Seguridad',
        type: 'aside',
        icon: 'heroicons_outline:shield-check',
        children: []
    }
];

export const futuristicNavigation: FuseNavigationItem[] = [
    { id: 'ingenieria', title: 'INGENIERIA', type: 'group', children: [] },
    { id: 'comercializacion', title: 'COMERCIALIZACION', type: 'group', children: [] },
    { id: 'marketing', title: 'MARKETING', type: 'group', children: [] },
    { id: 'apps', title: 'SEGURIDAD', type: 'group', children: [] }
];

export const horizontalNavigation: FuseNavigationItem[] = [
    { id: 'ingenieria', title: 'Ingeniería', type: 'group', icon: 'heroicons_outline:cog', children: [] },
    { id: 'comercializacion', title: 'Comercial', type: 'group', icon: 'heroicons_outline:briefcase', children: [] },
    { id: 'marketing', title: 'Marketing', type: 'group', icon: 'heroicons_outline:megaphone', children: [] },
    { id: 'apps', title: 'Seguridad', type: 'group', icon: 'heroicons_outline:shield-check', children: [] }
];