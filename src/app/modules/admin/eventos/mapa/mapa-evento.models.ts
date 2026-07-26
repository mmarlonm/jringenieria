export type StandTipo = '3x3' | '6x3' | '9x3' | 'escenario' | 'zona';

/** ─── Calibración del plano ────────────────────────────────────────────────
 *  plano.png mide 1600×900. El suelo 3D es un plano de PLANE_W × PLANE_H con
 *  el mismo aspect ratio, centrado en el origen. Por eso 1 px de la imagen
 *  equivale SIEMPRE a `SCALE` unidades de mundo (≈ 1 unidad ≈ 1 m).
 *
 *      world_x = (img_x - IMG_W/2) * SCALE
 *      world_z = (img_y - IMG_H/2) * SCALE
 *
 *  Todos los volúmenes se declaran con `rect: [x1, y1, x2, y2]` en píxeles de
 *  la imagen para que queden exactamente sobre su recuadro del plano.
 *  ────────────────────────────────────────────────────────────────────────── */
export const IMG_W = 1600;
export const IMG_H = 900;
export const PLANE_W = 100;
export const PLANE_H = (PLANE_W * IMG_H) / IMG_W;   // 56.25
export const SCALE = PLANE_W / IMG_W;               // 0.0625

export type PxRect = [number, number, number, number];

export interface WorldBox { px: number; pz: number; w: number; d: number; }

export function rectToWorld([x1, y1, x2, y2]: PxRect): WorldBox {
  return {
    px: ((x1 + x2) / 2 - IMG_W / 2) * SCALE,
    pz: ((y1 + y2) / 2 - IMG_H / 2) * SCALE,
    w : Math.abs(x2 - x1) * SCALE,
    d : Math.abs(y2 - y1) * SCALE,
  };
}

export interface StandConfig extends WorldBox {
  id: string;
  label: string;
  tipo: StandTipo;
  rect: PxRect;
  h: number;
  color?: number;
  empresa?: string;
  disponible?: boolean;
  /** Las zonas/escenarios no cuentan como stand comercializable */
  esStand: boolean;
}

interface StandRaw {
  id: string;
  label: string;
  tipo: StandTipo;
  rect: PxRect;
  h?: number;
  color?: number;
  empresa?: string;
  disponible?: boolean;
}

/** Colores tomados de la leyenda impresa del plano */
export const STAND_COLORS: Record<StandTipo, number> = {
  '3x3':       0xe2795f,   // terracota
  '6x3':       0xb9c0ca,   // plata
  '9x3':       0xd4a03c,   // dorado
  'escenario': 0x2f3fa0,   // azul escenario
  'zona':      0x10b981,   // verde
};

export const DEFAULT_H: Record<StandTipo, number> = {
  '3x3': 2.5, '6x3': 2.5, '9x3': 3.2, 'escenario': 1.4, 'zona': 2.6,
};

