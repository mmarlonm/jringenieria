import {
    Component,
    OnInit,
    OnDestroy,
    AfterViewInit,
    ViewChild,
    ElementRef,
    ChangeDetectorRef,
    HostListener,
    inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { Subscription } from 'rxjs';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ActivitySignalRService, ActivityLog } from '../../../../core/signalr/activity-signalr.service';
import { SignalRService } from '../../../../core/signalr/signalr.service';

export interface Graph3DNode {
    id: string;
    label: string;
    moduleName?: string;
    isLeader?: boolean;
    color: string;
    borderColor: string;
    size: number;
    community: number;
    communityName: string;
    sourceFile: string;
    fileType: string;
    degree: number;
    scope: 'frontend' | 'backend';
    x: number;
    y: number;
    z: number;
    visible?: boolean;
}

export interface Graph3DEdge {
    from: string;
    to: string;
    width?: number;
    scope?: 'frontend' | 'backend';
    isBridge?: boolean;
    label?: string;
}

export interface Graph3DCommunity {
    cid: number;
    color: string;
    label: string;
    count: number;
    scope: 'frontend' | 'backend';
    visible: boolean;
}

export interface Pulse3D {
    id: string;
    startPos: THREE.Vector3;
    midPos: THREE.Vector3;
    endPos: THREE.Vector3;
    progress: number;
    speed: number;
    color: THREE.Color;
    sparkSprite: THREE.Sprite;
    trailLine: THREE.Line;
    direction: 'forward' | 'backward';
    targetNode?: Graph3DNode;
}

export interface SynapticBurst {
    sprite: THREE.Sprite;
    progress: number;
    maxScale: number;
}

