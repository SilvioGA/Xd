// Homenaje a Tom y Jerry: una esquina de la casa con la ratonera de Jerry en el rodapié.
// Tom, el gato gris azulado (unos 27 bloques), está de pie a la izquierda; Jerry, pequeño y
// marrón, saluda delante de su ratonera junto a un queso gigante con agujeros. Hay suelo de
// madera, alfombra, el cuenco de leche de Tom y el nombre escrito con bloques en la pared.
// Los dos miran al sur (+z), hacia quien llega. Se modelan con elipsoides y cápsulas.

import { Schematic } from './schematic.js';

const tjEll = (p, c, r) => Math.hypot((p[0] - c[0]) / r[0], (p[1] - c[1]) / r[1], (p[2] - c[2]) / r[2]);
const tjSeg = (p, a, b) => {
  const ab = b.map((v, i) => v - a[i]);
  const len2 = ab.reduce((acc, v) => acc + v * v, 0);
  const t = Math.max(0, Math.min(1, p.reduce((acc, v, i) => acc + (v - a[i]) * ab[i], 0) / len2));
  return { t, d: Math.hypot(...p.map((v, i) => v - a[i] - ab[i] * t)) };
};
const tjChain = (p, pts, r) => pts.slice(1).some((b, i) => tjSeg(p, pts[i], b).d <= r);

const TOM_FUR = 'light_blue_terracotta';
const TOM_TAIL = [[0, 7, -3], [2.5, 5, -6], [5.5, 6, -8], [7.5, 10, -8], [7.5, 13.5, -6.5], [6.2, 15, -5.5]];

function tomAt(p) {
  const [x, y, z] = p;
  // Ojos grandes (blancos con pupila negra) y nariz.
  for (const sd of [-1, 1]) {
    if (tjEll(p, [sd * 1.25, 20.1, 3.95], [0.55, 0.75, 0.45]) <= 1) return 'black_concrete';
    if (tjEll(p, [sd * 1.45, 20.4, 3.2], [1.3, 1.7, 0.85]) <= 1) return 'white_concrete';
  }
  if (tjEll(p, [0, 18.4, 4.35], [0.85, 0.6, 0.5]) <= 1) return 'black_concrete';
  // Orejas triangulares, rosas por delante.
  for (const sd of [-1, 1]) {
    const e = tjSeg(p, [sd * 2.8, 21.8, 0], [sd * 4.1, 26.8, -0.2]);
    const r = 1.8 - 1.5 * e.t;
    if (Math.hypot(x - (sd * 2.8 + sd * 1.3 * e.t), (y - (21.8 + 5 * e.t)) * 0.4, (z + 0.2 * e.t) * 1.6) <= r) {
      return z > 0.15 && e.t < 0.8 ? 'pink_wool' : TOM_FUR;
    }
  }
  // Hocico blanco, mechones de las mejillas y cabeza.
  if (tjEll(p, [0, 17.4, 3.1], [2.7, 1.8, 1.5]) <= 1) return 'white_wool';
  for (const sd of [-1, 1]) if (tjEll(p, [sd * 4.5, 17.6, 0.8], [1.9, 1.1, 1.2]) <= 1) return 'white_wool';
  if (tjEll(p, [0, 19, 0.3], [4.6, 4, 3.8]) <= 1) return TOM_FUR;
  // Manos blancas, brazos, patas y pies blancos.
  for (const sd of [-1, 1]) {
    if (tjEll(p, [sd * 4.2, 7.8, 2.6], [1.35, 1.35, 1.35]) <= 1) return 'white_wool';
    if (tjSeg(p, [sd * 4, 13.2, 0], [sd * 4.2, 8.6, 2.2]).d <= 1.25) return TOM_FUR;
    if (tjEll(p, [sd * 2.2, 0.9, 1.3], [1.6, 1, 2.7]) <= 1) return 'white_wool';
    if (tjSeg(p, [sd * 2, 2, 0], [sd * 2.1, 7, 0]).d <= 1.6) return TOM_FUR;
  }
  // Cuerpo con el pecho blanco.
  if (tjEll(p, [0, 10.2, 0], [4.2, 5, 3.4]) <= 1) return z > 1.4 && Math.abs(x) < 2.6 && y > 7 ? 'white_wool' : TOM_FUR;
  // Cola.
  if (tjChain(p, TOM_TAIL, 0.95)) return TOM_FUR;
  return null;
}

const JERRY_FUR = 'orange_terracotta';
const JERRY_TAN = 'white_terracotta';

