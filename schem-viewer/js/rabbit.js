// Tres estatuas de conejo, cada una con su peana, una al lado de la otra:
// - el conejo bueno: blanco, con una zanahoria sobre las patas y una peana de césped con flores;
// - el conejo malvado: pelaje oscuro, oreja rota, ojos rojos con cejas de enfado, colmillos
//   y una espada clavada en el suelo, sobre una peana infernal (magma, fuego de almas, huesos);
// - el conejo del amor: rosa, con ojos de corazón, abrazando un gran corazón rojo, con
//   corazones flotando y una peana de flores con un corazón en mosaico.
// Se modelan con elipsoides que luego se convierten a bloques. Todos miran al sur (+z).

import { Schematic } from './schematic.js';
import { rng } from './lobby.js';

export const RABBIT_BASE = 2; // altura de las peanas; los conejos empiezan encima
export const RABBIT_FRAME = 29; // cada conejo ocupa un cuadro de 29×29
export const EVIL_OFFSET = 33; // x donde empieza el cuadro del conejo malvado
export const LOVE_OFFSET = 66; // x donde empieza el cuadro del conejo del amor

const FRAME = RABBIT_FRAME;

// Distancia normalizada a un elipsoide (<= 1 dentro).
const ell = (p, c, r) => Math.hypot((p[0] - c[0]) / r[0], (p[1] - c[1]) / r[1], (p[2] - c[2]) / r[2]);

// Distancia de p al segmento a-b y posición t (0..1) a lo largo de él.
const toSegment = (p, a, b) => {
  const ab = b.map((v, i) => v - a[i]);
  const len2 = ab.reduce((acc, v) => acc + v * v, 0);
  const t = Math.max(0, Math.min(1, p.reduce((acc, v, i) => acc + (v - a[i]) * ab[i], 0) / len2));
  return { t, d: Math.hypot(...p.map((v, i) => v - a[i] - ab[i] * t)) };
};

