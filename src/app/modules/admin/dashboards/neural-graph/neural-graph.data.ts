export interface NeuralNode {
    id: string;
    label: string;
    subLabel: string;
    layer: number; // 0: Users, 1: UI Modules, 2: Front Services, 3: Controllers/Hubs, 4: Logic/Workers, 5: DB/Externals
    layerName: string;
    type: 'user' | 'module' | 'service' | 'controller' | 'worker' | 'database' | 'external';
    icon: string;
    color: string;
    glowColor: string;
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    radius: number;
    baseRadius: number;
    pulseIntensity: number; // 0 a 1 (para efecto spike)
    lastActivated?: number;
    status: 'idle' | 'firing' | 'transmitting' | 'error';
    details: {
        description: string;
        sourceFile?: string;
        technologies?: string[];
        connectedCount?: number;
        metrics?: {
            requestsTotal: number;
            errorsTotal: number;
            lastLatencyMs: number;
        };
    };
}

export interface NeuralLink {
    id: string;
    source: string;
    target: string;
    color?: string;
    weight: number;
    activity: number; // 0 a 1 para grosor/brillo en vivo
    curvature?: number;
}

export interface SynapticPulse {
    id: string;
    sourceId: string;
    targetId: string;
    progress: number; // 0.0 a 1.0
    speed: number;
    color: string;
    glowColor: string;
    size: number;
    trailLength: number;
    label?: string;
    direction: 'forward' | 'backward';
    isError?: boolean;
}

export interface SynapseLog {
    id: string;
    timestamp: string;
    userName: string;
    module: string;
    action: string;
    pathDescription: string;
    latencyMs: number;
    status: 'success' | 'warning' | 'error';
}

// -------------------------------------------------------------
// CATALOGO ESTRUCTURADO DE LA RED NEURONAL DE JR INGENIERÍA
// -------------------------------------------------------------

