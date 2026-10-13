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

export interface PipelineStepInfo {
    stepNumber: number;
    totalSteps: number;
    icon: string;
    phase: 'forward' | 'database' | 'return';
    title: string;
    description: string;
    isFailure?: boolean;
}

export interface DbTableSpec {
    name: string;
    domain: string;
    foreignKeys: string[];
}

export const APPLICATION_DB_TABLES: DbTableSpec[] = [
    // Seguridad y Usuarios
    { name: 'Usuarios', domain: 'Seguridad', foreignKeys: ['Roles', 'UsuarioInformacion', 'LoginLogs', 'Departamentos'] },
    { name: 'Roles', domain: 'Seguridad', foreignKeys: ['Permisos', 'RolPermisos', 'RolVistas'] },
    { name: 'Permisos', domain: 'Seguridad', foreignKeys: ['RolPermisos'] },
    { name: 'UsuarioRoles', domain: 'Seguridad', foreignKeys: ['Usuarios', 'Roles'] },
    { name: 'RolPermisos', domain: 'Seguridad', foreignKeys: ['Roles', 'Permisos'] },
    { name: 'Vistas', domain: 'Seguridad', foreignKeys: ['RolVistas'] },
    { name: 'RolVistas', domain: 'Seguridad', foreignKeys: ['Roles', 'Vistas'] },
    { name: 'UsuarioInformacion', domain: 'Seguridad', foreignKeys: ['Usuarios'] },
    { name: 'LoginLogs', domain: 'Seguridad', foreignKeys: ['Usuarios'] },

    // CRM, Ventas y Cotizaciones
    { name: 'Clientes', domain: 'Ventas', foreignKeys: ['Cotizaciones', 'Proyectos', 'Ventas', 'Prospectos'] },
    { name: 'Cotizaciones', domain: 'Ventas', foreignKeys: ['Clientes', 'CotizacionProductos', 'EstatusCotizacion', 'Usuarios'] },
    { name: 'CotizacionProductos', domain: 'Ventas', foreignKeys: ['Cotizaciones', 'Productos', 'CotizacionProductoDetalle'] },
    { name: 'CotizacionProductoDetalle', domain: 'Ventas', foreignKeys: ['CotizacionProductos'] },
    { name: 'EstatusCotizacion', domain: 'Ventas', foreignKeys: ['Cotizaciones'] },
    { name: 'CotizacionesEstatusHistorial', domain: 'Ventas', foreignKeys: ['Cotizaciones', 'Usuarios'] },
    { name: 'CotizacionArchivo', domain: 'Ventas', foreignKeys: ['Cotizaciones'] },
    { name: 'Prospectos', domain: 'Ventas', foreignKeys: ['SeguimientoProspectos', 'NotasProspecto', 'Clientes'] },
    { name: 'SeguimientoProspectos', domain: 'Ventas', foreignKeys: ['Prospectos', 'Usuarios'] },
    { name: 'NotasProspecto', domain: 'Ventas', foreignKeys: ['Prospectos', 'Usuarios'] },
    { name: 'Ventas', domain: 'Ventas', foreignKeys: ['Clientes', 'FormasDePago', 'Usuarios'] },
    { name: 'FormasDePago', domain: 'Ventas', foreignKeys: ['Ventas'] },
    { name: 'Leads', domain: 'Ventas', foreignKeys: ['LeadSeguimientos', 'Clientes'] },
    { name: 'LeadSeguimientos', domain: 'Ventas', foreignKeys: ['Leads', 'Usuarios'] },

    // Proyectos e Ingeniería
    { name: 'Proyectos', domain: 'Proyectos', foreignKeys: ['Clientes', 'EstatusProyecto', 'ProyectoArchivo', 'AvanceProyecto', 'Usuarios'] },
    { name: 'EstatusProyecto', domain: 'Proyectos', foreignKeys: ['Proyectos'] },
    { name: 'ProyectoArchivo', domain: 'Proyectos', foreignKeys: ['Proyectos'] },
    { name: 'ProyectoEstatusHistorial', domain: 'Proyectos', foreignKeys: ['Proyectos', 'Usuarios'] },
    { name: 'AvanceProyecto', domain: 'Proyectos', foreignKeys: ['Proyectos'] },
    { name: 'SeguimientoProyectos', domain: 'Proyectos', foreignKeys: ['Proyectos', 'SeguimientoEjecuciones'] },
    { name: 'SeguimientoEjecuciones', domain: 'Proyectos', foreignKeys: ['SeguimientoProyectos', 'SeguimientoEjecucionActividadesMaestras'] },
    { name: 'SeguimientoEjecucionActividadesMaestras', domain: 'Proyectos', foreignKeys: ['SeguimientoEjecuciones'] },
    { name: 'GanttTasks', domain: 'Proyectos', foreignKeys: ['Proyectos', 'Usuarios'] },
    { name: 'UnidadDeNegocio', domain: 'Proyectos', foreignKeys: ['Proyectos', 'Cotizaciones'] },
    { name: 'Categorias', domain: 'Proyectos', foreignKeys: ['Proyectos', 'Productos'] },

    // Compras y Proveedores
    { name: 'SolicitudesCompra', domain: 'Compras', foreignKeys: ['ProveedoresMaestro', 'SolicitudesCompra_Proveedores', 'SolicitudesCompra_Detalle', 'Cat_EstatusCompra', 'Usuarios'] },
    { name: 'SolicitudesCompra_Proveedores', domain: 'Compras', foreignKeys: ['SolicitudesCompra', 'ProveedoresMaestro'] },
    { name: 'SolicitudesCompra_Detalle', domain: 'Compras', foreignKeys: ['SolicitudesCompra', 'Productos'] },
    { name: 'SolicitudesCompra_Historial', domain: 'Compras', foreignKeys: ['SolicitudesCompra', 'Usuarios'] },
    { name: 'SolicitudesCompra_Anticipos', domain: 'Compras', foreignKeys: ['SolicitudesCompra'] },
    { name: 'Cat_EstatusCompra', domain: 'Compras', foreignKeys: ['SolicitudesCompra'] },
    { name: 'ProveedoresMaestro', domain: 'Compras', foreignKeys: ['SolicitudesCompra', 'GastoProveedores'] },
    { name: 'Compras_Recepciones', domain: 'Compras', foreignKeys: ['SolicitudesCompra', 'Compras_Recepciones_Facturas'] },
    { name: 'Compras_Recepciones_Facturas', domain: 'Compras', foreignKeys: ['Compras_Recepciones'] },
    { name: 'CatalogoSolicitantes', domain: 'Compras', foreignKeys: ['SolicitudesCompra'] },

    // Inventarios y Almacenes
    { name: 'Productos', domain: 'Inventario', foreignKeys: ['Almacenes', 'ExistenciaCosto', 'Categorias'] },
    { name: 'Almacenes', domain: 'Inventario', foreignKeys: ['Productos', 'ExistenciaCosto', 'Traspasos'] },
    { name: 'ExistenciaCosto', domain: 'Inventario', foreignKeys: ['Productos', 'Almacenes'] },
    { name: 'Traspasos', domain: 'Inventario', foreignKeys: ['Almacenes', 'TraspasosDetalle', 'CatEstadosTraspaso'] },
    { name: 'TraspasosDetalle', domain: 'Inventario', foreignKeys: ['Traspasos', 'Productos'] },
    { name: 'CatEstadosTraspaso', domain: 'Inventario', foreignKeys: ['Traspasos'] },

    // Finanzas y Gastos
    { name: 'Gastos', domain: 'Finanzas', foreignKeys: ['GastoTipos', 'GastoConceptos', 'GastoAreas', 'GastoProveedores', 'GastoCuentas', 'Proyectos'] },
    { name: 'GastoTipos', domain: 'Finanzas', foreignKeys: ['Gastos'] },
    { name: 'GastoConceptos', domain: 'Finanzas', foreignKeys: ['Gastos', 'GastoTipos'] },
    { name: 'GastoAreas', domain: 'Finanzas', foreignKeys: ['Gastos', 'Departamentos'] },
    { name: 'GastoProveedores', domain: 'Finanzas', foreignKeys: ['Gastos', 'ProveedoresMaestro'] },
    { name: 'GastoCuentas', domain: 'Finanzas', foreignKeys: ['Gastos'] },
    { name: 'ControlFacturas_Maestro', domain: 'Finanzas', foreignKeys: ['ControlFacturas_Partidas', 'ProveedoresMaestro'] },
    { name: 'ControlFacturas_Partidas', domain: 'Finanzas', foreignKeys: ['ControlFacturas_Maestro'] },

    // Recursos Humanos y Operaciones
    { name: 'Departamentos', domain: 'RRHH', foreignKeys: ['Usuarios', 'GastoAreas'] },
    { name: 'Horarios', domain: 'RRHH', foreignKeys: ['Asistencias', 'Usuarios'] },
    { name: 'Asistencias', domain: 'RRHH', foreignKeys: ['Usuarios', 'Horarios'] },
    { name: 'RecursosTarifas', domain: 'RRHH', foreignKeys: ['Usuarios', 'Proyectos'] },
    { name: 'RegistrosViaticos', domain: 'RRHH', foreignKeys: ['Usuarios', 'Proyectos'] },
    { name: 'MetasUsuario', domain: 'RRHH', foreignKeys: ['Usuarios'] },
    { name: 'SubcontratistasEmpresas', domain: 'RRHH', foreignKeys: ['SubcontratistasPersonal', 'Proyectos'] },
    { name: 'SubcontratistasPersonal', domain: 'RRHH', foreignKeys: ['SubcontratistasEmpresas'] },

    // Tareas, ISO 9001 y Comunicación
    { name: 'Tareas', domain: 'Tareas', foreignKeys: ['TareaUsuario', 'Tareas_Comentarios', 'Usuarios', 'Proyectos'] },
    { name: 'TareaUsuario', domain: 'Tareas', foreignKeys: ['Tareas', 'Usuarios'] },
    { name: 'Tareas_Comentarios', domain: 'Tareas', foreignKeys: ['Tareas', 'Usuarios'] },
    { name: 'IsoDocumentacionBitacoras', domain: 'Calidad', foreignKeys: ['Usuarios', 'Proyectos'] },
    { name: 'Eventos', domain: 'Eventos', foreignKeys: ['Asistentes', 'Usuarios'] },
    { name: 'Asistentes', domain: 'Eventos', foreignKeys: ['Eventos'] },
    { name: 'Chats', domain: 'Comunicacion', foreignKeys: ['Mensajes', 'Usuarios'] },
    { name: 'Mensajes', domain: 'Comunicacion', foreignKeys: ['Chats', 'Usuarios'] },
    { name: 'Notificaciones', domain: 'Comunicacion', foreignKeys: ['Usuarios'] },
    { name: 'Encuestas', domain: 'Calidad', foreignKeys: ['Clientes', 'Usuarios'] }
];

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

    // Estado Responsivo y Visibilidad de Barra Lateral (Graphify)
    public isMobileView: boolean = typeof window !== 'undefined' ? window.innerWidth < 1024 : false;
    public isSidebarOpen: boolean = typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;

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
    private glowTextureRed!: THREE.Texture;

    // Manejo de Caminos de Falla 3D (Ruta Roja)
    public isFailureActive: boolean = false;
    public lastFailureMessage: string = '';
    private failurePathMesh?: THREE.LineSegments;
    private failureTimeout: any = null;

    // Núcleo de Base de Datos 3D (SQL Server en el centro 0,0,0)
    private dbCoreGroup = new THREE.Group();
    private dbCoreMesh!: THREE.Mesh;
    private dbCoreWireMesh!: THREE.Mesh;
    private dbCoreRings: THREE.Mesh[] = [];
    private dbCoreLight!: THREE.PointLight;

    // Ejecución Secuencial del Pipeline Arquitectónico Completo (Click Guardar ➔ BD ➔ UI)
    public isPipelineRunning: boolean = false;
    public activePipelineStep: PipelineStepInfo | null = null;

    private subscriptions: Subscription = new Subscription();

    ngOnInit(): void {
        this.checkViewport();
        this.initSignalRListener();
    }

    public checkViewport(): void {
        const isMobile = typeof window !== 'undefined' ? window.innerWidth < 1024 : false;
        if (this.isMobileView !== isMobile) {
            this.isMobileView = isMobile;
            this.isSidebarOpen = !isMobile;
            this._cdr.markForCheck();
        }
    }

    public toggleSidebar(): void {
        this.isSidebarOpen = !this.isSidebarOpen;
        this._cdr.markForCheck();
        setTimeout(() => {
            if (this.containerRef?.nativeElement) {
                const rect = this.containerRef.nativeElement.getBoundingClientRect();
                this.handleResize(rect.width, rect.height);
            }
        }, 320);
    }

    public closeSidebar(): void {
        this.isSidebarOpen = false;
        this._cdr.markForCheck();
        setTimeout(() => {
            if (this.containerRef?.nativeElement) {
                const rect = this.containerRef.nativeElement.getBoundingClientRect();
                this.handleResize(rect.width, rect.height);
            }
        }, 320);
    }

    public openSidebar(): void {
        this.isSidebarOpen = true;
        this._cdr.markForCheck();
        setTimeout(() => {
            if (this.containerRef?.nativeElement) {
                const rect = this.containerRef.nativeElement.getBoundingClientRect();
                this.handleResize(rect.width, rect.height);
            }
        }, 320);
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
        this.glowTextureRed = this.createGlowTexture('#FF1E56', '#DC2626');

        // Grupos 3D
        this.scene.add(this.layerRingsGroup);
        this.scene.add(this.labelsGroup);

        // 7. Crear e inicializar el Núcleo central de Base de Datos (SQL Server en 0,0,0)
        this.createDatabaseCore();

        // Configurar observador de redimensionamiento automático
        this.setupResizeObserver();

        // Iniciar loop de render
        this.startLoop();
    }

    @HostListener('window:resize')
    onWindowResize(): void {
        this.checkViewport();
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

        // 3. Crear e inyectar el SUBGRAFO COMPLETO DE TABLAS DE BASE DE DATOS en el Núcleo central (R ~ 14 a 28)
        const tableDomainColors: Record<string, string> = {
            'Seguridad': '#38bdf8',
            'Ventas': '#10b981',
            'Proyectos': '#f59e0b',
            'Compras': '#c084fc',
            'Inventario': '#06b6d4',
            'Finanzas': '#34d399',
            'RRHH': '#f472b6',
            'Tareas': '#818cf8',
            'Calidad': '#a78bfa',
            'Comunicacion': '#38bdf8',
            'Eventos': '#fbbf24'
        };

        const totalTables = APPLICATION_DB_TABLES.length;
        const dbTableNodes: Graph3DNode[] = APPLICATION_DB_TABLES.map((t, idx) => {
            const phi = Math.acos(-1 + (2 * idx) / totalTables);
            const theta = Math.sqrt(totalTables * Math.PI) * phi;
            const r = 15 + (idx % 5) * 2.6; // Radio compacto de 15 a 26 en el núcleo interior
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);

            const color = tableDomainColors[t.domain] || '#10b981';
            const isLeader = t.foreignKeys.length >= 3;

            return {
                id: `table_${t.name.toLowerCase()}`,
                label: `🗄️ ${t.name}`,
                moduleName: `Tabla SQL Server (${t.domain})`,
                isLeader,
                color,
                borderColor: '#ffffff',
                size: isLeader ? 15 : 10.5,
                community: 999,
                communityName: `SQL Server (${t.domain})`,
                sourceFile: 'Data/ApplicationDbContext.cs',
                fileType: 'database_table',
                degree: t.foreignKeys.length,
                scope: 'backend',
                x, y, z,
                visible: true
            };
        });

        // Nodo central del sistema de base de datos db_jr en (0, 0, 0)
        const dbCoreNode: Graph3DNode = {
            id: 'core_sql_database',
            label: '🗄️ SQL Server Core (db_jr)',
            moduleName: 'Database / SQL Server Core',
            isLeader: true,
            color: '#10b981',
            borderColor: '#34d399',
            size: 26,
            community: 999,
            communityName: 'SQL Server Core',
            sourceFile: 'Data/ApplicationDbContext.cs',
            fileType: 'database',
            degree: 99,
            scope: 'backend',
            x: 0,
            y: 0,
            z: 0,
            visible: true
        };

        this.nodes.unshift(dbCoreNode, ...dbTableNodes);

        // Conectar Foreign Keys y relaciones entre tablas dentro del núcleo
        for (const t of APPLICATION_DB_TABLES) {
            const fromId = `table_${t.name.toLowerCase()}`;
            for (const fk of t.foreignKeys) {
                const toId = `table_${fk.toLowerCase()}`;
                this.edges.push({
                    from: fromId,
                    to: toId,
                    scope: 'backend',
                    isBridge: false,
                    label: 'FK'
                });
            }
            // Enlace de cada tabla al centro del motor SQL
            this.edges.push({
                from: fromId,
                to: 'core_sql_database',
                scope: 'backend',
                isBridge: false
            });
        }

        // Conectar Controladores y Servicios de Backend directamente con sus tablas en el núcleo
        const beControllersAndServices = this.nodes.filter(n => n.scope === 'backend' && n.fileType !== 'database_table' && n.id !== 'core_sql_database');
        for (const be of beControllersAndServices) {
            const beLower = (be.label + ' ' + (be.moduleName || '')).toLowerCase();
            let matchedTable = APPLICATION_DB_TABLES.find(t => beLower.includes(t.name.toLowerCase()));
            if (!matchedTable) {
                if (beLower.includes('cotiz')) matchedTable = APPLICATION_DB_TABLES.find(t => t.name === 'Cotizaciones');
                else if (beLower.includes('compra') || beLower.includes('solicitud')) matchedTable = APPLICATION_DB_TABLES.find(t => t.name === 'SolicitudesCompra');
                else if (beLower.includes('user') || beLower.includes('usuario') || beLower.includes('auth')) matchedTable = APPLICATION_DB_TABLES.find(t => t.name === 'Usuarios');
                else if (beLower.includes('proyect')) matchedTable = APPLICATION_DB_TABLES.find(t => t.name === 'Proyectos');
                else if (beLower.includes('gasto')) matchedTable = APPLICATION_DB_TABLES.find(t => t.name === 'Gastos');
                else if (beLower.includes('inventario') || beLower.includes('producto')) matchedTable = APPLICATION_DB_TABLES.find(t => t.name === 'Productos');
                else if (beLower.includes('tarea') || beLower.includes('task')) matchedTable = APPLICATION_DB_TABLES.find(t => t.name === 'Tareas');
                else if (beLower.includes('iso')) matchedTable = APPLICATION_DB_TABLES.find(t => t.name === 'IsoDocumentacionBitacoras');
                else if (beLower.includes('evento')) matchedTable = APPLICATION_DB_TABLES.find(t => t.name === 'Eventos');
                else if (beLower.includes('chat')) matchedTable = APPLICATION_DB_TABLES.find(t => t.name === 'Chats');
            }

            if (matchedTable) {
                this.edges.push({
                    from: be.id,
                    to: `table_${matchedTable.name.toLowerCase()}`,
                    scope: 'backend',
                    isBridge: false
                });
            } else {
                this.edges.push({
                    from: be.id,
                    to: 'core_sql_database',
                    scope: 'backend',
                    isBridge: false
                });
            }
        }

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

        const labelDB = this.createLayerHeaderSprite('🗄️ NÚCLEO BD (SQL Server)', '#10b981');
        labelDB.position.set(0, 24, 0);
        labelDB.scale.set(36, 6.5, 1);
        this.layerRingsGroup.add(labelDB);
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
    // ETIQUETAS 3D FLOTANTES (NOMBRES DE COMPONENTES FRONT Y BACKEND)
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

        // 1. Componentes y Módulos de FRONTEND (Esfera Exterior)
        const topFeCommunities = [...this.communities]
            .filter(c => c.scope === 'frontend' && c.count >= 6)
            .sort((a, b) => b.count - a.count)
            .slice(0, 36);

        for (const comm of topFeCommunities) {
            const commNodes = this.nodes.filter(n => n.scope === 'frontend' && n.community === comm.cid);
            if (commNodes.length === 0) continue;

            const leader = commNodes.find(n => n.isLeader) || commNodes[0];
            let name = (leader.label || leader.moduleName || comm.label || '')
                .replace(/^\[Corteza Front\]\s*/i, '');

            if (!name || name === 'General' || name.length <= 2) continue;

            const dir = new THREE.Vector3(leader.x, leader.y, leader.z).normalize();
            const sprite = this.createLabelSprite(name, '#f8fafc', '🎨 FRONT', '#38bdf8');
            sprite.position.set(leader.x + dir.x * 7, leader.y + dir.y * 7, leader.z + dir.z * 7);
            sprite.scale.set(16, 4.2, 1);
            this.labelsGroup.add(sprite);
        }

        // 2. Controladores y Servicios de BACKEND API (Esfera Interior / Núcleo)
        const beControllersAndServices = this.nodes
            .filter(n => n.scope === 'backend' && (/controller/i.test(n.label) || /service/i.test(n.label) || n.isLeader))
            .sort((a, b) => (b.degree || 0) - (a.degree || 0))
            .slice(0, 28);

        for (const beNode of beControllersAndServices) {
            let name = (beNode.label || '')
                .replace(/^\[Núcleo API\]\s*/i, '');

            if (!name || name === 'General' || name.length <= 2) continue;

            const dir = new THREE.Vector3(beNode.x, beNode.y, beNode.z).normalize();
            const sprite = this.createLabelSprite(name, '#fef08a', '⚙️ API CORE', '#f59e0b');
            sprite.position.set(beNode.x + dir.x * 5, beNode.y + dir.y * 5, beNode.z + dir.z * 5);
            sprite.scale.set(15, 3.8, 1);
            this.labelsGroup.add(sprite);
        }

        // 3. Tablas principales de BASE DE DATOS en el Núcleo central (R ~ 18)
        const keyTables = this.nodes
            .filter(n => n.fileType === 'database_table' && n.isLeader)
            .slice(0, 16);

        for (const tbl of keyTables) {
            const dir = new THREE.Vector3(tbl.x, tbl.y, tbl.z).normalize();
            const sprite = this.createLabelSprite(tbl.label.replace(/^🗄️\s*/, ''), tbl.color || '#34d399', '🗄️ TABLA SQL', '#10b981');
            sprite.position.set(tbl.x + dir.x * 3.5, tbl.y + dir.y * 3.5, tbl.z + dir.z * 3.5);
            sprite.scale.set(12, 3.2, 1);
            this.labelsGroup.add(sprite);
        }

        this.labelsGroup.visible = this.showModuleLabels;
    }

    private createLabelSprite(text: string, color: string = '#f1f5f9', badgeText?: string, badgeColor?: string): THREE.Sprite {
        const canvas = document.createElement('canvas');
        canvas.width = 280;
        canvas.height = 70;
        const ctx = canvas.getContext('2d')!;

        // Fondo transparente con sombra para legibilidad superior
        ctx.clearRect(0, 0, 280, 70);

        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;

        if (badgeText) {
            ctx.fillStyle = badgeColor || '#38bdf8';
            ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(badgeText, 140, 8);
        }

        // Nombre del componente / controlador
        ctx.fillStyle = color;
        ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = badgeText ? 'bottom' : 'middle';

        const yPos = badgeText ? 58 : 35;
        const displayText = text.length > 20 ? text.substring(0, 18) + '…' : text;
        ctx.fillText(displayText, 140, yPos);

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

            // Rotación viva del Núcleo de Base de Datos y sus anillos orbitales (0, 0, 0)
            if (this.dbCoreMesh) {
                this.dbCoreMesh.rotation.y += 0.007;
                this.dbCoreWireMesh.rotation.x -= 0.01;
                this.dbCoreWireMesh.rotation.y += 0.006;
                if (this.dbCoreRings.length >= 3) {
                    this.dbCoreRings[0].rotation.x += 0.012;
                    this.dbCoreRings[1].rotation.y += 0.015;
                    this.dbCoreRings[2].rotation.z += 0.01;
                }
            }

            // Pulso dinámico en el camino rojo de falla
            if (this.failurePathMesh && this.failurePathMesh.material) {
                const pulse = 0.55 + 0.45 * Math.sin(this.frameCount * 0.12);
                (this.failurePathMesh.material as THREE.LineBasicMaterial).opacity = pulse;
            }

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
        const isRed = color.r > 0.7 && color.g < 0.4;
        const isCyan = color.b > 0.6;
        const tex = isRed ? this.glowTextureRed : (isCyan ? this.glowTextureCyan : this.glowTextureGreen);
        const mat = new THREE.SpriteMaterial({
            map: tex,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 1.0,
            depthWrite: false
        });
        const sprite = new THREE.Sprite(mat);
        sprite.position.copy(pos);
        sprite.scale.set(isRed ? 6 : 4, isRed ? 6 : 4, 1);
        this.scene.add(sprite);

        this.activeBursts.push({
            sprite,
            progress: 0,
            maxScale: isRed ? 32 : 22
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

        const upperColor = colorHex.toUpperCase();
        const isRed = upperColor.includes('FF0055') || upperColor.includes('EF4444') || upperColor.includes('FF1E56') || upperColor.includes('RED');
        const isCyan = upperColor.includes('00F0FF') || upperColor.includes('CYAN');
        const tex = isRed ? this.glowTextureRed : (isCyan ? this.glowTextureCyan : this.glowTextureGreen);

        // 1. Chispa de luz pura con resplandor aditivo
        const sparkMat = new THREE.SpriteMaterial({
            map: tex,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false
        });
        const sparkSprite = new THREE.Sprite(sparkMat);
        sparkSprite.scale.set(isRed ? 16 : 13, isRed ? 16 : 13, 1);
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
            opacity: 0.92,
            blending: THREE.AdditiveBlending,
            linewidth: isRed ? 3 : 2
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
     * Resalta en ROJO CARMESÍ NEÓN el camino sináptico directo entre dos nodos.
     */
    public highlightFailurePath(sourceNode: Graph3DNode, targetNode: Graph3DNode): void {
        this.highlightFailurePathMultiHop([sourceNode, targetNode]);
    }

    /**
     * Resalta en ROJO CARMESÍ NEÓN el camino multicapa completo:
     * (HTML ➔ TS ➔ Frontend Service ➔ Gateway ➔ API Controller ➔ BE Service ➔ Base de Datos SQL Server)
     * cuando ocurre una falla en el flujo.
     */
    public highlightFailurePathMultiHop(chain: Graph3DNode[]): void {
        if (this.failurePathMesh) {
            this.scene.remove(this.failurePathMesh);
            this.failurePathMesh.geometry.dispose();
            (this.failurePathMesh.material as THREE.Material).dispose();
            this.failurePathMesh = undefined;
        }

        const positions: number[] = [];
        const colors: number[] = [];
        const failColor = new THREE.Color('#FF0055');

        // Trazar línea continua entre todos los eslabones de la arquitectura
        for (let i = 0; i < chain.length - 1; i++) {
            const a = chain[i];
            const b = chain[i + 1];
            positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
            colors.push(failColor.r, failColor.g, failColor.b, failColor.r, failColor.g, failColor.b);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const mat = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            linewidth: 3
        });

        this.failurePathMesh = new THREE.LineSegments(geo, mat);
        this.scene.add(this.failurePathMesh);

        this.isFailureActive = true;
        this.lastFailureMessage = 'Error 500';
        this._cdr.markForCheck();

        if (this.failureTimeout) {
            clearTimeout(this.failureTimeout);
        }

        this.failureTimeout = setTimeout(() => {
            if (this.failurePathMesh) {
                this.scene.remove(this.failurePathMesh);
                this.failurePathMesh.geometry.dispose();
                (this.failurePathMesh.material as THREE.Material).dispose();
                this.failurePathMesh = undefined;
            }
            this.isFailureActive = false;
            this._cdr.markForCheck();
        }, 9000);
    }

    // ─────────────────────────────────────────────────────────────
    // NÚCLEO CENTRAL DE BASE DE DATOS 3D (SQL SERVER / DB_JR EN 0,0,0)
    // ─────────────────────────────────────────────────────────────
    private createDatabaseCore(): void {
        this.scene.add(this.dbCoreGroup);

        // 1. Núcleo central de base de datos (Esfera facetada con alto brillo emisivo esmeralda)
        const coreGeo = new THREE.IcosahedronGeometry(13, 2);
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0x059669,
            emissive: 0x10b981,
            emissiveIntensity: 0.9,
            roughness: 0.15,
            metalness: 0.85
        });
        this.dbCoreMesh = new THREE.Mesh(coreGeo, coreMat);
        this.dbCoreGroup.add(this.dbCoreMesh);

        // 2. Jaula holográfica exterior que rota en sentido opuesto
        const wireGeo = new THREE.IcosahedronGeometry(17, 1);
        const wireMat = new THREE.MeshBasicMaterial({
            color: 0x34d399,
            wireframe: true,
            transparent: true,
            opacity: 0.65,
            blending: THREE.AdditiveBlending
        });
        this.dbCoreWireMesh = new THREE.Mesh(wireGeo, wireMat);
        this.dbCoreGroup.add(this.dbCoreWireMesh);

        // 3. Anillos giroscópicos orbitales de datos (Tablas / Shards de SQL Server)
        const ringDefs = [
            { radius: 22, tube: 0.45, color: 0x10b981, rotAxis: 'x' },
            { radius: 26, tube: 0.4, color: 0x38bdf8, rotAxis: 'y' },
            { radius: 30, tube: 0.35, color: 0xa78bfa, rotAxis: 'z' }
        ];

        this.dbCoreRings = [];
        for (const def of ringDefs) {
            const rGeo = new THREE.TorusGeometry(def.radius, def.tube, 8, 48);
            const rMat = new THREE.MeshBasicMaterial({
                color: def.color,
                transparent: true,
                opacity: 0.55,
                blending: THREE.AdditiveBlending
            });
            const rMesh = new THREE.Mesh(rGeo, rMat);
            if (def.rotAxis === 'x') rMesh.rotation.x = Math.PI / 3;
            if (def.rotAxis === 'y') rMesh.rotation.y = Math.PI / 4;
            if (def.rotAxis === 'z') rMesh.rotation.z = Math.PI / 6;
            this.dbCoreGroup.add(rMesh);
            this.dbCoreRings.push(rMesh);
        }

        // 4. Luz puntual de radiación del núcleo central
        this.dbCoreLight = new THREE.PointLight(0x10b981, 4.0, 320);
        this.dbCoreLight.position.set(0, 0, 0);
        this.dbCoreGroup.add(this.dbCoreLight);
    }

    public pulseDatabaseCore(isFailure: boolean = false): void {
        if (!this.dbCoreLight || !this.dbCoreMesh) return;

        const pulseColor = isFailure ? new THREE.Color('#FF0055') : new THREE.Color('#10B981');
        this.dbCoreLight.color.copy(pulseColor);
        this.dbCoreLight.intensity = 9.0;

        const mat = this.dbCoreMesh.material as THREE.MeshStandardMaterial;
        mat.emissive.copy(pulseColor);
        mat.emissiveIntensity = 2.5;
        this.dbCoreMesh.scale.set(1.4, 1.4, 1.4);

        this.spawnSynapticBurst(new THREE.Vector3(0, 0, 0), pulseColor);

        setTimeout(() => {
            if (this.dbCoreLight && this.dbCoreMesh) {
                this.dbCoreLight.color.setHex(0x10b981);
                this.dbCoreLight.intensity = 4.0;
                mat.emissive.setHex(0x10b981);
                mat.emissiveIntensity = 0.9;
                this.dbCoreMesh.scale.set(1, 1, 1);
            }
        }, 550);
    }

    // ─────────────────────────────────────────────────────────────
    // CADENA ARQUITECTÓNICA COMPLETA DE 7 ESLABONES
    // (HTML ➔ TS ➔ FE Service ➔ Gateway ➔ Controller ➔ BE Service ➔ Base de Datos)
    // ─────────────────────────────────────────────────────────────
    public resolveArchitecturalChain(startNode?: Graph3DNode): Graph3DNode[] {
        let feNode = startNode;
        if (!feNode || feNode.scope !== 'frontend') {
            feNode = this.nodes.find(n => n.scope === 'frontend' && (n.isLeader || /component/i.test(n.label))) || this.nodes[0];
        }

        const baseLabel = (feNode.label || 'App').replace(/Component$/i, '');

        // 1. Nodo HTML (Vista del template con el botón click) en R ~ 286
        const dirFE = new THREE.Vector3(feNode.x, feNode.y, feNode.z).normalize();
        const htmlPos = dirFE.clone().multiplyScalar(286);
        const htmlNode: Graph3DNode = {
            id: `html_${feNode.id}`,
            label: `📄 [HTML] ${baseLabel}.component.html <button (click)="guardar()">`,
            moduleName: feNode.moduleName || 'Template HTML',
            color: '#38bdf8',
            borderColor: '#0284c7',
            size: 13,
            community: feNode.community,
            communityName: feNode.communityName,
            sourceFile: `${baseLabel}.component.html`,
            fileType: 'html',
            degree: 1,
            scope: 'frontend',
            x: htmlPos.x,
            y: htmlPos.y,
            z: htmlPos.z,
            visible: true
        };

        // 2. Nodo TypeScript (Componente Angular con método guardar())
        const tsNode: Graph3DNode = feNode;

        // 3. Nodo Servicio Frontend (Angular HttpClient Service)
        const feServices = this.nodes.filter(n => n.scope === 'frontend' && /service/i.test(n.label));
        let feServiceNode = feServices.find(s => s.community === feNode.community) ||
            feServices.find(s => s.label.toLowerCase().includes(baseLabel.toLowerCase())) ||
            feServices[0] ||
            feNode;

        // 4. Gateway / Red / Interceptor HTTP (cruza el vacío entre ambas esferas en R ~ 165)
        const beController = this.findMatchingBackendController(feNode);
        const posFE = new THREE.Vector3(feServiceNode.x, feServiceNode.y, feServiceNode.z);
        const posBE = new THREE.Vector3(beController.x, beController.y, beController.z);
        const midPos = new THREE.Vector3().addVectors(posFE, posBE).multiplyScalar(0.5).normalize().multiplyScalar(165);
        const gatewayNode: Graph3DNode = {
            id: `gateway_${feNode.id}`,
            label: `🌐 [Gateway] AuthInterceptor & Red HTTP`,
            moduleName: 'HTTP Transport Gateway',
            color: '#f59e0b',
            borderColor: '#d97706',
            size: 15,
            community: 998,
            communityName: 'HTTP Wire Transport',
            sourceFile: 'core/interceptors/auth.interceptor.ts',
            fileType: 'gateway',
            degree: 8,
            scope: 'frontend',
            x: midPos.x,
            y: midPos.y,
            z: midPos.z,
            visible: true
        };

        // 5. Controlador ASP.NET Core API
        const controllerNode = beController;

        // 6. Servicio de Negocio en Backend (.NET Business Logic)
        const beServices = this.nodes.filter(n => n.scope === 'backend' && n.id !== 'core_sql_database' && /service/i.test(n.label));
        const beServiceNode = beServices.find(s => s.community === controllerNode.community) ||
            beServices.find(s => s.label.toLowerCase().includes(controllerNode.label.replace(/Controller$/i, '').toLowerCase())) ||
            beServices[0] ||
            controllerNode;

        // 7. Base de Datos Núcleo: Encontrar la tabla específica en el subgrafo del Núcleo de Base de Datos
        const targetTable = this.findMatchingDatabaseTable(feNode, controllerNode);

        return [htmlNode, tsNode, feServiceNode, gatewayNode, controllerNode, beServiceNode, targetTable];
    }

    private findMatchingDatabaseTable(feNode: Graph3DNode, beController: Graph3DNode): Graph3DNode {
        const text = `${feNode.label} ${feNode.moduleName || ''} ${beController.label}`.toLowerCase();

        // 1. Coincidencia directa por nombre de tabla
        for (const t of APPLICATION_DB_TABLES) {
            if (text.includes(t.name.toLowerCase())) {
                const tableNode = this.nodeMap.get(`table_${t.name.toLowerCase()}`);
                if (tableNode) return tableNode;
            }
        }

        // 2. Mapeo semántico por dominio de negocio
        let targetName = 'Cotizaciones';
        if (text.includes('compra') || text.includes('solicitud') || text.includes('proveedor')) targetName = 'SolicitudesCompra';
        else if (text.includes('user') || text.includes('usuario') || text.includes('auth') || text.includes('login') || text.includes('rol')) targetName = 'Usuarios';
        else if (text.includes('proyect') || text.includes('obra')) targetName = 'Proyectos';
        else if (text.includes('gasto') || text.includes('factura') || text.includes('cuenta')) targetName = 'Gastos';
        else if (text.includes('producto') || text.includes('almacen') || text.includes('inventario') || text.includes('kardex')) targetName = 'Productos';
        else if (text.includes('venta') || text.includes('pago')) targetName = 'Ventas';
        else if (text.includes('tarea') || text.includes('task') || text.includes('gantt')) targetName = 'Tareas';
        else if (text.includes('iso') || text.includes('calidad') || text.includes('doc')) targetName = 'IsoDocumentacionBitacoras';
        else if (text.includes('evento') || text.includes('asisten')) targetName = 'Eventos';
        else if (text.includes('chat') || text.includes('mensaje')) targetName = 'Chats';
        else if (text.includes('cliente') || text.includes('lead') || text.includes('prospecto')) targetName = 'Clientes';

        return this.nodeMap.get(`table_${targetName.toLowerCase()}`) || this.nodeMap.get('core_sql_database') || this.nodes[0];
    }

    private findMatchingBackendController(sourceNode: Graph3DNode): Graph3DNode {
        const bridge = this.edges.find(e => e.isBridge && (e.from === sourceNode.id || e.to === sourceNode.id));
        if (bridge) {
            const otherId = bridge.from === sourceNode.id ? bridge.to : bridge.from;
            const target = this.nodeMap.get(otherId);
            if (target && target.scope === 'backend') return target;
        }

        const cleanName = (sourceNode.label || '').replace(/Component$/i, '').toLowerCase();
        const beControllers = this.nodes.filter(n => n.scope === 'backend' && n.id !== 'core_sql_database' && /controller/i.test(n.label));

        const matched = beControllers.find(c => c.label.toLowerCase().includes(cleanName) || cleanName.includes(c.label.replace(/Controller$/i, '').toLowerCase()));
        if (matched) return matched;

        return beControllers.find(c => c.isLeader) || beControllers[0] || this.nodes.find(n => n.scope === 'backend' && n.id !== 'core_sql_database')!;
    }

    /**
     * Recorre TODA la red arquitectónica de un click paso a paso secuencial:
     * HTML ➔ TS ➔ Service ➔ Gateway ➔ API Controller ➔ Service ➔ BD Núcleo (0,0,0) ➔ Retorno a la UI.
     * Si algo falla, se enciende en ROJO carmesí toda la ruta seguida.
     */
    public async executeFullClickPipeline(sourceNode?: Graph3DNode, isFailure: boolean = false): Promise<void> {
        if (this.isPipelineRunning) return;
        this.isPipelineRunning = true;

        const node = sourceNode || this.selectedNode || this.nodes.find(n => n.scope === 'frontend' && (n.isLeader || /component/i.test(n.label))) || this.nodes[0];
        const chain = this.resolveArchitecturalChain(node);
        const [htmlNode, tsNode, feServiceNode, gatewayNode, controllerNode, beServiceNode, dbNode] = chain;

        this.selectNode(tsNode);

        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        const pulseColorForward = '#00F0FF';
        const pulseColorReturn = isFailure ? '#FF0055' : '#00FF88';

        const cleanModuleName = (node.communityName || node.label || 'Cotizaciones')
            .replace(/^📄\s*\[HTML\]\s*/i, '')
            .replace(/Component$/i, '')
            .replace(/Controller$/i, '');

        if (!this.lastActiveUser || this.lastActiveUser === 'Usuario' || this.lastActiveUser === 'Error 500' || this.lastActiveUser === 'Guardado Exitoso') {
            this.lastActiveUser = 'Juan Pérez';
        }
        this.lastActiveModule = cleanModuleName;
        this.lastActiveTime = new Date().toLocaleTimeString();
        this.showActivityBanner = true;

        try {
            // ─────────────────────────────────────────────────────────────
            // ETAPA DE ENVÍO (FORWARD JOURNEY): DE LA VISTA AL NÚCLEO BD
            // ─────────────────────────────────────────────────────────────

            // PASO 1/11: HTML ➔ TS Component
            this.activePipelineStep = {
                stepNumber: 1,
                totalSteps: 11,
                icon: '🖱️',
                phase: 'forward',
                title: 'Evento (Click) en HTML',
                description: `${htmlNode.label} ➔ Invoca método guardar() en ${tsNode.label}`
            };
            this._cdr.markForCheck();
            this.spawnSynapticBurst(new THREE.Vector3(htmlNode.x, htmlNode.y, htmlNode.z), new THREE.Color(pulseColorForward));
            this.emitPulse3D(htmlNode, tsNode, pulseColorForward, 0.038);
            await delay(280);

            // PASO 2/11: TS Component ➔ Angular Service
            this.activePipelineStep = {
                stepNumber: 2,
                totalSteps: 11,
                icon: '⚡',
                phase: 'forward',
                title: 'Lógica en TypeScript',
                description: `${tsNode.label} valida formulario y llama a ${feServiceNode.label}`
            };
            this._cdr.markForCheck();
            this.spawnSynapticBurst(new THREE.Vector3(tsNode.x, tsNode.y, tsNode.z), new THREE.Color(pulseColorForward));
            this.emitPulse3D(tsNode, feServiceNode, pulseColorForward, 0.034);
            await delay(280);

            // PASO 3/11: Angular Service ➔ HTTP Gateway / Red
            this.activePipelineStep = {
                stepNumber: 3,
                totalSteps: 11,
                icon: '🛠️',
                phase: 'forward',
                title: 'Llamada HTTP en Service',
                description: `${feServiceNode.label} genera petición POST y pasa por ${gatewayNode.label}`
            };
            this._cdr.markForCheck();
            this.spawnSynapticBurst(new THREE.Vector3(feServiceNode.x, feServiceNode.y, feServiceNode.z), new THREE.Color(pulseColorForward));
            this.emitPulse3D(feServiceNode, gatewayNode, pulseColorForward, 0.032);
            await delay(320);

            // PASO 4/11: HTTP Gateway ➔ ASP.NET Core API Controller
            this.activePipelineStep = {
                stepNumber: 4,
                totalSteps: 11,
                icon: '🌐',
                phase: 'forward',
                title: 'Cruce de Esferas (Red HTTP)',
                description: `Petición cruza hacia la Esfera Interior API ➔ ${controllerNode.label}`
            };
            this._cdr.markForCheck();
            this.spawnSynapticBurst(new THREE.Vector3(gatewayNode.x, gatewayNode.y, gatewayNode.z), new THREE.Color(pulseColorForward));
            this.emitPulse3D(gatewayNode, controllerNode, pulseColorForward, 0.032);
            await delay(320);

            // PASO 5/11: API Controller ➔ Backend Service
            this.activePipelineStep = {
                stepNumber: 5,
                totalSteps: 11,
                icon: '⚙️',
                phase: 'forward',
                title: 'Controlador ASP.NET Core',
                description: `${controllerNode.label} procesa [HttpPost] y delega a ${beServiceNode.label}`
            };
            this._cdr.markForCheck();
            this.spawnSynapticBurst(new THREE.Vector3(controllerNode.x, controllerNode.y, controllerNode.z), new THREE.Color(pulseColorForward));
            this.emitPulse3D(controllerNode, beServiceNode, pulseColorForward, 0.034);
            await delay(280);

            // PASO 6/11: Backend Service ➔ SQL Server Núcleo (0, 0, 0)
            this.activePipelineStep = {
                stepNumber: 6,
                totalSteps: 11,
                icon: '🧩',
                phase: 'forward',
                title: 'Servicio de Negocio C#',
                description: `${beServiceNode.label} ejecuta SaveChangesAsync() hacia el Núcleo de Base de Datos`
            };
            this._cdr.markForCheck();
            this.spawnSynapticBurst(new THREE.Vector3(beServiceNode.x, beServiceNode.y, beServiceNode.z), new THREE.Color(pulseColorForward));
            this.emitPulse3D(beServiceNode, dbNode, pulseColorForward, 0.036);
            await delay(320);

            // ─────────────────────────────────────────────────────────────
            // ETAPA CENTRAL: NÚCLEO DE BASE DE DATOS (PROCESAMIENTO SQL)
            // ─────────────────────────────────────────────────────────────
            this.activePipelineStep = {
                stepNumber: 7,
                totalSteps: 11,
                icon: '🗄️',
                phase: 'database',
                title: isFailure ? 'Transacción SQL Fallida (Error 500)' : 'Transacción SQL en Núcleo (Commit)',
                description: isFailure
                    ? 'SQL Server detecta violación de restricción / Error de inserción ➔ Rollback y fallo'
                    : 'SQL Server ejecuta INSERT/UPDATE y confirma transacción exitosa',
                isFailure
            };
            this._cdr.markForCheck();

            // Pulso espectacular en el Núcleo 3D
            this.pulseDatabaseCore(isFailure);

            // Destello en la tabla específica del núcleo y sinapsis a tablas con foreign keys
            this.spawnSynapticBurst(new THREE.Vector3(dbNode.x, dbNode.y, dbNode.z), new THREE.Color(isFailure ? '#FF0055' : '#10B981'));
            const fkNeighbors = this.getConnectedNeighbors(dbNode.id)
                .filter(n => n.fileType === 'database_table')
                .slice(0, 3);
            for (const fkn of fkNeighbors) {
                this.emitPulse3D(dbNode, fkn, isFailure ? '#FF0055' : '#10B981', 0.04);
            }

            if (isFailure) {
                // ILUMINAR EN ROJO CARMESÍ TODA LA RUTA SEGUIDA
                this.highlightFailurePathMultiHop(chain);
            }

            await delay(550);

            // ─────────────────────────────────────────────────────────────
            // ETAPA DE RETORNO (RETURN JOURNEY): DEL NÚCLEO A LA UI
            // ─────────────────────────────────────────────────────────────

            // PASO 8/11: Base de Datos ➔ Backend Service
            this.activePipelineStep = {
                stepNumber: 8,
                totalSteps: 11,
                icon: isFailure ? '🚨' : '📦',
                phase: 'return',
                title: isFailure ? 'Retorno de Excepción C#' : 'Retorno de Datos Persistidos',
                description: `${dbNode.label} responde con ${isFailure ? 'DbUpdateException' : 'Entidad persistida con ID'} ➔ ${beServiceNode.label}`,
                isFailure
            };
            this._cdr.markForCheck();
            this.spawnSynapticBurst(new THREE.Vector3(dbNode.x, dbNode.y, dbNode.z), new THREE.Color(pulseColorReturn));
            this.emitPulse3D(dbNode, beServiceNode, pulseColorReturn, 0.036);
            await delay(300);

            // PASO 9/11: Backend Service ➔ API Controller
            this.activePipelineStep = {
                stepNumber: 9,
                totalSteps: 11,
                icon: isFailure ? '🚨' : '⚙️',
                phase: 'return',
                title: isFailure ? 'Código HTTP 500' : 'Código HTTP 200 OK',
                description: `${beServiceNode.label} ➔ ${controllerNode.label} empaqueta respuesta ${isFailure ? 'InternalServerError' : 'Ok(resultado)'}`,
                isFailure
            };
            this._cdr.markForCheck();
            this.spawnSynapticBurst(new THREE.Vector3(beServiceNode.x, beServiceNode.y, beServiceNode.z), new THREE.Color(pulseColorReturn));
            this.emitPulse3D(beServiceNode, controllerNode, pulseColorReturn, 0.034);
            await delay(280);

            // PASO 10/11: API Controller ➔ HTTP Gateway ➔ Frontend Service
            this.activePipelineStep = {
                stepNumber: 10,
                totalSteps: 11,
                icon: isFailure ? '🚨' : '🌐',
                phase: 'return',
                title: 'Retorno por Red a Esfera Front',
                description: `Pasa por ${gatewayNode.label} ➔ Resuelve Observable en ${feServiceNode.label}`,
                isFailure
            };
            this._cdr.markForCheck();
            this.spawnSynapticBurst(new THREE.Vector3(controllerNode.x, controllerNode.y, controllerNode.z), new THREE.Color(pulseColorReturn));
            this.emitPulse3D(controllerNode, gatewayNode, pulseColorReturn, 0.032);
            await delay(220);
            this.emitPulse3D(gatewayNode, feServiceNode, pulseColorReturn, 0.034);
            await delay(280);

            // PASO 11/11: Frontend Service ➔ TypeScript ➔ HTML UI
            this.activePipelineStep = {
                stepNumber: 11,
                totalSteps: 11,
                icon: isFailure ? '❌' : '✅',
                phase: 'return',
                title: isFailure ? 'Falla Reflejada en Pantalla' : 'Respuesta Final en Interfaz',
                description: `${feServiceNode.label} ➔ ${tsNode.label} ➔ ${htmlNode.label} (Notificación y actualización de la vista)`,
                isFailure
            };
            this._cdr.markForCheck();
            this.spawnSynapticBurst(new THREE.Vector3(feServiceNode.x, feServiceNode.y, feServiceNode.z), new THREE.Color(pulseColorReturn));
            this.emitPulse3D(feServiceNode, tsNode, pulseColorReturn, 0.036);
            await delay(200);
            this.emitPulse3D(tsNode, htmlNode, pulseColorReturn, 0.04);
            this.spawnSynapticBurst(new THREE.Vector3(htmlNode.x, htmlNode.y, htmlNode.z), new THREE.Color(pulseColorReturn));

            // Finalizar pipeline manteniendo la identidad del usuario sin mostrar recorrido de texto
            await delay(1200);

            this.lastActiveTime = new Date().toLocaleTimeString();
            this.showActivityBanner = true;

            setTimeout(() => {
                if (this.activePipelineStep && !this.isPipelineRunning) {
                    this.activePipelineStep = null;
                    this._cdr.markForCheck();
                }
            }, 3500);

        } finally {
            this.isPipelineRunning = false;
            this._cdr.markForCheck();
        }
    }

    public triggerSynapticCascade(sourceNode: Graph3DNode, isFailure: boolean = false): void {
        this.executeFullClickPipeline(sourceNode, isFailure);
    }

    public triggerFailureSimulation(): void {
        const feNodes = this.nodes.filter(n => n.scope === 'frontend');
        const node = this.selectedNode || feNodes[Math.floor(Math.random() * feNodes.length)] || this.nodes[0];
        if (node) {
            this.selectedNode = node;
            this.executeFullClickPipeline(node, true);
        }
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

        // Detectar si el evento de navegación o telemetría corresponde a un fallo o error
        const isErrorEvent = /error|fall|fail|excep|500|400|404|rechaz|denied|unauthor/i.test(`${action} ${rawMod} ${rawUrl}`);

        this.selectedNode = matchingNode;
        this.triggerSynapticCascade(matchingNode, isErrorEvent);

        console.log(`🧠 [Red Neuronal] Actividad detectada: ${userName} en "${this.lastActiveModule}" -> Neurona ${matchingNode.label} (Falla: ${isErrorEvent})`);
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
        // Ignorar clics dentro del sidebar, botones flotantes, backdrop o HUD
        if ((event.target as HTMLElement).closest('#sidebar, .floating-sidebar-btn, .sidebar-edge-toggle, .sidebar-backdrop, .hud-topbar')) return;

        if (this.hoveredNode) {
            this.selectNode(this.hoveredNode, false);
            return;
        }

        // Detección directa por tap/click para móviles o dispositivos táctiles
        if (this.containerRef?.nativeElement && this.instancedNodes) {
            const rect = this.containerRef.nativeElement.getBoundingClientRect();
            const clickX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            const clickY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            const clickMouse = new THREE.Vector2(clickX, clickY);
            this.raycaster.setFromCamera(clickMouse, this.camera);
            const intersects = this.raycaster.intersectObject(this.instancedNodes);
            if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
                const node = this.indexToNodeMap.get(intersects[0].instanceId);
                if (node) {
                    this.selectNode(node, false);
                }
            }
        }
    }

    public selectNode(node: Graph3DNode, focusCamera: boolean = false): void {
        this.selectedNode = node;

        // En pantallas móviles, si se selecciona un nodo, abrimos el panel flotante para inspección
        if (this.isMobileView) {
            this.isSidebarOpen = true;
        }

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
        if (this.failureTimeout) {
            clearTimeout(this.failureTimeout);
            this.failureTimeout = null;
        }
        if (this.failurePathMesh) {
            this.scene.remove(this.failurePathMesh);
            this.failurePathMesh.geometry.dispose();
            (this.failurePathMesh.material as THREE.Material).dispose();
            this.failurePathMesh = undefined;
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
        if (this.dbCoreGroup) {
            this.scene.remove(this.dbCoreGroup);
            this.dbCoreGroup.traverse((child) => {
                if ((child as any).geometry) (child as any).geometry.dispose();
                if ((child as any).material) {
                    if (Array.isArray((child as any).material)) {
                        (child as any).material.forEach((m: any) => m.dispose());
                    } else {
                        (child as any).material.dispose();
                    }
                }
            });
        }
        if (this.glowTextureCyan) this.glowTextureCyan.dispose();
        if (this.glowTextureGreen) this.glowTextureGreen.dispose();
        if (this.glowTextureRed) this.glowTextureRed.dispose();

        if (this.renderer) {
            this.renderer.dispose();
            if (this.containerRef?.nativeElement && this.renderer.domElement) {
                this.containerRef.nativeElement.removeChild(this.renderer.domElement);
            }
        }
    }
}
