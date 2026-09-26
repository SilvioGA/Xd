// Unicornio rosa: estatua de unos 35 bloques de alto, de perfil (mira al este, +x) con una pata
// delantera levantada. Cuerno dorado en espiral, crin y cola arcoíris, pezuñas de oro, ojos con
// brillo y mejillas sonrosadas. Está sobre una nube, con un arcoíris detrás, corazones flotando
// y un prado de flores. Se modela con elipsoides y cápsulas que luego se pasan a bloques.

import { Schematic } from './schematic.js';
import { rng } from './lobby.js';

export const UNICORN_BASE = 6; // y de la parte de arriba de la nube (donde apoyan las pezuñas)

const uEll = (p, c, r) => Math.hypot((p[0] - c[0]) / r[0], (p[1] - c[1]) / r[1], (p[2] - c[2]) / r[2]);
const uToSegment = (p, a, b) => {
  const ab = b.map((v, i) => v - a[i]);
  const len2 = ab.reduce((acc, v) => acc + v * v, 0);
  const t = Math.max(0, Math.min(1, p.reduce((acc, v, i) => acc + (v - a[i]) * ab[i], 0) / len2));
  return { t, d: Math.hypot(...p.map((v, i) => v - a[i] - ab[i] * t)) };
};
// Cápsula que se estrecha de r0 a r1. Devuelve t (0..1) si p está dentro, o -1.
const uCapsule = (p, a, b, r0, r1) => {
  const { t, d } = uToSegment(p, a, b);
  return d <= r0 + (r1 - r0) * t ? t : -1;
};
// Cadena de cápsulas: devuelve la posición global (0..1) a lo largo de la cadena, o -1.
const uChain = (p, pts, radii) => {
  for (let i = 0; i < pts.length - 1; i++) {
    const t = uCapsule(p, pts[i], pts[i + 1], radii[i], radii[i + 1]);
    if (t >= 0) return (i + t) / (pts.length - 1);
  }
  return -1;
};

// Cuerpo (coordenadas locales: x hacia la cabeza, y arriba, z hacia el lado que mira al sur).
const U_BODY = [
  { c: [0, 14, 0], r: [9, 4.8, 4.4] }, // tronco
  { c: [6, 14.6, 0], r: [4.6, 5, 4.1] }, // pecho
  { c: [-6.2, 14.8, 0], r: [5, 5.2, 4.4] }, // grupa
];
const U_NECK = [[7.5, 16, 0], [12.4, 25, 0]];
const U_HEAD = { c: [14, 26.8, 0], r: [3.9, 3.3, 2.9] };
const U_MUZZLE = [[14.6, 26, 0], [18.8, 23.4, 0]];
const U_EARS = [-1, 1].map((sd) => [[13, 29.4, sd * 1.5], [12.6, 32.2, sd * 1.8]]);
const U_HORN = [[15.4, 29.4, 0], [17.6, 37, 0]];
const U_LEGS = [
  [[7, 12, 2], [7.6, 6.2, 2], [9.6, 4.6, 2]], // delantera del sur, levantada y doblada
  [[7, 12, -2], [7.4, 6, -2], [7.4, 0.6, -2]],
  [[-7, 12, 2], [-8.4, 6, 2], [-7.6, 0.6, 2]],
  [[-7, 12, -2], [-8.4, 6, -2], [-7.6, 0.6, -2]],
];
const U_LEG_R = [2.1, 1.6, 1.45];
const U_MANE = [[14.6, 30.4, 0], [11.2, 28.6, 0], [9.2, 24.6, 0], [7, 20.2, 0], [4.8, 18.8, 0]];
const U_MANE_R = [1.3, 2.1, 2.3, 2.1, 1.4];
const U_TAIL = [[-10.4, 16.6, 0], [-14, 15.4, 0], [-16, 11.4, 0], [-15.2, 6.4, 0], [-16.6, 2.6, 0]];
const U_TAIL_R = [1.2, 2, 2.3, 2, 1.3];
const U_RAINBOW = ['red', 'orange', 'yellow', 'lime', 'light_blue', 'purple'];
const U_HAIR = ['pink_wool', 'magenta_wool', 'purple_wool', 'light_blue_wool', 'yellow_wool', 'lime_wool'];