// ═══ Volúmenes ═══════════════════════════════════════════════════════════════
const RAW: StandRaw[] = [

  // ── Escenarios ──────────────────────────────────────────────────────────────
  { id: 'ESC_PRINCIPAL', label: 'Escenario Principal\nConferencias', tipo: 'escenario', rect: [205, 150, 400, 232] },
  { id: 'ESC_TALLERES',  label: 'Escenario\nTalleres',               tipo: 'escenario', rect: [203, 573, 388, 668] },

  // ── Servicios / zonas ───────────────────────────────────────────────────────
  { id: 'BANOS_N',      label: 'Baños',                                  tipo: 'zona', rect: [ 86, 146,  158, 263], h: 3.2, color: 0xd946a6 },
  { id: 'BANOS_S',      label: 'Baños',                                  tipo: 'zona', rect: [ 86, 549,  158, 682], h: 3.2, color: 0xd946a6 },
  { id: 'DESCARGA_N',   label: 'Entrada de\nDescarga',                   tipo: 'zona', rect: [ 38, 266,  156, 392], h: 3.4, color: 0x334155 },
  { id: 'DESCARGA_S',   label: 'Entrada de\nDescarga',                   tipo: 'zona', rect: [ 38, 400,  156, 524], h: 3.4, color: 0x334155 },
  { id: 'BODEGA',       label: 'Bodega',                                 tipo: 'zona', rect: [445,  98,  502, 143], h: 3.0, color: 0x475569 },
  { id: 'ACCESO_ESC',   label: 'Acceso a Escenarios',                    tipo: 'zona', rect: [446, 330,  506, 400], h: 0.25, color: 0x22c55e },
  { id: 'PATROCINA',    label: 'Patrocinadores\nVOLTRAN · JR · WEG',     tipo: 'zona', rect: [838, 198,  948, 392], h: 4.0, color: 0x93a4bd },
  { id: 'ENTRADA_PPAL', label: 'Entrada / Salida\nPrincipal',            tipo: 'zona', rect: [925, 405, 1038, 490], h: 3.6, color: 0x1f2937 },
  { id: 'REGISTRO',     label: 'Área de Registro',                       tipo: 'zona', rect: [1046, 20, 1196, 120], h: 0.3, color: 0x0ea5e9 },
  { id: 'ESCALERAS',    label: 'Escaleras · Baños\nMódulo de Atención',  tipo: 'zona', rect: [1052, 158, 1188, 237], h: 2.6, color: 0x1d4ed8 },
  { id: 'EXP_INMERSIVA',label: 'Experiencia\nInmersiva',                 tipo: 'zona', rect: [1054, 272, 1196, 503], h: 4.4, color: 0x7c3aed },
  { id: 'PHOTO_WALL',   label: 'Photo Opportunity\nMuro de Proveedores', tipo: 'zona', rect: [1050, 562, 1196, 692], h: 3.0, color: 0xef4444 },

  // ── Columna izquierda del salón (x 452–500) ─────────────────────────────────
  { id: 'B10', label: 'B10', tipo: '3x3', rect: [452, 162, 500, 202] },
  { id: 'P5',  label: 'P5',  tipo: '6x3', rect: [452, 203, 500, 300] },
  { id: 'P4',  label: 'P4',  tipo: '6x3', rect: [452, 405, 500, 476] },
  { id: 'B11', label: 'B11', tipo: '3x3', rect: [452, 478, 500, 532] },
  { id: 'B12', label: 'B12', tipo: '3x3', rect: [452, 534, 500, 588] },

  // ── Fila superior B9 → B1 (B7 ocupado, marcado con X en el plano) ───────────
  { id: 'B9', label: 'B9', tipo: '3x3', rect: [526, 99,  573, 140] },
  { id: 'B8', label: 'B8', tipo: '3x3', rect: [575, 99,  622, 140] },
  { id: 'B6', label: 'B6', tipo: '3x3', rect: [680, 99,  727, 140] },
  { id: 'B5', label: 'B5', tipo: '3x3', rect: [781, 99,  828, 140] },
  { id: 'B4', label: 'B4', tipo: '3x3', rect: [829, 99,  876, 140] },
  { id: 'B3', label: 'B3', tipo: '3x3', rect: [877, 99,  923, 140] },
  { id: 'B2', label: 'B2', tipo: '3x3', rect: [924, 99,  970, 140] },
  { id: 'B1', label: 'B1', tipo: '3x3', rect: [971, 99, 1017, 140] },

  // ── Stands premium centrales ────────────────────────────────────────────────
  { id: 'O3', label: 'O3', tipo: '9x3', rect: [549, 200, 602, 391], empresa: 'WEG',                     disponible: false },
  { id: 'O2', label: 'O2', tipo: '9x3', rect: [604, 200, 660, 391], empresa: 'VOLTRAN VRC Group',       disponible: false },
  { id: 'O1', label: 'O1', tipo: '9x3', rect: [758, 200, 811, 391], empresa: 'JR Ingeniería Eléctrica', disponible: false },
  { id: 'P2', label: 'P2', tipo: '6x3', rect: [707, 246, 755, 391] },

  // ── Isla central inferior ───────────────────────────────────────────────────
  { id: 'P3',  label: 'P3',  tipo: '6x3', rect: [544, 485, 599, 595] },
  { id: 'B20', label: 'B20', tipo: '3x3', rect: [601, 486, 648, 537] },
  { id: 'B21', label: 'B21', tipo: '3x3', rect: [601, 539, 648, 592] },
  { id: 'B22', label: 'B22', tipo: '3x3', rect: [697, 486, 745, 537] },
  { id: 'B23', label: 'B23', tipo: '3x3', rect: [746, 486, 793, 537] },
  { id: 'B24', label: 'B24', tipo: '3x3', rect: [697, 539, 745, 592] },
  { id: 'B25', label: 'B25', tipo: '3x3', rect: [746, 539, 793, 592] },
  { id: 'B26', label: 'B26', tipo: '3x3', rect: [839, 486, 887, 537] },
  { id: 'B27', label: 'B27', tipo: '3x3', rect: [839, 539, 887, 592] },
  { id: 'P1',  label: 'P1',  tipo: '6x3', rect: [889, 485, 945, 595] },

  // ── Fila inferior B13 → B19 ─────────────────────────────────────────────────
  { id: 'B13', label: 'B13', tipo: '3x3', rect: [495, 649, 544, 689] },
  { id: 'B14', label: 'B14', tipo: '3x3', rect: [545, 649, 594, 689] },
  { id: 'B15', label: 'B15', tipo: '3x3', rect: [595, 649, 644, 689] },
  { id: 'B16', label: 'B16', tipo: '3x3', rect: [645, 649, 694, 689] },
  { id: 'B17', label: 'B17', tipo: '3x3', rect: [776, 649, 825, 689] },
  { id: 'B18', label: 'B18', tipo: '3x3', rect: [826, 649, 875, 689] },
  { id: 'B19', label: 'B19', tipo: '3x3', rect: [876, 649, 925, 689] },
];

