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
// RADIAL / ORBITAL ORGANIGRAMA INTERFACES
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
    category: 'cliente' | 'administracion' | 'comercial' | 'calidad' | 'ingenieria' | 'puebla' | 'pachuca' | 'queretaro' | 'direccion';
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
        // El nombre más largo del área debe caber dentro del círculo (mayúsculas en negritas ≈ 0.68 em por letra)
        const masLarga = Math.max(...linesPerson.map(l => l.length));
        const fontSize = Math.min(n === 1 ? 22 : 18, Math.max(9, (1.7 * r) / (0.68 * masLarga)));
        const lineHeight = fontSize * 1.15;
        const startY = cy - (((n - 1) * lineHeight) / 2) + fontSize * 0.36;
        return linesPerson.map((line, idx) => ({
            text: line,
            isPerson: true,
            y: Number((startY + idx * lineHeight).toFixed(1)),
            fontSize: `${fontSize.toFixed(1)}px`,
            fontWeight: '900',
            fill: textColor || '#0f172a'
        }));
    }

    const allItems: { text: string; isPerson: boolean }[] = [];
    linesRole.forEach(r => allItems.push({ text: r, isPerson: false }));
    linesPerson.forEach(p => allItems.push({ text: p, isPerson: true }));

    const n = allItems.length;
    if (n === 0) return [];

    // La línea más ancha de cada tipo debe caber en el círculo (el puesto ≈ 0.56 em por letra; la persona va en
    // mayúsculas y negritas, ≈ 0.72 em) y el bloque completo en su alto. Si no cabe, el texto se encoge hasta 5 px.
    const masLargaRol = Math.max(1, ...linesRole.map(l => l.length));
    const masLargaPersona = Math.max(1, ...linesPerson.map(l => l.length));
    let roleFont = Math.min(8.5, (1.9 * r) / (0.56 * masLargaRol));
    let personFont = Math.min(10, roleFont * 1.15, (1.9 * r) / (0.72 * masLargaPersona));
    const alto = n * Math.max(roleFont, personFont) * 1.38;
    const escala = Math.min(1, (1.7 * r) / alto);
    roleFont = Math.max(5, roleFont * escala);
    personFont = Math.max(5, personFont * escala);

    const lineHeight = Math.max(roleFont, personFont) * 1.38;
    const startY = cy - (((n - 1) * lineHeight) / 2) + Math.max(roleFont, personFont) * 0.36;

    return allItems.map((item, idx) => ({
        text: item.text,
        isPerson: item.isPerson,
        y: Number((startY + idx * lineHeight).toFixed(1)),
        fontSize: `${(item.isPerson ? personFont : roleFont).toFixed(1)}px`,
        fontWeight: item.isPerson ? '900' : '700',
        fill: item.isPerson ? (nodeColor || '#16a34a') : '#334155'
    }));
}

// -----------------------------------------------------------------------------
// ORBITAL: «DIAGRAMA ESTRUCTURAL – JR INGENIERÍA ELÉCTRICA»
// Las posiciones se midieron sobre la imagen del diagrama (coordenadas de imagen) y `aLienzo` las lleva al lienzo del
// orbital. Los conectores y los enfoques por área se calculan a partir de ellas, así que mover o agregar una burbuja
// no obliga a redibujar líneas ni a recalcular zooms a mano.
// -----------------------------------------------------------------------------

/** Lienzo del orbital (el HTML usa el mismo viewBox 1100×1000). (cx, cy) es el centro del anillo de Dirección General. */
export const ORBITAL_FRAME = { width: 1100, height: 1000, cx: 550, cy: 500, radioAnillo: 492 } as const;

/** Centro y escala de la imagen de origen: su círculo exterior mide ≈ 675 px de radio y aquí ≈ 500. */
const IMG_CX = 685;
const IMG_CY = 686;
const IMG_ESCALA = 0.74;

const redondear = (n: number): number => Number(n.toFixed(1));

const aLienzo = (x: number, y: number, r: number): { cx: number; cy: number; r: number } => ({
    cx: redondear(ORBITAL_FRAME.cx + (x - IMG_CX) * IMG_ESCALA),
    cy: redondear(ORBITAL_FRAME.cy + (y - IMG_CY) * IMG_ESCALA),
    r: Math.round(r * IMG_ESCALA)
});

