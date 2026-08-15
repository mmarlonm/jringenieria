import { Injectable, NgZone, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import {
  IMG_H, IMG_W, PLANE_H, PLANE_W, SCALE,
  STAND_COLORS, STANDS_DATA, StandConfig, TOUR, WALLS, rectToWorld,
} from './mapa-evento.models';
import { Subject } from 'rxjs';

type OrbitControlsType = import('three/examples/jsm/controls/OrbitControls.js').OrbitControls;

export interface StandClickEvent {
  stand: StandConfig;
  position: { x: number; y: number };
}

interface LabelRef {
  sprite: THREE.Sprite;
  /** distancia de cámara máxima a la que la etiqueta sigue siendo legible */
  maxDist: number;
  /** alto de la etiqueta en fracción de viewport */
  h: number;
  ratio: number;
}

/** px de imagen → coordenada de mundo */
const wx = (x: number) => (x - IMG_W / 2) * SCALE;
const wz = (y: number) => (y - IMG_H / 2) * SCALE;

const EYE_Y  = 3.4;
const LOOK_Y = 2.0;
const SEG_MS = 3400;

@Injectable()
export class MapaEventoService implements OnDestroy {

  readonly standClick$ = new Subject<StandClickEvent | null>();
  readonly tourStep$   = new Subject<string | null>();
  readonly tooltipPosition$ = new Subject<{ x: number; y: number } | null>();

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControlsType;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private animFrameId = 0;
  private lastTs = 0;

  private standMeshes: THREE.Mesh[] = [];
  private labels: LabelRef[] = [];
  private logoSprites = new Map<string, THREE.Sprite>();
  private labelSprites = new Map<string, THREE.Sprite>();
  private selectedMesh: THREE.Mesh | null = null;
  private hoveredMesh: THREE.Mesh | null = null;
  private baseColors = new WeakMap<THREE.Mesh, THREE.Color>();
  private baseOpacity = new WeakMap<THREE.Mesh, number>();
  private disposables: Array<{ dispose(): void }> = [];

  // Animaciones de Salidas, Área de Comida (Food Trucks, Mesas, Sombrillas) y Mascota Rayito
  private animatedDoors: Array<{ leftDoor: THREE.Mesh; rightDoor: THREE.Mesh; basePosLeft: THREE.Vector3; basePosRight: THREE.Vector3; width: number; axis: 'x' | 'z' }> = [];
  private foodSignGroup!: THREE.Group;
  private foodTrucks: Array<{ group: THREE.Group; baseX: number; wheels: THREE.Mesh[] }> = [];
  private foodUmbrellas: THREE.Mesh[] = [];
  private rayitoGroup!: THREE.Group;
  private rayitoLeftLeg!: THREE.Mesh;
  private rayitoRightLeg!: THREE.Mesh;

  // ── recorrido ───────────────────────────────────────────────────────────────
  private touring = false;
  private tourIdx = 0;
  private pathDistances: number[] = [];
  private totalPathLength = 0;
  private currentPathDist = 0;
  private lastStepTime = 0;
  private firstTourFrame = false;
  private smoothCamPos = new THREE.Vector3();
  private smoothTarget = new THREE.Vector3();
  private smoothRayitoDir = new THREE.Vector3();

  private readonly HOME_POS    = new THREE.Vector3(0, 60, 56);
  private readonly HOME_TARGET = new THREE.Vector3(0, 0, 0);

  constructor(private ngZone: NgZone) {}

  // ══════════════════════════════════════════════════════════════════════════
  async init(canvas: HTMLCanvasElement, mapImageUrl: string): Promise<void> {
    this.buildScene();
    this.buildRenderer(canvas);
    this.camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 400);
    this.camera.position.copy(this.HOME_POS);
    this.camera.lookAt(this.HOME_TARGET);
    await this.buildControls(canvas);
    this.buildLights();
    this.buildFloor(mapImageUrl);
    this.buildWalls();
    this.buildStands();
    this.buildAnimatedDoors();
    this.buildFoodAreaAnimation();
    this.buildRayitoMascot();
    this.buildTour();
    this.ngZone.runOutsideAngular(() => this.animate());
  }

  private buildScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf3f5f9);
    this.scene.fog = new THREE.Fog(0xf3f5f9, 130, 300);
  }

  private buildRenderer(canvas: HTMLCanvasElement): void {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setSize(canvas.clientWidth || 800, canvas.clientHeight || 600, false);
  }

  private buildCamera(canvas: HTMLCanvasElement): void {
    const w = canvas.clientWidth  || 800;
    const h = canvas.clientHeight || 600;
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 400);
    this.camera.position.copy(this.HOME_POS);
    this.camera.lookAt(this.HOME_TARGET);
  }

  private async buildControls(canvas: HTMLCanvasElement): Promise<void> {
    const { OrbitControls } = await import(
      /* webpackChunkName: "orbit-controls" */
      'three/examples/jsm/controls/OrbitControls.js'
    );
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping     = true;
    this.controls.dampingFactor     = 0.08;
    this.controls.maxPolarAngle     = Math.PI / 2.12;
    this.controls.minDistance       = 4;
    this.controls.maxDistance       = 170;
    this.controls.zoomSpeed         = 1.1;
    this.controls.screenSpacePanning = false;
    this.controls.target.copy(this.HOME_TARGET);

    this.controls.addEventListener('change', () => {
      this.updateTooltipPosition();
    });
  }

  private buildLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xc7cfdb, 1.15));

    const dir = new THREE.DirectionalLight(0xffffff, 1.05);
    dir.position.set(-45, 90, 55);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.bias = -0.0006;
    const c = dir.shadow.camera as THREE.OrthographicCamera;
    Object.assign(c, { near: 1, far: 250, left: -80, right: 80, top: 55, bottom: -55 });
    c.updateProjectionMatrix();
    this.scene.add(dir);

    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(50, 45, -50);
    this.scene.add(fill);
  }

  /** Suelo = plano.png a escala 1:1 con el mapeo de STANDS_DATA */
  private buildFloor(mapImageUrl: string): void {
    const geom = new THREE.PlaneGeometry(PLANE_W, PLANE_H);
    const mat  = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0 });
    const floor = new THREE.Mesh(geom, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = 'floor';
    this.scene.add(floor);
    this.disposables.push(geom, mat);

    new THREE.TextureLoader().load(mapImageUrl, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      mat.map = texture;
      mat.needsUpdate = true;
      this.disposables.push(texture);
    });
  }

  /** Muros extruidos desde el plano — dan la sensación de recorrido interior */
  private buildWalls(): void {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2b4a6f, roughness: 0.75, metalness: 0.05,
      transparent: true, opacity: 0.3, depthWrite: false,
      side: THREE.DoubleSide,
    });
    const lineMat = new THREE.LineBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.55 });
    this.disposables.push(mat, lineMat);

    WALLS.forEach((wall) => {
      const b = rectToWorld(wall.rect);
      const geom = new THREE.BoxGeometry(b.w, wall.h, b.d);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(b.px, wall.h / 2, b.pz);
      mesh.renderOrder = 1;
      this.scene.add(mesh);

      const edges = new THREE.EdgesGeometry(geom);
      const wire  = new THREE.LineSegments(edges, lineMat);
      wire.position.copy(mesh.position);
      this.scene.add(wire);
      this.disposables.push(geom, edges);
    });
  }

  private buildStands(): void {
    STANDS_DATA.forEach((cfg) => {
      const baseColor = cfg.color ?? STAND_COLORS[cfg.tipo];
      const ocupado   = cfg.disponible === false;
      const opacity   = cfg.tipo === 'zona' ? 0.55 : cfg.tipo === 'escenario' ? 0.7 : ocupado ? 0.95 : 0.82;
      const area = cfg.w * cfg.d;

      const mat  = new THREE.MeshStandardMaterial({
        color: baseColor,
        transparent: opacity < 1,
        opacity,
        roughness: cfg.tipo === '6x3' ? 0.25 : 0.55,
        metalness: cfg.tipo === '6x3' ? 0.55 : cfg.tipo === '9x3' ? 0.4 : 0.08,
        emissive: new THREE.Color(baseColor).multiplyScalar(0.08),
      });
      this.disposables.push(mat);

      const addHoverData = (m: THREE.Mesh) => {
        this.baseColors.set(m, new THREE.Color(baseColor));
        this.baseOpacity.set(m, opacity);
      };

      if (cfg.esStand) {
        const standGroup = new THREE.Group();
        standGroup.position.set(cfg.px, 0, cfg.pz);

        const floorGeo = new THREE.BoxGeometry(cfg.w, 0.1, cfg.d);
        const floor = new THREE.Mesh(floorGeo, mat);
        floor.position.y = 0.05;
        floor.receiveShadow = true;
        floor.userData = cfg;
        standGroup.add(floor);
        this.standMeshes.push(floor);
        addHoverData(floor);

        const wallGeo = new THREE.BoxGeometry(cfg.w, cfg.h, 0.2);
        const wall = new THREE.Mesh(wallGeo, mat);
        wall.position.set(0, cfg.h / 2, -cfg.d / 2 + 0.1);
        wall.castShadow = true; wall.receiveShadow = true;
        standGroup.add(wall);
        
        const deskW = Math.min(2.0, cfg.w * 0.6);
        const deskGeo = new THREE.BoxGeometry(deskW, 1.0, 0.6);
        const deskMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
        const desk = new THREE.Mesh(deskGeo, deskMat);
        desk.position.set(0, 0.5, cfg.d / 2 - 0.5);
        desk.castShadow = true; desk.receiveShadow = true;
        standGroup.add(desk);

        const tvGeo = new THREE.BoxGeometry(1.8, 1.0, 0.1);
        const tvMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
        const tv = new THREE.Mesh(tvGeo, tvMat);
        tv.position.set(0, cfg.h * 0.6, -cfg.d / 2 + 0.25);
        standGroup.add(tv);

        // Techo del stand (Roof)
        const roofGeo = new THREE.BoxGeometry(cfg.w, 0.1, cfg.d);
        const roof = new THREE.Mesh(roofGeo, mat);
        roof.position.y = cfg.h; // Colocar el techo en la parte superior
        roof.castShadow = true;
        roof.receiveShadow = true;
        standGroup.add(roof);

        const edges = new THREE.EdgesGeometry(wallGeo);
        const edgeMat = new THREE.LineBasicMaterial({ color: new THREE.Color(baseColor).multiplyScalar(0.45) });
        const wire = new THREE.LineSegments(edges, edgeMat);
        wire.position.copy(wall.position);
        standGroup.add(wire);

        this.scene.add(standGroup);
        this.disposables.push(floorGeo, wallGeo, deskGeo, deskMat, tvGeo, tvMat, roofGeo, edges, edgeMat);
        this.addLabel(cfg, cfg.px, cfg.h + 0.9, cfg.pz, area);

      } else if (cfg.tipo === 'escenario') {
        const stageGroup = new THREE.Group();
        stageGroup.position.set(cfg.px, 0, cfg.pz);

        const platGeo = new THREE.BoxGeometry(cfg.w, 0.6, cfg.d);
        const platform = new THREE.Mesh(platGeo, mat);
        platform.position.y = 0.3;
        platform.receiveShadow = true;
        platform.userData = cfg;
        stageGroup.add(platform);
        this.standMeshes.push(platform);
        addHoverData(platform);

        const stairW = 2.0;
        const stairGeo1 = new THREE.BoxGeometry(stairW, 0.2, 1.5);
        const stair1 = new THREE.Mesh(stairGeo1, mat);
        stair1.position.set(cfg.w / 2 + stairW / 2, 0.1, 0);
        stageGroup.add(stair1);

        const stairGeo2 = new THREE.BoxGeometry(stairW, 0.4, 1.0);
        const stair2 = new THREE.Mesh(stairGeo2, mat);
        stair2.position.set(cfg.w / 2 + stairW / 2, 0.2, 0);
        stageGroup.add(stair2);

        const podiumGeo = new THREE.BoxGeometry(0.8, 1.2, 0.6);
        const podiumMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
        const podium = new THREE.Mesh(podiumGeo, podiumMat);
        podium.position.set(-cfg.w / 4, 0.6 + 0.6, 1.0);
        podium.castShadow = true;
        stageGroup.add(podium);

        const screenGeo = new THREE.BoxGeometry(0.2, 3.0, cfg.d * 0.7);
        const screenMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(-cfg.w / 2 + 0.5, 2.1, 0);
        stageGroup.add(screen);

        this.scene.add(stageGroup);
        this.disposables.push(platGeo, stairGeo1, stairGeo2, podiumGeo, podiumMat, screenGeo, screenMat);
        this.addLabel(cfg, cfg.px, cfg.h + 0.9, cfg.pz, area);

      } else {
        const geom = new THREE.BoxGeometry(cfg.w, cfg.h, cfg.d);
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(cfg.px, cfg.h / 2, cfg.pz);
        mesh.castShadow = mesh.receiveShadow = true;
        mesh.userData = cfg;
        this.scene.add(mesh);
        this.standMeshes.push(mesh);
        addHoverData(mesh);

        const edges = new THREE.EdgesGeometry(geom);
        const edgeMat = new THREE.LineBasicMaterial({ color: new THREE.Color(baseColor).multiplyScalar(0.45) });
        const wire = new THREE.LineSegments(edges, edgeMat);
        wire.position.copy(mesh.position);
        this.scene.add(wire);

        this.disposables.push(geom, edges, edgeMat);
        this.addLabel(cfg, cfg.px, cfg.h + 0.9, cfg.pz, area);
      }
    });
  }

  /**
   * Etiqueta como sprite con `sizeAttenuation: false` → tamaño constante en
   * pantalla (siempre legible, sin importar el zoom). Se ocultan por distancia
   * para evitar el amontonamiento que hacía ilegibles los títulos.
   */
  private addLabel(cfg: StandConfig, x: number, y: number, z: number, area: number): void {
    const lines   = cfg.label.split('\n');
    const dpr     = 2;
    const fs      = 34;          // px lógicos
    const lh      = fs * 1.24;
    const padX    = 18;
    const padY    = 10;
    const subFs   = 26;

    const measure = document.createElement('canvas').getContext('2d')!;
    measure.font = `700 ${fs}px Inter, Arial, sans-serif`;
    let tw = measure.measureText(lines[0]).width;
    measure.font = `500 ${subFs}px Inter, Arial, sans-serif`;
    for (let i = 1; i < lines.length; i++) tw = Math.max(tw, measure.measureText(lines[i]).width);

    const cw = Math.ceil(tw + padX * 2);
    const ch = Math.ceil(lines.length * lh + padY * 2);

    const c   = document.createElement('canvas');
    c.width   = cw * dpr;
    c.height  = ch * dpr;
    const ctx = c.getContext('2d')!;
    ctx.scale(dpr, dpr);

    // Píldora blanca con borde del color del stand
    const accent = `#${new THREE.Color(cfg.color ?? STAND_COLORS[cfg.tipo]).getHexString()}`;
    ctx.fillStyle   = 'rgba(255,255,255,0.94)';
    ctx.strokeStyle = accent;
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.roundRect(2, 2, cw - 4, ch - 4, Math.min(14, ch / 2));
    ctx.fill();
    ctx.stroke();

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((line, i) => {
      const isFirst = i === 0;
      ctx.font      = isFirst ? `700 ${fs}px Inter, Arial, sans-serif` : `500 ${subFs}px Inter, Arial, sans-serif`;
      ctx.fillStyle = isFirst ? '#0f172a' : '#5b6779';
      ctx.fillText(line, cw / 2, padY + lh * (i + 0.5));
    });

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const spriteMat = new THREE.SpriteMaterial({
      map: tex, transparent: true, depthTest: false, depthWrite: false, sizeAttenuation: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(x, y, z);
    sprite.renderOrder = 20;
    sprite.userData = { standId: cfg.id, isLabel: true };

    // Alto en fracción de viewport (constante en pantalla)
    const h     = area > 40 ? 0.038 : area > 18 ? 0.032 : 0.027;
    const ratio = cw / ch;
    sprite.scale.set(h * ratio, h, 1);

    this.scene.add(sprite);
    this.labelSprites.set(cfg.id, sprite);
    this.labels.push({ sprite, h, ratio, maxDist: area > 40 ? 260 : area > 18 ? 120 : 78 });
    this.disposables.push(tex, spriteMat);
  }

  private buildAnimatedDoors(): void {
    const doorExits = [
      // 1. Entrada / Salida Principal en el muro divisorio del salón
      { name: 'ENTRADA_PPAL', px: wx(1036), pz: wz(447), w: 5.2, h: 3.4, axis: 'z' as const },
      
      // 2. Salida al Área de Alimentos / Café Izquierda (entre B16 y B17)
      { name: 'SALIDA_CAFE_IZQ', px: wx(735), pz: wz(694), w: 4.2, h: 3.2, axis: 'x' as const },

      // 3. Salida al Área de Alimentos / Café Derecha (entre B12 y B13)
      { name: 'SALIDA_CAFE_DER', px: wx(475), pz: wz(694), w: 4.2, h: 3.2, axis: 'x' as const },

      // 4. Entrada / Salida Descarga Norte
      { name: 'DESCARGA_N', px: wx(82), pz: wz(330), w: 4.5, h: 3.4, axis: 'z' as const },

      // 5. Entrada / Salida Descarga Sur
      { name: 'DESCARGA_S', px: wx(82), pz: wz(460), w: 4.5, h: 3.4, axis: 'z' as const },

      // 6. Acceso a Escenarios
      { name: 'ACCESO_ESC', px: wx(443), pz: wz(365), w: 4.8, h: 3.4, axis: 'z' as const },
    ];

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, roughness: 0.2, metalness: 0.85
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8, transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.95
    });
    const signMat = new THREE.MeshStandardMaterial({
      color: 0x059669, emissive: 0x10b981, emissiveIntensity: 0.85, roughness: 0.3
    });

    this.disposables.push(frameMat, glassMat, signMat);

    doorExits.forEach((exit) => {
      const postWidth = 0.22;
      const frameDepth = 1.2;
      const portalGroup = new THREE.Group();

      // 1. MARCO DEL PORTAL (Postes y Dintel Superior)
      const postGeom = exit.axis === 'x'
        ? new THREE.BoxGeometry(postWidth, exit.h, frameDepth)
        : new THREE.BoxGeometry(frameDepth, exit.h, postWidth);
      
      const leftPost = new THREE.Mesh(postGeom, frameMat);
      if (exit.axis === 'x') {
        leftPost.position.set(exit.px - exit.w / 2, exit.h / 2, exit.pz);
      } else {
        leftPost.position.set(exit.px, exit.h / 2, exit.pz - exit.w / 2);
      }
      portalGroup.add(leftPost);

      const rightPost = new THREE.Mesh(postGeom, frameMat);
      if (exit.axis === 'x') {
        rightPost.position.set(exit.px + exit.w / 2, exit.h / 2, exit.pz);
      } else {
        rightPost.position.set(exit.px, exit.h / 2, exit.pz + exit.w / 2);
      }
      portalGroup.add(rightPost);

      const lintelGeom = exit.axis === 'x'
        ? new THREE.BoxGeometry(exit.w + postWidth, 0.3, frameDepth)
        : new THREE.BoxGeometry(frameDepth, 0.3, exit.w + postWidth);
      const lintel = new THREE.Mesh(lintelGeom, frameMat);
      lintel.position.set(exit.px, exit.h + 0.15, exit.pz);
      portalGroup.add(lintel);

      // 2. HOJAS DOBLES DE CRISTAL CORREDERAS
      const doorW = (exit.w / 2) * 0.94;
      const doorH = exit.h * 0.96;
      const doorD = 0.08;

      const doorGroupLeft = new THREE.Group();
      const doorGroupRight = new THREE.Group();

      const glassGeom = exit.axis === 'x'
        ? new THREE.BoxGeometry(doorW, doorH, doorD)
        : new THREE.BoxGeometry(doorD, doorH, doorW);

      const glassLeft = new THREE.Mesh(glassGeom, glassMat);
      doorGroupLeft.add(glassLeft);

      const glassRight = new THREE.Mesh(glassGeom, glassMat);
      doorGroupRight.add(glassRight);

      const basePosLeft = exit.axis === 'x'
        ? new THREE.Vector3(exit.px - doorW / 2, exit.h / 2, exit.pz)
        : new THREE.Vector3(exit.px, exit.h / 2, exit.pz - doorW / 2);

      const basePosRight = exit.axis === 'x'
        ? new THREE.Vector3(exit.px + doorW / 2, exit.h / 2, exit.pz)
        : new THREE.Vector3(exit.px, exit.h / 2, exit.pz + doorW / 2);

      doorGroupLeft.position.copy(basePosLeft);
      doorGroupRight.position.copy(basePosRight);

      portalGroup.add(doorGroupLeft);
      portalGroup.add(doorGroupRight);

      // 3. LETRERO LUMINOSO "SALIDA / EXIT"
      const signGeom = exit.axis === 'x'
        ? new THREE.BoxGeometry(exit.w * 0.7, 0.45, 0.2)
        : new THREE.BoxGeometry(0.2, 0.45, exit.w * 0.7);
      const signMesh = new THREE.Mesh(signGeom, signMat);
      signMesh.position.set(exit.px, exit.h + 0.5, exit.pz);
      portalGroup.add(signMesh);

      this.scene.add(portalGroup);

      this.animatedDoors.push({
        leftDoor: doorGroupLeft as any,
        rightDoor: doorGroupRight as any,
        basePosLeft,
        basePosRight,
        width: doorW,
        axis: exit.axis
      });

      this.disposables.push(postGeom, lintelGeom, glassGeom, signGeom);
    });
  }

  private buildFoodAreaAnimation(): void {
    const foodZ = wz(770);

    // 1. CARRI TOS DE COMIDA 3D (FOOD TRUCKS EN MOVIMIENTO)
    const truckConfigs = [
      { name: 'Coffee & Snacks', color: 0x1e293b, baseX: wx(310) },
      { name: 'Street Eats', color: 0x334155, baseX: wx(860) }
    ];

    truckConfigs.forEach((cfg) => {
      const truckGroup = new THREE.Group();
      truckGroup.position.set(cfg.baseX, 0, foodZ);

      // Carrocería del Food Truck
      const bodyGeom = new THREE.BoxGeometry(3.4, 1.8, 1.8);
      const bodyMat  = new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.3, metalness: 0.7 });
      const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
      bodyMesh.position.y = 1.1;
      truckGroup.add(bodyMesh);

      // Ventana de atención al cliente
      const windowGeom = new THREE.BoxGeometry(1.8, 0.8, 0.05);
      const windowMat  = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75, roughness: 0.1 });
      const windowMesh = new THREE.Mesh(windowGeom, windowMat);
      windowMesh.position.set(0, 1.2, 0.91);
      truckGroup.add(windowMesh);

      // Toldo de terraza sobre la ventana
      const awningGeom = new THREE.BoxGeometry(2.0, 0.08, 0.6);
      const awningMat  = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
      const awningMesh = new THREE.Mesh(awningGeom, awningMat);
      awningMesh.position.set(0, 1.65, 1.1);
      awningMesh.rotation.x = 0.25;
      truckGroup.add(awningMesh);

      // Ruedas (4 ruedas)
      const wheelGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 16);
      const wheelMat  = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
      const wheels: THREE.Mesh[] = [];

      const wheelPositions = [
        [-1.0, 0.35, 0.9], [1.0, 0.35, 0.9],
        [-1.0, 0.35, -0.9], [1.0, 0.35, -0.9]
      ];

      wheelPositions.forEach(([x, y, z]) => {
        const wheel = new THREE.Mesh(wheelGeom, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, y, z);
        truckGroup.add(wheel);
        wheels.push(wheel);
      });

      // Luces delanteras cálidas
      const lightL = new THREE.PointLight(0xfef08a, 1.2, 6);
      lightL.position.set(-1.7, 0.8, 0.5);
      truckGroup.add(lightL);

      this.scene.add(truckGroup);
      this.foodTrucks.push({ group: truckGroup, baseX: cfg.baseX, wheels });
      this.disposables.push(bodyGeom, bodyMat, windowGeom, windowMat, awningGeom, awningMat, wheelGeom, wheelMat);
    });

    // 2. MESAS Y SOMBRILLAS DE COMIDA 3D (TERRAZA DE ALIMENTOS)
    const tablePositions = [wx(440), wx(540), wx(650), wx(750)];
    const umbrellaColors = [0xef4444, 0x3b82f6, 0xf59e0b, 0x10b981];

    tablePositions.forEach((tx, idx) => {
      const tableGroup = new THREE.Group();
      tableGroup.position.set(tx, 0, foodZ);

      // Mesa redonda
      const tableTopGeom = new THREE.CylinderGeometry(0.9, 0.9, 0.08, 20);
      const tableMat     = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.3 });
      const tableTop     = new THREE.Mesh(tableTopGeom, tableMat);
      tableTop.position.y = 0.75;
      tableGroup.add(tableTop);

      // Poste de la sombrilla
      const poleGeom = new THREE.CylinderGeometry(0.05, 0.05, 2.4, 12);
      const poleMat  = new THREE.MeshStandardMaterial({ color: 0x475569 });
      const pole     = new THREE.Mesh(poleGeom, poleMat);
      pole.position.y = 1.2;
      tableGroup.add(pole);

      // Sombrilla de terraza (Cono)
      const umbrellaGeom = new THREE.ConeGeometry(1.4, 0.6, 16);
      const umbrellaMat  = new THREE.MeshStandardMaterial({
        color: umbrellaColors[idx % umbrellaColors.length],
        roughness: 0.5,
        side: THREE.DoubleSide
      });
      const umbrella = new THREE.Mesh(umbrellaGeom, umbrellaMat);
      umbrella.position.y = 2.2;
      tableGroup.add(umbrella);
      this.foodUmbrellas.push(umbrella);

      this.scene.add(tableGroup);
      this.disposables.push(tableTopGeom, tableMat, poleGeom, poleMat, umbrellaGeom, umbrellaMat);
    });
  }

  private buildRayitoMascot(): void {
    this.rayitoGroup = new THREE.Group();

    // 1. Cuerpo de Rayo 3D Estilizado Original
    const shape = new THREE.Shape();
    shape.moveTo(0, 1.8);
    shape.lineTo(-0.7, 0.4);
    shape.lineTo(-0.15, 0.4);
    shape.lineTo(-0.6, -0.9);
    shape.lineTo(0.7, 0.1);
    shape.lineTo(0.15, 0.1);
    shape.lineTo(0.6, 1.0);
    shape.closePath();

    const extrudeSettings = { depth: 0.35, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: 0.06, bevelThickness: 0.06 };
    const rayGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const rayMat  = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xd97706,
      emissiveIntensity: 0.5,
      metalness: 0.4,
      roughness: 0.15,
    });
    const rayMesh = new THREE.Mesh(rayGeom, rayMat);
    rayMesh.position.set(0, 0.9, -0.175);
    this.rayitoGroup.add(rayMesh);

    // 2. Ojos Grandes y Expresivos
    const eyeGeom = new THREE.SphereGeometry(0.12, 16, 16);
    const eyeMat  = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1 });
    
    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    leftEye.position.set(-0.2, 1.15, 0.22);
    this.rayitoGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
    rightEye.position.set(0.2, 1.15, 0.22);
    this.rayitoGroup.add(rightEye);

    const pupilGeom = new THREE.SphereGeometry(0.04, 12, 12);
    const pupilMat  = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    const p1 = new THREE.Mesh(pupilGeom, pupilMat);
    p1.position.set(-0.17, 1.18, 0.32);
    this.rayitoGroup.add(p1);

    const p2 = new THREE.Mesh(pupilGeom, pupilMat);
    p2.position.set(0.23, 1.18, 0.32);
    this.rayitoGroup.add(p2);

    const blushGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16);
    const blushMat  = new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.7 });
    
    const b1 = new THREE.Mesh(blushGeom, blushMat);
    b1.rotation.x = Math.PI / 2;
    b1.position.set(-0.35, 1.0, 0.2);
    this.rayitoGroup.add(b1);

    const b2 = new THREE.Mesh(blushGeom, blushMat);
    b2.rotation.x = Math.PI / 2;
    b2.position.set(0.35, 1.0, 0.2);
    this.rayitoGroup.add(b2);

    // 3. Brazos y Guantes Blancos Animados
    const armGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.45, 12);
    const armMat  = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2 });
    const gloveGeom = new THREE.SphereGeometry(0.1, 16, 16);
    const gloveMat  = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });

    const leftArm = new THREE.Mesh(armGeom, armMat);
    leftArm.rotation.z = Math.PI / 3;
    leftArm.position.set(-0.45, 0.8, 0);
    const leftGlove = new THREE.Mesh(gloveGeom, gloveMat);
    leftGlove.position.set(0, -0.22, 0);
    leftArm.add(leftGlove);
    this.rayitoGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeom, armMat);
    rightArm.rotation.z = -Math.PI / 3;
    rightArm.position.set(0.45, 0.8, 0);
    const rightGlove = new THREE.Mesh(gloveGeom, gloveMat);
    rightGlove.position.set(0, -0.22, 0);
    rightArm.add(rightGlove);
    this.rayitoGroup.add(rightArm);

    // 4. Piernas y Tenis Blancos
    const legGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 12);
    const legMat  = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });

    this.rayitoLeftLeg = new THREE.Mesh(legGeom, legMat);
    this.rayitoLeftLeg.position.set(-0.22, 0.25, 0);
    this.rayitoGroup.add(this.rayitoLeftLeg);

    this.rayitoRightLeg = new THREE.Mesh(legGeom, legMat);
    this.rayitoRightLeg.position.set(0.22, 0.25, 0);
    this.rayitoGroup.add(this.rayitoRightLeg);

    const shoeGeom = new THREE.BoxGeometry(0.18, 0.14, 0.3);
    const shoeMat  = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });

    const leftShoe = new THREE.Mesh(shoeGeom, shoeMat);
    leftShoe.position.set(0, -0.25, 0.08);
    this.rayitoLeftLeg.add(leftShoe);

    const rightShoe = new THREE.Mesh(shoeGeom, shoeMat);
    rightShoe.position.set(0, -0.25, 0.08);
    this.rayitoRightLeg.add(rightShoe);

    // 5. Luz y Aura Dorada
    const rayLight = new THREE.PointLight(0xfacc15, 2.5, 12);
    rayLight.position.set(0, 1.2, 0.2);
    this.rayitoGroup.add(rayLight);

    this.rayitoGroup.scale.set(0.9, 0.9, 0.9);
    this.rayitoGroup.visible = false;
    this.scene.add(this.rayitoGroup);

    this.disposables.push(rayGeom, rayMat, eyeGeom, eyeMat, pupilGeom, pupilMat, blushGeom, blushMat, armGeom, armMat, gloveGeom, gloveMat, legGeom, legMat, shoeGeom, shoeMat);
  }

  private getPointAtDist(d: number): { p: [number, number], index: number } {
    if (d <= 0) return { p: TOUR[0].p, index: 0 };
    if (d >= this.totalPathLength) return { p: TOUR[TOUR.length - 1].p, index: TOUR.length - 1 };
    
    for (let i = 0; i < this.pathDistances.length - 1; i++) {
      if (d >= this.pathDistances[i] && d <= this.pathDistances[i+1]) {
        const segDist = this.pathDistances[i+1] - this.pathDistances[i];
        const t = segDist > 0 ? (d - this.pathDistances[i]) / segDist : 0;
        const A = TOUR[i].p;
        const B = TOUR[i+1].p;
        const px = A[0] + (B[0] - A[0]) * t;
        const py = A[1] + (B[1] - A[1]) * t;
        return { p: [px, py], index: i };
      }
    }
    return { p: TOUR[TOUR.length - 1].p, index: TOUR.length - 1 };
  }

  private buildTour(): void {
    this.pathDistances = [0];
    this.totalPathLength = 0;
    for (let i = 0; i < TOUR.length - 1; i++) {
      const A = TOUR[i].p;
      const B = TOUR[i+1].p;
      const dist = Math.hypot(B[0] - A[0], B[1] - A[1]);
      this.totalPathLength += dist;
      this.pathDistances.push(this.totalPathLength);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  private animate(): void {
    this.animFrameId = requestAnimationFrame(() => this.animate());
    const now = performance.now();
    const dt  = this.lastTs ? Math.min(0.1, (now - this.lastTs) / 1000) : 0;
    this.lastTs = now;

    this.updateDoors(now);
    this.updateFoodArea(now, dt);

    if (this.touring) {
      this.updateTour(now);
    } else {
      if (this.rayitoGroup) this.rayitoGroup.visible = false;
      this.controls?.update();
    }

    this.updateLabels();
    this.renderer.render(this.scene, this.camera);
  }

  private updateDoors(now: number): void {
    const openFactor = Math.pow(Math.sin(now * 0.0008), 2);
    for (const door of this.animatedDoors) {
      const offset = openFactor * (door.width * 0.85);
      if (door.axis === 'x') {
        door.leftDoor.position.x = door.basePosLeft.x - offset;
        door.rightDoor.position.x = door.basePosRight.x + offset;
      } else {
        door.leftDoor.position.z = door.basePosLeft.z - offset;
        door.rightDoor.position.z = door.basePosRight.z + offset;
      }
    }
  }

  private updateFoodArea(now: number, dt: number): void {
    // Sombrillas y food trucks estáticos (sin movimiento a petición del usuario)
    // Sólo rotación muy sutil para las sombrillas
    for (const umbrella of this.foodUmbrellas) {
      umbrella.rotation.y += dt * 0.15;
    }
  }

  private updateRayitoFixed(now: number, dt: number, rayPos: THREE.Vector3, dir2D: THREE.Vector3): void {
    if (!this.rayitoGroup) return;
    this.rayitoGroup.visible = true;

    // Calcular altura del piso
    rayPos.y = 10;
    this.raycaster.set(rayPos, new THREE.Vector3(0, -1, 0));
    
    const validObjects: THREE.Object3D[] = [];
    this.scene.traverse((obj) => {
      if (obj.name === 'floor' || obj.name === 'stage_platform') {
        validObjects.push(obj);
      }
    });

    const hits = this.raycaster.intersectObjects(validObjects, false);
    let floorY = 0;
    if (hits.length > 0) {
      floorY = hits[0].point.y;
    }

    const walkCycle = Math.sin(now * 0.008); // Pasos ligeramente más lentos acordes a la nueva velocidad
    rayPos.y = floorY + Math.abs(walkCycle) * 0.35;

    this.rayitoGroup.position.copy(rayPos);

    // Suavizado de la rotación de Rayito para que no gire como robot en las esquinas
    if (this.firstTourFrame) {
      this.smoothRayitoDir.copy(dir2D);
    } else {
      const lerpFactor = 1 - Math.pow(0.85, dt / 16);
      this.smoothRayitoDir.lerp(dir2D, lerpFactor).normalize();
    }
    
    this.rayitoGroup.lookAt(rayPos.x + this.smoothRayitoDir.x, rayPos.y, rayPos.z + this.smoothRayitoDir.z);

    if (this.rayitoLeftLeg && this.rayitoRightLeg) {
      this.rayitoLeftLeg.rotation.x = walkCycle * 0.7;
      this.rayitoRightLeg.rotation.x = -walkCycle * 0.7;
    }
  }

  private updateLabels(): void {
    const cam = this.camera.position;
    for (const l of this.labels) {
      const d = cam.distanceTo(l.sprite.position);
      const fade = 1 - Math.min(1, Math.max(0, (d - l.maxDist * 0.78) / (l.maxDist * 0.22)));
      l.sprite.visible = fade > 0.02;
      (l.sprite.material as THREE.SpriteMaterial).opacity = fade;
    }
  }

  private updateTour(now: number): void {
    let dt = now - this.lastStepTime;
    if (dt > 100) dt = 16;
    this.lastStepTime = now;

    // Velocidad constante: 55 pixeles de mapa por segundo (mucho más lento y suave)
    const speed = 55 * (dt / 1000); 
    this.currentPathDist += speed;
    
    if (this.currentPathDist >= this.totalPathLength) {
       this.currentPathDist = this.totalPathLength;
       this.stopTour();
       return;
    }

    const camData = this.getPointAtDist(this.currentPathDist);
    if (camData.index !== this.tourIdx) {
       this.tourIdx = camData.index;
       this.ngZone.run(() => this.tourStep$.next(TOUR[this.tourIdx].titulo));
    }

    // Rayito siempre va 50 pixeles por delante sobre el MISMO path
    const rayitoData = this.getPointAtDist(this.currentPathDist + 50);
    
    // LookTarget de la cámara 80 pixeles por delante para anticipar las curvas
    const lookData = this.getPointAtDist(this.currentPathDist + 80);

    const cx = wx(camData.p[0]); const cz = wz(camData.p[1]);
    const rx = wx(rayitoData.p[0]); const rz = wz(rayitoData.p[1]);
    const lx = wx(lookData.p[0]); const lz = wz(lookData.p[1]);

    const camPos = new THREE.Vector3(cx, EYE_Y, cz);
    const targetVector = new THREE.Vector3(lx, LOOK_Y, lz);

    if (this.firstTourFrame) {
       this.smoothCamPos.copy(camPos);
       this.smoothTarget.copy(targetVector);
    } else {
       // Lerp orgánico para hacer que la cámara tome las curvas de forma curvilínea muy suave
       const lerpFactor = 1 - Math.pow(0.94, dt / 16);
       this.smoothCamPos.lerp(camPos, lerpFactor);
       this.smoothTarget.lerp(targetVector, lerpFactor);
    }

    this.camera.position.copy(this.smoothCamPos);
    if (this.smoothCamPos.distanceTo(this.smoothTarget) > 0.1) {
       this.controls.target.copy(this.smoothTarget);
       this.camera.lookAt(this.smoothTarget);
    }
    this.updateTooltipPosition();

    // Calcular dirección real para Rayito
    const prevRayito = this.getPointAtDist(this.currentPathDist + 49);
    const prx = wx(prevRayito.p[0]); const prz = wz(prevRayito.p[1]);
    const dir2D = new THREE.Vector3(rx - prx, 0, rz - prz).normalize();
    
    if (dir2D.lengthSq() < 0.1) {
      dir2D.copy(new THREE.Vector3().subVectors(this.smoothTarget, this.smoothCamPos).normalize());
      dir2D.y = 0;
      dir2D.normalize();
    }

    const rayPos = new THREE.Vector3(rx, 10, rz);
    this.updateRayitoFixed(now, dt, rayPos, dir2D);
    
    this.firstTourFrame = false;
  }

  startTour(): void {
    if (!this.controls) return;
    this.touring     = true;
    this.tourIdx     = 0;
    this.currentPathDist = 0;
    this.lastStepTime = performance.now();
    this.firstTourFrame = true;
    this.controls.enabled = false;
    this.ngZone.run(() => this.tourStep$.next(TOUR[0].titulo));
  }

  stopTour(): void {
    if (!this.touring) return;
    this.touring = false;
    this.controls.enabled = true;
    this.controls.update();
    this.ngZone.run(() => this.tourStep$.next(null));
  }

  get isTouring(): boolean { return this.touring; }

  resetView(): void {
    this.stopTour();
    this.camera.position.copy(this.HOME_POS);
    this.controls.target.copy(this.HOME_TARGET);
    this.camera.lookAt(this.HOME_TARGET);
    this.controls.update();
  }

  onResize(width: number, height: number): void {
    if (!width || !height) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  showStandLogo(stand: any, logoDataUrl: string | null): void {
    if (!logoDataUrl) return;

    const mesh = this.standMeshes.find(m => m.userData.id === stand.id);
    if (!mesh) return;

    // Evitar duplicados
    if (this.logoSprites.has(stand.id)) return;

    // Cargar imagen del logo
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(logoDataUrl, (logoTexture) => {
      logoTexture.colorSpace = THREE.SRGBColorSpace;

      const planeW = stand.w;
      const planeD = stand.d;
      const planeH = stand.h;

      const mat = new THREE.MeshStandardMaterial({
        map: logoTexture,
        transparent: true,
        roughness: 0.6,
        metalness: 0.1,
        side: THREE.DoubleSide
      });

      const group = new THREE.Group();
      group.userData = { standId: stand.id, isLogo: true };

      // 1. CARA TOP (+Y)
      const geomTop = new THREE.PlaneGeometry(planeW, planeD);
      const meshTop = new THREE.Mesh(geomTop, mat);
      meshTop.position.set(0, stand.h / 2 + 0.005, 0);
      meshTop.rotation.x = -Math.PI / 2;
      meshTop.receiveShadow = true;
      group.add(meshTop);

      // 2. CARA FRONT (+Z)
      const geomFront = new THREE.PlaneGeometry(planeW, planeH);
      const meshFront = new THREE.Mesh(geomFront, mat);
      meshFront.position.set(0, 0, planeD / 2 + 0.005);
      meshFront.receiveShadow = true;
      group.add(meshFront);

      // 3. CARA BACK (-Z)
      const geomBack = new THREE.PlaneGeometry(planeW, planeH);
      const meshBack = new THREE.Mesh(geomBack, mat);
      meshBack.position.set(0, 0, -(planeD / 2 + 0.005));
      meshBack.rotation.y = Math.PI;
      meshBack.receiveShadow = true;
      group.add(meshBack);

      // 4. CARA LEFT (-X)
      const geomLeft = new THREE.PlaneGeometry(planeD, planeH);
      const meshLeft = new THREE.Mesh(geomLeft, mat);
      meshLeft.position.set(-(planeW / 2 + 0.005), 0, 0);
      meshLeft.rotation.y = -Math.PI / 2;
      meshLeft.receiveShadow = true;
      group.add(meshLeft);

      // 5. CARA RIGHT (+X)
      const geomRight = new THREE.PlaneGeometry(planeD, planeH);
      const meshRight = new THREE.Mesh(geomRight, mat);
      meshRight.position.set(planeW / 2 + 0.005, 0, 0);
      meshRight.rotation.y = Math.PI / 2;
      meshRight.receiveShadow = true;
      group.add(meshRight);

      // Posicionar el grupo en la misma coordenada que el stand
      group.position.copy(mesh.position);

      this.scene.add(group);
      this.logoSprites.set(stand.id, group as any); // Guardamos la referencia en el mismo mapa
      this.disposables.push(geomTop, geomFront, geomBack, geomLeft, geomRight, mat, logoTexture);
    });
  }

  updateStandStates(standsData: any[]): void {
    // Actualizar color y opacidad de los meshes según estado de disponibilidad
    for (const mesh of this.standMeshes) {
      const standId = mesh.userData.id;
      const updatedStand = standsData.find(s => s.id === standId);

      if (updatedStand) {
        const isOccupied = updatedStand.disponible === false;
        const mat = mesh.material as THREE.Material;
        const baseColor = this.baseColors.get(mesh);
        const baseOpacity = this.baseOpacity.get(mesh);

        if (mat && baseColor && baseOpacity !== undefined) {
          if (isOccupied) {
            (mat as any).color.copy(new THREE.Color(0x999999)); // Gris
            (mat as any).opacity = 0.5;
          } else {
            (mat as any).color.copy(baseColor);
            (mat as any).opacity = baseOpacity;
          }
          (mat as any).needsUpdate = true;
        }

        // Cargar logo inmediatamente si está apartado
        const logo = updatedStand.empresaInfo?.logo;
        if (isOccupied && logo) {
          this.showStandLogo(updatedStand, logo);
        } else {
          // Limpiar logo si ya no está ocupado o no tiene logo
          const existingSprite = this.logoSprites.get(standId);
          if (existingSprite) {
            this.scene.remove(existingSprite);
            this.logoSprites.delete(standId);
          }
        }

        // Ajustar altura de la etiqueta si hay logo para que no se encimen
        const labelSprite = this.labelSprites.get(standId);
        if (labelSprite) {
          if (isOccupied && logo) {
            // Como el logo ahora está plano acoplado al techo, la etiqueta puede flotar a +0.95 elegantemente
            labelSprite.position.y = updatedStand.h + 0.95;
          } else {
            labelSprite.position.y = updatedStand.h + 0.9; // Altura normal
          }
        }
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  private pick(event: MouseEvent, canvas: HTMLCanvasElement): THREE.Mesh | null {
    const rect = canvas.getBoundingClientRect();
    this.mouse.x =  ((event.clientX - rect.left) / rect.width)  * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Collect all raycastable objects (stand meshes, label sprites, logo meshes)
    const targets: THREE.Object3D[] = [...this.standMeshes];
    this.labelSprites.forEach(sprite => targets.push(sprite));
    this.logoSprites.forEach(logoMesh => targets.push(logoMesh));

    const hits = this.raycaster.intersectObjects(targets, false);
    if (!hits.length) return null;

    const hitObj = hits[0].object;
    if (hitObj.userData.isLabel || hitObj.userData.isLogo) {
      const standId = hitObj.userData.standId;
      return this.standMeshes.find(m => m.userData.id === standId) || null;
    }

    return hitObj as THREE.Mesh;
  }

  private restore(mesh: THREE.Mesh | null): void {
    if (!mesh) return;
    const m = mesh.material as THREE.MeshStandardMaterial;
    const c = this.baseColors.get(mesh);
    const o = this.baseOpacity.get(mesh);
    if (c) m.color.copy(c);
    if (o !== undefined) m.opacity = o;
  }

  onMouseMove(event: MouseEvent, canvas: HTMLCanvasElement): boolean {
    if (this.touring) return false;
    const mesh = this.pick(event, canvas);
    if (mesh === this.hoveredMesh) return !!mesh;

    if (this.hoveredMesh && this.hoveredMesh !== this.selectedMesh) this.restore(this.hoveredMesh);
    this.hoveredMesh = mesh;

    if (mesh && mesh !== this.selectedMesh) {
      const m = mesh.material as THREE.MeshStandardMaterial;
      m.color.copy(this.baseColors.get(mesh)!).lerp(new THREE.Color(0xffffff), 0.35);
      m.opacity = Math.min(1, (this.baseOpacity.get(mesh) ?? 1) + 0.15);
    }
    return !!mesh;
  }

  onMouseClick(event: MouseEvent, canvas: HTMLCanvasElement): void {
    const mesh = this.pick(event, canvas);

    if (this.selectedMesh) { this.restore(this.selectedMesh); this.selectedMesh = null; }

    if (mesh) {
      this.stopTour();
      (mesh.material as THREE.MeshStandardMaterial).color.set(0xfbbf24);
      (mesh.material as THREE.MeshStandardMaterial).opacity = 1;
      this.selectedMesh = mesh;
      this.ngZone.run(() =>
        this.standClick$.next({
          stand: mesh.userData as StandConfig,
          position: this.getSelectedStandScreenPos() || { x: event.clientX, y: event.clientY },
        })
      );
    } else {
      this.ngZone.run(() => this.standClick$.next(null));
    }
  }

  getSelectedStandScreenPos(): { x: number; y: number } | null {
    if (!this.selectedMesh || !this.camera || !this.renderer) return null;

    const pos = new THREE.Vector3();
    this.selectedMesh.getWorldPosition(pos);
    const stand = this.selectedMesh.userData as StandConfig;
    pos.y += stand.h;

    pos.project(this.camera);

    const canvas = this.renderer.domElement;
    const rect = canvas.getBoundingClientRect();

    const x = ((pos.x + 1) * canvas.clientWidth) / 2 + rect.left;
    const y = (-(pos.y - 1) * canvas.clientHeight) / 2 + rect.top;

    return { x, y };
  }

  updateTooltipPosition(): void {
    if (!this.selectedMesh) return;
    const pos = this.getSelectedStandScreenPos();
    if (pos) {
      this.ngZone.run(() => {
        this.tooltipPosition$.next(pos);
      });
    }
  }

  /** Enfoca un volumen concreto (usado desde el panel) */
  focusStand(cfg: StandConfig): void {
    this.stopTour();
    const dist = Math.max(cfg.w, cfg.d) + 14;
    this.controls.target.set(cfg.px, cfg.h / 2, cfg.pz);
    this.camera.position.set(cfg.px + dist * 0.55, cfg.h + dist * 0.6, cfg.pz + dist * 0.8);
    this.camera.lookAt(this.controls.target);
    this.controls.update();
  }

  // ══════════════════════════════════════════════════════════════════════════
  ngOnDestroy(): void {
    cancelAnimationFrame(this.animFrameId);
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    this.standMeshes = [];
    this.labels      = [];
    this.controls?.dispose();
    this.renderer?.dispose();
  }
}
