export interface StrategicPillar {
    icon: string;
    title: string;
    desc: string;
}

export interface MisionVisionItem {
    type: 'mision' | 'vision';
    title: string;
    subtitle: string;
    badgeColor: string;
    gradient: string;
    text: string;
    icon: string;
    pillars: StrategicPillar[];
}

export interface ValorItem {
    id: number;
    title: string;
    subtitle: string;
    description: string;
    color: string;
    bgSoft: string;
    angleStart: number;
    angleEnd: number;
    midAngle: number;
    icon: string;
    quote: string;
    behaviors: string[];
}

// -----------------------------------------------------------------------------
// RADIAL / ORBITAL ORGANIGRAMA INTERFACES (Image 3)
// -----------------------------------------------------------------------------
export interface RadialNodeTextLine {
    text: string;
    isPerson: boolean;
    y: number;
    fontSize: string;
    fontWeight: string;
    fill?: string;
}

export interface RadialNode {
    id: string;
    role: string;
    person: string;
    category: 'cliente' | 'administracion' | 'comercial' | 'ingenieria' | 'puebla' | 'pachuca' | 'queretaro' | 'direccion';
    cx: number;
    cy: number;
    r: number;
    color: string;
    borderColor: string;
    fillColor: string;
    textColor: string;
    isDepartmentHub?: boolean;
    isCore?: boolean;
    parentId?: string;
    linesRole: string[];
    linesPerson: string[];
    textLines?: RadialNodeTextLine[];
}

export interface RadialConnector {
    fromId: string;
    toId: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
}

export interface RadialDepartmentFilter {
    id: string;
    name: string;
    color: string;
    icon: string;
    focusX: number;
    focusY: number;
    focusZoom: number;
    leader: string;
    description: string;
    teamCount: number;
}

// -----------------------------------------------------------------------------
// MISIÓN & VISIÓN DATA (Exact match with corporate Image 1)
// -----------------------------------------------------------------------------
export const MISION_DATA: MisionVisionItem = {
    type: 'mision',
    title: 'MISIÓN',
    subtitle: 'NUESTRO PROPÓSITO FUNDAMENTAL',
    badgeColor: '#16a34a',
    gradient: 'from-emerald-600 via-green-600 to-teal-700',
    icon: 'heroicons_outline:arrow-trending-up',
    text: 'Brindar soluciones en asesoría, consultoría, construcción de obra electromecánica y comercialización de productos y servicios eléctricos con un enfoque sostenible e innovador. Nos comprometemos a impulsar la rentabilidad de nuestros clientes, el uso eficiente de la energía y el desarrollo continuo de nuestros colaboradores para ofrecer soluciones integrales de la más alta calidad.',
    pillars: [
        {
            icon: 'heroicons_outline:academic-cap',
            title: 'Asesoría & Consultoría',
            desc: 'Diagnósticos especializados y normativos de ingeniería eléctrica.'
        },
        {
            icon: 'heroicons_outline:wrench-screwdriver',
            title: 'Obra Electromecánica',
            desc: 'Construcción y montaje técnico con rigurosos estándares de seguridad.'
        },
        {
            icon: 'heroicons_outline:shopping-cart',
            title: 'Comercialización de Suministros',
            desc: 'Productos y equipos eléctricos de calidad certificada internacional.'
        },
        {
            icon: 'heroicons_outline:sparkles',
            title: 'Sostenible e Innovador',
            desc: 'Soluciones limpias, reducción de huella y eficiencia energética.'
        },
        {
            icon: 'heroicons_outline:arrow-trending-up',
            title: 'Rentabilidad del Cliente',
            desc: 'Optimización de consumo, máxima disponibilidad y ahorro en costos.'
        },
        {
            icon: 'heroicons_outline:user-group',
            title: 'Desarrollo de Colaboradores',
            desc: 'Crecimiento integral, capacitación técnica y bienestar continuo.'
        }
    ]
};

export const VISION_DATA: MisionVisionItem = {
    type: 'vision',
    title: 'VISIÓN',
    subtitle: 'HACIA DÓNDE VAMOS',
    badgeColor: '#0284c7',
    gradient: 'from-blue-600 via-sky-600 to-indigo-700',
    icon: 'heroicons_outline:check-badge',
    text: 'Ser una empresa líder en México en la comercialización de productos eléctricos y la prestación de servicios especializados en ahorro y calidad de energía, diseño, desarrollo, construcción y mantenimiento de proyectos eléctricos eficientes. Nos distinguimos por la aplicación de nuevas tecnologías, la innovación, la responsabilidad social y la solidez financiera, operando con altos estándares de calidad y compromiso en todos nuestros procesos organizacionales.',
    pillars: [
        {
            icon: 'heroicons_outline:trophy',
            title: 'Liderazgo en México',
            desc: 'Referente nacional de excelencia en suministros e ingeniería eléctrica.'
        },
        {
            icon: 'heroicons_outline:bolt',
            title: 'Ahorro y Calidad de Energía',
            desc: 'Monitoreo de armónicos, corrección de factor de potencia y confiabilidad.'
        },
        {
            icon: 'heroicons_outline:building-office-2',
            title: 'Ingeniería Integral & Mantenimiento',
            desc: 'Proyectos llave en mano con ciclo completo de mantenimiento preventivo.'
        },
        {
            icon: 'heroicons_outline:cpu-chip',
            title: 'Nuevas Tecnologías',
            desc: 'Digitalización industrial, automatización y modelado de avanzada.'
        },
        {
            icon: 'heroicons_outline:heart',
            title: 'Responsabilidad Social',
            desc: 'Compromiso genuino con las comunidades y el entorno ambiental.'
        },
        {
            icon: 'heroicons_outline:shield-check',
            title: 'Solidez & Procesos ISO',
            desc: 'Estabilidad financiera y estándares organizacionales de clase mundial.'
        }
    ]
};