function uUnicornAt(p) {
  // Cuerno con franjas en espiral.
  const h = uCapsule(p, U_HORN[0], U_HORN[1], 1.5, 0.3);
  if (h >= 0) {
    const ang = Math.atan2(p[2], p[0] - (U_HORN[0][0] + (U_HORN[1][0] - U_HORN[0][0]) * h));
    return ((h * 5 + ang / Math.PI) % 1 + 1) % 1 < 0.5 ? 'gold_block' : 'yellow_concrete';
  }
  // Crin y cola arcoíris: los mechones cambian de color a lo largo y de un lado a otro.
  const m = uChain(p, U_MANE, U_MANE_R);
  if (m >= 0 && p[0] < 15.5) return U_HAIR[(Math.floor(m * 7) + Math.floor(Math.abs(p[2]) * 0.8)) % U_HAIR.length];
  const t = uChain(p, U_TAIL, U_TAIL_R);
  if (t >= 0) return U_HAIR[(Math.floor(t * 9) + Math.floor(Math.abs(p[2]) * 0.8)) % U_HAIR.length];
  // Orejas con el interior rosa fuerte.
  for (const [a, b] of U_EARS) {
    const e = uCapsule(p, a, b, 0.9, 0.35);
    if (e >= 0) return Math.abs(p[2]) < Math.abs(a[2]) - 0.2 ? 'magenta_wool' : 'pink_wool';
  }
  // Patas con pezuñas de oro.
  for (let i = 0; i < U_LEGS.length; i++) {
    const k = uChain(p, U_LEGS[i], U_LEG_R);
    if (k >= 0) return k > 0.86 ? 'gold_block' : 'pink_wool';
  }
  if (uCapsule(p, U_NECK[0], U_NECK[1], 3.3, 2.7) >= 0) return 'pink_wool';
  if (uEll(p, U_HEAD.c, U_HEAD.r) <= 1) return 'pink_wool';
  const mz = uCapsule(p, U_MUZZLE[0], U_MUZZLE[1], 2.5, 1.9);
  if (mz >= 0) return mz > 0.8 ? 'pink_concrete_powder' : 'pink_wool';
  for (const b of U_BODY) if (uEll(p, b.c, b.r) <= 1) return p[1] < 12 ? 'pink_concrete_powder' : 'pink_wool';
  return null;
}

// Dibuja el unicornio con las pezuñas en y = oy y el centro del cuerpo en (ox, oz). scale lo
// encoge (0,55 da unos 21 bloques de alto) y flip lo gira para que mire al oeste en vez de al este.
export function drawUnicorn(set, isAir, { ox, oy, oz, scale = 1, flip = false }) {
  const toLocal = (x, y, z) => [(flip ? ox - (x + 0.5) : x + 0.5 - ox) / scale, (y + 0.5 - oy) / scale, (z + 0.5 - oz) / scale];
  const x0 = Math.floor(ox - 22 * scale) - 1;
  const x1 = Math.ceil(ox + 22 * scale) + 1;
  const zr = Math.ceil(7 * scale) + 1;
  const zc = Math.floor(oz);
  for (let y = oy; y <= oy + Math.ceil(40 * scale); y++) for (let z = zc - zr; z <= zc + zr; z++) for (let x = x0; x <= x1; x++) {
    const m = uUnicornAt(toLocal(x, y, z));
    if (m) set(x, y, z, m);
  }
  // Ojos (negros con brillo blanco y pestañas), mejillas y nariz, en la superficie de las dos caras.
  const cell = (lx, ly) => [Math.floor(flip ? ox - (lx + 0.5) * scale : ox + (lx + 0.5) * scale), Math.floor(oy + (ly + 0.5) * scale)];
  const face = (lx, ly, sd, name) => {
    const [x, y] = cell(lx, ly);
    let z = zc + sd * zr;
    while (z !== zc && isAir(x, y, z)) z -= sd;
    set(x, y, z, name);
  };
  for (const sd of [1, -1]) {
    face(15, 26, sd, 'black_concrete');
    face(15, 27, sd, 'black_concrete');
    face(16, 27, sd, 'white_concrete');
    face(14, 28, sd, 'black_concrete');
    face(16, 25, sd, 'pink_concrete');
    face(18, 24, sd, 'magenta_concrete');
  }
}