export const INITIAL_NEURAL_NODES: NeuralNode[] = [
    // ── CAPA 0: USUARIOS / INPUT ──
    {
        id: 'user_ricardo',
        label: 'Ricardo Méndez',
        subLabel: 'Dirección General',
        layer: 0,
        layerName: 'Capa 0: Usuarios Activos',
        type: 'user',
        icon: 'heroicons_solid:user',
        color: '#818CF8',
        glowColor: 'rgba(129, 140, 248, 0.8)',
        x: 100,
        y: 200,
        radius: 20,
        baseRadius: 20,
        pulseIntensity: 0,
        status: 'idle',
        details: {
            description: 'Usuario principal / Dirección. Genera peticiones ejecutivas y autorizaciones.',
            technologies: ['Auth JWT', 'SignalR Client', 'Web / Mobile']
        }
    },
    {
        id: 'user_marlon',
        label: 'Marlon Santos',
        subLabel: 'Ingeniería & Proyectos',
        layer: 0,
        layerName: 'Capa 0: Usuarios Activos',
        type: 'user',
        icon: 'heroicons_solid:user',
        color: '#A78BFA',
        glowColor: 'rgba(167, 139, 250, 0.8)',
        x: 100,
        y: 400,
        radius: 19,
        baseRadius: 19,
        pulseIntensity: 0,
        status: 'idle',
        details: {
            description: 'Líder técnico / Seguimiento de ejecución de obra y materiales.',
            technologies: ['Auth JWT', 'SignalR Client']
        }
    },
    {
        id: 'user_operativo',
        label: 'Staff Operativo',
        subLabel: 'Compras / Almacén / Eventos',
        layer: 0,
        layerName: 'Capa 0: Usuarios Activos',
        type: 'user',
        icon: 'heroicons_solid:user-group',
        color: '#C084FC',
        glowColor: 'rgba(192, 132, 252, 0.8)',
        x: 100,
        y: 600,
        radius: 18,
        baseRadius: 18,
        pulseIntensity: 0,
        status: 'idle',
        details: {
            description: 'Personal operativo gestionando compras, recepción y registro de asistentes.',
            technologies: ['Angular Fuse', 'NFC / QR Scanner']
        }
    },

    // ── CAPA 1: MODULOS FRONTEND UI (Angular) ──
    {
        id: 'mod_cotizaciones',
        label: 'Cotizaciones',
        subLabel: 'quotes / quotes-products',
        layer: 1,
        layerName: 'Capa 1: Módulos Angular UI',
        type: 'module',
        icon: 'heroicons_outline:document-text',
        color: '#38BDF8',
        glowColor: 'rgba(56, 189, 248, 0.8)',
        x: 350,
        y: 150,
        radius: 22,
        baseRadius: 22,
        pulseIntensity: 0,
        status: 'idle',
        details: {
            description: 'Cotizador inteligente con sincronización a CONTPAQi y plantillas personalizadas.',
            sourceFile: 'src/app/modules/admin/dashboards/quotes-products',
            technologies: ['Angular 18', 'Reactive Forms', 'Highcharts']
        }
    },
    {
        id: 'mod_gastos',
        label: 'Gastos & Viáticos',
        subLabel: 'expenses / viaticos',
        layer: 1,
        layerName: 'Capa 1: Módulos Angular UI',
        type: 'module',
        icon: 'heroicons_outline:banknotes',
        color: '#06B6D4',
        glowColor: 'rgba(6, 182, 212, 0.8)',
        x: 350,
        y: 300,
        radius: 20,
        baseRadius: 20,
        pulseIntensity: 0,
        status: 'idle',
        details: {
            description: 'Gestión y comprobación de gastos de obra, viáticos y archivos XML/PDF.',
            sourceFile: 'src/app/modules/admin/dashboards/expenses',
            technologies: ['Angular 18', 'ExcelJS', 'File Viewer']
        }
    },
    {
        id: 'mod_compras',
        label: 'Solicitudes Compra',
        subLabel: 'solicitudes-compra / recepciones',
        layer: 1,
        layerName: 'Capa 1: Módulos Angular UI',
        type: 'module',
        icon: 'heroicons_outline:shopping-cart',
        color: '#22D3EE',
        glowColor: 'rgba(34, 211, 238, 0.8)',
        x: 350,
        y: 450,
        radius: 21,
        baseRadius: 21,
        pulseIntensity: 0,
        status: 'idle',
        details: {
            description: 'Flujo completo de solicitudes, compras, órdenes y recepción en almacenes.',
            sourceFile: 'src/app/modules/admin/administration/solicitudes-compra',
            technologies: ['Material Table', 'Fuse Drawer', 'RxJS']
        }
    },
    {
        id: 'mod_proyectos',
        label: 'Proyectos & Seguimiento',
        subLabel: 'seguimiento-ejecucion / obras',
        layer: 1,
        layerName: 'Capa 1: Módulos Angular UI',
        type: 'module',
        icon: 'heroicons_outline:briefcase',
        color: '#2DD4BF',
        glowColor: 'rgba(45, 212, 191, 0.8)',
        x: 350,
        y: 600,
        radius: 21,
        baseRadius: 21,
        pulseIntensity: 0,
        status: 'idle',
        details: {
            description: 'Control de ejecución de obra maestra, subactividades, cuadrillas y mano de obra.',
            sourceFile: 'src/app/modules/admin/engineering/seguimiento-ejecucion',
            technologies: ['Frappe Gantt', 'ApexCharts', 'Fuse Card']
        }
    },
    {
        id: 'mod_iso_eventos',
        label: 'ISO 9001 & Eventos',
        subLabel: 'iso-documentacion / stands / qr',
        layer: 1,
        layerName: 'Capa 1: Módulos Angular UI',
        type: 'module',
        icon: 'heroicons_outline:check-badge',
        color: '#14B8A6',
        glowColor: 'rgba(20, 184, 166, 0.8)',
        x: 350,
        y: 750,
        radius: 20,
        baseRadius: 20,
        pulseIntensity: 0,
        status: 'idle',
        details: {
            description: 'Control de calidad ISO-9001, bitácoras OnlyOffice y check-in QR de eventos.',
            sourceFile: 'src/app/modules/admin/administration/iso-documentacion',
            technologies: ['OnlyOffice Editor', 'QR Generator', 'PDF.js']
        }
    },

    // ── CAPA 2: SERVICIOS FRONTEND & TELEMETRIA ──
    {
        id: 'srv_cotizacion_ts',
        label: 'CotizacionService.ts',
        subLabel: 'HTTP client data handler',
        layer: 2,
        layerName: 'Capa 2: Servicios de Comunicación Front',
        type: 'service',
        icon: 'heroicons_outline:arrow-path',
        color: '#60A5FA',
        glowColor: 'rgba(96, 165, 250, 0.8)',
        x: 600,
        y: 200,
        radius: 17,
        baseRadius: 17,
        pulseIntensity: 0,
        status: 'idle',
        details: {
            description: 'Servicio Angular inyectable para CRUD de cotizaciones y sincronización.',
            sourceFile: 'src/app/modules/admin/dashboards/quotes-products/quotes-products.service.ts',
            technologies: ['Angular HttpClient', 'RxJS BehaviorSubject']
        }
    },
    {
        id: 'srv_http_interceptor',
        label: 'Http Interceptor / Auth',
        subLabel: 'JWT bearer & telemetry',
        layer: 2,
        layerName: 'Capa 2: Servicios de Comunicación Front',
        type: 'service',
        icon: 'heroicons_outline:key',
        color: '#3B82F6',
        glowColor: 'rgba(59, 130, 246, 0.8)',
        x: 600,
        y: 400,
        radius: 19,
        baseRadius: 19,
        pulseIntensity: 0,
        status: 'idle',
        details: {
            description: 'Intercepta todas las solicitudes hacia la API, inyecta tokens y audita tráfico.',
            sourceFile: 'src/app/core/auth/auth.interceptor.ts',
            technologies: ['Angular Interceptor', 'JWT Tokens']
        }
    },
    {
        id: 'srv_signalr_client',
        label: 'ActivitySignalRService',
        subLabel: 'WebSocket listener',
        layer: 2,
        layerName: 'Capa 2: Servicios de Comunicación Front',
        type: 'service',
        icon: 'heroicons_outline:bolt',
        color: '#6366F1',
        glowColor: 'rgba(99, 102, 241, 0.8)',
        x: 600,
        y: 600,
        radius: 18,
        baseRadius: 18,
        pulseIntensity: 0,
        status: 'idle',
        details: {
            description: 'Cliente SignalR conectado a /navegacionHub y /presenceHub en tiempo real.',
            sourceFile: 'src/app/core/signalr/activity-signalr.service.ts',
            technologies: ['@microsoft/signalr', 'WebSocket Transport']
        }
    },

    // ── CAPA 3: BACKEND API CONTROLLERS & HUBS (.NET 8) ──
    {
        id: 'api_cotizacion_ctrl',
        label: 'CotizacionController',
        subLabel: 'api/Cotizacion',
        layer: 3,
        layerName: 'Capa 3: Controllers & Hubs .NET 8',
        type: 'controller',
        icon: 'heroicons_outline:command-line',
        color: '#A855F7',
        glowColor: 'rgba(168, 85, 247, 0.8)',
        x: 880,
        y: 180,
        radius: 20,
        baseRadius: 20,
        pulseIntensity: 0,
        status: 'idle',
        details: {
            description: 'API REST para gestión de cotizaciones, búsqueda remota y PDF de cotización.',
            sourceFile: 'jr_api/Controllers/CotizacionController.cs',
            technologies: ['ASP.NET Core 8', 'REST', 'Authorize']
        }
    },
    {
        id: 'api_solicitudes_ctrl',
        label: 'SolicitudesCompraController',
        subLabel: 'api/SolicitudesCompra',
        layer: 3,
        layerName: 'Capa 3: Controllers & Hubs .NET 8',
        type: 'controller',
        icon: 'heroicons_outline:command-line',
        color: '#9333EA',
        glowColor: 'rgba(147, 51, 234, 0.8)',
        x: 880,
        y: 350,
        radius: 20,
        baseRadius: 20,
        pulseIntensity: 0,
        status: 'idle',
        details: {
            description: 'Controlador neurálgico de compras, recepciones y órdenes de compra.',
            sourceFile: 'jr_api/Controllers/SolicitudesCompraController.cs',
            technologies: ['ASP.NET Core 8', 'EF Core Transactions']
        }
    },
    {
        id: 'api_navegacion_hub',
        label: 'NavegacionHub & Logs',
        subLabel: '/navegacionHub',
        layer: 3,
        layerName: 'Capa 3: Controllers & Hubs .NET 8',
        type: 'controller',
        icon: 'heroicons_outline:signal',
        color: '#EC4899',
        glowColor: 'rgba(236, 72, 153, 0.8)',
        x: 880,
        y: 520,
        radius: 22,
        baseRadius: 22,
        pulseIntensity: 0,
        status: 'idle',
        details: {
            description: 'Hub SignalR que distribuye telemetría y movimientos en tiempo real a los clientes.',
            sourceFile: 'jr_api/Hubs/NavegacionHub.cs',
            technologies: ['SignalR Core', 'Async Broadcast']
        }
    },
    {
        id: 'api_proyectos_ctrl',
        label: 'SeguimientoEjecucionController',
        subLabel: 'api/SeguimientoEjecucion',
        layer: 3,
        layerName: 'Capa 3: Controllers & Hubs .NET 8',
        type: 'controller',
        icon: 'heroicons_outline:command-line',
        color: '#8B5CF6',
        glowColor: 'rgba(139, 92, 246, 0.8)',
        x: 880,
        y: 690,
        radius: 20,
        baseRadius: 20,
        pulseIntensity: 0,
        status: 'idle',
        details: {
            description: 'Control de estimaciones, mano de obra, horas trabajadas y bitácoras de obra.',
            sourceFile: 'jr_api/Controllers/SeguimientoEjecucionController.cs',
            technologies: ['ASP.NET Core 8', 'Stored Procedures']
        }
    },

    // ── CAPA 4: LOGICA DE NEGOCIO, SYNC & WORKERS ──
    {
        id: 'srv_sync_cotizacion',
        label: 'SyncCotizacionRemote',
        subLabel: 'sp_ObtenerCotizacionesRecientes',
        layer: 4,
        layerName: 'Capa 4: Servicios de Negocio & Workers',
        type: 'worker',
        icon: 'heroicons_outline:cpu-chip',
        color: '#F43F5E',
        glowColor: 'rgba(244, 63, 94, 0.8)',
        x: 1150,
        y: 200,
        radius: 19,
        baseRadius: 19,
        pulseIntensity: 0,
        status: 'idle',
        details: {
            description: 'Sincronizador que extrae cotizaciones y partidas ejecutando SPs en CONTPAQi cada hora.',
            sourceFile: 'jr_api/SyncService/SyncCotizacionRemote.cs',
            technologies: ['C# Service', 'Raw SQL SP execution']
        }
    },
    {
        id: 'worker_sync_background',
        label: 'SyncServiceBackground',
        subLabel: 'Worker horario (Productos, Clientes, Precios)',
        layer: 4,
        layerName: 'Capa 4: Servicios de Negocio & Workers',
        type: 'worker',
        icon: 'heroicons_outline:clock',
        color: '#E11D48',
        glowColor: 'rgba(225, 29, 72, 0.8)',
        x: 1150,
        y: 400,
        radius: 20,
        baseRadius: 20,
        pulseIntensity: 0,
        status: 'idle',
        details: {
            description: 'Background Service que corre 24/7 sincronizando almacenes, clientes y existencias.',
            sourceFile: 'jr_api/SyncService/SyncServiceBackground.cs',
            technologies: ['HostedService', 'Background Loop']
        }
    },
    {
        id: 'worker_facturas_vencimiento',
        label: 'FacturasVencimientoWorker',
        subLabel: '7:00 AM diario (sp_ReporteCartera)',
        layer: 4,
        layerName: 'Capa 4: Servicios de Negocio & Workers',
        type: 'worker',
        icon: 'heroicons_outline:bell-alert',
        color: '#FB7185',
        glowColor: 'rgba(251, 113, 133, 0.8)',
        x: 1150,
        y: 600,
        radius: 19,
        baseRadius: 19,
        pulseIntensity: 0,
        status: 'idle',
        details: {
            description: 'Alarma diaria matutina que evalúa facturas vencidas y envía WhatsApp/Email.',
            sourceFile: 'jr_api/BackgroundService/FacturasVencimientoWorker.cs',
            technologies: ['Cron Worker', 'WhatsApp Cloud SDK', 'SMTP']
        }
    },

    // ── CAPA 5: BASES DE DATOS & SERVICIOS EXTERNOS ──
    {
        id: 'db_sql_server',
        label: 'SQL Server (db_jr)',
        subLabel: 'ApplicationDbContext / Tablas Maestras',
        layer: 5,
        layerName: 'Capa 5: Almacenamiento & Servicios Externos',
        type: 'database',
        icon: 'heroicons_outline:circle-stack',
        color: '#10B981',
        glowColor: 'rgba(16, 185, 129, 0.9)',
        x: 1420,
        y: 220,
        radius: 26,
        baseRadius: 26,
        pulseIntensity: 0,
        status: 'idle',
        details: {
            description: 'Base de datos principal del CRM/ERP JR Ingeniería (cotizaciones, compras, usuarios, obras).',
            sourceFile: 'jr_api/Data/ApplicationDbContext.cs',
            technologies: ['Microsoft SQL Server 2022', 'EF Core 8']
        }
    },
    {
        id: 'db_contpaqi',
        label: 'CONTPAQi Comercial',
        subLabel: 'RemoteDb (Física) & RemoteDbM (Moral)',
        layer: 5,
        layerName: 'Capa 5: Almacenamiento & Servicios Externos',
        type: 'database',
        icon: 'heroicons_outline:circle-stack',
        color: '#34D399',
        glowColor: 'rgba(52, 211, 153, 0.9)',
        x: 1420,
        y: 420,
        radius: 25,
        baseRadius: 25,
        pulseIntensity: 0,
        status: 'idle',
        details: {
            description: 'Bases de datos de CONTPAQi Comercial conectadas por red remota para inventarios y facturación.',
            sourceFile: 'jr_api/Data/RemoteDbContext.cs',
            technologies: ['CONTPAQi Comercial SDK', 'SQL Server Express']
        }
    },
    {
        id: 'ext_gemini_ai',
        label: 'Gemini 3 Flash & OpenAI',
        subLabel: 'Rayito IA / Consultas inteligentes',
        layer: 5,
        layerName: 'Capa 5: Almacenamiento & Servicios Externos',
        type: 'external',
        icon: 'heroicons_outline:sparkles',
        color: '#F59E0B',
        glowColor: 'rgba(245, 158, 11, 0.9)',
        x: 1420,
        y: 600,
        radius: 22,
        baseRadius: 22,
        pulseIntensity: 0,
        status: 'idle',
        details: {
            description: 'Agente de IA corporativo (Rayito) para análisis de datos, cotizaciones y asistencia.',
            sourceFile: 'jr_api/Services/GeminiService.cs',
            technologies: ['Google Gemini API', 'OpenAI API']
        }
    },
    {
        id: 'ext_whatsapp_meta',
        label: 'WhatsApp Cloud API',
        subLabel: 'Notificaciones & Encuestas',
        layer: 5,
        layerName: 'Capa 5: Almacenamiento & Servicios Externos',
        type: 'external',
        icon: 'heroicons_outline:chat-bubble-left-right',
        color: '#10B981',
        glowColor: 'rgba(16, 185, 129, 0.8)',
        x: 1420,
        y: 760,
        radius: 20,
        baseRadius: 20,
        pulseIntensity: 0,
        status: 'idle',
        details: {
            description: 'Canal oficial de WhatsApp para envío de encuestas y alertas automáticas de cartera.',
            technologies: ['Meta Graph API v22.0']
        }
    }
];