function jerryAt(p) {
  const [x, y, z] = p;
  for (const sd of [-1, 1]) {
    if (tjEll(p, [sd * 0.75, 7.75, 1.95], [0.4, 0.62, 0.35]) <= 1) return 'black_concrete';
    if (tjEll(p, [sd * 0.8, 7.7, 1.6], [0.72, 0.95, 0.5]) <= 1) return 'white_concrete';
  }
  if (tjEll(p, [0, 6.8, 2.45], [0.55, 0.42, 0.4]) <= 1) return 'black_concrete';
  // Orejas redondas y grandes, rosas por dentro.
  for (const sd of [-1, 1]) {
    if (tjEll(p, [sd * 2.45, 9.3, -0.2], [1.95, 1.95, 0.55]) <= 1) return tjEll(p, [sd * 2.45, 9.3, 0.15], [1.35, 1.35, 0.4]) <= 1 ? 'pink_terracotta' : JERRY_FUR;
  }
  if (tjEll(p, [0, 6.3, 1.5], [1.55, 1.1, 0.95]) <= 1) return JERRY_TAN;
  if (tjEll(p, [0, 7, 0.2], [2.3, 2.1, 2]) <= 1) return JERRY_FUR;
  // Brazo derecho saludando, el izquierdo en la cadera.
  if (tjEll(p, [3.4, 7.4, 0.6], [0.7, 0.7, 0.7]) <= 1) return JERRY_TAN;
  if (tjSeg(p, [1.8, 4.6, 0], [3.3, 6.9, 0.5]).d <= 0.6) return JERRY_FUR;
  if (tjSeg(p, [-1.8, 4.5, 0], [-2.4, 3.2, 0.4]).d <= 0.6) return JERRY_FUR;
  // Pies, patas, cuerpo con barriga clara y cola fina.
  for (const sd of [-1, 1]) {
    if (tjEll(p, [sd * 1.05, 0.5, 0.8], [0.9, 0.6, 1.5]) <= 1) return JERRY_TAN;
    if (tjSeg(p, [sd * 1, 0.8, 0], [sd * 0.9, 2.2, 0]).d <= 0.7) return JERRY_FUR;
  }
  if (tjEll(p, [0, 3.3, 0], [2, 2.6, 1.8]) <= 1) return z > 0.7 && Math.abs(x) < 1.2 ? JERRY_TAN : JERRY_FUR;
  if (tjChain(p, [[0, 2, -1.5], [-1.5, 1, -3.5], [-3.2, 1.8, -5], [-4, 3.5, -5]], 0.45)) return JERRY_FUR;
  return null;
}

// Letras de 3×5 (la M de 5×5) para escribir en la pared.
const TJ_FONT = {
  T: ['###', '.#.', '.#.', '.#.', '.#.'], O: ['###', '#.#', '#.#', '#.#', '###'], M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], J: ['..#', '..#', '..#', '#.#', '###'], E: ['###', '#..', '##.', '#..', '###'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'], ' ': ['..', '..', '..', '..', '..'],
};