type CategoriaArea = Exclude<RadialNode['category'], 'cliente' | 'direccion'>;

interface EstiloArea {
    color: string;
    borde: string;
    relleno: string;
    texto: string;
    bordeSatelite: string;
    textoSatelite: string;
}

const ESTILOS: Record<CategoriaArea, EstiloArea> = {
    administracion: { color: '#22c55e', borde: '#16a34a', relleno: '#dcfce7', texto: '#14532d', bordeSatelite: '#86efac', textoSatelite: '#15803d' },
    comercial: { color: '#64748b', borde: '#475569', relleno: '#f1f5f9', texto: '#1e293b', bordeSatelite: '#cbd5e1', textoSatelite: '#334155' },
    calidad: { color: '#ea580c', borde: '#c2410c', relleno: '#ffedd5', texto: '#9a3412', bordeSatelite: '#fb923c', textoSatelite: '#c2410c' },
    ingenieria: { color: '#f97316', borde: '#ea580c', relleno: '#ffedd5', texto: '#9a3412', bordeSatelite: '#fdba74', textoSatelite: '#c2410c' },
    puebla: { color: '#2563eb', borde: '#1d4ed8', relleno: '#dbeafe', texto: '#1e40af', bordeSatelite: '#93c5fd', textoSatelite: '#1d4ed8' },
    pachuca: { color: '#0ea5e9', borde: '#0284c7', relleno: '#e0f2fe', texto: '#0369a1', bordeSatelite: '#7dd3fc', textoSatelite: '#0369a1' },
    queretaro: { color: '#6366f1', borde: '#4f46e5', relleno: '#e0e7ff', texto: '#3730a3', bordeSatelite: '#a5b4fc', textoSatelite: '#4338ca' }
};

interface Puesto {
    id: string;
    parentId: string;
    /** Puesto con «|» donde el diagrama parte la línea. */
    rol: string;
    /** Nombres tal como se leen en la burbuja. */
    visible: string[];
    /** Forma «NOMBRE I» (nombre + inicial del apellido) con la que RRHH ubica al colaborador; varias personas se separan con « / ». */
    persona: string;
    x: number;
    y: number;
    r: number;
}

/** Burbuja de puesto. Sin `persona` explícita se usa lo que muestra la burbuja en mayúsculas. */
const puesto = (
    id: string, parentId: string, rol: string, x: number, y: number, r: number,
    visible: string[] = [], persona: string = visible.join(' / ').toUpperCase()
): Puesto => ({ id, parentId, rol, visible, persona, x, y, r });

interface Area {
    categoria: CategoriaArea;
    hub: { id: string; rol: string; lineas: string[]; x: number; y: number; r: number };
    puestos: Puesto[];
}