export function buildUnicorn() {
  const W = 66;
  const L = 34;
  const H = 46;
  const B = UNICORN_BASE;
  const OX = 31; // x del mundo donde está el x = 0 del unicornio
  const OZ = 15;
  const s = new Schematic(W, H, L);
  s.format = 'Ejemplo integrado';
  s.meta = { name: 'Unicornio rosa', author: 'Visor de Schematics', dataVersion: 3465, spawn: [OX + 0.5, 2, L - 1.5, 0] };
  const rand = rng(777);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const inside = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < W && y < H && z < L;
  const set = (x, y, z, name, props) => { if (inside(x, y, z)) s.set(x, y, z, name, props); };
  const get = (x, y, z) => (inside(x, y, z) ? s.palette[s.get(x, y, z)].name.slice(10) : 'out');
  const isAir = (x, y, z) => get(x, y, z) === 'air';

  // Prado.
  for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) { set(x, 0, z, 'dirt'); set(x, 1, z, 'grass_block'); }

  // Nube que hace de peana, con nubecitas donde apoya el arcoíris.
  const CLOUD = [
    [0, -3, 0, 21, 3.2, 7.5], [-13, -1.6, 2.5, 6.5, 2.6, 5], [11, -1.6, -2.5, 7.5, 2.6, 5], [2, -1.2, 4.5, 6, 2.2, 3.5],
    [-8, -1.8, -4, 6, 2.4, 3.5], [-25, -3, -7, 4.5, 2.6, 3], [25, -3, -7, 4.5, 2.6, 3],
  ];
  for (let y = 2; y <= B + 1; y++) for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    const p = [x + 0.5 - OX, y + 0.5 - B, z + 0.5 - OZ];
    const d = Math.min(...CLOUD.map(([cx, cy, cz, rx, ry, rz]) => uEll(p, [cx, cy, cz], [rx, ry, rz])));
    if (d <= 1) set(x, y, z, d > 0.82 && rand() < 0.4 ? 'white_concrete_powder' : 'white_wool');
  }

  // Arcoíris detrás del unicornio.
  for (let y = 2; y < H; y++) for (let x = 0; x < W; x++) {
    const r = Math.hypot(x + 0.5 - (OX + 0.5), y + 0.5 - (B - 4));
    const band = Math.floor(28 - r);
    if (band < 0 || band >= U_RAINBOW.length || y + 0.5 < B - 3) continue;
    for (let z = OZ - 8; z <= OZ - 6; z++) if (isAir(x, y, z)) set(x, y, z, `${U_RAINBOW[band]}_concrete`);
  }

  drawUnicorn(set, isAir, { ox: OX, oy: B, oz: OZ });

  // Corazones flotando y destellos.
  const HEART = ['.X.X.', 'XXXXX', '.XXX.', '..X..'];
  const heart = (x0, yTop, z, name) => HEART.forEach((row, i) => [...row].forEach((c, j) => { if (c === 'X') set(x0 + j, yTop - i, z, name); }));
  heart(OX + 21, B + 22, OZ, 'pink_concrete');
  heart(OX - 24, B + 26, OZ + 1, 'magenta_concrete');
  heart(OX + 24, B + 31, OZ - 2, 'red_concrete');
  for (const [x, y, z] of [[OX + 5, B + 33, OZ + 3], [OX - 12, B + 30, OZ - 2], [OX + 26, B + 12, OZ + 4], [OX - 22, B + 14, OZ + 5], [OX + 12, B + 36, OZ - 4]]) {
    set(x, y, z, 'end_rod', { facing: 'up' });
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) set(x + dx, y + dy, z, 'end_rod', { facing: dx ? 'east' : 'up' });
  }

  // Flores del prado.
  for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    if (!isAir(x, 2, z)) continue;
    const r = rand();
    if (r < 0.14) set(x, 2, z, pick(['pink_tulip', 'allium', 'white_tulip', 'azure_bluet', 'oxeye_daisy', 'cornflower']));
    else if (r < 0.2) set(x, 2, z, 'pink_petals', { flower_amount: String(1 + Math.floor(rand() * 4)), facing: pick(['north', 'east', 'south', 'west']) });
    else if (r < 0.3) set(x, 2, z, 'short_grass');
  }
  return s;
}
