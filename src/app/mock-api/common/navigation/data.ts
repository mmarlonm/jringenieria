/* eslint-disable */
import { FuseNavigationItem } from '@fuse/components/navigation';

export const defaultNavigation: FuseNavigationItem[] = [
    {
        id: 'dashboards',
        title: 'Dashboards',
        subtitle: 'Modulos generales',
        type: 'group',
        icon: 'heroicons_outline:home',
        children: [
            {
                id: 'dashboards.analytics',
                title: 'Analytics',
                type: 'basic',
                icon: 'heroicons_outline:chart-pie',
                link: '/dashboards/analytics',
            },
            {
                id: 'dashboards.project',
                title: 'Proyectos',
                type: 'basic',
                icon: 'heroicons_outline:clipboard-document-check',
                link: '/dashboards/project',
            },
            {
                id: 'dashboards.quote',
                title: 'Cotizaciones de Proyectos',
                type: 'basic',
                icon: 'heroicons_outline:banknotes',
                link: '/dashboards/quote',
            },
            {
                id: 'dashboards.quote-products',
                title: 'Cotizaciones de  Productos',
                type: 'basic',
                icon: 'heroicons_outline:banknotes',
                link: '/dashboards/quote-products',
            },
            {
                id: 'dashboards.prospects',
                title: 'Prospectos',
                type: 'basic',
                icon: 'heroicons_outline:user-circle',
                link: '/dashboards/prospects',
            },
            {
                id: 'dashboards.sales',
                title: 'Ventas',
                type: 'basic',
                icon: 'heroicons_outline:shopping-cart',
                link: '/dashboards/sales',
            },
            {
                id: 'dashboards.tasjks',
                title: 'Tareas',
                type: 'basic',
                icon: 'heroicons_outline:check-circle',
                link: '/dashboards/tasks',
            },
            {
                id: 'dashboards.surveys',
                title: 'Encuestas',
                type: 'basic',
                icon: 'heroicons_outline:clipboard-document-list',
                link: '/dashboards/surveys',
            },
            {
                id: 'dashboards.surveys-products',
                title: 'Encuesta de Productos',
                type: 'basic',
                icon: 'heroicons_outline:clipboard-document-list',
                link: '/dashboards/surveys-products',
            },
        ],
    },
    {
        id: 'catalogs',
        title: 'Catalogos',
        subtitle: 'Administracion de catalogos',
        type: 'collapsable',
        icon: 'heroicons_outline:book-open',
        children: [
            {
                id: 'catalogs.clients',
                title: 'Clientes',
                type: 'basic',
                icon: 'heroicons_outline:user',
                link: '/catalogs/clients',
            },
            {
                id: 'catalogs.products',
                title: 'Productos',
                type: 'basic',
                icon: 'heroicons_outline:user',
                link: '/catalogs/products',
            }
            
        ],
    },
    {
        id: 'reports',
        title: 'Reportes',
        subtitle: 'Administracion de reportes',
        type: 'collapsable',
        icon: 'heroicons_outline:book-open',
        children: [
            {
                id: 'reports.project-progress',
                title: 'Reporte avance de proyectos',
                type: 'basic',
                icon: 'heroicons_outline:user',
                link: '/reports/project-progress',
            },
            {
                id: 'reports.login-logs',
                title: 'Historial de Inicios de Sesión',
                type: 'basic',
                icon: 'heroicons_outline:clipboard-document-list',
                link: '/reports/login-logs',
            },
            {
                id: 'reports.product-satisfaction-survey',
                title: 'Encuesta de Satisfacción de Productos',
                type: 'basic',
                icon: 'heroicons_outline:clipboard-document-list',
                link: '/reports/product-satisfaction-survey',
            },
            {
                id: 'reports.project-satisfaction-survey',
                title: 'Encuesta de Satisfacción de Proyectos',
                type: 'basic',
                icon: 'heroicons_outline:clipboard-document-list',
                link: '/reports/project-satisfaction-survey',
            },
            {
                id: 'reports.report-ventas',
                title: 'Reporte de Ventas',
                type: 'basic',
                icon: 'heroicons_outline:clipboard-document-list',
                link: '/reports/report-venta',
            },
            {
                id: 'reports.report-portfolio-overdue',
                title: 'Reporte Cuentas por Cobrar',
                type: 'basic',
                icon: 'heroicons_outline:clipboard-document-list',
                link: '/reports/report-portfolio-overdue',
            }
        ],
    },
    {
        id: 'apps',
        title: 'Securidad',
        subtitle: 'Configuracion de seguridad',
        type: 'group',
        icon: 'heroicons_outline:shield-check',
        children: [
            {
                id: 'apps.contacts',
                title: 'Usuarios',
                type: 'basic',
                icon: 'heroicons_outline:user-group',
                link: '/security/users',
            },
            {
                id: 'apps.roles',
                title: 'Roles',
                type: 'basic',
                icon: 'heroicons_outline:user-group',
                link: '/security/roles',
            }
        ],
    },
    
];
export const compactNavigation: FuseNavigationItem[] = [
    {
        id: 'dashboards',
        title: 'Dashboards',
        tooltip: 'Dashboards',
        type: 'aside',
        icon: 'heroicons_outline:home',
        children: [], // This will be filled from defaultNavigation so we don't have to manage multiple sets of the same navigation
    },
    {
        id: 'apps',
        title: 'Apps',
        tooltip: 'Apps',
        type: 'aside',
        icon: 'heroicons_outline:squares-2x2',
        children: [], // This will be filled from defaultNavigation so we don't have to manage multiple sets of the same navigation
    },
    {
        id: 'pages',
        title: 'Pages',
        tooltip: 'Pages',
        type: 'aside',
        icon: 'heroicons_outline:document-duplicate',
        children: [], // This will be filled from defaultNavigation so we don't have to manage multiple sets of the same navigation
    },
    {
        id: 'user-interface',
        title: 'UI',
        tooltip: 'UI',
        type: 'aside',
        icon: 'heroicons_outline:rectangle-stack',
        children: [], // This will be filled from defaultNavigation so we don't have to manage multiple sets of the same navigation
    },
    {
        id: 'navigation-features',
        title: 'Navigation',
        tooltip: 'Navigation',
        type: 'aside',
        icon: 'heroicons_outline:bars-3',
        children: [], // This will be filled from defaultNavigation so we don't have to manage multiple sets of the same navigation
    },
];
export const futuristicNavigation: FuseNavigationItem[] = [
    {
        id: 'dashboards',
        title: 'DASHBOARDS',
        type: 'group',
        children: [], // This will be filled from defaultNavigation so we don't have to manage multiple sets of the same navigation
    },
    {
        id: 'apps',
        title: 'APPS',
        type: 'group',
        children: [], // This will be filled from defaultNavigation so we don't have to manage multiple sets of the same navigation
    },
    {
        id: 'others',
        title: 'OTHERS',
        type: 'group',
    },
    {
        id: 'pages',
        title: 'Pages',
        type: 'aside',
        icon: 'heroicons_outline:document-duplicate',
        children: [], // This will be filled from defaultNavigation so we don't have to manage multiple sets of the same navigation
    },
    {
        id: 'user-interface',
        title: 'User Interface',
        type: 'aside',
        icon: 'heroicons_outline:rectangle-stack',
        children: [], // This will be filled from defaultNavigation so we don't have to manage multiple sets of the same navigation
    },
    {
        id: 'navigation-features',
        title: 'Navigation Features',
        type: 'aside',
        icon: 'heroicons_outline:bars-3',
        children: [], // This will be filled from defaultNavigation so we don't have to manage multiple sets of the same navigation
    },
];
export const horizontalNavigation: FuseNavigationItem[] = [
    {
        id: 'dashboards',
        title: 'Dashboards',
        type: 'group',
        icon: 'heroicons_outline:home',
        children: [], // This will be filled from defaultNavigation so we don't have to manage multiple sets of the same navigation
    },
    {
        id: 'apps',
        title: 'Apps',
        type: 'group',
        icon: 'heroicons_outline:squares-2x2',
        children: [], // This will be filled from defaultNavigation so we don't have to manage multiple sets of the same navigation
    },
    {
        id: 'pages',
        title: 'Pages',
        type: 'group',
        icon: 'heroicons_outline:document-duplicate',
        children: [], // This will be filled from defaultNavigation so we don't have to manage multiple sets of the same navigation
    },
    {
        id: 'user-interface',
        title: 'UI',
        type: 'group',
        icon: 'heroicons_outline:rectangle-stack',
        children: [], // This will be filled from defaultNavigation so we don't have to manage multiple sets of the same navigation
    },
    {
        id: 'navigation-features',
        title: 'Misc',
        type: 'group',
        icon: 'heroicons_outline:bars-3',
        children: [], // This will be filled from defaultNavigation so we don't have to manage multiple sets of the same navigation
    },
];