export const STANDS_DATA: StandConfig[] = RAW.map((r) => ({
  ...r,
  ...rectToWorld(r.rect),
  h: r.h ?? DEFAULT_H[r.tipo],
  esStand: r.tipo !== 'zona' && r.tipo !== 'escenario',
}));

// ═══ Muros del recinto (para que se lea como recorrido arquitectónico) ════════
export interface WallDef { rect: PxRect; h: number; }

export const WALLS: WallDef[] = [
  // Perímetro del recinto cubierto
  { rect: [  76,  10, 1220,  22], h: 5.2 },
  { rect: [  76,  10,   88, 266], h: 5.2 },
  { rect: [  76, 524,   88, 712], h: 5.2 },
  { rect: [  76, 700, 1042, 712], h: 5.2 },
  { rect: [1208,  10, 1220, 740], h: 5.2 },
  { rect: [1030, 728, 1220, 740], h: 5.2 },
  // Muro que separa el salón del pasillo de registro / experiencia
  { rect: [1030,  10, 1042, 740], h: 5.2 },
  // Salas de escenarios (conferencias arriba, talleres abajo)
  { rect: [ 158, 117,  437, 129], h: 4.4 },
  { rect: [ 158, 684,  437, 696], h: 4.4 },
  { rect: [ 158, 117,  170, 696], h: 4.4 },
  { rect: [ 425, 117,  437, 696], h: 4.4 },
  { rect: [ 158, 404,  437, 416], h: 4.4 },
  // Muros del salón de exposición
  { rect: [ 437,  88,  449, 700], h: 4.4 },
  { rect: [ 440,  88, 1030, 100], h: 4.4 },
  { rect: [ 440, 688, 1030, 700], h: 4.4 },
];

// ═══ Recorrido virtual (waypoints en px de la imagen) ════════════════════════
export interface TourStep { eye: [number, number]; look: [number, number]; titulo: string; }

export const TOUR: TourStep[] = [
  { eye: [1120, 120], look: [1120, 300], titulo: 'Área de Registro' },
  { eye: [1120, 300], look: [1120, 470], titulo: 'Experiencia Inmersiva' },
  { eye: [1120, 560], look: [1120, 690], titulo: 'Photo Opportunity' },
  { eye: [ 985, 450], look: [ 700, 450], titulo: 'Entrada / Salida Principal' },
  { eye: [ 700, 450], look: [ 700, 180], titulo: 'Pasillo central' },
  { eye: [ 690, 170], look: [1000, 170], titulo: 'Stands B1 – B9' },
  { eye: [ 680, 440], look: [ 520, 440], titulo: 'Isla B20 – B27' },
  { eye: [ 520, 400], look: [ 300, 300], titulo: 'Acceso a Escenarios' },
  { eye: [ 330, 330], look: [ 300, 190], titulo: 'Escenario Principal' },
  { eye: [ 330, 500], look: [ 300, 630], titulo: 'Escenario Talleres' },
];