// -----------------------------------------------------------------------------
// VALORES CORPORATIVOS (Exact 9 values and layout from Image 2)
// -----------------------------------------------------------------------------
export const VALORES_LIST: ValorItem[] = [
    {
        id: 1,
        title: 'SERVICIO',
        subtitle: 'Enfocado al cliente',
        description: 'Colocamos las necesidades y objetivos de nuestros clientes en el centro de cada decisión técnica y comercial, asegurando atención oportuna, empática y resolutiva.',
        color: '#0284c7',
        bgSoft: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/60',
        angleStart: 250,
        angleEnd: 290,
        midAngle: 270,
        icon: 'heroicons_outline:hand-thumb-up',
        quote: 'La satisfacción de nuestro cliente es la medida de nuestro éxito.',
        behaviors: [
            'Escucha activa y comprensión profunda del proyecto.',
            'Tiempos de respuesta ágiles y asesoría proactiva.',
            'Acompañamiento integral post-venta y soporte continuo.'
        ]
    },
    {
        id: 2,
        title: 'CONFIANZA',
        subtitle: 'Relaciones sólidas y transparentes',
        description: 'Construimos vínculos indestructibles con colaboradores, proveedores y clientes fundamentados en la certidumbre técnica, cumplimiento y honestidad.',
        color: '#16a34a',
        bgSoft: 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800/60',
        angleStart: 290,
        angleEnd: 330,
        midAngle: 310,
        icon: 'heroicons_outline:shield-check',
        quote: 'La confianza se gana con hechos y se mantiene con excelencia técnica.',
        behaviors: [
            'Transparencia total en cotizaciones, compras y ejecución.',
            'Cumplimiento puntual de compromisos y plazos.',
            'Respaldo técnico garantizado en cada instalación.'
        ]
    },
    {
        id: 3,
        title: 'TRABAJO EN EQUIPO',
        subtitle: 'Colaboramos, sumamos esfuerzos y talentos',
        description: 'Fomentamos la sinergia multidisciplinaria donde cada ingeniero, técnico y administrativo aporta su máximo potencial en un ambiente de apoyo mutuo.',
        color: '#475569',
        bgSoft: 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800',
        angleStart: 330,
        angleEnd: 370,
        midAngle: 350,
        icon: 'heroicons_outline:user-group',
        quote: 'Solos llegamos más rápido, pero juntos como equipo JR llegamos más lejos.',
        behaviors: [
            'Comunicación asertiva entre campo, oficina y almacén.',
            'Reconocimiento activo del mérito de cada integrante.',
            'Coordinación armónica para resolver desafíos complejos.'
        ]
    },
    {
        id: 4,
        title: 'AMOR',
        subtitle: 'Por el trabajo que hacemos',
        description: 'Pasión genuina y dedicación en cada plano trazado, cada empalme eléctrico y cada obra concluida. Amamos la energía y el impacto positivo que generamos.',
        color: '#ea580c',
        bgSoft: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/60',
        angleStart: 10,
        angleEnd: 50,
        midAngle: 30,
        icon: 'heroicons_outline:heart',
        quote: 'Hacer lo que amamos con pasión convierte nuestro trabajo en arte ingenieril.',
        behaviors: [
            'Atención al mínimo detalle en cada conexión y acabado.',
            'Orgullo de pertenencia a la gran familia JR Ingeniería.',
            'Entusiasmo constante frente a nuevos retos tecnológicos.'
        ]
    },
    {
        id: 5,
        title: 'INTEGRIDAD',
        subtitle: 'Respeto, lealtad, honestidad, probidad',
        description: 'Procedemos con apego inquebrantable a los principios éticos y profesionales, honrando nuestra palabra y defendiendo la rectitud en toda circunstancia.',
        color: '#b91c1c',
        bgSoft: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60',
        angleStart: 50,
        angleEnd: 90,
        midAngle: 70,
        icon: 'heroicons_outline:scale',
        quote: 'La integridad es hacer lo correcto incluso cuando nadie nos está mirando.',
        behaviors: [
            'Conducta honesta y justa con todos los grupos de interés.',
            'Lealtad incondicional a nuestros valores corporativos.',
            'Cero tolerancia a prácticas indebidas o atajos normativos.'
        ]
    },
    {
        id: 6,
        title: 'CALIDAD',
        subtitle: 'Buscamos la excelencia en cada proyecto',
        description: 'Búsqueda incansable de la perfección técnica y operativa, implementando controles de calidad ISO 9001 rigurosos para certificar cada entrega.',
        color: '#0d9488',
        bgSoft: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800/60',
        angleStart: 90,
        angleEnd: 130,
        midAngle: 110,
        icon: 'heroicons_outline:sparkles',
        quote: 'La calidad no es un accidente, es el resultado del esfuerzo inteligente.',
        behaviors: [
            'Inspección y pruebas rigurosas en tableros y líneas.',
            'Estandarización de procedimientos y auditorías internas.',
            'Mejora continua basada en datos e indicadores precisos.'
        ]
    },
    {
        id: 7,
        title: 'SOSTENIBILIDAD',
        subtitle: 'Compromiso con el entorno y el futuro',
        description: 'Diseñamos y ejecutamos obras optimizadas que reducen pérdidas de energía, promoviendo el cuidado ambiental y la transición ecológica inteligente.',
        color: '#f59e0b',
        bgSoft: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60',
        angleStart: 130,
        angleEnd: 170,
        midAngle: 150,
        icon: 'heroicons_outline:globe-alt',
        quote: 'Innovamos hoy para iluminar un mañana limpio, próspero y sostenible.',
        behaviors: [
            'Uso y recomendación de tecnologías de alta eficiencia energética.',
            'Manejo responsable de residuos industriales en obra.',
            'Fomento de energías limpias y sistemas de cogeneración.'
        ]
    },
    {
        id: 8,
        title: 'SEGURIDAD',
        subtitle: 'Cuidando de nuestro equipo y nuestras labores',
        description: 'La vida y la integridad física de cada compañero es sagrada. Aplicamos protocolos estrictos NOM-STPS para garantizar cero accidentes en cada frente.',
        color: '#7c3aed',
        bgSoft: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60',
        angleStart: 170,
        angleEnd: 210,
        midAngle: 190,
        icon: 'heroicons_outline:shield-exclamation',
        quote: 'En JR Ingeniería, todos regresamos sanos y seguros a casa.',
        behaviors: [
            'Uso obligatorio y verificación de equipo de protección (EPP).',
            'Bloqueo y etiquetado (LOTO) en cualquier intervención eléctrica.',
            'Capacitación continua en rescate, primeros auxilios y prevención.'
        ]
    },
    {
        id: 9,
        title: 'INNOVACIÓN',
        subtitle: 'Tecnología y soluciones vanguardistas',
        description: 'Desafiamos los paradigmas tradicionales mediante la adopción temprana de tecnología de vanguardia, software inteligente y metodologías ágiles.',
        color: '#0284c7',
        bgSoft: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60',
        angleStart: 210,
        angleEnd: 250,
        midAngle: 230,
        icon: 'heroicons_outline:light-bulb',
        quote: 'La innovación es la chispa que transforma retos en ventajas competitivas.',
        behaviors: [
            'Adopción de herramientas digitales y análisis en tiempo real.',
            'Creatividad técnica aplicada a solucionar problemas singulares.',
            'Capacitación constante en avances del sector eléctrico global.'
        ]
    }
];