// Punto p pasado al sistema de una oreja que sale de la cabeza, abierta hacia fuera (open)
// y algo hacia atrás.
const earLocal = (p, side, open) => {
  const base = [side * 2.0, 17.4, 2.6];
  let x = p[0] - base[0];
  let y = p[1] - base[1];
  let z = p[2] - base[2];
  const a = side * (open * Math.PI) / 180;
  [x, y] = [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  const b = (10 * Math.PI) / 180;
  [y, z] = [y * Math.cos(b) - z * Math.sin(b), y * Math.sin(b) + z * Math.cos(b)];
  return [x, y, z];
};
const EAR = { c: [0, 6.2, 0], r: [2.0, 6.9, 1.35] };
const INNER = { c: [0, 6.8, 0.7], r: [1.1, 5.2, 0.75] };

const BODY = [
  { c: [0, 5, -1.5], r: [6.8, 5.6, 7] }, // cuartos traseros
  { c: [0, 9.5, 1.2], r: [5, 6, 5] }, // pecho
  { c: [0, 15.2, 3.6], r: [4.6, 4.2, 4.4] }, // cabeza
  { c: [-2.1, 14, 5.6], r: [2.5, 2, 2.2] }, // mofletes
  { c: [2.1, 14, 5.6], r: [2.5, 2, 2.2] },
  { c: [-4.6, 1.3, 2.2], r: [1.9, 1.4, 4] }, // patas traseras
  { c: [4.6, 1.3, 2.2], r: [1.9, 1.4, 4] },
];
const GOOD_PAWS = [
  { c: [-2, 2, 5.3], r: [1.5, 2, 1.8] }, // patas delanteras apoyadas
  { c: [2, 2, 5.3], r: [1.5, 2, 1.8] },
];
const HOLD_PAWS = [ // brazos hacia delante, sujetando algo contra el pecho
  { c: [-3.1, 8.6, 4.2], r: [1.5, 2.6, 1.7] }, // brazos
  { c: [3.1, 8.6, 4.2], r: [1.5, 2.6, 1.7] },
  { c: [-1.3, 7.4, 6.6], r: [1.3, 1.3, 1.5] }, // patas agarrando la empuñadura
  { c: [1.3, 7.4, 6.6], r: [1.3, 1.3, 1.5] },
];
const TAIL = { c: [0, 4.2, -8.6], r: [2.3, 2.3, 2] };

// Zanahoria tumbada sobre las patas delanteras: punta a la izquierda, hojas a la derecha.
const CARROT_TIP = [-4.6, 3.3, 7.3];
const CARROT_TOP = [2.6, 4.5, 7.3];
const carrot = (p) => {
  const { t, d } = toSegment(p, CARROT_TIP, CARROT_TOP);
  if (t <= 0 || d > 0.35 + 1.05 * t) return null;
  return Math.abs(t - 0.4) < 0.05 || Math.abs(t - 0.7) < 0.05 ? 'orange_terracotta' : 'orange_concrete'; // surcos
};
// Abanico de tallos que se abren hacia arriba y hacia fuera.
const SHOOTS = [[0.6, 3.8, 0.3], [1.9, 3.5, 0.4], [3.2, 2.6, 0.3], [3.9, 1.2, 0.2], [1.2, 3.9, -0.6], [2.8, 3.2, -0.5]];
const LEAF_BASE = [CARROT_TOP[0] + 0.6, CARROT_TOP[1] + 0.3, CARROT_TOP[2]];
const carrotLeaves = (p) => {
  const i = SHOOTS.findIndex((o) => toSegment(p, LEAF_BASE, LEAF_BASE.map((v, k) => v + o[k])).d <= 0.62);
  return i < 0 ? null : i % 2 ? 'lime_wool' : 'green_wool';
};

export function buildRabbit() {
  const W = LOVE_OFFSET + FRAME;
  const L = FRAME;
  const H = 34;
  const B = RABBIT_BASE;
  const s = new Schematic(W, H, L);
  s.format = 'Ejemplo integrado';
  s.meta = { name: 'Conejos: bueno, malvado y del amor', author: 'Visor de Schematics', dataVersion: 3465 };
  const rand = rng(42);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const set = (x, y, z, name, props) => {
    if (x >= 0 && y >= 0 && z >= 0 && x < W && y < H && z < L) s.set(x, y, z, name, props);
  };
  const nameAt = (x, y, z) => s.palette[s.get(x, y, z)].name.slice(10);
  const front = (x, y) => {
    for (let z = L - 1; z >= 0; z--) if (s.get(x, y, z) !== 0) return z;
    return -1;
  };
  const paint = (x, y, m) => {
    const z = front(x, y);
    if (z >= 0) set(x, y, z, m);
  };

  const drawRabbit = (ox, kind) => {
    const evil = kind === 'evil';
    const love = kind === 'love';
    const CX = ox + 14.5;
    const CZ = 13.5;
    const MX = ox + 14; // columna central de la cara: lo simétrico de x es 2·MX - x
    const inFrame = (fn) => {
      for (let y = 0; y < H; y++) for (let z = 0; z < L; z++) for (let x = ox; x < ox + FRAME; x++) fn(x, y, z, [x + 0.5 - CX, y + 0.5 - B, z + 0.5 - CZ]);
    };

    // ---------- Peana ----------
    inFrame((x, y, z) => {
      if (y > 1) return;
      const d = Math.hypot(x + 0.5 - CX, z + 0.5 - (CZ + 0.5));
      if (d > 13.8) return;
      if (y === 0) set(x, 0, z, evil ? 'blackstone' : love ? 'smooth_quartz' : 'stone_bricks');
      else if (love) {
        const tile = Math.floor(Math.atan2(z + 0.5 - CZ - 0.5, x + 0.5 - CX) / (Math.PI / 12));
        set(x, 1, z, d > 12.8 ? (tile % 2 ? 'pink_terracotta' : 'white_terracotta') : 'grass_block');
      } else if (evil) {
        const crack = Math.abs(Math.sin((x - ox) * 0.9 + z * 0.4) + Math.sin(z * 0.8 - (x - ox) * 0.3)) < 0.18;
        set(x, 1, z, d > 12.8 ? 'polished_blackstone_bricks' : crack ? 'magma_block' : pick(['netherrack', 'netherrack', 'crimson_nylium', 'soul_soil', 'blackstone']));
      } else set(x, 1, z, d > 12.8 ? 'polished_andesite' : 'grass_block');
    });

    // ---------- Cuerpo ----------
    const paws = evil || love ? HOLD_PAWS : GOOD_PAWS;
    const fur = evil ? 'gray_wool' : love ? 'pink_wool' : 'white_wool';
    const light = evil ? 'light_gray_wool' : love ? 'white_wool' : 'white_concrete';
    inFrame((x, y, z, p) => {
      if (y < B) return;
      let m = null;
      if (kind === 'good') m = carrot(p) || carrotLeaves(p);
      if (m) {
        // la zanahoria y sus hojas van delante del cuerpo
      } else if (ell(p, TAIL.c, TAIL.r) <= 1) m = evil ? 'black_wool' : 'snow_block';
      else if (BODY.some((sh) => ell(p, sh.c, sh.r) <= 1) || paws.some((sh) => ell(p, sh.c, sh.r) <= 1)) {
        const belly = ell(p, [0, 8, 4.5], [3.2, 5, 2.5]) <= 1;
        m = belly ? light : fur;
        // Manchas oscuras en la espalda del malvado.
        if (evil && p[2] < 0 && Math.sin(p[0] * 0.9 + p[1] * 0.5) + Math.sin(p[1] * 0.7 - p[2] * 0.6) > 0.9) m = 'black_wool';
      } else {
        for (const side of [-1, 1]) {
          // El malvado tiene la oreja derecha rota: más abierta, más corta y con una muesca.
          const torn = evil && side === 1;
          const e = earLocal(p, side, torn ? 38 : 13);
          const r = torn ? [EAR.r[0], 5.2, EAR.r[2]] : EAR.r;
          const c = torn ? [0, 4.6, 0] : EAR.c;
          if (ell(e, c, r) > 1) continue;
          if (torn && e[1] > 5.5 && e[1] < 7.5 && e[0] > 0.2) continue; // muesca
          m = e[2] > 0.1 && ell(e, INNER.c, INNER.r) <= 1 ? (evil ? 'red_wool' : love ? 'magenta_wool' : 'pink_wool') : fur;
        }
      }
      if (m) set(x, y, z, m);
    });

    // ---------- Cara ----------
    const eyeY = B + 16;
    // Ojos de corazón (3×3) para el conejo del amor; ojos normales para los demás.
    const HEART_EYE = ['X.X', 'XXX', '.X.'];
    if (love) {
      for (const side of [-1, 1]) HEART_EYE.forEach((row, r) => [...row].forEach((c, i) => {
        if (c === 'X') paint(MX + side * (3 - i), eyeY + 2 - r, 'red_concrete'); // más centrados y un poco más arriba
      }));
    }
    for (const side of love ? [] : [-1, 1]) {
      for (const dx of [2, 3]) for (const dy of [0, 1]) {
        const x = MX + side * dx;
        if (evil) paint(x, eyeY + dy, dx === 2 && dy === 1 ? 'shroomlight' : 'redstone_block'); // ojos rojos con un punto brillante
        else paint(x, eyeY + dy, dx === 3 && dy === 1 ? 'white_concrete' : 'black_concrete');
      }
    }
    // Hocico: dos almohadillas redondeadas bajo la nariz.
    inFrame((x, y, z, p) => {
      if (y < B + 12 || y > B + 15 || Math.abs(x - MX) > 3) return;
      const pad = [-0.9, 0.9].some((o) => ell(p, [o, 13.9, 7.4], [1.5, 1.2, 1.2]) <= 1);
      if (pad && s.get(x, y, z) === 0) set(x, y, z, light);
    });
    // Nariz en triángulo invertido, a ras del hocico.
    const noseZ = front(MX, B + 14);
    const noseBlock = evil ? 'red_terracotta' : love ? 'magenta_wool' : 'pink_wool';
    for (const x of [MX - 1, MX, MX + 1]) {
      for (let z = front(x, B + 15) + 1; z <= noseZ; z++) set(x, B + 15, z, noseBlock);
      if (front(x, B + 15) === noseZ) set(x, B + 15, noseZ, noseBlock);
    }
    set(MX, B + 14, noseZ, noseBlock);

    if (kind === 'good') {
      for (const side of [-1, 1]) paint(MX + side * 4, B + 14, 'pink_wool'); // mofletes
      return;
    }
    if (love) {
      for (const side of [-1, 1]) { paint(MX + side * 3, B + 14, 'red_wool'); paint(MX + side * 4, B + 14, 'red_wool'); } // sonrojo
      // Sonrisa.
      for (let x = MX - 1; x <= MX + 1; x++) paint(x, B + 12, 'red_concrete');
      for (const side of [-1, 1]) paint(MX + side * 2, B + 13, 'red_concrete');

      // Gran corazón rojo abrazado contra el pecho (2 bloques de grosor).
      const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
      const top = B + 10;
      let hz = 0;
      HEART.forEach((row, r) => [...row].forEach((c, i) => { if (c === 'X') hz = Math.max(hz, front(MX - 3 + i, top - r)); }));
      hz += 1;
      HEART.forEach((row, r) => [...row].forEach((c, i) => {
        if (c !== 'X') return;
        const x = MX - 3 + i;
        const y = top - r;
        const shine = (i === 1 && r === 1) || (i === 2 && r === 0);
        set(x, y, hz, 'red_concrete');
        set(x, y, hz + 1, shine ? 'pink_concrete' : 'red_concrete');
      }));

      // Corazones flotando alrededor de las orejas.
      const SMALL = ['.X.X.', 'XXXXX', '.XXX.', '..X..'];
      for (const [dx, y, z, m] of [[-9, B + 22, 16, 'red_concrete'], [9, B + 25, 15, 'pink_concrete'], [-6, B + 28, 11, 'magenta_concrete']]) {
        SMALL.forEach((row, r) => [...row].forEach((c, i) => { if (c === 'X') set(MX + dx - 2 + i, y + 3 - r, z, m); }));
      }

      // Corazón en mosaico en el suelo, delante del conejo, con la punta hacia quien mira.
      HEART.forEach((row, r) => [...row].forEach((c, i) => {
        if (c === 'X') set(MX - 3 + i, 1, 21 + r, r === 1 && i === 1 ? 'pink_concrete' : 'red_concrete');
      }));
      return;
    }

    // Cejas en V: bajan hacia el centro (cara de enfado).
    for (const side of [-1, 1]) {
      paint(MX + side * 1, eyeY + 2, 'black_concrete');
      paint(MX + side * 2, eyeY + 2, 'black_concrete');
      paint(MX + side * 3, eyeY + 3, 'black_concrete');
      paint(MX + side * 4, eyeY + 3, 'black_concrete');
    }
    // Sonrisa malvada con las comisuras hacia arriba y dos colmillos.
    for (let x = MX - 2; x <= MX + 2; x++) paint(x, B + 12, 'black_concrete');
    for (const side of [-1, 1]) paint(MX + side * 3, B + 13, 'black_concrete');
    for (const side of [-1, 1]) {
      const x = MX + side * 1;
      const z = front(x, B + 12);
      set(x, B + 11, z, 'white_concrete');
      if (s.get(x, B + 11, z + 1) === 0) set(x, B + 11, z + 1, 'white_concrete');
    }
    // Cicatriz sobre el ojo izquierdo.
    for (const [dx, dy] of [[-5, 4], [-4, 3], [-4, 2]]) paint(MX + dx, eyeY + dy, 'red_terracotta');

    // ---------- Espada clavada en el suelo, agarrada con las dos patas ----------
    const sz = Math.max(front(MX, B + 7), front(MX, B + 8)) + 1; // delante de las patas
    for (let y = 1; y <= B + 5; y++) set(MX, y, sz, 'iron_block'); // hoja, clavada en la peana
    for (let x = MX - 2; x <= MX + 2; x++) set(x, B + 6, sz, x === MX ? 'redstone_block' : 'gold_block'); // guarda con gema
    for (let y = B + 7; y <= B + 8; y++) set(MX, y, sz, 'dark_oak_log', { axis: 'y' }); // empuñadura
    set(MX, B + 9, sz, 'gold_block'); // pomo
    // Grieta en el suelo donde está clavada.
    for (const [dx, dz] of [[-1, 0], [1, 0], [0, 1], [0, -1], [-2, 1], [2, -1]]) set(MX + dx, 1, sz + dz, 'magma_block');
  };

  drawRabbit(0, 'good');
  drawRabbit(EVIL_OFFSET, 'evil');
  drawRabbit(LOVE_OFFSET, 'love');

  // ---------- Detalles de las peanas ----------
  const flowers = ['dandelion', 'poppy', 'azure_bluet', 'oxeye_daisy', 'cornflower', 'pink_tulip'];
  for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    if (s.get(x, 2, z) !== 0) continue;
    const ground = nameAt(x, 1, z);
    const r = rand();
    if (ground === 'grass_block' && x >= LOVE_OFFSET) {
      // Flores del amor: pétalos rosas, tulipanes, alliums, rosales y peonías.
      if (r < 0.14) set(x, 2, z, 'pink_petals', { flower_amount: String(1 + Math.floor(rand() * 4)), facing: pick(['north', 'east', 'south', 'west']) });
      else if (r < 0.22) set(x, 2, z, pick(['pink_tulip', 'allium', 'poppy', 'lily_of_the_valley']));
      else if (r < 0.26 && s.get(x, 3, z) === 0) {
        const tall = pick(['rose_bush', 'peony', 'lilac']);
        set(x, 2, z, tall, { half: 'lower' });
        set(x, 3, z, tall, { half: 'upper' });
      } else if (r < 0.36) set(x, 2, z, 'short_grass');
    } else if (ground === 'grass_block') {
      if (r < 0.1) set(x, 2, z, pick(flowers));
      else if (r < 0.3) set(x, 2, z, 'short_grass');
    } else if (ground === 'soul_soil' && r < 0.35) set(x, 2, z, 'soul_fire');
    else if (ground === 'crimson_nylium' && r < 0.3) set(x, 2, z, pick(['crimson_roots', 'crimson_fungus']));
    else if (ground === 'netherrack' && r < 0.05) set(x, 2, z, 'bone_block', { axis: pick(['x', 'z']) });
    else if (ground === 'netherrack' && r < 0.08) set(x, 2, z, 'cobweb');
    else if (ground === 'netherrack' && r < 0.14) set(x, 2, z, 'wither_rose');
  }
  // Zanahorias plantadas junto al conejo bueno.
  for (const [x, z] of [[5, 22], [6, 23], [23, 22], [22, 23], [7, 24]]) {
    set(x, 1, z, 'farmland', { moisture: '7' });
    set(x, 2, z, 'carrots', { age: '7' });
  }
  // Calaveras, pinchos y farolillos de almas alrededor del malvado.
  const ex = EVIL_OFFSET + 14.5;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    const x = Math.floor(ex + Math.cos(a) * 12.6);
    const z = Math.floor(14 + Math.sin(a) * 12.6);
    if (i % 2) {
      set(x, 2, z, 'pointed_dripstone', { vertical_direction: 'up', thickness: 'base' });
      set(x, 3, z, 'pointed_dripstone', { vertical_direction: 'up', thickness: 'tip' });
    } else {
      set(x, 2, z, 'polished_blackstone_brick_wall');
      set(x, 3, z, 'soul_lantern');
    }
  }
  for (const [dx, dz, rot] of [[-7, 9, '0'], [8, 8, '2'], [-9, -3, '4'], [9, -5, '12']]) {
    const x = Math.floor(ex + dx);
    const z = 14 + dz;
    set(x, 2, z, 'wither_skeleton_skull', { rotation: rot });
  }

  return s;
}