@Component({
    selector: 'app-system-neural-graph',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        MatMenuModule
    ],
    templateUrl: './neural-graph.component.html',
    styleUrls: ['./neural-graph.component.scss']
})
export class SystemNeuralGraphComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('canvas3dContainer', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

    private _http = inject(HttpClient);
    private _activitySignalR = inject(ActivitySignalRService);
    private _signalRService = inject(SignalRService);
    private _cdr = inject(ChangeDetectorRef);

    // Telemetría en tiempo real (SignalR)
    public isSignalRConnected: boolean = false;
    public lastActiveUser: string = '';
    public lastActiveModule: string = '';
    public lastActiveTime: string = '';
    public showActivityBanner: boolean = false;
    private bannerTimeout: any = null;
    private processedEvents = new Set<string>();

    // Estado del Grafo 3D
    public nodes: Graph3DNode[] = [];
    public edges: Graph3DEdge[] = [];
    public communities: Graph3DCommunity[] = [];
    public nodeMap: Map<string, Graph3DNode> = new Map();
    public neighborMap: Map<string, string[]> = new Map();

    // Filtros y Selección
    public selectedNode: Graph3DNode | null = null;
    public hoveredNode: Graph3DNode | null = null;
    public searchQuery: string = '';
    public searchResults: Graph3DNode[] = [];
    public activeScope: 'all' | 'frontend' | 'backend' = 'all';
    public selectAllCommunities: boolean = true;
    public isIndeterminateCommunities: boolean = false;
    public showModuleLabels: boolean = true;

    // Métricas
    public isLoading: boolean = true;
    public loadingProgress: string = 'Cargando constelaciones 3D de Graphify...';
    public stats = {
        feNodes: 0,
        beNodes: 0,
        totalNodes: 0,
        totalEdges: 0,
        bridgesCount: 0,
        communitiesCount: 0
    };

    public isAutoDemo: boolean = false;
    private demoTimer: any = null;
    public recentSynapsesCount: number = 0;

    // Three.js Core
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private controls!: OrbitControls;
    private raycaster = new THREE.Raycaster();
    private mouse = new THREE.Vector2(-1000, -1000);
    private mouseMoved: boolean = false;
    private frameCount: number = 0;
    private animFrameId: number = 0;
    private isRunning: boolean = true;
    private resizeObserver?: ResizeObserver;

    // Meshes Three.js
    private instancedNodes!: THREE.InstancedMesh;
    private nodeDummy = new THREE.Object3D();
    private linesMesh!: THREE.LineSegments;
    private bridgeLinesMesh?: THREE.LineSegments;
    private selectedConnectionsMesh?: THREE.LineSegments;
    private labelsGroup = new THREE.Group();
    private layerRingsGroup = new THREE.Group();
    private nodeIndexMap: Map<string, number> = new Map();
    private indexToNodeMap: Map<number, Graph3DNode> = new Map();

    // Pulsos e impulsos de luz 3D
    private activePulses: Pulse3D[] = [];
    private activeBursts: SynapticBurst[] = [];
    private glowTextureCyan!: THREE.Texture;
    private glowTextureGreen!: THREE.Texture;

    private subscriptions: Subscription = new Subscription();

    ngOnInit(): void {
        this.initSignalRListener();
    }

    ngAfterViewInit(): void {
        this.initThreeScene();
        // Carga asíncrona desacoplada del ciclo de detección para evitar NG0100
        setTimeout(() => {
            this.loadGraphData();
        }, 0);
    }

    ngOnDestroy(): void {
        this.isRunning = false;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
        }
        if (this.demoTimer) {
            clearInterval(this.demoTimer);
        }
        this.subscriptions.unsubscribe();
        this.disposeThree();
    }

    // ─────────────────────────────────────────────────────────────
    // INICIALIZACIÓN THREE.JS
    // ─────────────────────────────────────────────────────────────
    private initThreeScene(): void {
        const container = this.containerRef.nativeElement;
        const width = container.clientWidth || window.innerWidth - 320;
        const height = container.clientHeight || window.innerHeight;

        // 1. Escena con niebla espacial sutil
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#0a0a14');
        this.scene.fog = new THREE.FogExp2('#0a0a14', 0.00032);

        // 2. Cámara de Perspectiva centrada en el sistema de dos esferas concéntricas
        this.camera = new THREE.PerspectiveCamera(52, width / height, 1, 10000);
        this.camera.position.set(0, 30, 620);

        // 3. Renderer WebGL optimizado (alta fluidez 60 FPS)
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        container.appendChild(this.renderer.domElement);

        // 4. Controles Orbitales 3D
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.06;
        this.controls.rotateSpeed = 0.6;
        this.controls.zoomSpeed = 1.0;
        this.controls.panSpeed = 0.8;
        this.controls.minDistance = 50;
        this.controls.maxDistance = 3500;
        this.controls.target.set(0, 0, 0);

        // 5. Iluminación volumétrica para el núcleo interior y la corteza exterior
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
        this.scene.add(ambientLight);

        // Luz radiante del núcleo interior (Esfera API)
        const coreLight = new THREE.PointLight(0x38bdf8, 3.5, 650);
        coreLight.position.set(0, 0, 0);
        this.scene.add(coreLight);

        // Luces para acentuar la capa esférica exterior (Frontend)
        const leftLight = new THREE.PointLight(0x00f0ff, 2.2, 800);
        leftLight.position.set(-260, 160, 200);
        this.scene.add(leftLight);

        const rightLight = new THREE.PointLight(0x818cf8, 2.2, 800);
        rightLight.position.set(260, -160, 200);
        this.scene.add(rightLight);

        // 6. Texturas de resplandor para impulsos de luz pura
        this.glowTextureCyan = this.createGlowTexture('#00F0FF', '#0284c7');
        this.glowTextureGreen = this.createGlowTexture('#00FF88', '#059669');

        // Grupos 3D
        this.scene.add(this.layerRingsGroup);
        this.scene.add(this.labelsGroup);

        // Configurar observador de redimensionamiento automático
        this.setupResizeObserver();

        // Iniciar loop de render
        this.startLoop();
    }

    @HostListener('window:resize')
    onWindowResize(): void {
        if (!this.containerRef?.nativeElement) return;
        const rect = this.containerRef.nativeElement.getBoundingClientRect();
        this.handleResize(rect.width, rect.height);
    }

    private setupResizeObserver(): void {
        const container = this.containerRef?.nativeElement;
        if (!container || typeof ResizeObserver === 'undefined') return;

        this.resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                this.handleResize(width, height);
            }
        });
        this.resizeObserver.observe(container);
    }

    private handleResize(width: number, height: number): void {
        if (!this.renderer || !this.camera || width <= 0 || height <= 0) return;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height, true);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    }

    private createGlowTexture(coreColor: string, haloColor: string): THREE.Texture {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d')!;

        const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        grad.addColorStop(0.0, '#FFFFFF'); // Núcleo incandescente
        grad.addColorStop(0.25, coreColor);
        grad.addColorStop(0.6, haloColor);
        grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 128, 128);

        const texture = new THREE.CanvasTexture(canvas);
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
        return texture;
    }

    private loadGraphData(): void {
        this.loadingProgress = 'Cargando cerebro 3D (Frontend y API en núcleo)...';
        this._cdr.detectChanges();

        const base = (typeof document !== 'undefined' && document.baseURI) ? document.baseURI.replace(/\/$/, '') : '';
        const candidateUrls = [
            'assets/graphify-3d.json',
            base ? `${base}/assets/graphify-3d.json` : '',
            '/jringenieria/assets/graphify-3d.json',
            '/assets/graphify-3d.json',
            './assets/graphify-3d.json'
        ].filter(u => !!u);

        const uniqueUrls = Array.from(new Set(candidateUrls));

        const tryFetch = (index: number) => {
            if (index >= uniqueUrls.length) {
                console.error('No se pudo cargar graphify-3d.json desde ninguna de las rutas intentadas:', uniqueUrls);
                this.loadingProgress = 'Error al cargar datos del cerebro 3D. Verifica que graphify-3d.json exista en assets.';
                this.isLoading = false;
                this._cdr.detectChanges();
                return;
            }

            const url = uniqueUrls[index];
            this._http.get<any>(url).subscribe({
                next: (data) => {
                    this.processLoadedData(data);
                },
                error: (err) => {
                    console.warn(`Ruta ${url} no disponible (${err.status || 'error'}), probando siguiente alternativa...`);
                    tryFetch(index + 1);
                }
            });
        };

        tryFetch(0);
    }

    private processLoadedData(data: any): void {
        this.loadingProgress = 'Construyendo esferas concéntricas (API interior y Frontend envolvente)...';

        // Estructura de dos esferas concéntricas:
        // 1. Esfera Interior (Backend API): R = 74 a 90 (Núcleo central compacto)
        // 2. Esfera Exterior (Frontend envolvente como segunda capa): R = 248 a 272
        // Separación radial limpia de ~158 unidades para que nunca se mezclen
        this.nodes = (data.nodes || []).map((n: Graph3DNode) => {
            const copy = { ...n, visible: true };
            let vx = copy.x || 0;
            let vy = copy.y || 0;
            let vz = copy.z || 0;
            let len = Math.sqrt(vx * vx + vy * vy + vz * vz);
            if (len < 0.001) {
                vx = Math.random() - 0.5;
                vy = Math.random() - 0.5;
                vz = Math.random() - 0.5;
                len = Math.sqrt(vx * vx + vy * vy + vz * vz);
            }
            const dx = vx / len;
            const dy = vy / len;
            const dz = vz / len;

            if (copy.scope === 'frontend') {
                const r_fe = 248 + ((copy.community || 0) % 7) * 3 + (Math.abs(copy.degree || 1) % 4) * 2;
                copy.x = dx * r_fe;
                copy.y = dy * r_fe;
                copy.z = dz * r_fe;
            } else {
                const r_be = 74 + ((copy.community || 0) % 5) * 3 + (Math.abs(copy.degree || 1) % 4) * 1.5;
                copy.x = dx * r_be;
                copy.y = dy * r_be;
                copy.z = dz * r_be;
            }
            return copy;
        });

        this.edges = data.edges || [];
        this.communities = (data.legend || []).map((c: Graph3DCommunity) => ({ ...c, visible: true }));

        // Mapas rápidos
        this.nodeMap = new Map(this.nodes.map(n => [n.id, n]));
        this.neighborMap = new Map();

        // Inicializar vecinos
        for (const edge of this.edges) {
            if (!this.neighborMap.has(edge.from)) this.neighborMap.set(edge.from, []);
            if (!this.neighborMap.has(edge.to)) this.neighborMap.set(edge.to, []);
            this.neighborMap.get(edge.from)!.push(edge.to);
            this.neighborMap.get(edge.to)!.push(edge.from);
        }

        // Estadísticas
        this.stats = {
            feNodes: data.stats?.feNodesCount || 4802,
            beNodes: data.stats?.beNodesCount || 3543,
            totalNodes: this.nodes.length,
            totalEdges: this.edges.length,
            bridgesCount: data.stats?.bridgeEdgesCount || 1148,
            communitiesCount: this.communities.length
        };

        this.buildThreeMeshes();
        this.isLoading = false;
        this._cdr.detectChanges();
    }

    // ─────────────────────────────────────────────────────────────
    // CONSTRUCCIÓN DE MESHES THREE.JS (ALTO RENDIMIENTO Y FLUIDEZ 60 FPS)
    // ─────────────────────────────────────────────────────────────
    private buildThreeMeshes(): void {
        // Limpiar mallas anteriores si existían
        if (this.instancedNodes) {
            this.scene.remove(this.instancedNodes);
            this.instancedNodes.geometry.dispose();
            (this.instancedNodes.material as THREE.Material).dispose();
        }
        if (this.linesMesh) {
            this.scene.remove(this.linesMesh);
            this.linesMesh.geometry.dispose();
            (this.linesMesh.material as THREE.Material).dispose();
        }
        if (this.bridgeLinesMesh) {
            this.scene.remove(this.bridgeLinesMesh);
            this.bridgeLinesMesh.geometry.dispose();
            (this.bridgeLinesMesh.material as THREE.Material).dispose();
            this.bridgeLinesMesh = undefined;
        }

        const count = this.nodes.length;
        const sphereGeo = new THREE.SphereGeometry(1, 6, 6);
        const nodeMat = new THREE.MeshLambertMaterial({
            emissive: 0x111827,
            emissiveIntensity: 0.45
        });

        this.instancedNodes = new THREE.InstancedMesh(sphereGeo, nodeMat, count);
        this.nodeIndexMap.clear();
        this.indexToNodeMap.clear();

        for (let i = 0; i < count; i++) {
            const node = this.nodes[i];
            this.nodeIndexMap.set(node.id, i);
            this.indexToNodeMap.set(i, node);

            const isLeader = node.isLeader || (node.scope === 'frontend' && (node.degree > 3 || /component|service/i.test(node.moduleName || '')));
            const baseScale = isLeader ? 2.2 : Math.max(0.75, Math.min(1.8, (node.size || 10) * 0.12));

            this.nodeDummy.position.set(node.x, node.y, node.z);
            this.nodeDummy.scale.set(baseScale, baseScale, baseScale);
            this.nodeDummy.updateMatrix();

            this.instancedNodes.setMatrixAt(i, this.nodeDummy.matrix);
            const color = new THREE.Color(node.color || '#4E79A7');
            this.instancedNodes.setColorAt(i, color);
        }

        this.instancedNodes.instanceMatrix.needsUpdate = true;
        if (this.instancedNodes.instanceColor) {
            this.instancedNodes.instanceColor.needsUpdate = true;
        }
        this.scene.add(this.instancedNodes);

        // 2. Líneas intra-capa (horizontales dentro de Front y dentro de Back)
        const linePositions: number[] = [];
        const lineColors: number[] = [];

        for (const edge of this.edges) {
            if (edge.isBridge) continue;

            const src = this.nodeMap.get(edge.from);
            const tgt = this.nodeMap.get(edge.to);
            if (!src || !tgt) continue;

            linePositions.push(src.x, src.y, src.z, tgt.x, tgt.y, tgt.z);
            const col = new THREE.Color(src.color || '#4E79A7');
            lineColors.push(col.r * 0.35, col.g * 0.35, col.b * 0.35);
            lineColors.push(col.r * 0.35, col.g * 0.35, col.b * 0.35);
        }

        const lineGeo = new THREE.BufferGeometry();
        lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
        lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
        const lineMat = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.18,
            blending: THREE.AdditiveBlending
        });
        this.linesMesh = new THREE.LineSegments(lineGeo, lineMat);
        this.scene.add(this.linesMesh);

        // 3. Vías sinápticas puente (verticales entre la capa Front arriba y la capa Back abajo)
        const bridgePositions: number[] = [];
        const bridgeColors: number[] = [];
        const colCyan = new THREE.Color('#00f0ff');
        const colIndigo = new THREE.Color('#818cf8');

        for (const edge of this.edges) {
            if (!edge.isBridge) continue;

            const src = this.nodeMap.get(edge.from);
            const tgt = this.nodeMap.get(edge.to);
            if (!src || !tgt) continue;

            bridgePositions.push(src.x, src.y, src.z, tgt.x, tgt.y, tgt.z);
            const c1 = src.scope === 'frontend' ? colCyan : colIndigo;
            const c2 = tgt.scope === 'frontend' ? colCyan : colIndigo;
            bridgeColors.push(c1.r, c1.g, c1.b);
            bridgeColors.push(c2.r, c2.g, c2.b);
        }

        if (bridgePositions.length > 0) {
            const bridgeGeo = new THREE.BufferGeometry();
            bridgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(bridgePositions, 3));
            bridgeGeo.setAttribute('color', new THREE.Float32BufferAttribute(bridgeColors, 3));
            const bridgeMat = new THREE.LineBasicMaterial({
                vertexColors: true,
                transparent: true,
                opacity: 0.12,
                blending: THREE.AdditiveBlending
            });
            this.bridgeLinesMesh = new THREE.LineSegments(bridgeGeo, bridgeMat);
            this.scene.add(this.bridgeLinesMesh);
        }

        // 4. Anillos de delimitación de esferas concéntricas y cabeceras holográficas
        this.buildLayerRings();

        // 5. Construir etiquetas 3D de nombres de módulo en la Esfera Exterior Frontend
        this.buildModuleLabels();
    }

    private buildLayerRings(): void {
        while (this.layerRingsGroup.children.length > 0) {
            const obj = this.layerRingsGroup.children[0];
            this.layerRingsGroup.remove(obj);
            if ((obj as any).geometry) (obj as any).geometry.dispose();
            if ((obj as any).material) {
                if ((obj as any).material.map) (obj as any).material.map.dispose();
                (obj as any).material.dispose();
            }
        }

        // Anillo Ecuatorial 1: Esfera Exterior Frontend (R = 260)
        const ringGeoFE = new THREE.RingGeometry(258, 262, 64);
        const ringMatFE = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            transparent: true,
            opacity: 0.22,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        const ringFE = new THREE.Mesh(ringGeoFE, ringMatFE);
        ringFE.rotation.x = Math.PI / 2;
        ringFE.position.set(0, 0, 0);
        this.layerRingsGroup.add(ringFE);

        // Anillo Ecuatorial 2: Esfera Interior API Core (R = 86)
        const ringGeoBE = new THREE.RingGeometry(84, 88, 64);
        const ringMatBE = new THREE.MeshBasicMaterial({
            color: 0x818cf8,
            transparent: true,
            opacity: 0.26,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        const ringBE = new THREE.Mesh(ringGeoBE, ringMatBE);
        ringBE.rotation.x = Math.PI / 2;
        ringBE.position.set(0, 0, 0);
        this.layerRingsGroup.add(ringBE);

        // Badges 3D flotantes en el zenit de cada esfera concéntrica
        const labelFE = this.createLayerHeaderSprite('🎨 ESFERA EXTERIOR (Frontend)', '#38bdf8');
        labelFE.position.set(0, 288, 0);
        labelFE.scale.set(40, 7.5, 1);
        this.layerRingsGroup.add(labelFE);

        const labelBE = this.createLayerHeaderSprite('⚙️ ESFERA INTERIOR (API Core)', '#a78bfa');
        labelBE.position.set(0, 104, 0);
        labelBE.scale.set(40, 7, 1);
        this.layerRingsGroup.add(labelBE);
    }

    private createLayerHeaderSprite(text: string, colorHex: string): THREE.Sprite {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 96;
        const ctx = canvas.getContext('2d')!;

        ctx.clearRect(0, 0, 512, 96);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.strokeStyle = colorHex;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(16, 16, 480, 64, 32);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '700 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 256, 48);

        const texture = new THREE.CanvasTexture(canvas);
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;

        const mat = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0.85,
            depthWrite: false
        });

        return new THREE.Sprite(mat);
    }

    // ─────────────────────────────────────────────────────────────
    // ETIQUETAS 3D FLOTANTES (NOMBRES DE MÓDULOS SUTILES SIN RECUADRO)
    // ─────────────────────────────────────────────────────────────
    private buildModuleLabels(): void {
        while (this.labelsGroup.children.length > 0) {
            const obj = this.labelsGroup.children[0] as THREE.Sprite;
            this.labelsGroup.remove(obj);
            if (obj.material) {
                if (obj.material.map) obj.material.map.dispose();
                obj.material.dispose();
            }
        }

        // Seleccionar los ~30 módulos y comunidades principales del Frontend
        const topCommunities = [...this.communities]
            .filter(c => c.scope === 'frontend' && c.count >= 8)
            .sort((a, b) => b.count - a.count)
            .slice(0, 32);

        for (const comm of topCommunities) {
            const commNodes = this.nodes.filter(n => n.scope === 'frontend' && n.community === comm.cid);
            if (commNodes.length === 0) continue;

            const leader = commNodes.find(n => n.isLeader) || commNodes[0];
            let name = (leader.moduleName || comm.label || leader.label || '')
                .replace(/^\[Corteza Front\]\s*/i, '')
                .replace(/Component$|Service$|FormComponent$|DialogComponent$/i, '');

            if (!name || name === 'General' || name.length <= 2) continue;

            const dir = new THREE.Vector3(leader.x, leader.y, leader.z).normalize();
            const sprite = this.createLabelSprite(name);
            sprite.position.set(leader.x + dir.x * 6.5, leader.y + dir.y * 6.5, leader.z + dir.z * 6.5);
            sprite.scale.set(16, 4, 1);
            this.labelsGroup.add(sprite);
        }

        this.labelsGroup.visible = this.showModuleLabels;
    }

    private createLabelSprite(text: string): THREE.Sprite {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d')!;

        // Fondo 100% transparente (sin recuadro ni marcos)
        ctx.clearRect(0, 0, 256, 64);

        // Sombra suave para que el texto sea perfectamente legible sin recuadro
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;

        // Tipografía sutil, limpia y moderna
        ctx.fillStyle = '#f1f5f9';
        ctx.font = '500 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const displayText = text.length > 18 ? text.substring(0, 16) + '…' : text;
        ctx.fillText(displayText, 128, 32);

        const texture = new THREE.CanvasTexture(canvas);
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;

        const mat = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0.72,
            depthWrite: false
        });

        return new THREE.Sprite(mat);
    }

    public toggleModuleLabels(): void {
        this.showModuleLabels = !this.showModuleLabels;
        this.labelsGroup.visible = this.showModuleLabels;
        this._cdr.markForCheck();
    }

    // ─────────────────────────────────────────────────────────────
    // RESALTADO DINÁMICO DE CONEXIONES DE LA NEURONA SELECCIONADA
    // ─────────────────────────────────────────────────────────────
    private highlightNodeConnections(node: Graph3DNode): void {
        if (this.selectedConnectionsMesh) {
            this.scene.remove(this.selectedConnectionsMesh);
            this.selectedConnectionsMesh.geometry.dispose();
            (this.selectedConnectionsMesh.material as THREE.Material).dispose();
            this.selectedConnectionsMesh = undefined;
        }

        const positions: number[] = [];
        const colors: number[] = [];

        // 1. Conexiones a vecinos directos (lila neón)
        const neighborIds = this.neighborMap.get(node.id) || [];
        const neighborColor = new THREE.Color('#c084fc');
        for (const nId of neighborIds.slice(0, 30)) {
            const neighbor = this.nodeMap.get(nId);
            if (neighbor && neighbor.visible) {
                positions.push(node.x, node.y, node.z, neighbor.x, neighbor.y, neighbor.z);
                colors.push(neighborColor.r, neighborColor.g, neighborColor.b);
                colors.push(neighborColor.r, neighborColor.g, neighborColor.b);
            }
        }

        // 2. Vía hacia el Núcleo API o Corteza Front (Cyan neón brillante)
        const bridgeEdges = this.edges.filter(e => e.isBridge && (e.from === node.id || e.to === node.id));
        const bridgeColor = new THREE.Color('#00f0ff');
        for (const b of bridgeEdges) {
            const otherId = b.from === node.id ? b.to : b.from;
            const otherNode = this.nodeMap.get(otherId);
            if (otherNode && otherNode.visible) {
                positions.push(node.x, node.y, node.z, otherNode.x, otherNode.y, otherNode.z);
                colors.push(bridgeColor.r, bridgeColor.g, bridgeColor.b);
                colors.push(bridgeColor.r, bridgeColor.g, bridgeColor.b);
            }
        }

        if (positions.length > 0) {
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            const mat = new THREE.LineBasicMaterial({
                vertexColors: true,
                transparent: true,
                opacity: 0.9,
                blending: THREE.AdditiveBlending
            });
            this.selectedConnectionsMesh = new THREE.LineSegments(geo, mat);
            this.scene.add(this.selectedConnectionsMesh);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // BUCLE DE RENDER THREE.JS (60 FPS FLUIDO Y OPTIMIZADO)
    // ─────────────────────────────────────────────────────────────
    private startLoop(): void {
        const animate = () => {
            if (!this.isRunning) return;

            this.frameCount++;
            this.controls.update();
            this.updatePulses3D();
            this.updateBursts3D();

            // Raycasting optimizado: sólo cada 3 frames si el mouse se movió (0 lag)
            if (this.frameCount % 3 === 0 && this.mouseMoved) {
                this.checkRaycastHover();
                this.mouseMoved = false;
            }

            this.renderer.render(this.scene, this.camera);
            this.animFrameId = requestAnimationFrame(animate);
        };
        this.animFrameId = requestAnimationFrame(animate);
    }

    private getBezierPoint(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, t: number): THREE.Vector3 {
        const mt = 1 - t;
        return new THREE.Vector3(
            mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
            mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
            mt * mt * p0.z + 2 * mt * t * p1.z + t * t * p2.z
        );
    }

    private updatePulses3D(): void {
        const surviving: Pulse3D[] = [];

        for (const pulse of this.activePulses) {
            pulse.progress += pulse.speed;

            if (pulse.progress >= 1.0) {
                // Llegada a destino: eliminar chispa y estela
                this.scene.remove(pulse.sparkSprite);
                if (pulse.sparkSprite.material) pulse.sparkSprite.material.dispose();

                this.scene.remove(pulse.trailLine);
                pulse.trailLine.geometry.dispose();
                (pulse.trailLine.material as THREE.Material).dispose();

                // Flash sináptico al impactar
                this.spawnSynapticBurst(pulse.endPos, pulse.color);
            } else {
                // Cabeza de luz brillante
                const headPos = this.getBezierPoint(pulse.startPos, pulse.midPos, pulse.endPos, pulse.progress);
                pulse.sparkSprite.position.copy(headPos);

                // Estela eléctrica que la sigue
                const trailGeo = pulse.trailLine.geometry as THREE.BufferGeometry;
                const positions = trailGeo.attributes.position.array as Float32Array;
                const trailLen = 16;
                const trailSpan = 0.12;

                for (let i = 0; i < trailLen; i++) {
                    const fraction = i / (trailLen - 1);
                    const t = Math.max(0, pulse.progress - (1 - fraction) * trailSpan);
                    const pt = this.getBezierPoint(pulse.startPos, pulse.midPos, pulse.endPos, t);
                    positions[i * 3] = pt.x;
                    positions[i * 3 + 1] = pt.y;
                    positions[i * 3 + 2] = pt.z;
                }
                trailGeo.attributes.position.needsUpdate = true;

                surviving.push(pulse);
            }
        }
        this.activePulses = surviving;
    }

    private spawnSynapticBurst(pos: THREE.Vector3, color: THREE.Color): void {
        const isCyan = color.b > 0.6;
        const tex = isCyan ? this.glowTextureCyan : this.glowTextureGreen;
        const mat = new THREE.SpriteMaterial({
            map: tex,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 1.0,
            depthWrite: false
        });
        const sprite = new THREE.Sprite(mat);
        sprite.position.copy(pos);
        sprite.scale.set(4, 4, 1);
        this.scene.add(sprite);

        this.activeBursts.push({
            sprite,
            progress: 0,
            maxScale: 22
        });
    }

    private updateBursts3D(): void {
        const surviving: SynapticBurst[] = [];
        for (const burst of this.activeBursts) {
            burst.progress += 0.08;
            if (burst.progress >= 1.0) {
                this.scene.remove(burst.sprite);
                burst.sprite.material.dispose();
            } else {
                const currentScale = 4 + burst.progress * (burst.maxScale - 4);
                burst.sprite.scale.set(currentScale, currentScale, 1);
                burst.sprite.material.opacity = 1.0 - burst.progress;
                surviving.push(burst);
            }
        }
        this.activeBursts = surviving;
    }

    // ─────────────────────────────────────────────────────────────
    // DISPARO DE IMPULSOS SINÁPTICOS 3D (CHISPA ELÉCTRICA + ESTELA DE LUZ)
    // ─────────────────────────────────────────────────────────────
    public emitPulse3D(sourceNode: Graph3DNode, targetNode: Graph3DNode, colorHex: string = '#00F0FF', speed: number = 0.022): void {
        const start = new THREE.Vector3(sourceNode.x, sourceNode.y, sourceNode.z);
        const end = new THREE.Vector3(targetNode.x, targetNode.y, targetNode.z);

        // Curva arqueada sináptica radial en el espacio 3D
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        const diff = new THREE.Vector3().subVectors(end, start);
        let normal = new THREE.Vector3(-diff.y, diff.x, diff.z * 0.3).normalize();
        if (normal.lengthSq() < 0.01) normal = new THREE.Vector3(0, 1, 0);
        mid.addScaledVector(normal, 22);

        const isCyan = colorHex.toUpperCase().includes('00F0FF') || colorHex.toUpperCase().includes('CYAN');
        const tex = isCyan ? this.glowTextureCyan : this.glowTextureGreen;

        // 1. Chispa de luz pura con resplandor aditivo
        const sparkMat = new THREE.SpriteMaterial({
            map: tex,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false
        });
        const sparkSprite = new THREE.Sprite(sparkMat);
        sparkSprite.scale.set(13, 13, 1);
        sparkSprite.position.copy(start);
        this.scene.add(sparkSprite);

        // 2. Estela eléctrica que sigue a la chispa
        const points: THREE.Vector3[] = [];
        for (let i = 0; i < 16; i++) {
            points.push(start.clone());
        }
        const trailGeo = new THREE.BufferGeometry().setFromPoints(points);
        const trailMat = new THREE.LineBasicMaterial({
            color: new THREE.Color(colorHex),
            transparent: true,
            opacity: 0.88,
            blending: THREE.AdditiveBlending,
            linewidth: 2
        });
        const trailLine = new THREE.Line(trailGeo, trailMat);
        this.scene.add(trailLine);

        const pulse: Pulse3D = {
            id: Math.random().toString(36).substring(2, 9),
            startPos: start,
            midPos: mid,
            endPos: end,
            progress: 0,
            speed,
            color: new THREE.Color(colorHex),
            sparkSprite,
            trailLine,
            direction: 'forward',
            targetNode
        };

        this.activePulses.push(pulse);
        this.recentSynapsesCount++;
        this._cdr.markForCheck();
    }

    /**
     * Dispara una cascada completa a través de la vía sináptica:
     * Corteza Frontend -> Núcleo API Controller -> Retorno 200 OK
     */
    /**
     * Dispara una cascada completa a través de la vía sináptica:
     * Corteza Frontend -> Núcleo API Controller -> Retorno 200 OK
     */
    public triggerSynapticCascade(sourceNode: Graph3DNode): void {
        const bridgeEdges = this.edges.filter(e => e.isBridge && (e.from === sourceNode.id || e.to === sourceNode.id));
        let targetNode: Graph3DNode | undefined;

        if (bridgeEdges.length > 0) {
            const targetId = bridgeEdges[0].from === sourceNode.id ? bridgeEdges[0].to : bridgeEdges[0].from;
            targetNode = this.nodeMap.get(targetId);
        } else {
            // Buscar controlador en el núcleo API más representativo
            const controllers = this.nodes.filter(n => n.scope === 'backend' && /controller/i.test(n.label));
            targetNode = controllers[Math.floor(Math.random() * controllers.length)];
        }

        if (!targetNode) return;

        // 1. Destello sináptico inmediato en la neurona emisora
        this.spawnSynapticBurst(new THREE.Vector3(sourceNode.x, sourceNode.y, sourceNode.z), new THREE.Color('#00F0FF'));

        this.highlightNodeConnections(sourceNode);

        // 2. Impulso eléctrico de ida (Corteza ➔ Núcleo API): Cyan neón
        this.emitPulse3D(sourceNode, targetNode, '#00F0FF', 0.022);

        // 3. Impulso eléctrico de retorno (Núcleo API ➔ Corteza): Verde esmeralda tras 650ms
        setTimeout(() => {
            this.emitPulse3D(targetNode!, sourceNode, '#00FF88', 0.028);
        }, 650);
    }

    // ─────────────────────────────────────────────────────────────
    // INTEGRACIÓN CON SIGNALR (TELEMETRÍA EN TIEMPO REAL)
    // ─────────────────────────────────────────────────────────────
    private readonly moduleDictionary: Record<string, string[]> = {
        'cotiz': ['quote', 'cotiz', 'presupuesto'],
        'quote': ['quote', 'cotiz'],
        'presupuesto': ['quote', 'cotiz'],
        'tarea': ['task', 'tarea'],
        'task': ['task', 'tarea'],
        'usuario': ['user', 'usuario', 'security'],
        'user': ['user', 'usuario'],
        'compra': ['compra', 'purchase', 'proveedor'],
        'solicitud': ['solicitud', 'compra'],
        'proveedor': ['proveedor', 'supplier'],
        'proyecto': ['project', 'proyecto', 'engineering'],
        'project': ['project', 'proyecto'],
        'gasto': ['expense', 'gasto', 'finance'],
        'expense': ['expense', 'gasto'],
        'rol': ['role', 'rol', 'permission'],
        'role': ['role', 'rol'],
        'cliente': ['client', 'cliente', 'customer', 'lead'],
        'client': ['client', 'cliente'],
        'producto': ['product', 'producto', 'catalog'],
        'product': ['product', 'producto'],
        'ingenier': ['engineering', 'ingenieria', 'obra'],
        'monitor': ['activity', 'monitor', 'feed'],
        'actividad': ['activity', 'monitor'],
        'chat': ['chat', 'rayito'],
        'terminal': ['cierre_terminal', 'terminal'],
        'entrega': ['control_entregas', 'entrega'],
        'rrhh': ['personal_management', 'personal', 'rrhh'],
        'personal': ['personal_management', 'personal'],
        'ticket': ['ticket', 'soporte'],
        'report': ['report', 'reporte', 'kardex', 'venta'],
        'kardex': ['kardex', 'product_kardex'],
        'dashboard': ['dashboard', 'analytic', 'analytics'],
        'analitica': ['analytic', 'analytics', 'dashboard'],
        'encuesta': ['survey', 'encuesta']
    };

    private initSignalRListener(): void {
        this._activitySignalR.startConnection();
        this._signalRService.startConnection();

        // Monitorear estado de conexión
        this.subscriptions.add(
            this._activitySignalR.connectionStatus$.subscribe(connected => {
                this.isSignalRConnected = connected;
                this._cdr.markForCheck();
            })
        );

        // Suscripción al stream principal de navegación
        this.subscriptions.add(
            this._activitySignalR.movimientos$.subscribe((mov: ActivityLog) => {
                if (!mov || this.nodes.length === 0) return;
                this.handleSignalREvent(mov);
            })
        );

        // Suscripción al stream redundante
        this.subscriptions.add(
            this._signalRService.movimiento$.subscribe((mov: any) => {
                if (!mov || this.nodes.length === 0) return;
                this.handleSignalREvent(mov);
            })
        );
    }

    private resolveNodeForActivity(rawMod: string, rawUrl: string): Graph3DNode {
        const feNodes = this.nodes.filter(n => n.scope === 'frontend');
        if (feNodes.length === 0) return this.nodes[0];

        const cleanMod = (rawMod || '').toLowerCase().trim();
        const cleanUrl = (rawUrl || '').toLowerCase().trim();

        // 1. Alta precisión: Segmentos limpios de la URL (/admin/dashboards/quotes -> 'quotes')
        if (cleanUrl) {
            const stripped = cleanUrl.replace(/^\/|\/$/g, '');
            const segments = stripped
                .split('/')
                .filter(s => s && !['admin', 'app', 'apps', 'dashboards', 'modules', 'pages'].includes(s));

            for (let i = segments.length - 1; i >= 0; i--) {
                const seg = segments[i].replace(/-/g, '_');
                const candidate = feNodes.find(n => 
                    (n.id.toLowerCase().includes(seg) || n.label.toLowerCase().includes(seg)) &&
                    (/component/i.test(n.id) || n.isLeader)
                );
                if (candidate) return candidate;
            }
        }

        // 2. Diccionario semántico (Español <-> Nombres técnicos de Angular)
        const combinedText = `${cleanMod} ${cleanUrl}`.toLowerCase();
        for (const [key, tokens] of Object.entries(this.moduleDictionary)) {
            if (combinedText.includes(key)) {
                for (const tok of tokens) {
                    const candidate = feNodes.find(n =>
                        (n.id.toLowerCase().includes(tok) || n.label.toLowerCase().includes(tok) || n.communityName.toLowerCase().includes(tok)) &&
                        (/component/i.test(n.id) || n.isLeader || n.degree > 2)
                    );
                    if (candidate) return candidate;
                }
            }
        }

        // 3. Coincidencia por palabras clave del nombre del módulo (> 3 letras)
        const words = cleanMod.split(/\s+/).filter(w => w.length > 3);
        for (const w of words) {
            const candidate = feNodes.find(n =>
                (n.id.toLowerCase().includes(w) || n.label.toLowerCase().includes(w) || n.communityName.toLowerCase().includes(w))
            );
            if (candidate) return candidate;
        }

        // 4. Coincidencia por comunidad Frontend
        if (cleanMod) {
            const commMatch = feNodes.find(n => n.communityName.toLowerCase().includes(cleanMod));
            if (commMatch) return commMatch;
        }

        // 5. Fallback representativo para que NUNCA se descarte un evento
        const leaderFallback = feNodes.find(n => n.isLeader && n.degree > 3);
        return leaderFallback || feNodes[0];
    }

    private handleSignalREvent(mov: any): void {
        const rawMod = ((mov.modulo || mov.Modulo || mov.componente || '') as string).trim();
        const rawUrl = ((mov.urlPath || mov.UrlPath || mov.url || '') as string).trim();
        const userName = mov.nombreUsuario || mov.Usuario || mov.nombre || 'Usuario';
        const action = mov.accion || mov.Accion || 'Acceso al módulo';
        const fecha = mov.fecha || mov.Fecha || new Date().toLocaleTimeString();

        // Evitar disparos duplicados si ambos servicios emiten el mismo evento
        const dedupeKey = `${mov.idLog || ''}_${rawMod}_${rawUrl}_${userName}_${fecha}`;
        if (this.processedEvents.has(dedupeKey)) return;
        this.processedEvents.add(dedupeKey);
        setTimeout(() => this.processedEvents.delete(dedupeKey), 2500);

        // Encontrar neurona correspondiente de forma infalible
        const matchingNode = this.resolveNodeForActivity(rawMod, rawUrl);
        if (!matchingNode) return;

        // Actualizar datos del HUD y activar toast de actividad
        this.lastActiveUser = userName;
        this.lastActiveModule = rawMod || matchingNode.communityName || matchingNode.label;
        this.lastActiveTime = typeof fecha === 'string' && fecha.length <= 8 ? fecha : new Date().toLocaleTimeString();
        this.showActivityBanner = true;

        if (this.bannerTimeout) {
            clearTimeout(this.bannerTimeout);
        }
        this.bannerTimeout = setTimeout(() => {
            this.showActivityBanner = false;
            this._cdr.markForCheck();
        }, 5000);

        // Disparar destello sináptico inmediato e impulsos hacia el núcleo API (sin zoom brusco)
        this.triggerSynapticCascade(matchingNode);
        this.selectedNode = matchingNode;
        this.highlightNodeConnections(matchingNode);

        console.log(`🧠 [Red Neuronal] Actividad detectada: ${userName} en "${this.lastActiveModule}" -> Neurona ${matchingNode.label}`);
        this._cdr.markForCheck();
    }

    // ─────────────────────────────────────────────────────────────
    // INTERACCIÓN: CLIC Y HOVER EN NODOS 3D (OPTIMIZADO CON ZERO LAG)
    // ─────────────────────────────────────────────────────────────
    @HostListener('mousemove', ['$event'])
    onMouseMove(event: MouseEvent): void {
        const container = this.containerRef.nativeElement;
        const rect = container.getBoundingClientRect();
        if (event.clientX > rect.right || event.clientX < rect.left || event.clientY > rect.bottom || event.clientY < rect.top) {
            return;
        }

        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.mouseMoved = true;
    }

    private checkRaycastHover(): void {
        if (!this.instancedNodes) return;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.instancedNodes);

        const container = this.containerRef.nativeElement;
        if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
            const instanceId = intersects[0].instanceId;
            const node = this.indexToNodeMap.get(instanceId);
            if (node && node !== this.hoveredNode) {
                this.hoveredNode = node;
                container.style.cursor = 'pointer';
                this._cdr.markForCheck();
            }
        } else {
            if (this.hoveredNode !== null) {
                this.hoveredNode = null;
                container.style.cursor = 'default';
                this._cdr.markForCheck();
            }
        }
    }

    @HostListener('click', ['$event'])
    onClick(event: MouseEvent): void {
        // Ignorar clics dentro del sidebar
        if ((event.target as HTMLElement).closest('#sidebar')) return;

        if (this.hoveredNode) {
            this.selectNode(this.hoveredNode, false);
        }
    }

    public selectNode(node: Graph3DNode, focusCamera: boolean = false): void {
        this.selectedNode = node;

        // Solo mover cámara si se solicita explícitamente (sin zoom automático por actividad)
        if (focusCamera) {
            const targetPos = new THREE.Vector3(node.x, node.y, node.z);
            const offset = node.scope === 'backend' ? new THREE.Vector3(0, 20, 110) : new THREE.Vector3(0, 30, 150);
            const camTarget = new THREE.Vector3().addVectors(targetPos, offset);

            this.controls.target.copy(targetPos);
            this.camera.position.copy(camTarget);
        }

        // Resaltar conexiones sinápticas
        this.highlightNodeConnections(node);

        // Disparar impulso 3D
        this.triggerSynapticCascade(node);
        this._cdr.markForCheck();
    }

    public getConnectedNeighbors(nodeId: string): Graph3DNode[] {
        const neighborIds = this.neighborMap.get(nodeId) || [];
        return neighborIds
            .slice(0, 30)
            .map(id => this.nodeMap.get(id))
            .filter((n): n is Graph3DNode => n !== undefined);
    }

    public getBridgeForNode(nodeId: string): Graph3DNode | null {
        const bridge = this.edges.find(e => e.isBridge && (e.from === nodeId || e.to === nodeId));
        if (!bridge) return null;
        const targetId = bridge.from === nodeId ? bridge.to : bridge.from;
        return this.nodeMap.get(targetId) || null;
    }

    // ─────────────────────────────────────────────────────────────
    // BÚSQUEDA Y FILTRADO
    // ─────────────────────────────────────────────────────────────
    public onSearchInput(): void {
        const q = this.searchQuery.toLowerCase().trim();
        if (!q) {
            this.searchResults = [];
            return;
        }

        this.searchResults = this.nodes
            .filter(n => n.label.toLowerCase().includes(q) || (n.moduleName && n.moduleName.toLowerCase().includes(q)) || n.communityName.toLowerCase().includes(q))
            .slice(0, 25);
    }

    public selectSearchResult(node: Graph3DNode): void {
        this.selectNode(node);
        this.searchResults = [];
        this.searchQuery = '';
    }

    // ─────────────────────────────────────────────────────────────
    // CONTROL DE COMUNIDADES (VISIBILIDAD EN 3D)
    // ─────────────────────────────────────────────────────────────
    public toggleAllCommunities(): void {
        this.selectAllCommunities = !this.selectAllCommunities;
        for (const comm of this.communities) {
            comm.visible = this.selectAllCommunities;
        }
        this.applyCommunityFilters();
    }

    public toggleCommunity(comm: Graph3DCommunity): void {
        comm.visible = !comm.visible;
        const total = this.communities.length;
        const visibleCount = this.communities.filter(c => c.visible).length;

        this.selectAllCommunities = visibleCount === total;
        this.isIndeterminateCommunities = visibleCount > 0 && visibleCount < total;

        this.applyCommunityFilters();
    }

    private applyCommunityFilters(): void {
        const hiddenCommSet = new Set(
            this.communities.filter(c => !c.visible).map(c => `${c.scope}_${c.cid}`)
        );

        for (let i = 0; i < this.nodes.length; i++) {
            const node = this.nodes[i];
            const isHidden = hiddenCommSet.has(`${node.scope}_${node.community}`) ||
                (this.activeScope !== 'all' && node.scope !== this.activeScope);

            node.visible = !isHidden;

            if (isHidden) {
                this.nodeDummy.position.set(0, 0, -99999);
                this.nodeDummy.scale.set(0.001, 0.001, 0.001);
            } else {
                const isLeader = node.isLeader || (node.scope === 'frontend' && (node.degree > 3 || /component|service/i.test(node.moduleName || '')));
                const scale = isLeader ? 2.2 : Math.max(0.75, Math.min(1.8, (node.size || 10) * 0.12));
                this.nodeDummy.position.set(node.x, node.y, node.z);
                this.nodeDummy.scale.set(scale, scale, scale);
            }
            this.nodeDummy.updateMatrix();
            this.instancedNodes.setMatrixAt(i, this.nodeDummy.matrix);
        }

        this.instancedNodes.instanceMatrix.needsUpdate = true;
        this._cdr.markForCheck();
    }

    public filterScope(scope: 'all' | 'frontend' | 'backend'): void {
        this.activeScope = scope;
        if (scope === 'backend') {
            this.controls.target.set(0, 0, 0);
            this.camera.position.set(0, 20, 240);
        } else if (scope === 'frontend') {
            this.controls.target.set(0, 0, 0);
            this.camera.position.set(0, 30, 520);
        } else {
            this.controls.target.set(0, 0, 0);
            this.camera.position.set(0, 30, 620);
        }
        this.applyCommunityFilters();
    }

    // ─────────────────────────────────────────────────────────────
    // ACCIONES GENERALES
    // ─────────────────────────────────────────────────────────────
    public resetCamera(): void {
        if (this.selectedConnectionsMesh) {
            this.scene.remove(this.selectedConnectionsMesh);
            this.selectedConnectionsMesh.geometry.dispose();
            (this.selectedConnectionsMesh.material as THREE.Material).dispose();
            this.selectedConnectionsMesh = undefined;
        }
        this.camera.position.set(0, 30, 620);
        this.controls.target.set(0, 0, 0);
        this.selectedNode = null;
        this._cdr.markForCheck();
    }

    public toggleAutoDemo(): void {
        this.isAutoDemo = !this.isAutoDemo;
        if (this.isAutoDemo) {
            this.demoTimer = setInterval(() => {
                const feNodes = this.nodes.filter(n => n.scope === 'frontend' && (n.degree > 3 || /component|service/i.test(n.label)));
                if (feNodes.length > 0) {
                    const randomNode = feNodes[Math.floor(Math.random() * feNodes.length)];
                    this.triggerSynapticCascade(randomNode);
                }
            }, 1400);
        } else {
            if (this.demoTimer) {
                clearInterval(this.demoTimer);
                this.demoTimer = null;
            }
        }
    }

    public triggerRandomSpike(): void {
        const feNodes = this.nodes.filter(n => n.scope === 'frontend' && n.degree > 2);
        if (feNodes.length > 0) {
            const randomNode = feNodes[Math.floor(Math.random() * feNodes.length)];
            this.selectNode(randomNode);
        }
    }

    private disposeThree(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = undefined;
        }
        if (this.bridgeLinesMesh) {
            this.scene.remove(this.bridgeLinesMesh);
            this.bridgeLinesMesh.geometry.dispose();
            (this.bridgeLinesMesh.material as THREE.Material).dispose();
            this.bridgeLinesMesh = undefined;
        }
        if (this.selectedConnectionsMesh) {
            this.scene.remove(this.selectedConnectionsMesh);
            this.selectedConnectionsMesh.geometry.dispose();
            (this.selectedConnectionsMesh.material as THREE.Material).dispose();
        }
        if (this.renderer) {
            this.renderer.dispose();
            if (this.containerRef?.nativeElement && this.renderer.domElement) {
                this.containerRef.nativeElement.removeChild(this.renderer.domElement);
            }
        }
    }
}