// -----------------------------------------------------------------------------
// RADIAL / ORBITAL DEPARTAMENTOS FILTROS & ZOOM PRESETS (Image 3)
// -----------------------------------------------------------------------------
export const RADIAL_DEPARTAMENTOS: RadialDepartmentFilter[] = [
    {
        id: 'todos',
        name: 'Todo el Organigrama',
        color: '#0284c7',
        icon: 'heroicons_outline:globe-alt',
        focusX: 0,
        focusY: 0,
        focusZoom: 0.95,
        leader: 'Director General (Gobierno Integral)',
        description: 'Estructura orbital completa centrada en el Cliente, con 6 frentes operativos y Dirección General en la periferia.',
        teamCount: 36
    },
    {
        id: 'administracion',
        name: 'Administración',
        color: '#22c55e',
        icon: 'heroicons_outline:banknotes',
        focusX: 65,
        focusY: 670,
        focusZoom: 2.15,
        leader: 'Administrador General: CATALINA M',
        description: 'Gestión administrativa, compras, contabilidad, finanzas, despachos fiscal/legal y recursos humanos.',
        teamCount: 7
    },
    {
        id: 'ingenieria',
        name: 'Ingeniería',
        color: '#f97316',
        icon: 'heroicons_outline:wrench-screwdriver',
        focusX: 520,
        focusY: -280,
        focusZoom: 1.95,
        leader: 'Gerente de Ingeniería: JIMENA C',
        description: 'Proyectos, tableros eléctricos, supervisión de seguridad, técnicos especialistas y control de calidad.',
        teamCount: 15
    },
    {
        id: 'comercial',
        name: 'Desarrollo Comercial',
        color: '#64748b',
        icon: 'heroicons_outline:presentation-chart-line',
        focusX: 530,
        focusY: 340,
        focusZoom: 2.3,
        leader: 'Gerente de Desarrollo Comercial: FERMIN P',
        description: 'Estrategia comercial corporativa, prospección de clientes y coordinación de mercadotecnia.',
        teamCount: 2
    },
    {
        id: 'puebla',
        name: 'Sucursal Puebla',
        color: '#2563eb',
        icon: 'heroicons_outline:building-office',
        focusX: -550,
        focusY: 70,
        focusZoom: 2.2,
        leader: 'Gerente de Sucursal: JAIR C',
        description: 'Operación comercial, administración de sucursal, almacén y atención a la región Puebla.',
        teamCount: 5
    },
    {
        id: 'pachuca',
        name: 'Sucursal Pachuca',
        color: '#0ea5e9',
        icon: 'heroicons_outline:building-office-2',
        focusX: -490,
        focusY: -450,
        focusZoom: 2.15,
        leader: 'Gerente de Sucursal: DAMIAN Z',
        description: 'Atención a clientes mostrador, ventas foráneas, almacén y administración Sucursal Pachuca.',
        teamCount: 5
    },
    {
        id: 'queretaro',
        name: 'Sucursal Querétaro',
        color: '#6366f1',
        icon: 'heroicons_outline:building-storefront',
        focusX: 20,
        focusY: -690,
        focusZoom: 2.15,
        leader: 'Gerente de Sucursal: YAIR M',
        description: 'Mercado del Bajío industrial, asesoría en mostrador, almacén y ventas regionales.',
        teamCount: 5
    }
];

// Helper to calculate exact, non-colliding vertical positions for text lines
export function buildTextLines(
    cx: number,
    cy: number,
    r: number,
    linesRole: string[],
    linesPerson: string[],
    isDepartmentHub?: boolean,
    textColor?: string,
    nodeColor?: string
): RadialNodeTextLine[] {
    if (isDepartmentHub) {
        const n = linesPerson.length;
        if (n === 0) return [];
        const lineHeight = 13.5;
        const totalHeight = (n - 1) * lineHeight;
        const startY = cy - (totalHeight / 2) + 3.8;
        return linesPerson.map((line, idx) => ({
            text: line,
            isPerson: true,
            y: Number((startY + idx * lineHeight).toFixed(1)),
            fontSize: n === 1 ? '12px' : '11px',
            fontWeight: '900',
            fill: textColor || '#0f172a'
        }));
    }

    const allItems: { text: string; isPerson: boolean }[] = [];
    linesRole.forEach(r => allItems.push({ text: r, isPerson: false }));
    linesPerson.forEach(p => allItems.push({ text: p, isPerson: true }));

    const n = allItems.length;
    if (n === 0) return [];

    let lineHeight = 11.5;
    let roleFontSize = '7.5px';
    let personFontSize = '8.5px';

    if (r >= 44) {
        lineHeight = n <= 3 ? 13.2 : 11.5;
        roleFontSize = '8.5px';
        personFontSize = '10px';
    } else if (n >= 4) {
        lineHeight = 10.2;
        roleFontSize = '7px';
        personFontSize = '8px';
    } else if (n === 3) {
        lineHeight = 11.6;
        roleFontSize = '7.5px';
        personFontSize = '8.8px';
    } else {
        lineHeight = 12.8;
        roleFontSize = '8px';
        personFontSize = '9.5px';
    }

    const totalBlockHeight = (n - 1) * lineHeight;
    const startY = cy - (totalBlockHeight / 2) + 3.6;

    return allItems.map((item, idx) => ({
        text: item.text,
        isPerson: item.isPerson,
        y: Number((startY + idx * lineHeight).toFixed(1)),
        fontSize: item.isPerson ? personFontSize : roleFontSize,
        fontWeight: item.isPerson ? '900' : '700',
        fill: item.isPerson ? (nodeColor || '#16a34a') : '#334155'
    }));
}

