/* eslint-disable */
import { FuseNavigationItem } from '@fuse/components/navigation';
export const defaultNavigation: FuseNavigationItem[] = [

    // ==========================================================================================
    // SECCIÓN: INGENIERÍA
    // ==========================================================================================
    {
        id: 'ingenieria',
        title: 'INGENIERIA',
        subtitle: 'Gestión técnica y proyectos',
        type: 'group',
        icon: 'heroicons_outline:cog',
        children: [
            // Elementos directos
            { id: 'dashboards.tasjks', title: 'Tareas', type: 'basic', icon: 'heroicons_outline:check-circle', link: '/dashboards/tasks' },
            { id: 'catalogs.clients', title: 'Clientes', type: 'basic', icon: 'heroicons_outline:user', link: '/catalogs/clients' },
            { id: 'dashboards.prospects', title: 'Prospectos', type: 'basic', icon: 'heroicons_outline:user-group', link: '/dashboards/prospects' },
            { id: 'dashboards.analytics', title: 'Mapa de prospectos y clientes', type: 'basic', icon: 'heroicons_outline:map', link: '/dashboards/analytics' },
            { id: 'dashboards.roadmap', title: 'Roadmap 2026', type: 'basic', icon: 'heroicons_outline:flag', link: '/dashboards/roadmap' },

            // Subgrupo: GESTION
            {
                id: 'ingenieria.gestion',
                title: 'GESTION',
                type: 'collapsable',
                icon: 'heroicons_outline:briefcase',
                children: [
                    { id: 'dashboards.expenses', title: 'Gastos', type: 'basic', icon: 'heroicons_outline:currency-dollar', link: '/dashboards/expenses' },
                    { id: 'dashboards.quote', title: 'Cotización de Proyectos', type: 'basic', icon: 'heroicons_outline:banknotes', link: '/dashboards/quote' },
                    { id: 'dashboards.transfer-management', title: 'Gestión de Traspasos', type: 'basic', icon: 'heroicons_outline:arrows-right-left', link: '/dashboards/transfer-management' }
                ]
            },

            // Subgrupo: PROYECTOS
            {
                id: 'ingenieria.proyectos',
                title: 'PROYECTOS',
                type: 'collapsable',
                icon: 'heroicons_outline:clipboard-document-check',
                children: [
                    { id: 'dashboards.project', title: 'Proyectos', type: 'basic', icon: 'heroicons_outline:folder-open', link: '/dashboards/project' }, // Conservado
                    { id: 'reports.project-progress', title: '*Diagrama de Gant por proyecto', type: 'basic', icon: 'heroicons_outline:chart-bar', link: '/reports/project-progress' }
                ]
            },

            // Subgrupo: INVENTARIO
            {
                id: 'ingenieria.inventario',
                title: 'INVENTARIO',
                type: 'collapsable',
                icon: 'heroicons_outline:archive-box',
                children: [
                    { id: 'catalogs.products', title: 'EXISTENCIAS DE PRODUCTOS CIAT', type: 'basic', icon: 'heroicons_outline:cube', link: '' },
                    { id: 'reports.report-product-existence', title: 'EXISTENCIAS DE PRODUCTOS', type: 'basic', icon: 'heroicons_outline:list-bullet', link: '/reports/report-product-existence' }
                ]
            },

            // Subgrupo: REPORTES
            {
                id: 'ingenieria.reportes',
                title: 'REPORTES',
                type: 'collapsable',
                icon: 'heroicons_outline:chart-pie',
                children: [
                    { id: 'reports.report-expenses', title: 'Reporte de gastos', type: 'basic', icon: 'heroicons_outline:document-text', link: '/reports/report-expenses' }
                ]
            }
        ]
    },

    // ==========================================================================================
    // SECCIÓN: COMERCIALIZACIÓN
    // ==========================================================================================
    {
        id: 'comercializacion',
        title: 'COMERCIALIZACION',
        subtitle: 'Ventas y atención comercial',
        type: 'group',
        icon: 'heroicons_outline:shopping-cart',
        children: [
            // Elementos directos
            { id: 'dashboards.tasjks', title: 'Tareas', type: 'basic', icon: 'heroicons_outline:check-circle', link: '/dashboards/tasks' },
            { id: 'dashboards.expenses', title: 'Gastos', type: 'basic', icon: 'heroicons_outline:currency-dollar', link: '/dashboards/expenses' },
            { id: 'dashboards.analytics', title: 'Mapa de Prospectos y clientes', type: 'basic', icon: 'heroicons_outline:map', link: '/dashboards/analytics' },
            { id: 'dashboards.roadmap', title: 'Roadmap 2026', type: 'basic', icon: 'heroicons_outline:flag', link: '/dashboards/roadmap' },

            // Subgrupo: INVENTARIO
            {
                id: 'comercializacion.inventario',
                title: 'INVENTARIO',
                type: 'collapsable',
                icon: 'heroicons_outline:archive-box',
                children: [
                    { id: 'catalogs.products', title: 'EXISTENCIAS DE PRODUCTOS CIAT', type: 'basic', icon: 'heroicons_outline:cube', link: '' },
                    { id: 'reports.report-product-existence', title: 'EXISTENCIAS DE PRODUCTOS', type: 'basic', icon: 'heroicons_outline:list-bullet', link: '/reports/report-product-existence' }
                ]
            },

            // Subgrupo: GESTION
            {
                id: 'comercializacion.gestion',
                title: 'GESTION',
                type: 'collapsable',
                icon: 'heroicons_outline:folder',
                children: [
                    { id: 'dashboards.sales', title: 'Ventas', type: 'basic', icon: 'heroicons_outline:shopping-bag', link: '/dashboards/sales' }, // Conservado
                    { id: 'dashboards.transfer-management', title: 'Gestión de Traspasos', type: 'basic', icon: 'heroicons_outline:arrows-right-left', link: '/dashboards/transfer-management' },
                    { id: 'dashboards.quote-products', title: 'Cotizaciones', type: 'basic', icon: 'heroicons_outline:banknotes', link: '/dashboards/quote-products' }
                ]
            },

            // Subgrupo: REPORTES
            {
                id: 'comercializacion.reportes',
                title: 'REPORTES',
                type: 'collapsable',
                icon: 'heroicons_outline:chart-bar',
                children: [
                    { id: 'reports.report-ventas', title: 'Reporte de Ventas', type: 'basic', icon: 'heroicons_outline:presentation-chart-line', link: '/reports/report-venta' },
                    { id: 'reports.report-ventas-agente', title: 'Reporte de ventas por agente', type: 'basic', icon: 'heroicons_outline:user', link: '/reports/report-ventas-agente' },
                    { id: 'reports.report-ventas-product', title: 'Reporte de ventas por producto', type: 'basic', icon: 'heroicons_outline:shopping-cart', link: '/reports/report-venta-product' },
                    { id: 'reports.report-customers-segmentation', title: 'Reporte de ventas por cliente', type: 'basic', icon: 'heroicons_outline:users', link: '/reports/report-customers-segmentation' },
                    { id: 'reports.report-customers', title: 'Acumulado de clientes', type: 'basic', icon: 'heroicons_outline:user-plus', link: '/reports/report-customers' },
                    { id: 'reports.report-portfolio-overdue', title: 'Cartera Vencida', type: 'basic', icon: 'heroicons_outline:currency-dollar', link: '/reports/report-portfolio-overdue' },
                    { id: 'reports.report-expenses', title: 'Reporte de Gastos', type: 'basic', icon: 'heroicons_outline:document-text', link: '/reports/report-expenses' }
                ]
            }
        ]
    },

    // ==========================================================================================
    // SECCIÓN: MARKETING
    // ==========================================================================================
    {
        id: 'marketing',
        title: 'MARKETING',
        subtitle: 'Prospección y satisfacción',
        type: 'group',
        icon: 'heroicons_outline:megaphone',
        children: [
            // Elementos directos
            { id: 'dashboards.tasjks', title: 'Tareas', type: 'basic', icon: 'heroicons_outline:check-circle', link: '/dashboards/tasks' },

            // Subgrupo: ENCUESTAS
            {
                id: 'marketing.encuestas',
                title: 'ENCUESTAS',
                type: 'collapsable',
                icon: 'heroicons_outline:clipboard-document-list',
                children: [
                    { id: 'dashboards.surveys', title: 'Encuestas', type: 'basic', icon: 'heroicons_outline:clipboard-document', link: '/dashboards/surveys' }, // Conservado
                    { id: 'dashboards.surveys-products', title: 'Encuestas de Productos', type: 'basic', icon: 'heroicons_outline:clipboard-document-check', link: '/dashboards/surveys-products' }, // Conservado
                    { id: 'catalogs.clients', title: 'Clientes', type: 'basic', icon: 'heroicons_outline:user', link: '/catalogs/clients' },
                    { id: 'dashboards.analytics', title: 'Mapa de prospectos y clientes', type: 'basic', icon: 'heroicons_outline:map', link: '/dashboards/analytics' }
                ]
            },

            // Subgrupo: GESTION
            {
                id: 'marketing.gestion',
                title: 'GESTION',
                type: 'collapsable',
                icon: 'heroicons_outline:briefcase',
                children: [
                    { id: 'dashboards.expenses', title: 'Gastos', type: 'basic', icon: 'heroicons_outline:currency-dollar', link: '/dashboards/expenses' }
                ]
            },

            // Subgrupo: REPORTES
            {
                id: 'marketing.reportes',
                title: 'REPORTES',
                type: 'collapsable',
                icon: 'heroicons_outline:chart-bar-square',
                children: [
                    { id: 'reports.product-satisfaction-survey', title: 'Reportes de satisfaccion', type: 'basic', icon: 'heroicons_outline:star', link: '/reports/product-satisfaction-survey' },
                    { id: 'reports.project-satisfaction-survey', title: 'Reportes de satisfaccion (Proyectos)', type: 'basic', icon: 'heroicons_outline:star', link: '/reports/project-satisfaction-survey' }, // Conservado
                    { id: 'reports.report-expenses', title: 'Reporte de Gastos', type: 'basic', icon: 'heroicons_outline:document-text', link: '/reports/report-expenses' }
                ]
            }
        ]
    },

    // ==========================================================================================
    // SECCIÓN: RECURSOS HUMANOS
    // ==========================================================================================
    {
        id: 'rrhh',
        title: 'RECURSOS HUMANOS',
        subtitle: 'Gestión de personal',
        type: 'group',
        icon: 'heroicons_outline:users',
        children: [
            { id: 'dashboards.tasjks', title: 'Tareas', type: 'basic', icon: 'heroicons_outline:check-circle', link: '/dashboards/tasks' },
            { id: 'rrhh.personal-management', title: 'Personal', type: 'basic', icon: 'heroicons_outline:user-group', link: '/rrhh/personal-management' } // Conservado
        ]
    },

    // ==========================================================================================
    // SECCIÓN: SEGURIDAD (Conservada)
    // ==========================================================================================
    {
        id: 'apps',
        title: 'SEGURIDAD',
        subtitle: 'Configuración del sistema',
        type: 'group',
        icon: 'heroicons_outline:shield-check',
        children: [
            { id: 'apps.contacts', title: 'Usuarios', type: 'basic', icon: 'heroicons_outline:user-group', link: '/security/users' },
            { id: 'apps.roles', title: 'Roles', type: 'basic', icon: 'heroicons_outline:lock-closed', link: '/security/roles' },
            { id: 'reports.login-logs', title: 'Historial de Inicios de Sesión', type: 'basic', icon: 'heroicons_outline:finger-print', link: '/reports/login-logs' }
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