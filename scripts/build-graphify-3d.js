const fs = require('fs');
const path = require('path');

console.log('🔄 Extrayendo grafos de Graphify (Frontend y Backend)...');

const fePath = path.resolve(__dirname, '../../jringenieria/graphify-out/graph.html');
const bePath = path.resolve(__dirname, '../../jr_api/graphify-out/graph.html');

function parseGraphHtml(filePath, scope) {
    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Archivo no encontrado: ${filePath}`);
        return { nodes: [], edges: [], legend: [] };
    }
    const html = fs.readFileSync(filePath, 'utf8');
    const lines = html.split('\n');

    const nodeLine = lines.find(l => l.startsWith('const RAW_NODES'));
    const edgeLine = lines.find(l => l.startsWith('const RAW_EDGES'));
    const legendLine = lines.find(l => l.startsWith('const LEGEND'));

    if (!nodeLine || !edgeLine || !legendLine) {
        console.warn(`⚠️ No se encontraron las variables RAW en ${filePath}`);
        return { nodes: [], edges: [], legend: [] };
    }

    const rawNodes = JSON.parse(nodeLine.trim().replace(/^const RAW_NODES = /, '').replace(/;$/, ''));
    const rawEdges = JSON.parse(edgeLine.trim().replace(/^const RAW_EDGES = /, '').replace(/;$/, ''));
    const legend = JSON.parse(legendLine.trim().replace(/^const LEGEND = /, '').replace(/;$/, ''));

    return { rawNodes, rawEdges, legend };
}

const fe = parseGraphHtml(fePath, 'frontend');
const be = parseGraphHtml(bePath, 'backend');

console.log(`✅ Frontend: ${fe.rawNodes.length} nodos, ${fe.rawEdges.length} aristas, ${fe.legend.length} comunidades.`);
console.log(`✅ Backend: ${be.rawNodes.length} nodos, ${be.rawEdges.length} aristas, ${be.legend.length} comunidades.`);

// ─────────────────────────────────────────────────────────────
// CÁLCULO DE POSICIONES 3D: ESFERA 100% ISOTRÓPICA Y CIRCULAR
// Núcleo API: r = 18 a 98 (centro denso esférico 360°)
// Frontend: r = 85 a 235 (envolvente esférica continua 360°)
// Forma: 100% Circular y Esférica perfecta desde cualquier ángulo de visión
// ─────────────────────────────────────────────────────────────

function extractCleanModuleName(n) {
    if (n.community_name && n.community_name !== 'General' && !n.community_name.startsWith('.')) {
        return n.community_name;
    }
    const parts = (n.id || '').split('_');
    const compPart = parts.find(p => /component|service|module|controller/i.test(p));
    if (compPart) {
        return compPart.charAt(0).toUpperCase() + compPart.slice(1);
    }
    return n.label || 'Módulo';
}

function layoutSphere3D(feNodes, beNodes, feLegend, beLegend) {
    function processScope(nodes, legend, isCore) {
        const commSizes = new Map();
        nodes.forEach(n => commSizes.set(n.community, (commSizes.get(n.community) || 0) + 1));

        // Encontrar líderes de comunidad (nodo con mayor degree)
        const commLeaders = new Map();
        nodes.forEach(n => {
            const cur = commLeaders.get(n.community);
            if (!cur || (n.degree || 0) > (cur.degree || 0)) {
                commLeaders.set(n.community, n.id);
            }
        });

        // Distribución uniforme e isotrópica 3D usando secuencia de Weyl (Áurea + Pitagórica)
        // Esto elimina cualquier asimetría o deformación de polos, garantizando un círculo perfecto
        const commDirs = new Map();
        legend.forEach((c, i) => {
            const u = ((i + 1) * 0.618033988749895) % 1;
            const v = ((i + 1) * 0.414213562373095) % 1;
            const y = 1 - 2 * u;
            const theta = 2 * Math.PI * v;
            const ring = Math.sqrt(Math.max(0, 1 - y * y));
            commDirs.set(c.cid, [
                ring * Math.cos(theta),
                y,
                ring * Math.sin(theta)
            ]);
        });

        const R_MIN = isCore ? 18 : 85;
        const R_MAX = isCore ? 98 : 235;

        return nodes.map(n => {
            const cDir = commDirs.get(n.community) || [0, 1, 0];
            const size = commSizes.get(n.community) || 1;
            // Cobertura angular suave proporcional al tamaño de la comunidad
            const maxAngle = Math.min(0.35, 0.08 + Math.sqrt(size) * 0.03);

            // Base ortonormal en el plano tangente de cDir
            const [cx, cy, cz] = cDir;
            const up = Math.abs(cy) < 0.9 ? [0, 1, 0] : [1, 0, 0];
            let ux = cy * up[2] - cz * up[1];
            let uy = cz * up[0] - cx * up[2];
            let uz = cx * up[1] - cy * up[0];
            const ulen = Math.hypot(ux, uy, uz) || 1;
            ux /= ulen; uy /= ulen; uz /= ulen;

            const vx = cy * uz - cz * uy;
            const vy = cz * ux - cx * uz;
            const vz = cx * uy - cy * ux;

            const rho = Math.random() * maxAngle;
            const psi = Math.random() * 2 * Math.PI;

            const cosRho = Math.cos(rho);
            const sinRho = Math.sin(rho);

            const tx = Math.cos(psi) * ux + Math.sin(psi) * vx;
            const ty = Math.cos(psi) * uy + Math.sin(psi) * vy;
            const tz = Math.cos(psi) * uz + Math.sin(psi) * vz;

            const nx = cosRho * cx + sinRho * tx;
            const ny = cosRho * cy + sinRho * ty;
            const nz = cosRho * cz + sinRho * tz;
            const nlen = Math.hypot(nx, ny, nz) || 1;

            const u = Math.random();
            const r = isCore
                ? R_MIN + Math.sqrt(u) * (R_MAX - R_MIN)
                : R_MIN + Math.pow(u, 0.65) * (R_MAX - R_MIN);

            // Coordenadas isotrópicas esféricas puras (círculo 100% simétrico desde cualquier ángulo)
            const x = Math.round((nx / nlen) * r * 10) / 10;
            const y = Math.round((ny / nlen) * r * 10) / 10;
            const z = Math.round((nz / nlen) * r * 10) / 10;

            const moduleName = extractCleanModuleName(n);
            const isGenericLabel = /^(component|injectable|input|output|hostlistener|inject|viewchild|contentchild)$/i.test(n.label || '');
            const cleanLabel = isGenericLabel ? moduleName : (n.label || moduleName);
            const isLeader = commLeaders.get(n.community) === n.id;

            return {
                id: n.id,
                label: cleanLabel,
                moduleName,
                isLeader,
                color: n.color?.background || (isCore ? '#F28E2B' : '#4E79A7'),
                borderColor: n.color?.border || '#4E79A7',
                size: n.size || 10,
                community: n.community,
                communityName: moduleName,
                sourceFile: n.source_file || '',
                fileType: n.file_type || 'code',
                degree: n.degree || 0,
                scope: isCore ? 'backend' : 'frontend',
                x,
                y,
                z
            };
        });
    }

    return {
        feNodes3D: processScope(feNodes, feLegend, false),
        beNodes3D: processScope(beNodes, beLegend, true)
    };
}

const { feNodes3D, beNodes3D } = layoutSphere3D(fe.rawNodes, be.rawNodes, fe.legend, be.legend);

// ─────────────────────────────────────────────────────────────
// DETECCIÓN DE PUENTES SINÁPTICOS (FRONTEND -> BACKEND CONTROLLERS)
// ─────────────────────────────────────────────────────────────

const beControllers = beNodes3D.filter(n => /controller|hub/i.test(n.label));
console.log(`🔍 Controladores y Hubs detectados en Backend: ${beControllers.length}`);

const bridgeEdges = [];
const connectedPairs = new Set();

feNodes3D.forEach(fn => {
    const fnName = (fn.label || '').toLowerCase();
    const fnComm = (fn.communityName || '').toLowerCase();

    beControllers.forEach(c => {
        const cBase = c.label.toLowerCase().replace(/controller|hub/i, '');
        if (cBase.length >= 4) {
            if (fnName.includes(cBase) || fnComm.includes(cBase)) {
                const pairKey = `${fn.id}->${c.id}`;
                if (!connectedPairs.has(pairKey)) {
                    connectedPairs.add(pairKey);
                    bridgeEdges.push({
                        from: fn.id,
                        to: c.id,
                        isBridge: true,
                        label: `${fn.label} ➔ ${c.label}`,
                        width: 1.5
                    });
                }
            }
        }
    });
});

console.log(`🧠 Conexiones sinápticas Corteza ➔ Núcleo detectadas: ${bridgeEdges.length}`);

// Preparar enlaces internos
const feEdges = fe.rawEdges.map(e => ({ from: e.from, to: e.to, width: e.width || 1, scope: 'frontend' }));
const beEdges = be.rawEdges.map(e => ({ from: e.from, to: e.to, width: e.width || 1, scope: 'backend' }));

// Combinar comunidades para el Legend
const combinedLegend = [
    ...fe.legend.map(c => ({ ...c, scope: 'frontend', label: `[Corteza Front] ${c.label}` })),
    ...be.legend.map(c => ({ ...c, scope: 'backend', label: `[Núcleo API] ${c.label}` }))
];

const combinedData = {
    generatedAt: new Date().toISOString(),
    stats: {
        feNodesCount: feNodes3D.length,
        beNodesCount: beNodes3D.length,
        totalNodes: feNodes3D.length + beNodes3D.length,
        feEdgesCount: feEdges.length,
        beEdgesCount: beEdges.length,
        bridgeEdgesCount: bridgeEdges.length,
        totalEdges: feEdges.length + beEdges.length + bridgeEdges.length,
        communitiesCount: combinedLegend.length
    },
    nodes: [...feNodes3D, ...beNodes3D],
    edges: [...feEdges, ...beEdges, ...bridgeEdges],
    legend: combinedLegend,
    bridges: bridgeEdges.slice(0, 50)
};

const outDir = path.resolve(__dirname, '../src/assets');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}
const outPath = path.resolve(outDir, 'graphify-3d.json');
fs.writeFileSync(outPath, JSON.stringify(combinedData));

const outSizeMB = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
console.log(`🚀 Cerebro 3D generado con éxito en: ${outPath} (${outSizeMB} MB)`);