const AREAS: Area[] = [
    {
        categoria: 'administracion',
        hub: { id: 'adm-hub', rol: 'Dirección de Área', lineas: ['Administración'], x: 790, y: 460, r: 85 },
        puestos: [
            puesto('adm-gerente', 'adm-hub', 'Gerente de|Administración', 798, 281, 50, ['Catalina'], 'CATALINA M'),
            puesto('adm-afianzadora', 'adm-gerente', 'Afianzadora', 712, 157, 37),
            puesto('adm-rp', 'adm-gerente', 'Relaciones|públicas', 797, 145, 37, ['Catalina'], 'CATALINA M'),
            puesto('adm-logistica', 'adm-gerente', 'Responsable|de logística', 873, 168, 37, ['Rafael']),
            puesto('adm-rrhh', 'adm-gerente', 'Responsable de|RRHH', 935, 215, 38, ['Yadira'], 'YADIRA R'),
            puesto('adm-reina', 'adm-rrhh', 'Auxiliar|administrativo', 1027, 270, 38, ['Reina']),
            puesto('adm-contabilidad', 'adm-gerente', 'Responsable de|Contabilidad y|finanzas', 944, 294, 38, ['Ana'], 'ANA R'),
            puesto('adm-compras', 'adm-gerente', 'Responsable de|Compras', 912, 368, 38, ['Catalina', 'Ana'], 'CATALINA M / ANA R'),
            puesto('adm-fiscal', 'adm-gerente', 'Despacho|fiscal', 667, 224, 37),
            puesto('adm-legal', 'adm-gerente', 'Despacho|legal', 664, 306, 37)
        ]
    },
    {
        categoria: 'comercial',
        hub: { id: 'com-hub', rol: 'Dirección de Área', lineas: ['Desarrollo', 'Comercial'], x: 613, y: 485, r: 85 },
        puestos: [
            puesto('com-gerente', 'com-hub', 'Gerente de|Desarrollo|Comercial', 535, 325, 52, ['Fermin'], 'FERMIN P'),
            puesto('com-marketing', 'com-gerente', 'Responsable de|Marketing', 399, 342, 35, ['Evelyn'], 'EVELYN M'),
            puesto('com-aux-marketing', 'com-marketing', 'Auxiliar de|Marketing', 398, 258, 35, ['Johanna M'])
        ]
    },
    {
        categoria: 'calidad',
        hub: { id: 'cal-hub', rol: 'Dirección de Área', lineas: ['Calidad'], x: 513, y: 645, r: 88 },
        puestos: [
            puesto('cal-gerente', 'cal-hub', 'Gerente de|Calidad', 380, 562, 52),
            puesto('cal-seguridad', 'cal-gerente', 'Supervisor|de Seguridad', 330, 451, 36, ['Bryan']),
            puesto('cal-ingenieria', 'cal-gerente', 'Inspector de|Calidad de|Ingeniería', 434.5, 458.7, 36),
            puesto('cal-tableros', 'cal-gerente', 'Inspector de|Calidad de|Tableros', 255, 527, 36)
        ]
    },
    {
        categoria: 'ingenieria',
        hub: { id: 'ing-hub', rol: 'Dirección de Área', lineas: ['Ingeniería'], x: 591, y: 843, r: 87 },
        puestos: [
            puesto('ing-gerente', 'ing-hub', 'Gerente de|ingeniería', 420, 886.5, 53, ['Jimena'], 'JIMENA C'),
            puesto('ing-integ-tableros', 'ing-gerente', 'Coordinador de|integración de|Tableros', 379, 782.6, 41, ['Jimena'], 'JIMENA C'),
            puesto('ing-sup-logistica', 'ing-integ-tableros', 'Supervisor de|Logística', 348, 691, 37, ['Rafa']),
            puesto('ing-sup-tableros', 'ing-integ-tableros', 'Supervisor de|Tableros', 284, 769.6, 37),
            puesto('ing-tableristas', 'ing-sup-tableros', 'Tableristas', 241, 679, 37),
            puesto('ing-coord-proyectos', 'ing-gerente', 'Coordinador de|Proyectos', 356, 966, 37, ['Omar'], 'OMAR M'),
            puesto('ing-admin', 'ing-gerente', 'administrador de|ingeniería', 442, 983.5, 37),
            puesto('ing-proyectista', 'ing-coord-proyectos', 'proyectista', 273.5, 982.6, 35, ['Diego'], 'DIEGO B'),
            puesto('ing-pruebas', 'ing-coord-proyectos', 'Ingeniero de|Pruebas y|Estudios', 321, 1050, 40, ['Osvaldo'], 'OSVALDO R'),
            puesto('ing-sup-proyectos', 'ing-proyectista', 'Supervisor de|Proyectos', 213, 934, 36, ['Rosendo']),
            puesto('ing-sobrestante', 'ing-sup-proyectos', 'Sobrestante|eléctrico', 157.4, 870.4, 33, ['Rosendo']),
            puesto('ing-cabo', 'ing-sobrestante', 'Cabo|eléctrico', 130, 798, 33, ['Rosendo']),
            puesto('ing-tecnico', 'ing-cabo', 'Técnico|electricista', 96.5, 712.6, 33, ['Andrés', 'Angel'], 'ANDRES F / ANGEL T'),
            puesto('ing-oficial', 'ing-tecnico', 'Oficial|electricista', 85.5, 644, 32, ['Alí'], 'ALI G'),
            puesto('ing-ayudante', 'ing-oficial', 'Ayudante|electricista', 85.5, 575.7, 32, ['Luis Eduardo', 'Alan'], 'LUIS EDUARDO / ALAN M')
        ]
    },
    {
        categoria: 'puebla',
        hub: { id: 'pue-hub', rol: 'Sucursal Regional', lineas: ['Sucursal', 'Puebla'], x: 932, y: 582, r: 83 },
        puestos: [
            puesto('pue-gerente', 'pue-hub', 'Gerente de|Sucursal', 1066.8, 675, 53, ['Jaime']),
            puesto('pue-admin', 'pue-gerente', 'Administrador|de Sucursal', 1137.8, 598, 37, ['Karem'], 'KAREM DILL'),
            puesto('pue-asesor', 'pue-admin', 'Asesor comercial|de mostrador', 1158.9, 515, 37, ['Adrian', 'Gibran'], 'ADRIAN Q / GIBRAN'),
            puesto('pue-almacen', 'pue-admin', 'Responsable de|almacén e|inventarios', 1232, 614.8, 38, ['Valentin']),
            puesto('pue-rep', 'pue-gerente', 'Representante|Regional de|Ventas', 1158.9, 735.4, 37, ['Fermin', 'Marco'], 'FERMIN P / MARCO D')
        ]
    },
    {
        categoria: 'pachuca',
        hub: { id: 'pac-hub', rol: 'Sucursal Regional', lineas: ['Sucursal', 'Pachuca'], x: 935, y: 768, r: 78 },
        puestos: [
            puesto('pac-gerente', 'pac-hub', 'Gerente de|Sucursal', 966, 955.6, 53, ['Damian'], 'DAMIAN Z'),
            puesto('pac-admin', 'pac-gerente', 'Administrador|de Sucursal', 1062.9, 917.8, 37, ['Ana Laura'], 'ANA LAURA K'),
            puesto('pac-asesor', 'pac-admin', 'Asesor comercial|de mostrador', 1084.6, 835, 37, ['Viridiana'], 'VIRIDIANA R'),
            puesto('pac-almacen', 'pac-admin', 'Responsable de|almacén e|inventarios', 1153.5, 922, 37, ['Viridiana', 'Rafael'], 'VIRIDIANA R / RAFAEL'),
            puesto('pac-rep', 'pac-gerente', 'Representante|Regional de|Ventas', 1035, 1036.5, 37)
        ]
    },
    {
        categoria: 'queretaro',
        hub: { id: 'qro-hub', rol: 'Sucursal Regional', lineas: ['Sucursal', 'Querétaro'], x: 796, y: 888, r: 83 },
        puestos: [
            puesto('qro-gerente', 'qro-hub', 'Gerente de|Sucursal', 710, 1030, 53, ['Yair'], 'YAIR M'),
            puesto('qro-rep', 'qro-gerente', 'Representante|Regional de|Ventas', 634, 1105.8, 37, ['Angel'], 'ANGEL S'),
            puesto('qro-admin', 'qro-gerente', 'Administrador|de Sucursal', 805.7, 1085.2, 37, ['Monserrat'], 'MONSE D'),
            puesto('qro-asesor', 'qro-admin', 'Asesor comercial|de mostrador', 764.6, 1178.9, 37, ['Monserrat'], 'MONSE D'),
            puesto('qro-almacen', 'qro-admin', 'Responsable de|almacén e|inventarios', 877, 1171, 37, ['Monserrat'], 'MONSE D')
        ]
    }
];