// -------------------------------------------------------------
// CONEXIONES SINÁPTICAS (AXONES DE COMUNICACIÓN)
// -------------------------------------------------------------

export const INITIAL_NEURAL_LINKS: NeuralLink[] = [
    // L0 -> L1 (Usuarios hacia Módulos)
    { id: 'l_ricardo_cot', source: 'user_ricardo', target: 'mod_cotizaciones', weight: 3, activity: 0 },
    { id: 'l_ricardo_gas', source: 'user_ricardo', target: 'mod_gastos', weight: 2, activity: 0 },
    { id: 'l_marlon_proy', source: 'user_marlon', target: 'mod_proyectos', weight: 3, activity: 0 },
    { id: 'l_marlon_gas', source: 'user_marlon', target: 'mod_gastos', weight: 2, activity: 0 },
    { id: 'l_operativo_com', source: 'user_operativo', target: 'mod_compras', weight: 3, activity: 0 },
    { id: 'l_operativo_iso', source: 'user_operativo', target: 'mod_iso_eventos', weight: 2, activity: 0 },

    // L1 -> L2 (Módulos hacia Servicios Front)
    { id: 'l_cot_srv', source: 'mod_cotizaciones', target: 'srv_cotizacion_ts', weight: 2, activity: 0 },
    { id: 'l_cot_int', source: 'mod_cotizaciones', target: 'srv_http_interceptor', weight: 2, activity: 0 },
    { id: 'l_gas_int', source: 'mod_gastos', target: 'srv_http_interceptor', weight: 2, activity: 0 },
    { id: 'l_com_int', source: 'mod_compras', target: 'srv_http_interceptor', weight: 2, activity: 0 },
    { id: 'l_proy_int', source: 'mod_proyectos', target: 'srv_http_interceptor', weight: 2, activity: 0 },
    { id: 'l_iso_int', source: 'mod_iso_eventos', target: 'srv_http_interceptor', weight: 2, activity: 0 },
    { id: 'l_all_sig', source: 'srv_http_interceptor', target: 'srv_signalr_client', weight: 1, activity: 0 },

    // L2 -> L3 (Servicios Front hacia Controllers API)
    { id: 'l_srv_cot_api', source: 'srv_cotizacion_ts', target: 'api_cotizacion_ctrl', weight: 3, activity: 0 },
    { id: 'l_int_cot_api', source: 'srv_http_interceptor', target: 'api_cotizacion_ctrl', weight: 2, activity: 0 },
    { id: 'l_int_com_api', source: 'srv_http_interceptor', target: 'api_solicitudes_ctrl', weight: 2, activity: 0 },
    { id: 'l_int_proy_api', source: 'srv_http_interceptor', target: 'api_proyectos_ctrl', weight: 2, activity: 0 },
    { id: 'l_sig_hub', source: 'srv_signalr_client', target: 'api_navegacion_hub', weight: 3, activity: 0 },

    // L3 -> L4 (Controllers hacia Workers / Logica)
    { id: 'l_api_cot_sync', source: 'api_cotizacion_ctrl', target: 'srv_sync_cotizacion', weight: 2, activity: 0 },
    { id: 'l_api_com_sync', source: 'api_solicitudes_ctrl', target: 'worker_sync_background', weight: 2, activity: 0 },
    { id: 'l_hub_log', source: 'api_navegacion_hub', target: 'worker_facturas_vencimiento', weight: 1, activity: 0 },

    // L3 & L4 -> L5 (Hacia Bases de Datos & Servicios Externos)
    { id: 'l_cot_db', source: 'api_cotizacion_ctrl', target: 'db_sql_server', weight: 3, activity: 0 },
    { id: 'l_proy_db', source: 'api_proyectos_ctrl', target: 'db_sql_server', weight: 3, activity: 0 },
    { id: 'l_com_db', source: 'api_solicitudes_ctrl', target: 'db_sql_server', weight: 3, activity: 0 },
    { id: 'l_sync_contpaqi', source: 'srv_sync_cotizacion', target: 'db_contpaqi', weight: 3, activity: 0 },
    { id: 'l_bg_contpaqi', source: 'worker_sync_background', target: 'db_contpaqi', weight: 3, activity: 0 },
    { id: 'l_fact_contpaqi', source: 'worker_facturas_vencimiento', target: 'db_contpaqi', weight: 3, activity: 0 },
    { id: 'l_fact_wa', source: 'worker_facturas_vencimiento', target: 'ext_whatsapp_meta', weight: 2, activity: 0 },
    { id: 'l_cot_gemini', source: 'api_cotizacion_ctrl', target: 'ext_gemini_ai', weight: 2, activity: 0 }
];
