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
        icon: 'heroicons_outline:home',
        children: [
            // Usa ID original: 'dashboards.quote'
            {
                id: 'dashboards.quote',
                title: 'Cotizaciones de Proyectos',
                type: 'basic',
                icon: 'heroicons_outline:banknotes',
                link: '/dashboards/quote'
            },
            // Usa ID original (con error de dedo preservado): 'dashboards.tasjks'
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
                    // Usa ID original: 'catalogs.clients'
                    { id: 'catalogs.clients', title: 'Clientes', type: 'basic', icon: 'heroicons_outline:user', link: '/catalogs/clients' },
                    // Usa ID original: 'catalogs.products'
                    { id: 'catalogs.products', title: 'Productos', type: 'basic', icon: 'heroicons_outline:archive-box', link: '/catalogs/products' },
                    // Usa ID original: 'dashboards.prospects'
                    { id: 'dashboards.prospects', title: 'Prospectos', type: 'basic', icon: 'heroicons_outline:user-group', link: '/dashboards/prospects' }
                ]
            },
            {
                id: 'ingenieria.reportes',
                title: 'Reportes',
                type: 'collapsable',
                icon: 'heroicons_outline:clipboard-document-list',
                children: [
                    // Usa ID original: 'dashboards.analytics'
                    { id: 'dashboards.analytics', title: 'Analytics', type: 'basic', icon: 'heroicons_outline:chart-pie', link: '/dashboards/analytics' },
                    // Usa ID original: 'dashboards.project'
                    { id: 'dashboards.project', title: 'Proyectos', type: 'basic', icon: 'heroicons_outline:clipboard-document-check', link: '/dashboards/project' },
                    // Usa ID original: 'reports.project-progress'
                    { id: 'reports.project-progress', title: 'Reporte avance de proyectos', type: 'basic', icon: 'heroicons_outline:document-chart-bar', link: '/reports/project-progress' },
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
        icon: 'heroicons_outline:briefcase',
        children: [
            // Usa ID original: 'dashboards.quote-products'
            {
                id: 'dashboards.quote-products',
                title: 'Cotizaciones de Productos',
                type: 'basic',
                icon: 'heroicons_outline:banknotes',
                link: '/dashboards/quote-products'
            },
            // Usa ID original: 'dashboards.sales'
            {
                id: 'dashboards.sales',
                title: 'Ventas',
                type: 'basic',
                icon: 'heroicons_outline:shopping-cart',
                link: '/dashboards/sales'
            },
            // Usa ID original: 'dashboards.tasjks'
            {
                id: 'dashboards.tasjks',
                title: 'Tareas',
                type: 'basic',
                icon: 'heroicons_outline:check-circle',
                link: '/dashboards/tasks'
            },
            {
                id: 'dashboards.expenses',
                title: 'Gastos',
                type: 'basic',
                icon: 'heroicons_outline:currency-dollar',
                link: '/dashboards/expenses'
            },
            {
                id: 'comercializacion.catalogos',
                title: 'Catalogos',
                type: 'collapsable',
                icon: 'heroicons_outline:book-open',
                children: [
                    { id: 'catalogs.clients', title: 'Clientes', type: 'basic', icon: 'heroicons_outline:user', link: '/catalogs/clients' },
                    { id: 'dashboards.prospects', title: 'Prospectos', type: 'basic', icon: 'heroicons_outline:user-group', link: '/dashboards/prospects' }
                ]
            },
            {
                id: 'comercializacion.reportes',
                title: 'Reportes',
                type: 'collapsable',
                icon: 'heroicons_outline:chart-bar',
                children: [
                    // Usa ID original: 'reports.report-ventas'
                    { id: 'reports.report-ventas', title: 'Reporte de Ventas', type: 'basic', icon: 'heroicons_outline:presentation-chart-line', link: '/reports/report-venta' },
                    // Usa ID original: 'reports.report-portfolio-overdue'
                    { id: 'reports.report-portfolio-overdue', title: 'Reporte Cuentas por Cobrar', type: 'basic', icon: 'heroicons_outline:currency-dollar', link: '/reports/report-portfolio-overdue' },
                    // Usa ID original: 'reports.report-ventas-product'
                    { id: 'reports.report-ventas-product', title: 'Reporte de Ventas por Producto', type: 'basic', icon: 'heroicons_outline:shopping-cart', link: '/reports/report-venta-product' },
                    // Usa ID original: 'dashboards.transfer-management' (Movido a reportes o dashboards según lógica)
                    { id: 'dashboards.transfer-management', title: 'Gestion de Traspasos', type: 'basic', icon: 'heroicons_outline:arrows-right-left', link: '/dashboards/transfer-management' },
                    // Usa ID original: 'reports.report-product-existence'
                    { id: 'reports.report-product-existence', title: 'Reporte de Existencia de Productos', type: 'basic', icon: 'heroicons_outline:list-bullet', link: '/reports/report-product-existence' },
                    // Usa ID original: 'reports.report-customers'
                    { id: 'reports.report-customers', title: 'Reporte de Clientes', type: 'basic', icon: 'heroicons_outline:user', link: '/reports/report-customers' },
                    // Usa ID original: 'reports.report-expenses'
                    { id: 'reports.report-expenses', title: 'Reporte de Gastos', type: 'basic', icon: 'heroicons_outline:currency-dollar', link: '/reports/report-expenses' },
                    { id: 'reports.report-ventas-agente', title: 'Reporte de Ventas por Agente', type: 'basic', icon: 'heroicons_outline:currency-dollar', link: '/reports/report-ventas-agente' },
                    { id: 'reports.report-customers-segmentation', title: 'Reporte de Clientes por Segmentación', type: 'basic', icon: 'heroicons_outline:user', link: '/reports/report-customers-segmentation' },
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
            // Usa ID original: 'dashboards.surveys'
            {
                id: 'dashboards.surveys',
                title: 'Encuestas',
                type: 'basic',
                icon: 'heroicons_outline:clipboard-document-list',
                link: '/dashboards/surveys'
            },
            // Usa ID original: 'dashboards.surveys-products'
            {
                id: 'dashboards.surveys-products',
                title: 'Encuesta de Productos',
                type: 'basic',
                icon: 'heroicons_outline:clipboard-document-check',
                link: '/dashboards/surveys-products'
            },
            {
                id: 'marketing.reportes',
                title: 'Reportes de Satisfacción',
                type: 'collapsable',
                icon: 'heroicons_outline:chart-bar-square',
                children: [
                    // Usa ID original: 'reports.product-satisfaction-survey'
                    { id: 'reports.product-satisfaction-survey', title: 'Encuesta de Satisfacción (Productos)', type: 'basic', icon: 'heroicons_outline:star', link: '/reports/product-satisfaction-survey' },
                    // Usa ID original: 'reports.project-satisfaction-survey'
                    { id: 'reports.project-satisfaction-survey', title: 'Encuesta de Satisfacción (Proyectos)', type: 'basic', icon: 'heroicons_outline:star', link: '/reports/project-satisfaction-survey' }
                ]
            }
        ]
    },

    // ==========================================================================================
    // SECCIÓN: SEGURIDAD
    // ==========================================================================================
    {
        id: 'apps', // ID Original para el grupo de seguridad
        title: 'SEGURIDAD',
        subtitle: 'Configuración del sistema',
        type: 'group',
        icon: 'heroicons_outline:shield-check',
        children: [
            // Usa ID original: 'apps.contacts'
            { id: 'apps.contacts', title: 'Usuarios', type: 'basic', icon: 'heroicons_outline:user-group', link: '/security/users' },
            // Usa ID original: 'apps.roles'
            { id: 'apps.roles', title: 'Roles', type: 'basic', icon: 'heroicons_outline:lock-closed', link: '/security/roles' },
            // Usa ID original: 'reports.login-logs'
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