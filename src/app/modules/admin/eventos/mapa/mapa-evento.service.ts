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
  private selectedMesh: THREE.Mesh | null = null;
  private hoveredMesh: THREE.Mesh | null = null;
  private baseColors = new WeakMap<THREE.Mesh, THREE.Color>();
  private baseOpacity = new WeakMap<THREE.Mesh, number>();
  private disposables: Array<{ dispose(): void }> = [];

  // ── recorrido ───────────────────────────────────────────────────────────────
  private touring = false;
  private tourIdx = 0;
  private tourElapsed = 0;
  private tourEyes: THREE.Vector3[] = [];
  private tourLooks: THREE.Vector3[] = [];

  private readonly HOME_POS    = new THREE.Vector3(0, 60, 56);
  private readonly HOME_TARGET = new THREE.Vector3(0, 0, 0);

  constructor(private ngZone: NgZone) {}

  // ══════════════════════════════════════════════════════════════════════════
  async init(canvas: HTMLCanvasElement, mapImageUrl: string): Promise<void> {
    this.buildScene();
    this.buildRenderer(canvas);
    this.buildCamera(canvas);
    await this.buildControls(canvas);
    this.buildLights();
    this.buildFloor(mapImageUrl);
    this.buildWalls();
    this.buildStands();
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

      const geom = new THREE.BoxGeometry(cfg.w, cfg.h, cfg.d);
      const mat  = new THREE.MeshStandardMaterial({
        color: baseColor,
        transparent: opacity < 1,
        opacity,
        roughness: cfg.tipo === '6x3' ? 0.25 : 0.55,
        metalness: cfg.tipo === '6x3' ? 0.55 : cfg.tipo === '9x3' ? 0.4 : 0.08,
        emissive: new THREE.Color(baseColor).multiplyScalar(0.08),
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(cfg.px, cfg.h / 2, cfg.pz);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.userData = cfg;
      this.scene.add(mesh);
      this.standMeshes.push(mesh);
      this.baseColors.set(mesh, new THREE.Color(baseColor));
      this.baseOpacity.set(mesh, opacity);
      this.disposables.push(geom, mat);

      // Contorno para separar volúmenes contiguos
      const edges   = new THREE.EdgesGeometry(geom);
      const edgeMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(baseColor).multiplyScalar(0.45),
      });
      const wire = new THREE.LineSegments(edges, edgeMat);
      wire.position.copy(mesh.position);
      this.scene.add(wire);
      this.disposables.push(edges, edgeMat);

      const area = cfg.w * cfg.d;
      this.addLabel(cfg, cfg.px, cfg.h + 0.9, cfg.pz, area);
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

    // Alto en fracción de viewport (constante en pantalla)
    const h     = area > 40 ? 0.038 : area > 18 ? 0.032 : 0.027;
    const ratio = cw / ch;
    sprite.scale.set(h * ratio, h, 1);

    this.scene.add(sprite);
    this.labels.push({ sprite, h, ratio, maxDist: area > 40 ? 260 : area > 18 ? 120 : 78 });
    this.disposables.push(tex, spriteMat);
  }

  private buildTour(): void {
    this.tourEyes  = TOUR.map(s => new THREE.Vector3(wx(s.eye[0]),  EYE_Y,  wz(s.eye[1])));
    this.tourLooks = TOUR.map(s => new THREE.Vector3(wx(s.look[0]), LOOK_Y, wz(s.look[1])));
  }

  // ══════════════════════════════════════════════════════════════════════════
  private animate(): void {
    this.animFrameId = requestAnimationFrame(() => this.animate());
    const now = performance.now();
    const dt  = this.lastTs ? Math.min(0.1, (now - this.lastTs) / 1000) : 0;
    this.lastTs = now;

    if (this.touring) this.updateTour(dt);
    else this.controls?.update();

    this.updateLabels();
    this.renderer.render(this.scene, this.camera);
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

  private updateTour(dt: number): void {
    this.tourElapsed += dt * 1000;
    const t = Math.min(1, this.tourElapsed / SEG_MS);
    const e = t * t * (3 - 2 * t);   // smoothstep

    const i = this.tourIdx;
    const j = Math.min(i + 1, this.tourEyes.length - 1);

    this.camera.position.lerpVectors(this.tourEyes[i],  this.tourEyes[j],  e);
    this.controls.target.lerpVectors(this.tourLooks[i], this.tourLooks[j], e);
    this.camera.lookAt(this.controls.target);

    if (t >= 1) {
      if (j >= this.tourEyes.length - 1) { this.stopTour(); return; }
      this.tourIdx = j;
      this.tourElapsed = 0;
      this.ngZone.run(() => this.tourStep$.next(TOUR[j].titulo));
    }
  }

  startTour(): void {
    if (!this.controls) return;
    this.touring     = true;
    this.tourIdx     = 0;
    this.tourElapsed = 0;
    this.controls.enabled = false;
    this.camera.position.copy(this.tourEyes[0]);
    this.controls.target.copy(this.tourLooks[0]);
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

  // ══════════════════════════════════════════════════════════════════════════
  private pick(event: MouseEvent, canvas: HTMLCanvasElement): THREE.Mesh | null {
    const rect = canvas.getBoundingClientRect();
    this.mouse.x =  ((event.clientX - rect.left) / rect.width)  * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.standMeshes, false);
    return hits.length ? (hits[0].object as THREE.Mesh) : null;
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
          position: { x: event.clientX, y: event.clientY },
        })
      );
    } else {
      this.ngZone.run(() => this.standClick$.next(null));
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