export function buildTomJerry() {
  const W = 60;
  const L = 40;
  const H = 36;
  const s = new Schematic(W, H, L);
  s.format = 'Ejemplo integrado';
  s.meta = { name: 'Homenaje a Tom y Jerry', author: 'Visor de Schematics', dataVersion: 3465, spawn: [24.5, 1, L - 1.5, 0] };
  const inside = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < W && y < H && z < L;
  const set = (x, y, z, name, props) => { if (inside(x, y, z)) s.set(x, y, z, name, props); };
  const get = (x, y, z) => (inside(x, y, z) ? s.palette[s.get(x, y, z)].name.slice(10) : 'out');
  const isAir = (x, y, z) => get(x, y, z) === 'air';

  // Suelo de tablas y alfombra redonda.
  for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) set(x, 0, z, (x >> 2) % 3 === 0 ? 'spruce_planks' : 'oak_planks');
  for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x + 0.5 - 24) / 17, (z + 0.5 - 22) / 11);
    if (d <= 1) set(x, 1, z, d > 0.88 ? 'yellow_carpet' : d > 0.8 ? 'red_carpet' : (Math.floor(x / 3) + Math.floor(z / 3)) % 2 ? 'red_carpet' : 'orange_carpet');
  }

  // Pared con rodapié, papel pintado a rayas y la ratonera de Jerry.
  const WZ = 3; // cara de la pared
  for (let y = 1; y <= 30; y++) for (let z = 0; z <= WZ; z++) for (let x = 0; x < W; x++) {
    let m = x % 6 < 3 ? 'white_terracotta' : 'yellow_terracotta';
    if (y <= 2) m = 'dark_oak_planks';
    else if (y === 3) m = 'dark_oak_slab';
    if (y === 3 && z < WZ) m = 'dark_oak_planks';
    set(x, y, z, m, m === 'dark_oak_slab' ? { type: 'bottom', waterlogged: 'false' } : undefined);
  }
  const HOLE = 46;
  for (let y = 1; y <= 6; y++) for (let x = HOLE - 3; x <= HOLE + 3; x++) {
    const inArch = Math.hypot(x + 0.5 - (HOLE + 0.5), Math.max(0, y + 0.5 - 3.5)) <= 3.2;
    if (!inArch) continue;
    set(x, y, WZ, 'air');
    set(x, y, WZ - 1, 'air');
    set(x, y, WZ - 2, 'black_concrete');
  }
  for (let x = HOLE - 2; x <= HOLE + 2; x++) set(x, 1, WZ + 1, 'red_carpet'); // felpudo
  set(HOLE, 1, WZ - 1, 'candle', { candles: '1', lit: 'true', waterlogged: 'false' });

  // Nombre en la pared.
  const text = 'TOM Y JERRY';
  const widths = [...text].map((c) => TJ_FONT[c][0].length);
  const total = widths.reduce((a, b) => a + b + 1, -1);
  let cx = Math.floor((W - total) / 2);
  [...text].forEach((c, i) => {
    TJ_FONT[c].forEach((row, r) => [...row].forEach((px, j) => {
      if (px === '#') { set(cx + j, 27 - r, WZ + 1, 'red_concrete'); set(cx + j + 1, 26 - r, WZ + 1, isAir(cx + j + 1, 26 - r, WZ + 1) ? 'black_concrete' : 'red_concrete'); }
    }));
    cx += widths[i] + 1;
  });
  // La sombra no debe tapar letras: se repintan en rojo.
  cx = Math.floor((W - total) / 2);
  [...text].forEach((c, i) => {
    TJ_FONT[c].forEach((row, r) => [...row].forEach((px, j) => { if (px === '#') set(cx + j, 27 - r, WZ + 1, 'red_concrete'); }));
    cx += widths[i] + 1;
  });

  // Tom.
  const TX = 22;
  const TZ = 20;
  for (let y = 1; y < H; y++) for (let z = TZ - 10; z <= TZ + 6; z++) for (let x = TX - 8; x <= TX + 10; x++) {
    const m = tomAt([x + 0.5 - (TX + 0.5), y + 0.5 - 1, z + 0.5 - (TZ + 0.5)]);
    if (m) set(x, y, z, m);
  }
  for (const sd of [-1, 1]) for (const dy of [0, 1]) set(TX + sd * 3, 17 + dy, TZ + 4, 'end_rod', { facing: sd > 0 ? 'east' : 'west' });

  // Jerry, a escala 1,4, delante de su ratonera.
  const JX = 40;
  const JZ = 12;
  const JS = 1.4;
  for (let y = 1; y < 18; y++) for (let z = JZ - 9; z <= JZ + 5; z++) for (let x = JX - 7; x <= JX + 7; x++) {
    const m = jerryAt([(x + 0.5 - (JX + 0.5)) / JS, (y + 0.5 - 1) / JS, (z + 0.5 - (JZ + 0.5)) / JS]);
    if (m && isAir(x, y, z)) set(x, y, z, m);
  }

  // Queso gigante en cuña con agujeros.
  for (let y = 1; y <= 7; y++) for (let z = 10; z <= 19; z++) for (let x = 48; x <= 57; x++) {
    const top = 1 + (x - 48) * 0.7;
    if (y > top) continue;
    const hole = [[51, 3, 19], [55, 5, 19], [53, 2, 10], [57, 6, 15], [50, 2, 15], [56, 3, 12]].some(([hx, hy, hz]) => Math.hypot(x - hx, y - hy, z - hz) < 1.3);
    if (hole && (z === 19 || z === 10 || x === 57 || y >= top - 1)) continue;
    set(x, y, z, hole ? 'yellow_terracotta' : 'yellow_concrete');
  }

  // Cuenco de leche de Tom.
  for (let z = 26; z <= 30; z++) for (let x = 6; x <= 10; x++) {
    const d = Math.hypot(x + 0.5 - 8.5, z + 0.5 - 28.5);
    if (d <= 2.6) { set(x, 1, z, 'red_concrete'); set(x, 2, z, d > 1.6 ? 'red_concrete' : 'white_concrete'); }
  }
  set(8, 1, 31, 'red_concrete');
  // Un poco de desorden de la persecución: una sartén en el suelo y un par de cuadros torcidos.
  for (let z = 30; z <= 32; z++) for (let x = 36; x <= 38; x++) set(x, 1, z, 'black_concrete');
  for (let z = 33; z <= 35; z++) set(37, 1, z, 'dark_oak_slab', { type: 'bottom', waterlogged: 'false' });
  for (const [x0, y0, c] of [[6, 12, 'light_blue_concrete'], [52, 14, 'lime_concrete']]) {
    for (let y = y0; y < y0 + 5; y++) for (let x = x0; x < x0 + 6; x++) {
      const edge = x === x0 || x === x0 + 5 || y === y0 || y === y0 + 4;
      set(x + (y - y0 > 2 ? 1 : 0), y, WZ + 1, edge ? 'spruce_planks' : c);
    }
  }
  return s;
}