// -----------------------------------------------------------------------------
// RADIAL NODES (Matching Image 3 Exactly with Generous Radii and Safe Spacing)
// -----------------------------------------------------------------------------
const RAW_RADIAL_NODES: RadialNode[] = [
    // -------------------------------------------------------------------------
    // CORE CENTER: CLIENTE
    // -------------------------------------------------------------------------
    {
        id: 'cliente',
        role: 'Centro Estratégico',
        person: 'Cliente',
        category: 'cliente',
        cx: 520,
        cy: 480,
        r: 62,
        color: '#0284c7',
        borderColor: '#38bdf8',
        fillColor: '#0f172a',
        textColor: '#ffffff',
        isCore: true,
        linesRole: [],
        linesPerson: ['Cliente']
    },

    // -------------------------------------------------------------------------
    // 1. ADMINISTRACIÓN (GREEN CLUSTER)
    // -------------------------------------------------------------------------
    {
        id: 'adm-hub',
        role: 'Dirección de Área',
        person: 'Administración',
        category: 'administracion',
        cx: 520,
        cy: 310,
        r: 48,
        color: '#22c55e',
        borderColor: '#16a34a',
        fillColor: '#dcfce7',
        textColor: '#14532d',
        isDepartmentHub: true,
        linesRole: [],
        linesPerson: ['Administración']
    },
    {
        id: 'adm-catalina',
        role: 'Administrador General',
        person: 'CATALINA M',
        category: 'administracion',
        cx: 520,
        cy: 175,
        r: 46,
        color: '#22c55e',
        borderColor: '#22c55e',
        fillColor: '#ffffff',
        textColor: '#15803d',
        parentId: 'adm-hub',
        linesRole: ['Administrador', 'General'],
        linesPerson: ['CATALINA M']
    },
    {
        id: 'adm-nadia',
        role: 'RH/reclutamiento',
        person: 'NADIA V',
        category: 'administracion',
        cx: 520,
        cy: 70,
        r: 32,
        color: '#22c55e',
        borderColor: '#86efac',
        fillColor: '#ffffff',
        textColor: '#15803d',
        parentId: 'adm-catalina',
        linesRole: ['RH/reclutamiento'],
        linesPerson: ['NADIA V']
    },
    {
        id: 'adm-yadira',
        role: 'Coordinador de RRHH',
        person: 'YADIRA R',
        category: 'administracion',
        cx: 625,
        cy: 110,
        r: 33,
        color: '#22c55e',
        borderColor: '#86efac',
        fillColor: '#ffffff',
        textColor: '#15803d',
        parentId: 'adm-catalina',
        linesRole: ['Coordinador de', 'RRHH'],
        linesPerson: ['YADIRA R']
    },
    {
        id: 'adm-ana',
        role: 'Coordinador de Contabilidad y Finanzas',
        person: 'ANA R',
        category: 'administracion',
        cx: 650,
        cy: 185,
        r: 36,
        color: '#22c55e',
        borderColor: '#86efac',
        fillColor: '#ffffff',
        textColor: '#15803d',
        parentId: 'adm-catalina',
        linesRole: ['Coordinador de', 'Contabilidad y', 'Finanzas'],
        linesPerson: ['ANA R']
    },
    {
        id: 'adm-compras-cat',
        role: 'Coordinador de Compras',
        person: 'CATALINA M',
        category: 'administracion',
        cx: 615,
        cy: 265,
        r: 32,
        color: '#22c55e',
        borderColor: '#86efac',
        fillColor: '#ffffff',
        textColor: '#15803d',
        parentId: 'adm-catalina',
        linesRole: ['Coordinador de', 'Compras'],
        linesPerson: ['CATALINA M']
    },
    {
        id: 'adm-silvia',
        role: 'Despacho Legal',
        person: 'SILVIA R',
        category: 'administracion',
        cx: 395,
        cy: 175,
        r: 31,
        color: '#22c55e',
        borderColor: '#86efac',
        fillColor: '#ffffff',
        textColor: '#15803d',
        parentId: 'adm-catalina',
        linesRole: ['Despacho', 'Legal'],
        linesPerson: ['SILVIA R']
    },
    {
        id: 'adm-juan',
        role: 'Despacho Fiscal',
        person: 'JUAN / GUILLE W',
        category: 'administracion',
        cx: 420,
        cy: 95,
        r: 32,
        color: '#22c55e',
        borderColor: '#86efac',
        fillColor: '#ffffff',
        textColor: '#15803d',
        parentId: 'adm-catalina',
        linesRole: ['Despacho', 'Fiscal'],
        linesPerson: ['JUAN', 'GUILLE W']
    },

    // -------------------------------------------------------------------------
    // 2. DESARROLLO COMERCIAL (GREY / SILVER CLUSTER)
    // -------------------------------------------------------------------------
    {
        id: 'com-hub',
        role: 'Dirección de Área',
        person: 'Desarrollo Comercial',
        category: 'comercial',
        cx: 370,
        cy: 400,
        r: 48,
        color: '#64748b',
        borderColor: '#475569',
        fillColor: '#f1f5f9',
        textColor: '#1e293b',
        isDepartmentHub: true,
        linesRole: [],
        linesPerson: ['Desarrollo', 'Comercial']
    },
    {
        id: 'com-fermin',
        role: 'Gerencia de Desarrollo Comercial',
        person: 'FERMIN P',
        category: 'comercial',
        cx: 315,
        cy: 275,
        r: 38,
        color: '#64748b',
        borderColor: '#94a3b8',
        fillColor: '#ffffff',
        textColor: '#334155',
        parentId: 'com-hub',
        linesRole: ['Gerencia de', 'Desarrollo', 'Comercial'],
        linesPerson: ['FERMIN P']
    },
    {
        id: 'com-evelyn',
        role: 'Coordinador de Marketing',
        person: 'EVELYN M',
        category: 'comercial',
        cx: 220,
        cy: 295,
        r: 32,
        color: '#64748b',
        borderColor: '#cbd5e1',
        fillColor: '#ffffff',
        textColor: '#334155',
        parentId: 'com-fermin',
        linesRole: ['Coordinador de', 'Marketing'],
        linesPerson: ['EVELYN M']
    },

    // -------------------------------------------------------------------------
    // 3. INGENIERÍA (ORANGE CLUSTER)
    // -------------------------------------------------------------------------
    {
        id: 'ing-hub',
        role: 'Dirección de Área',
        person: 'Ingeniería',
        category: 'ingenieria',
        cx: 370,
        cy: 580,
        r: 50,
        color: '#f97316',
        borderColor: '#ea580c',
        fillColor: '#ffedd5',
        textColor: '#9a3412',
        isDepartmentHub: true,
        linesRole: [],
        linesPerson: ['Ingeniería']
    },
    {
        id: 'ing-jimena',
        role: 'Gerencia de Ingeniería',
        person: 'JIMENA C',
        category: 'ingenieria',
        cx: 295,
        cy: 620,
        r: 40,
        color: '#f97316',
        borderColor: '#f97316',
        fillColor: '#ffffff',
        textColor: '#c2410c',
        parentId: 'ing-hub',
        linesRole: ['Gerencia de', 'Ingeniería'],
        linesPerson: ['JIMENA C']
    },
    {
        id: 'ing-sup-tableros',
        role: 'Supervisor de Tableros',
        person: 'LIBRADO O',
        category: 'ingenieria',
        cx: 230,
        cy: 490,
        r: 32,
        color: '#f97316',
        borderColor: '#fdba74',
        fillColor: '#ffffff',
        textColor: '#c2410c',
        parentId: 'ing-jimena',
        linesRole: ['Supervisor de', 'Tableros'],
        linesPerson: ['LIBRADO O']
    },
    {
        id: 'ing-cal-tableros',
        role: 'Inspector de Calidad de Tableros',
        person: 'LIBRADO O',
        category: 'ingenieria',
        cx: 300,
        cy: 445,
        r: 34,
        color: '#f97316',
        borderColor: '#fdba74',
        fillColor: '#ffffff',
        textColor: '#c2410c',
        parentId: 'ing-sup-tableros',
        linesRole: ['Inspector de', 'Calidad Tableros'],
        linesPerson: ['LIBRADO O']
    },
    {
        id: 'ing-tableristas',
        role: 'Tableristas',
        person: 'DIEGO B / OSVALDO R',
        category: 'ingenieria',
        cx: 185,
        cy: 425,
        r: 33,
        color: '#f97316',
        borderColor: '#fdba74',
        fillColor: '#ffffff',
        textColor: '#c2410c',
        parentId: 'ing-sup-tableros',
        linesRole: ['Tableristas'],
        linesPerson: ['DIEGO B', 'OSVALDO R']
    },
    {
        id: 'ing-integ-tableros',
        role: 'Ingeniero de Integración de Tableros',
        person: 'JIMENA C',
        category: 'ingenieria',
        cx: 295,
        cy: 535,
        r: 32,
        color: '#f97316',
        borderColor: '#fdba74',
        fillColor: '#ffffff',
        textColor: '#c2410c',
        parentId: 'ing-jimena',
        linesRole: ['Ingeniero de', 'Integración Tableros'],
        linesPerson: ['JIMENA C']
    },
    {
        id: 'ing-oficiales',
        role: 'Oficiales',
        person: 'ALI G',
        category: 'ingenieria',
        cx: 215,
        cy: 580,
        r: 29,
        color: '#f97316',
        borderColor: '#fdba74',
        fillColor: '#ffffff',
        textColor: '#c2410c',
        parentId: 'ing-jimena',
        linesRole: ['Oficiales'],
        linesPerson: ['ALI G']
    },
    {
        id: 'ing-tecnicos',
        role: 'Técnicos',
        person: 'JAVIER Y / ANDRES F / ANGEL T / ALAN M / ALBERTO R',
        category: 'ingenieria',
        cx: 125,
        cy: 580,
        r: 45,
        color: '#f97316',
        borderColor: '#fdba74',
        fillColor: '#ffffff',
        textColor: '#c2410c',
        parentId: 'ing-oficiales',
        linesRole: ['Técnicos'],
        linesPerson: ['JAVIER Y', 'ANDRES F', 'ANGEL T', 'ALAN M']
    },
    {
        id: 'ing-sup-seg-aaron',
        role: 'Supervisor de Seguridad',
        person: 'AARON M',
        category: 'ingenieria',
        cx: 210,
        cy: 665,
        r: 30,
        color: '#f97316',
        borderColor: '#fdba74',
        fillColor: '#ffffff',
        textColor: '#c2410c',
        parentId: 'ing-jimena',
        linesRole: ['Supervisor de', 'Seguridad'],
        linesPerson: ['AARON M']
    },
    {
        id: 'ing-sup-seg-librado',
        role: 'Supervisor de Seguridad',
        person: 'LIBRADO O',
        category: 'ingenieria',
        cx: 230,
        cy: 730,
        r: 30,
        color: '#f97316',
        borderColor: '#fdba74',
        fillColor: '#ffffff',
        textColor: '#c2410c',
        parentId: 'ing-jimena',
        linesRole: ['Supervisor de', 'Seguridad'],
        linesPerson: ['LIBRADO O']
    },
    {
        id: 'ing-coord-omar',
        role: 'Coordinador de Proyectos',
        person: 'OMAR M',
        category: 'ingenieria',
        cx: 300,
        cy: 705,
        r: 32,
        color: '#f97316',
        borderColor: '#fdba74',
        fillColor: '#ffffff',
        textColor: '#c2410c',
        parentId: 'ing-jimena',
        linesRole: ['Coordinador de', 'Proyectos'],
        linesPerson: ['OMAR M']
    },
    {
        id: 'ing-integ-proy',
        role: 'Ingeniero de Integración de Proyectos',
        person: 'JIMENA C / OMAR M / DIEGO B',
        category: 'ingenieria',
        cx: 385,
        cy: 700,
        r: 36,
        color: '#f97316',
        borderColor: '#fdba74',
        fillColor: '#ffffff',
        textColor: '#c2410c',
        parentId: 'ing-coord-omar',
        linesRole: ['Ing. Integración', 'de Proyectos'],
        linesPerson: ['JIMENA C', 'OMAR M']
    },
    {
        id: 'ing-monitoreo',
        role: 'Ingeniero de Monitoreo y Calidad',
        person: 'HERIBERTO L / DIEGO B / OSVALDO R',
        category: 'ingenieria',
        cx: 230,
        cy: 810,
        r: 36,
        color: '#f97316',
        borderColor: '#fdba74',
        fillColor: '#ffffff',
        textColor: '#c2410c',
        parentId: 'ing-sup-seg-librado',
        linesRole: ['Monitoreo y', 'Calidad'],
        linesPerson: ['HERIBERTO L', 'DIEGO B']
    },

    // -------------------------------------------------------------------------
    // 4. SUCURSAL PUEBLA (BLUE CLUSTER)
    // -------------------------------------------------------------------------
    {
        id: 'pue-hub',
        role: 'Sucursal Regional',
        person: 'Sucursal Puebla',
        category: 'puebla',
        cx: 690,
        cy: 440,
        r: 48,
        color: '#2563eb',
        borderColor: '#1d4ed8',
        fillColor: '#dbeafe',
        textColor: '#1e40af',
        isDepartmentHub: true,
        linesRole: [],
        linesPerson: ['Sucursal', 'Puebla']
    },
    {
        id: 'pue-jair',
        role: 'Gerente de Sucursal',
        person: 'JAIR C',
        category: 'puebla',
        cx: 780,
        cy: 520,
        r: 33,
        color: '#2563eb',
        borderColor: '#93c5fd',
        fillColor: '#ffffff',
        textColor: '#1d4ed8',
        parentId: 'pue-hub',
        linesRole: ['Gerente de', 'Sucursal'],
        linesPerson: ['JAIR C']
    },
    {
        id: 'pue-karem',
        role: 'Administrador de Sucursal',
        person: 'KAREM DILL',
        category: 'puebla',
        cx: 800,
        cy: 445,
        r: 34,
        color: '#2563eb',
        borderColor: '#93c5fd',
        fillColor: '#ffffff',
        textColor: '#1d4ed8',
        parentId: 'pue-hub',
        linesRole: ['Administrador', 'de Sucursal'],
        linesPerson: ['KAREM DILL']
    },
    {
        id: 'pue-adrian-vta',
        role: 'Asesor Comercial',
        person: 'ADRIAN Q',
        category: 'puebla',
        cx: 830,
        cy: 380,
        r: 30,
        color: '#2563eb',
        borderColor: '#93c5fd',
        fillColor: '#ffffff',
        textColor: '#1d4ed8',
        parentId: 'pue-karem',
        linesRole: ['Asesor', 'Comercial'],
        linesPerson: ['ADRIAN Q']
    },
    {
        id: 'pue-adrian-alm',
        role: 'Almacenista',
        person: 'ADRIAN Q',
        category: 'puebla',
        cx: 890,
        cy: 435,
        r: 30,
        color: '#2563eb',
        borderColor: '#93c5fd',
        fillColor: '#ffffff',
        textColor: '#1d4ed8',
        parentId: 'pue-karem',
        linesRole: ['Almacenista'],
        linesPerson: ['ADRIAN Q']
    },
    {
        id: 'pue-armando',
        role: 'Representante Regional de Ventas',
        person: 'ARMANDO P / MARCO D',
        category: 'puebla',
        cx: 850,
        cy: 585,
        r: 36,
        color: '#2563eb',
        borderColor: '#93c5fd',
        fillColor: '#ffffff',
        textColor: '#1d4ed8',
        parentId: 'pue-jair',
        linesRole: ['Rep. Regional', 'de Ventas'],
        linesPerson: ['ARMANDO P', 'MARCO D']
    },

    // -------------------------------------------------------------------------
    // 5. SUCURSAL PACHUCA (BLUE CLUSTER)
    // -------------------------------------------------------------------------
    {
        id: 'pac-hub',
        role: 'Sucursal Regional',
        person: 'Sucursal Pachuca',
        category: 'pachuca',
        cx: 665,
        cy: 615,
        r: 48,
        color: '#0ea5e9',
        borderColor: '#0284c7',
        fillColor: '#e0f2fe',
        textColor: '#0369a1',
        isDepartmentHub: true,
        linesRole: [],
        linesPerson: ['Sucursal', 'Pachuca']
    },
    {
        id: 'pac-viridiana-vta',
        role: 'Asesor comercial mostrador',
        person: 'VIRIDIANA R',
        category: 'pachuca',
        cx: 765,
        cy: 645,
        r: 34,
        color: '#0ea5e9',
        borderColor: '#7dd3fc',
        fillColor: '#ffffff',
        textColor: '#0369a1',
        parentId: 'pac-hub',
        linesRole: ['Asesor comercial', 'mostrador'],
        linesPerson: ['VIRIDIANA R']
    },
    {
        id: 'pac-ana',
        role: 'Administrador de Sucursal',
        person: 'ANA K',
        category: 'pachuca',
        cx: 730,
        cy: 725,
        r: 33,
        color: '#0ea5e9',
        borderColor: '#7dd3fc',
        fillColor: '#ffffff',
        textColor: '#0369a1',
        parentId: 'pac-hub',
        linesRole: ['Administrador', 'de Sucursal'],
        linesPerson: ['ANA K']
    },
    {
        id: 'pac-viridiana-alm',
        role: 'Almacenista',
        person: 'VIRIDIANA R',
        category: 'pachuca',
        cx: 805,
        cy: 725,
        r: 30,
        color: '#0ea5e9',
        borderColor: '#7dd3fc',
        fillColor: '#ffffff',
        textColor: '#0369a1',
        parentId: 'pac-ana',
        linesRole: ['Almacenista'],
        linesPerson: ['VIRIDIANA R']
    },
    {
        id: 'pac-damian',
        role: 'Gerente de Sucursal',
        person: 'DAMIAN Z',
        category: 'pachuca',
        cx: 690,
        cy: 760,
        r: 33,
        color: '#0ea5e9',
        borderColor: '#7dd3fc',
        fillColor: '#ffffff',
        textColor: '#0369a1',
        parentId: 'pac-hub',
        linesRole: ['Gerente de', 'Sucursal'],
        linesPerson: ['DAMIAN Z']
    },
    {
        id: 'pac-guillermo',
        role: 'Representante Regional de Ventas',
        person: 'GUILLERMO L',
        category: 'pachuca',
        cx: 740,
        cy: 830,
        r: 35,
        color: '#0ea5e9',
        borderColor: '#7dd3fc',
        fillColor: '#ffffff',
        textColor: '#0369a1',
        parentId: 'pac-damian',
        linesRole: ['Rep. Regional', 'de Ventas'],
        linesPerson: ['GUILLERMO L']
    },

    // -------------------------------------------------------------------------
    // 6. SUCURSAL QUERÉTARO (BLUE CLUSTER)
    // -------------------------------------------------------------------------
    {
        id: 'qro-hub',
        role: 'Sucursal Regional',
        person: 'Sucursal Querétaro',
        category: 'queretaro',
        cx: 545,
        cy: 675,
        r: 48,
        color: '#6366f1',
        borderColor: '#4f46e5',
        fillColor: '#e0e7ff',
        textColor: '#3730a3',
        isDepartmentHub: true,
        linesRole: [],
        linesPerson: ['Sucursal', 'Querétaro']
    },
    {
        id: 'qro-yair',
        role: 'Gerente de Sucursal',
        person: 'YAIR M',
        category: 'queretaro',
        cx: 480,
        cy: 790,
        r: 33,
        color: '#6366f1',
        borderColor: '#a5b4fc',
        fillColor: '#ffffff',
        textColor: '#4338ca',
        parentId: 'qro-hub',
        linesRole: ['Gerente de', 'Sucursal'],
        linesPerson: ['YAIR M']
    },
    {
        id: 'qro-angel',
        role: 'Representante Regional de Ventas',
        person: 'ANGEL S',
        category: 'queretaro',
        cx: 410,
        cy: 845,
        r: 34,
        color: '#6366f1',
        borderColor: '#a5b4fc',
        fillColor: '#ffffff',
        textColor: '#4338ca',
        parentId: 'qro-yair',
        linesRole: ['Rep. Regional', 'de Ventas'],
        linesPerson: ['ANGEL S']
    },
    {
        id: 'qro-monse',
        role: 'Administrador de Sucursal',
        person: 'MONSE D',
        category: 'queretaro',
        cx: 555,
        cy: 840,
        r: 34,
        color: '#6366f1',
        borderColor: '#a5b4fc',
        fillColor: '#ffffff',
        textColor: '#4338ca',
        parentId: 'qro-hub',
        linesRole: ['Administrador', 'de Sucursal'],
        linesPerson: ['MONSE D']
    },
    {
        id: 'qro-gustavo-vta',
        role: 'Asesor comercial mostrador',
        person: 'GUSTAVO M',
        category: 'queretaro',
        cx: 515,
        cy: 920,
        r: 30,
        color: '#6366f1',
        borderColor: '#a5b4fc',
        fillColor: '#ffffff',
        textColor: '#4338ca',
        parentId: 'qro-monse',
        linesRole: ['Asesor comercial', 'mostrador'],
        linesPerson: ['GUSTAVO M']
    },
    {
        id: 'qro-gustavo-alm',
        role: 'Almacenista',
        person: 'GUSTAVO M',
        category: 'queretaro',
        cx: 595,
        cy: 920,
        r: 30,
        color: '#6366f1',
        borderColor: '#a5b4fc',
        fillColor: '#ffffff',
        textColor: '#4338ca',
        parentId: 'qro-monse',
        linesRole: ['Almacenista'],
        linesPerson: ['GUSTAVO M']
    }
];