/** Líneas del diagrama que unen a una burbuja con una segunda jefatura (además de su padre). */
const ENLACES_EXTRA: [string, string][] = [
    ['adm-reina', 'adm-contabilidad'],
    ['ing-admin', 'ing-coord-proyectos']
];

// -----------------------------------------------------------------------------
// RADIAL NODES
// -----------------------------------------------------------------------------
const RAW_RADIAL_NODES: RadialNode[] = [
    {
        id: 'cliente',
        role: 'Centro Estratégico',
        person: 'Cliente',
        category: 'cliente',
        ...aLienzo(745, 675, 90),
        color: '#0284c7',
        borderColor: '#38bdf8',
        fillColor: '#0f172a',
        textColor: '#ffffff',
        isCore: true,
        linesRole: [],
        linesPerson: ['Cliente']
    },
    ...AREAS.flatMap((area): RadialNode[] => {
        const e = ESTILOS[area.categoria];
        const hub: RadialNode = {
            id: area.hub.id,
            role: area.hub.rol,
            person: area.hub.lineas.join(' '),
            category: area.categoria,
            ...aLienzo(area.hub.x, area.hub.y, area.hub.r),
            color: e.color,
            borderColor: e.borde,
            fillColor: e.relleno,
            textColor: e.texto,
            isDepartmentHub: true,
            linesRole: [],
            linesPerson: area.hub.lineas
        };
        const satelites = area.puestos.map((p): RadialNode => ({
            id: p.id,
            role: p.rol.replace(/\|/g, ' '),
            person: p.persona,
            category: area.categoria,
            ...aLienzo(p.x, p.y, p.r),
            color: e.color,
            borderColor: e.bordeSatelite,
            fillColor: '#ffffff',
            textColor: e.textoSatelite,
            parentId: p.parentId,
            linesRole: p.rol.split('|'),
            linesPerson: p.visible
        }));
        return [hub, ...satelites];
    })
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
// RADIAL CONNECTORS: uno por relación padre → hijo (las líneas van de centro a centro; los círculos tapan los extremos)
// -----------------------------------------------------------------------------
const nodoPorId = new Map(RAW_RADIAL_NODES.map(n => [n.id, n]));

function conector(desdeId: string, hastaId: string): RadialConnector {
    const desde = nodoPorId.get(desdeId)!;
    const hasta = nodoPorId.get(hastaId)!;
    return { fromId: desdeId, toId: hastaId, x1: desde.cx, y1: desde.cy, x2: hasta.cx, y2: hasta.cy, color: hasta.color };
}

export const RADIAL_CONNECTORS: RadialConnector[] = [
    ...RAW_RADIAL_NODES.filter(n => n.parentId).map(n => conector(n.parentId!, n.id)),
    ...ENLACES_EXTRA.map(([desde, hasta]) => conector(desde, hasta))
];

// -----------------------------------------------------------------------------
// DIRECCIÓN GENERAL: etiquetas sobre el anillo exterior (ángulos medidos en el diagrama, en grados desde arriba, a la derecha)
// -----------------------------------------------------------------------------
export interface RadialDirectorLabel {
    x: number;
    y: number;
    /** El texto sigue la tangente del anillo; +y apunta siempre al centro, de modo que la persona queda debajo del cargo. */
    rotate: number;
}

export const DIRECCION_GENERAL = { cargo: 'Director General', persona: 'Jesus' } as const;

const ANGULOS_DIRECCION = [0, 72, 124, 178, 240, 300];
const RADIO_ETIQUETA = 456;

export const RADIAL_DIRECTOR_LABELS: RadialDirectorLabel[] = ANGULOS_DIRECCION.map(grados => {
    const rad = (grados * Math.PI) / 180;
    return {
        x: redondear(ORBITAL_FRAME.cx + RADIO_ETIQUETA * Math.sin(rad)),
        y: redondear(ORBITAL_FRAME.cy - RADIO_ETIQUETA * Math.cos(rad)),
        rotate: grados
    };
});

// -----------------------------------------------------------------------------
// RADIAL / ORBITAL DEPARTAMENTOS FILTROS & ZOOM PRESETS
// -----------------------------------------------------------------------------

/** Nombres distintos que aparecen en las burbujas de un área (o de todo el organigrama si no se indica). */
function colaboradoresVisibles(categoria?: CategoriaArea): number {
    const nombres = AREAS
        .filter(a => !categoria || a.categoria === categoria)
        .flatMap(a => a.puestos.flatMap(p => p.visible.map(v => v.trim().toLowerCase())));
    return new Set(nombres).size;
}

/** Zoom y desplazamiento que dejan a toda un área a la vista, centrada (mismo criterio que `selectRadialNode`). */
function enfoque(categoria: CategoriaArea): Pick<RadialDepartmentFilter, 'focusX' | 'focusY' | 'focusZoom'> {
    const nodos = RAW_RADIAL_NODES.filter(n => n.category === categoria);
    const x1 = Math.min(...nodos.map(n => n.cx - n.r));
    const x2 = Math.max(...nodos.map(n => n.cx + n.r));
    const y1 = Math.min(...nodos.map(n => n.cy - n.r));
    const y2 = Math.max(...nodos.map(n => n.cy + n.r));
    const zoom = Math.min(2.4, Math.max(1.1, 0.9 * Math.min(1000 / (x2 - x1), 680 / (y2 - y1))));
    return {
        focusX: Math.round((ORBITAL_FRAME.cx - (x1 + x2) / 2) * zoom),
        focusY: Math.round((ORBITAL_FRAME.cy - (y1 + y2) / 2) * zoom),
        focusZoom: Number(zoom.toFixed(2))
    };
}

interface DatosArea {
    id: CategoriaArea;
    name: string;
    icon: string;
    leader: string;
    description: string;
}

const DATOS_AREAS: DatosArea[] = [
    {
        id: 'administracion', name: 'Administración', icon: 'heroicons_outline:banknotes',
        leader: 'Gerente de Administración: Catalina',
        description: 'Administración, compras, contabilidad y finanzas, RRHH, logística, relaciones públicas, afianzadora y despachos fiscal y legal.'
    },
    {
        id: 'ingenieria', name: 'Ingeniería', icon: 'heroicons_outline:wrench-screwdriver',
        leader: 'Gerente de Ingeniería: Jimena',
        description: 'Proyectos, integración y supervisión de tableros, logística, pruebas y estudios, y cuadrilla de técnicos electricistas.'
    },
    {
        id: 'calidad', name: 'Calidad', icon: 'heroicons_outline:check-badge',
        leader: 'Gerente de Calidad',
        description: 'Inspección de calidad de tableros e ingeniería, y supervisión de seguridad.'
    },
    {
        id: 'comercial', name: 'Desarrollo Comercial', icon: 'heroicons_outline:presentation-chart-line',
        leader: 'Gerente de Desarrollo Comercial: Fermin',
        description: 'Estrategia comercial, mercadotecnia y desarrollo de clientes.'
    },
    {
        id: 'puebla', name: 'Sucursal Puebla', icon: 'heroicons_outline:building-office',
        leader: 'Gerente de Sucursal: Jaime',
        description: 'Operación comercial, administración de sucursal, almacén e inventarios y ventas regionales en Puebla.'
    },
    {
        id: 'pachuca', name: 'Sucursal Pachuca', icon: 'heroicons_outline:building-office-2',
        leader: 'Gerente de Sucursal: Damian',
        description: 'Atención a clientes de mostrador, almacén e inventarios, administración y ventas regionales en Pachuca.'
    },
    {
        id: 'queretaro', name: 'Sucursal Querétaro', icon: 'heroicons_outline:building-storefront',
        leader: 'Gerente de Sucursal: Yair',
        description: 'Mercado del Bajío industrial: asesoría en mostrador, almacén e inventarios y ventas regionales.'
    }
];

export const RADIAL_DEPARTAMENTOS: RadialDepartmentFilter[] = [
    {
        id: 'todos',
        name: 'Todo el Organigrama',
        color: '#0284c7',
        icon: 'heroicons_outline:globe-alt',
        focusX: 0,
        focusY: 0,
        focusZoom: 0.95,
        leader: `${DIRECCION_GENERAL.cargo}: ${DIRECCION_GENERAL.persona}`,
        description: `Estructura orbital completa centrada en el Cliente, con ${DATOS_AREAS.length} frentes operativos y la Dirección General en la periferia.`,
        teamCount: colaboradoresVisibles()
    },
    ...DATOS_AREAS.map((a): RadialDepartmentFilter => ({
        ...a,
        color: ESTILOS[a.id].color,
        ...enfoque(a.id),
        teamCount: colaboradoresVisibles(a.id)
    }))
];
