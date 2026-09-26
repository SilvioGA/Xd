// Estatua de un conejo blanco sentado, de unos 28 bloques de alto, con una zanahoria
// entre las patas, sobre una peana de césped. Se modela con elipsoides que luego se
// convierten a bloques. Mira al sur (+z).

import { Schematic } from './schematic.js';
import { rng } from './lobby.js';

export const RABBIT_BASE = 2; // altura de la peana; el conejo empieza encima

export function buildRabbit() {
  const W = 29;
  const L = 29;
  const H = 34;
  const B = RABBIT_BASE;
  const CX = 14.5;
  const CZ = 13.5;
  const s = new Schematic(W, H, L);
  s.format = 'Ejemplo integrado';
  s.meta = { name: 'Conejo gigante', author: 'Visor de Schematics', dataVersion: 3465 };
  const rand = rng(42);
  const set = (x, y, z, name, props) => {
    if (x >= 0 && y >= 0 && z >= 0 && x < W && y < H && z < L) s.set(x, y, z, name, props);
  };
  const nameAt = (x, y, z) => s.palette[s.get(x, y, z)].name.slice(10);

  // Distancia normalizada a un elipsoide (<= 1 dentro).
  const ell = (p, c, r) => Math.hypot((p[0] - c[0]) / r[0], (p[1] - c[1]) / r[1], (p[2] - c[2]) / r[2]);

  // Orejas: elipsoides alargados que salen de la cabeza, abiertos hacia fuera y algo hacia atrás.
  const earLocal = (p, side) => {
    const base = [side * 2.0, 17.4, 2.6];
    let x = p[0] - base[0];
    let y = p[1] - base[1];
    let z = p[2] - base[2];
    // Eje de la oreja inclinado hacia fuera (a) y hacia atrás (b): se pasa el punto a ese sistema.
    const a = side * (13 * Math.PI) / 180;
    [x, y] = [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
    const b = (10 * Math.PI) / 180;
    [y, z] = [y * Math.cos(b) - z * Math.sin(b), y * Math.sin(b) + z * Math.cos(b)];
    return [x, y, z];
  };
  const EAR = { c: [0, 6.2, 0], r: [2.0, 6.9, 1.35] };
  const INNER = { c: [0, 6.8, 0.7], r: [1.1, 5.2, 0.75] };

  const SHAPES = [
    { c: [0, 5, -1.5], r: [6.8, 5.6, 7] }, // cuartos traseros
    { c: [0, 9.5, 1.2], r: [5, 6, 5] }, // pecho
    { c: [0, 15.2, 3.6], r: [4.6, 4.2, 4.4] }, // cabeza
    { c: [-2.1, 14, 5.6], r: [2.5, 2, 2.2] }, // mofletes
    { c: [2.1, 14, 5.6], r: [2.5, 2, 2.2] },
    { c: [-4.6, 1.3, 2.2], r: [1.9, 1.4, 4] }, // patas traseras
    { c: [4.6, 1.3, 2.2], r: [1.9, 1.4, 4] },
    { c: [-2, 2, 5.3], r: [1.5, 2, 1.8] }, // patas delanteras
    { c: [2, 2, 5.3], r: [1.5, 2, 1.8] },
  ];
  const TAIL = { c: [0, 4.2, -8.6], r: [2.3, 2.3, 2] };

  // Zanahoria inclinada entre las patas: cono naranja con hojas verdes.
  const CARROT_A = [0, 0.8, 8.2]; // punta
  const CARROT_B = [0, 7.2, 6.4]; // extremo ancho
  const carrot = (p) => {
    const ab = CARROT_B.map((v, i) => v - CARROT_A[i]);
    const ap = p.map((v, i) => v - CARROT_A[i]);
    const len2 = ab.reduce((a, v) => a + v * v, 0);
    const t = ap.reduce((a, v, i) => a + v * ab[i], 0) / len2;
    if (t < 0 || t > 1) return false;
    const closest = ab.map((v, i) => CARROT_A[i] + v * t);
    return Math.hypot(...p.map((v, i) => v - closest[i])) <= 0.35 + 1.25 * t;
  };

  // ---------- Peana ----------
  for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    const d = Math.hypot(x + 0.5 - CX, z + 0.5 - (CZ + 0.5));
    if (d > 13.8) continue;
    set(x, 0, z, 'stone_bricks');
    set(x, 1, z, d > 12.8 ? 'polished_andesite' : 'grass_block');
  }

  // ---------- Conejo ----------
  for (let y = B; y < H; y++) for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    const p = [x + 0.5 - CX, y + 0.5 - B, z + 0.5 - CZ];
    let m = null;
    if (carrot(p)) m = p[1] > 6.3 ? 'orange_terracotta' : 'orange_concrete';
    else if (ell(p, TAIL.c, TAIL.r) <= 1) m = 'snow_block';
    else if (SHAPES.some((sh) => ell(p, sh.c, sh.r) <= 1)) {
      // Barriga y hocico algo más claros que el resto.
      const belly = ell(p, [0, 8, 4.5], [3.2, 5, 2.5]) <= 1;
      m = belly ? 'white_concrete' : 'white_wool';
    } else {
      for (const side of [-1, 1]) {
        const e = earLocal(p, side);
        if (ell(e, EAR.c, EAR.r) <= 1) {
          m = e[2] > 0.1 && ell(e, INNER.c, INNER.r) <= 1 ? 'pink_wool' : 'white_wool';
        }
      }
    }
    if (m) set(x, y, z, m);
  }

  // Hojas de la zanahoria.
  const top = CARROT_B.map((v, i) => v + [CX, B, CZ][i]);
  for (const [dx, dy, dz, m] of [[0, 1, 1, 'lime_wool'], [0, 2, 1, 'green_wool'], [-1, 1, 1, 'green_wool'], [1, 1, 1, 'green_wool'], [0, 2, 2, 'lime_wool'], [0, 3, 1, 'lime_wool'], [-1, 2, 2, 'lime_wool'], [1, 2, 2, 'green_wool']]) {
    const x = Math.floor(top[0]) + dx;
    const y = Math.floor(top[1]) + dy;
    const z = Math.floor(top[2]) + dz;
    if (nameAt(x, y, z) === 'air') set(x, y, z, m);
  }

  // Cara: se pinta sobre la superficie frontal de la cabeza.
  const front = (x, y) => {
    for (let z = L - 1; z >= 0; z--) if (s.get(x, y, z) !== 0) return z;
    return -1;
  };
  const paint = (x, y, m) => {
    const z = front(x, y);
    if (z >= 0) set(x, y, z, m);
  };
  // La columna central de la cara es x = 14 (el ancho es impar): lo simétrico de x es 28 - x.
  const MX = Math.floor(CX);
  const eyeY = B + 16;
  for (const side of [-1, 1]) {
    for (const dx of [2, 3]) for (const dy of [0, 1]) {
      const x = MX + side * dx;
      paint(x, eyeY + dy, dx === 3 && dy === 1 ? 'white_concrete' : 'black_concrete'); // brillo arriba, hacia fuera
    }
  }
  // Hocico: dos almohadillas blancas redondeadas bajo la nariz.
  for (let y = B + 12; y <= B + 15; y++) for (let z = 18; z <= 23; z++) for (let x = MX - 3; x <= MX + 3; x++) {
    const p = [x + 0.5 - CX, y + 0.5 - B, z + 0.5 - CZ];
    const pad = [-0.9, 0.9].some((ox) => ell(p, [ox, 13.9, 7.4], [1.5, 1.2, 1.2]) <= 1);
    if (pad && s.get(x, y, z) === 0) set(x, y, z, 'white_concrete');
  }
  // Nariz rosa en triángulo invertido (3 bloques arriba y 1 abajo), que sobresale del hocico.
  const nose = [[MX - 1, B + 15], [MX, B + 15], [MX + 1, B + 15], [MX, B + 14]];
  const noseZ = Math.max(...nose.map(([x, y]) => front(x, y))) + 1;
  for (const [x, y] of nose) for (let z = front(x, y) + 1; z <= noseZ; z++) set(x, y, z, 'pink_wool');
  // Mofletes sonrosados a los lados del hocico.
  for (const side of [-1, 1]) paint(MX + side * 4, B + 14, 'pink_wool');

  // ---------- Detalles del césped ----------
  const flowers = ['dandelion', 'poppy', 'azure_bluet', 'oxeye_daisy', 'cornflower', 'pink_tulip'];
  for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    if (nameAt(x, 1, z) !== 'grass_block' || s.get(x, 2, z) !== 0) continue;
    const r = rand();
    if (r < 0.1) set(x, 2, z, flowers[Math.floor(rand() * flowers.length)]);
    else if (r < 0.3) set(x, 2, z, 'short_grass');
  }
  // Zanahorias plantadas junto a la peana.
  for (const [x, z] of [[5, 22], [6, 23], [23, 22], [22, 23], [7, 24]]) {
    set(x, 1, z, 'farmland', { moisture: '7' });
    set(x, 2, z, 'carrots', { age: '7' });
  }

  return s;
}