// Pre-compute formatted textLines with exact Y-coordinates to guarantee ZERO overlap
export const RADIAL_NODES: RadialNode[] = RAW_RADIAL_NODES.map(node => ({
    ...node,
    textLines: buildTextLines(
        node.cx,
        node.cy,
        node.r,
        node.linesRole,
        node.linesPerson,
        node.isDepartmentHub,
        node.textColor,
        node.color
    )
}));

// -----------------------------------------------------------------------------
// RADIAL CONNECTORS (Edges linking nodes - Centers are used, Circles cover line ends)
// -----------------------------------------------------------------------------
export const RADIAL_CONNECTORS: RadialConnector[] = [
    // Cliente to Department Hubs
    { fromId: 'cliente', toId: 'adm-hub', x1: 520, y1: 480, x2: 520, y2: 310, color: '#22c55e' },
    { fromId: 'cliente', toId: 'com-hub', x1: 520, y1: 480, x2: 370, y2: 400, color: '#64748b' },
    { fromId: 'cliente', toId: 'ing-hub', x1: 520, y1: 480, x2: 370, y2: 580, color: '#f97316' },
    { fromId: 'cliente', toId: 'pue-hub', x1: 520, y1: 480, x2: 690, y2: 440, color: '#2563eb' },
    { fromId: 'cliente', toId: 'pac-hub', x1: 520, y1: 480, x2: 665, y2: 615, color: '#0ea5e9' },
    { fromId: 'cliente', toId: 'qro-hub', x1: 520, y1: 480, x2: 545, y2: 675, color: '#6366f1' },

    // Administración Links
    { fromId: 'adm-hub', toId: 'adm-catalina', x1: 520, y1: 310, x2: 520, y2: 175, color: '#22c55e' },
    { fromId: 'adm-catalina', toId: 'adm-nadia', x1: 520, y1: 175, x2: 520, y2: 70, color: '#22c55e' },
    { fromId: 'adm-catalina', toId: 'adm-yadira', x1: 520, y1: 175, x2: 625, y2: 110, color: '#22c55e' },
    { fromId: 'adm-catalina', toId: 'adm-ana', x1: 520, y1: 175, x2: 650, y2: 185, color: '#22c55e' },
    { fromId: 'adm-catalina', toId: 'adm-compras-cat', x1: 520, y1: 175, x2: 615, y2: 265, color: '#22c55e' },
    { fromId: 'adm-catalina', toId: 'adm-silvia', x1: 520, y1: 175, x2: 395, y2: 175, color: '#22c55e' },
    { fromId: 'adm-catalina', toId: 'adm-juan', x1: 520, y1: 175, x2: 420, y2: 95, color: '#22c55e' },

    // Comercial Links
    { fromId: 'com-hub', toId: 'com-fermin', x1: 370, y1: 400, x2: 315, y2: 275, color: '#64748b' },
    { fromId: 'com-fermin', toId: 'com-evelyn', x1: 315, y1: 275, x2: 220, y2: 295, color: '#64748b' },

    // Ingeniería Links
    { fromId: 'ing-hub', toId: 'ing-jimena', x1: 370, y1: 580, x2: 295, y2: 620, color: '#f97316' },
    { fromId: 'ing-jimena', toId: 'ing-sup-tableros', x1: 295, y1: 620, x2: 230, y2: 490, color: '#f97316' },
    { fromId: 'ing-sup-tableros', toId: 'ing-cal-tableros', x1: 230, y1: 490, x2: 300, y2: 445, color: '#f97316' },
    { fromId: 'ing-sup-tableros', toId: 'ing-tableristas', x1: 230, y1: 490, x2: 185, y2: 425, color: '#f97316' },
    { fromId: 'ing-jimena', toId: 'ing-integ-tableros', x1: 295, y1: 620, x2: 295, y2: 535, color: '#f97316' },
    { fromId: 'ing-jimena', toId: 'ing-oficiales', x1: 295, y1: 620, x2: 215, y2: 580, color: '#f97316' },
    { fromId: 'ing-oficiales', toId: 'ing-tecnicos', x1: 215, y1: 580, x2: 125, y2: 580, color: '#f97316' },
    { fromId: 'ing-jimena', toId: 'ing-sup-seg-aaron', x1: 295, y1: 620, x2: 210, y2: 665, color: '#f97316' },
    { fromId: 'ing-jimena', toId: 'ing-sup-seg-librado', x1: 295, y1: 620, x2: 230, y2: 730, color: '#f97316' },
    { fromId: 'ing-jimena', toId: 'ing-coord-omar', x1: 295, y1: 620, x2: 300, y2: 705, color: '#f97316' },
    { fromId: 'ing-coord-omar', toId: 'ing-integ-proy', x1: 300, y1: 705, x2: 385, y2: 700, color: '#f97316' },
    { fromId: 'ing-sup-seg-librado', toId: 'ing-monitoreo', x1: 230, y1: 730, x2: 230, y2: 810, color: '#f97316' },

    // Puebla Links
    { fromId: 'pue-hub', toId: 'pue-jair', x1: 690, y1: 440, x2: 780, y2: 520, color: '#2563eb' },
    { fromId: 'pue-hub', toId: 'pue-karem', x1: 690, y1: 440, x2: 800, y2: 445, color: '#2563eb' },
    { fromId: 'pue-karem', toId: 'pue-adrian-vta', x1: 800, y1: 445, x2: 830, y2: 380, color: '#2563eb' },
    { fromId: 'pue-karem', toId: 'pue-adrian-alm', x1: 800, y1: 445, x2: 890, y2: 435, color: '#2563eb' },
    { fromId: 'pue-jair', toId: 'pue-armando', x1: 780, y1: 520, x2: 850, y2: 585, color: '#2563eb' },

    // Pachuca Links
    { fromId: 'pac-hub', toId: 'pac-viridiana-vta', x1: 665, y1: 615, x2: 765, y2: 645, color: '#0ea5e9' },
    { fromId: 'pac-hub', toId: 'pac-ana', x1: 665, y1: 615, x2: 730, y2: 725, color: '#0ea5e9' },
    { fromId: 'pac-ana', toId: 'pac-viridiana-alm', x1: 730, y1: 725, x2: 805, y2: 725, color: '#0ea5e9' },
    { fromId: 'pac-hub', toId: 'pac-damian', x1: 665, y1: 615, x2: 690, y2: 760, color: '#0ea5e9' },
    { fromId: 'pac-damian', toId: 'pac-guillermo', x1: 690, y1: 760, x2: 740, y2: 830, color: '#0ea5e9' },

    // Querétaro Links
    { fromId: 'qro-hub', toId: 'qro-yair', x1: 545, y1: 675, x2: 480, y2: 790, color: '#6366f1' },
    { fromId: 'qro-yair', toId: 'qro-angel', x1: 480, y1: 790, x2: 410, y2: 845, color: '#6366f1' },
    { fromId: 'qro-hub', toId: 'qro-monse', x1: 545, y1: 675, x2: 555, y2: 840, color: '#6366f1' },
    { fromId: 'qro-monse', toId: 'qro-gustavo-vta', x1: 555, y1: 840, x2: 515, y2: 920, color: '#6366f1' },
    { fromId: 'qro-monse', toId: 'qro-gustavo-alm', x1: 555, y1: 840, x2: 595, y2: 920, color: '#6366f1' }
];
