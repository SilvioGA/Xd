// Isla tropical (72×72): mar transparente con arrecife de coral, playa de arena, colina
// con cascada y poza, palmeras curvadas con cocos, cabaña tiki, muelle, hamaca, sombrilla,
// castillo de arena, huevos de tortuga y un tesoro enterrado.

import { Schematic } from './schematic.js';
import { rng, finalizeConnections } from './lobby.js';

export const ISLAND_SEA = 8; // Y de la superficie del mar

export function buildIsland() {
  const W = 72;
  const L = 72;
  const H = 40;
  const SEA = ISLAND_SEA;
  const s = new Schematic(W, H, L);
  s.format = 'Ejemplo integrado';
  s.meta = { name: 'Isla tropical', author: 'Visor de Schematics', dataVersion: 3465 };
  const rand = rng(7777);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const inside = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < W && y < H && z < L;
  const set = (x, y, z, name, props) => { if (inside(x, y, z)) s.set(x, y, z, name, props); };
  const get = (x, y, z) => (inside(x, y, z) ? s.palette[s.get(x, y, z)].name.slice(10) : 'out');
  const isAir = (x, y, z) => get(x, y, z) === 'air';

  // ---------- Relieve ----------
  const CX = 36;
  const CZ = 36;
  const radius = (a) => 19 + 2.5 * Math.sin(3 * a + 0.5) + 1.5 * Math.sin(5 * a + 2);
  const HILL = { x: 31, z: 30 };
  const shape = (x, z) => {
    const d = Math.hypot(x + 0.5 - CX, z + 0.5 - CZ);
    const t = d / radius(Math.atan2(z - CZ, x - CX));
    return { d, t };
  };
  const hm = new Int16Array(W * L);
  for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    const { d, t } = shape(x, z);
    let h;
    if (t < 1) {
      const hd = Math.hypot(x - HILL.x, z - HILL.z);
      const hill = 13 * Math.pow(Math.max(0, 1 - hd / 11.5), 1.5) + Math.max(0, Math.sin(x * 0.5) + Math.sin(z * 0.6)) * (hd < 9 ? 1 : 0);
      h = SEA + 1 + Math.round((1 - t) * 3 + hill);
    } else {
      h = Math.max(1, SEA - 1 - Math.round((d - radius(Math.atan2(z - CZ, x - CX))) * 0.55 + Math.sin(x * 0.4 + z * 0.3) * 0.6));
    }
    hm[z * W + x] = h;
  }
  const hAt = (x, z) => (x < 0 || z < 0 || x >= W || z >= L ? 0 : hm[z * W + x]);

  for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    const { t } = shape(x, z);
    const top = hAt(x, z);
    const slope = Math.max(...[[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => Math.abs(hAt(x + a, z + b) - top)));
    const beach = t > 0.74 || top <= SEA + 2;
    for (let y = 0; y <= top; y++) {
      let m;
      if (top < SEA) {
        // Fondo marino: arena cerca de la orilla, grava y arcilla en lo hondo.
        if (y === top) m = top >= SEA - 3 ? 'sand' : rand() < 0.3 ? pick(['gravel', 'clay']) : 'sand';
        else m = y > top - 3 ? 'sand' : 'sandstone';
        if (y < top - 3) m = 'stone';
      } else if (beach) m = y > top - 3 ? 'sand' : y > top - 5 ? 'sandstone' : 'stone';
      else if (y === top) m = slope >= 3 ? pick(['stone', 'andesite', 'mossy_cobblestone']) : rand() < 0.08 ? 'moss_block' : 'grass_block';
      else m = y > top - 3 ? 'dirt' : 'stone';
      set(x, y, z, m);
    }
    for (let y = top + 1; y <= SEA; y++) set(x, y, z, 'water');
  }

  // ---------- Arrecife y vida marina ----------
  const CORALS = ['tube', 'brain', 'bubble', 'fire', 'horn'];
  for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    const top = hAt(x, z);
    if (top >= SEA - 1) continue;
    const { t } = shape(x, z);
    const reef = t > 1.12 && t < 1.55 && Math.sin(x * 0.45) + Math.sin(z * 0.5 + 1) + Math.sin((x + z) * 0.3) > -0.4;
    // Manchas de color: cada zona del arrecife tiene su coral (azul, rosa, morado, rojo, amarillo).
    const kind = CORALS[Math.floor(((Math.sin(x * 0.23 + z * 0.11) + Math.cos(z * 0.19 - x * 0.07)) * 0.25 + 0.5) * 5 + 5) % 5];
    if (reef && top <= SEA - 2) {
      set(x, top, z, `${kind}_coral_block`);
      if (rand() < 0.35 && top + 1 < SEA) set(x, top + 1, z, `${kind}_coral_block`);
      const up = get(x, top + 1, z) === 'water' ? top + 1 : top + 2;
      const r = rand();
      if (up < SEA && r < 0.45) set(x, up, z, `${pick(CORALS)}_coral${rand() < 0.5 ? '' : '_fan'}`, { waterlogged: 'true' });
      else if (up < SEA && r < 0.55) set(x, up, z, 'sea_pickle', { pickles: String(1 + Math.floor(rand() * 4)), waterlogged: 'true' });
    } else {
      const r = rand();
      if (top <= SEA - 4 && r < 0.012) {
        // Kelp: tallos que suben hasta cerca de la superficie.
        const len = 2 + Math.floor(rand() * (SEA - top - 2));
        for (let i = 1; i <= len; i++) set(x, top + i, z, i === len ? 'kelp' : 'kelp_plant');
      } else if (r < 0.07 && top < SEA - 1) set(x, top + 1, z, 'seagrass');
      else if (r < 0.08 && top < SEA - 2) { set(x, top + 1, z, 'tall_seagrass', { half: 'lower' }); set(x, top + 2, z, 'tall_seagrass', { half: 'upper' }); }
    }
  }

  // ---------- Poza con cascada (al este de la colina) ----------
  const P = { x: 43, z: 31 };
  const pg = hAt(P.x, P.z);
  for (let z = P.z - 3; z <= P.z + 3; z++) for (let x = P.x - 3; x <= P.x + 3; x++) {
    const d = Math.hypot(x - P.x, z - P.z);
    if (d > 3.3) continue;
    for (let y = pg - 2; y <= pg + 3; y++) set(x, y, z, y <= pg - 1 ? 'water' : 'air');
    set(x, pg - 3, z, 'clay');
    if (d > 2.3) set(x, pg - 1, z, pick(['mossy_cobblestone', 'stone', 'moss_block']));
    else if (rand() < 0.15) set(x, pg, z, 'lily_pad');
  }
  // Roca de la que cae el agua.
  const cz = P.z - 4;
  for (let x = P.x - 2; x <= P.x + 2; x++) for (let y = pg - 2; y <= pg + 6 - Math.abs(x - P.x); y++) {
    set(x, y, cz, pick(['mossy_cobblestone', 'stone', 'andesite', 'mossy_cobblestone']));
    set(x, y, cz - 1, 'stone');
  }
  set(P.x, pg + 6, cz, 'water'); // nacimiento
  set(P.x, pg + 6, cz - 1, 'stone');
  for (let y = pg; y <= pg + 5; y++) set(P.x, y, cz + 1, 'water', { level: '8' });
  for (let y = pg - 2; y <= pg - 1; y++) set(P.x, y, cz + 1, 'water'); // el chorro cae dentro de la poza
  set(P.x, pg + 7, cz, 'moss_block');
  for (const dx of [-1, 1]) set(P.x + dx, pg + 6, cz, 'mossy_cobblestone');

  // ---------- Palmeras ----------
  const palm = (x0, z0, lean, height, seed) => {
    const r = rng(seed);
    const base = hAt(x0, z0);
    let px = x0 + 0.5;
    let pz = z0 + 0.5;
    let top = [x0, base, z0];
    for (let i = 1; i <= height; i++) {
      const k = (i / height) ** 2 * 3.2;
      px = x0 + 0.5 + lean[0] * k;
      pz = z0 + 0.5 + lean[1] * k;
      top = [Math.floor(px), base + i, Math.floor(pz)];
      set(...top, 'jungle_log', { axis: 'y' });
    }
    const [tx, ty, tz] = top;
    set(tx, ty + 1, tz, 'jungle_leaves', { persistent: 'true' });
    // Hojas en abanico que suben un poco y caen hacia las puntas.
    const n = 8;
    for (let f = 0; f < n; f++) {
      const a = (f / n) * Math.PI * 2 + r() * 0.3;
      const len = 4 + Math.floor(r() * 2);
      for (let i = 1; i <= len; i++) {
        const x = Math.round(tx + Math.cos(a) * i);
        const z = Math.round(tz + Math.sin(a) * i);
        const y = ty + 1 - Math.floor(((i - 1.5) ** 2) / 3.5);
        if (isAir(x, y, z)) set(x, y, z, 'jungle_leaves', { persistent: 'true' });
        if (i === len && isAir(x, y - 1, z)) set(x, y - 1, z, 'jungle_leaves', { persistent: 'true' });
      }
    }
    // Cocos: vainas de cacao pegadas al tronco bajo la copa.
    for (const [dx, dz, facing] of [[1, 0, 'west'], [-1, 0, 'east'], [0, 1, 'north'], [0, -1, 'south']]) {
      if (r() < 0.7 && isAir(tx + dx, ty - 1, tz + dz)) set(tx + dx, ty - 1, tz + dz, 'cocoa', { age: '2', facing });
    }
    return top;
  };
  // Palmeras repartidas por la playa, inclinadas hacia el mar.
  let seed = 100;
  const palms = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + (rand() - 0.5) * 0.35;
    const R = radius(a) * (0.7 + rand() * 0.12);
    const x = Math.round(CX + Math.cos(a) * R);
    const z = Math.round(CZ + Math.sin(a) * R);
    if (hAt(x, z) <= SEA) continue;
    if (a > 1.2 && a < 1.9) continue; // deja libre la playa del muelle (al sur)
    palms.push([x, z]);
    palm(x, z, [Math.cos(a) * 0.9, Math.sin(a) * 0.9], 9 + Math.floor(rand() * 4), seed++);
  }

  // Orilla sur: primera fila con agua bajando desde el centro.
  const shoreZ = (x) => {
    let z = CZ;
    while (z < L - 1 && hAt(x, z + 1) > SEA) z++;
    return z;
  };

  // ---------- Muelle ----------
  const DX = [37, 39];
  const dockStart = Math.max(shoreZ(37), shoreZ(38), shoreZ(39)) - 1;
  const dockEnd = Math.min(L - 3, dockStart + 15);
  for (let z = dockStart; z <= dockEnd; z++) for (let x = DX[0]; x <= DX[1]; x++) {
    set(x, SEA + 1, z, 'spruce_planks');
    const post = (x === DX[0] || x === DX[1]) && (z - dockStart) % 4 === 0;
    if (post) {
      for (let y = hAt(x, z) + 1; y <= SEA; y++) set(x, y, z, 'stripped_spruce_log', { axis: 'y' });
      set(x, SEA + 2, z, 'spruce_fence');
      if ((z - dockStart) % 8 === 0) set(x, SEA + 3, z, 'lantern');
    }
  }
  set(DX[0], SEA + 2, dockEnd, 'barrel', { facing: 'up' });
  set(DX[1], SEA + 2, dockEnd, 'chest', { facing: 'north' });
  set(38, SEA + 2, dockEnd - 1, 'spruce_trapdoor', { facing: 'south', half: 'bottom', open: 'false' });

  // ---------- Cabaña tiki ----------
  const HX0 = 22;
  const HZ0 = 40;
  let hy = 0;
  for (let z = HZ0; z <= HZ0 + 6; z++) for (let x = HX0; x <= HX0 + 6; x++) hy = Math.max(hy, hAt(x, z));
  for (let z = HZ0 - 1; z <= HZ0 + 7; z++) for (let x = HX0 - 1; x <= HX0 + 7; x++) {
    for (let y = hAt(x, z) + 1; y <= hy; y++) set(x, y, z, 'sand'); // nivela el terreno
    for (let y = hy + 1; y <= hy + 14; y++) set(x, y, z, 'air'); // despeja plantas y palmeras del solar
  }
  const floorY = hy + 1;
  for (let z = HZ0; z <= HZ0 + 6; z++) for (let x = HX0; x <= HX0 + 6; x++) {
    set(x, floorY, z, (x + z) % 2 ? 'bamboo_mosaic' : 'bamboo_planks');
    const corner = (x === HX0 || x === HX0 + 6) && (z === HZ0 || z === HZ0 + 6);
    const edge = x === HX0 || x === HX0 + 6 || z === HZ0 || z === HZ0 + 6;
    if (corner) for (let y = floorY + 1; y <= floorY + 4; y++) set(x, y, z, 'stripped_bamboo_block', { axis: 'y' });
    else if (edge && !(z === HZ0 + 6 && x >= HX0 + 2 && x <= HX0 + 4)) set(x, floorY + 1, z, 'bamboo_fence');
  }
  // Tejado de paja a cuatro aguas con alero.
  for (let k = 0; k <= 4; k++) {
    const y = floorY + 5 + k;
    for (let z = HZ0 - 1 + k; z <= HZ0 + 7 - k; z++) for (let x = HX0 - 1 + k; x <= HX0 + 7 - k; x++) {
      const edge = x === HX0 - 1 + k || x === HX0 + 7 - k || z === HZ0 - 1 + k || z === HZ0 + 7 - k;
      if (edge || k === 4) set(x, y, z, 'hay_block', { axis: 'y' });
    }
  }
  set(HX0 + 3, floorY + 10, HZ0 + 3, 'bamboo_fence');
  set(HX0 + 3, floorY + 1, HZ0 + 3, 'red_carpet');
  set(HX0 + 1, floorY + 1, HZ0 + 1, 'barrel', { facing: 'up' });
  set(HX0 + 5, floorY + 1, HZ0 + 1, 'melon');
  set(HX0 + 3, floorY + 4, HZ0 + 3, 'lantern', { hanging: 'true' });
  set(HX0 + 3, floorY + 5, HZ0 + 3, 'hay_block', { axis: 'y' });
  // Antorchas tiki a la entrada.
  for (const x of [HX0 + 1, HX0 + 5]) {
    set(x, floorY, HZ0 + 8, 'sand');
    set(x, floorY + 1, HZ0 + 8, 'bamboo_fence');
    set(x, floorY + 2, HZ0 + 8, 'bamboo_fence');
    set(x, floorY + 3, HZ0 + 8, 'torch');
  }
  // Fogata con troncos para sentarse.
  const F = { x: HX0 + 3, z: HZ0 + 11 };
  set(F.x, hAt(F.x, F.z) + 1, F.z, 'campfire', { lit: 'true', facing: 'north' });
  for (const [dx, dz, axis] of [[-2, 0, 'z'], [2, 0, 'z'], [0, 2, 'x']]) set(F.x + dx, hAt(F.x + dx, F.z + dz) + 1, F.z + dz, 'stripped_jungle_log', { axis });

  // ---------- Hamaca entre dos palmeras ----------
  const hz = shoreZ(49) - 4;
  const hx0 = 46;
  const hx1 = 52;
  palm(hx0, hz, [-0.35, 0], 10, 900);
  palm(hx1, hz, [0.35, 0], 10, 901);
  // A poca altura los troncos aún están rectos: la hamaca se ata en x = hx0 y x = hx1.
  const hangY = Math.min(hAt(hx0, hz), hAt(hx1, hz)) + 4;
  for (let x = hx0 + 1; x <= hx1 - 1; x++) {
    const mid = (hx0 + hx1) / 2;
    const sag = Math.abs(x - mid) < 1.6 ? 1 : 0;
    set(x, hangY - sag, hz, x % 2 ? 'white_wool' : 'light_blue_wool');
  }

  // ---------- Playa: sombrilla, toalla, castillo de arena, huevos de tortuga, tesoro ----------
  const bx = 31;
  const bz = shoreZ(bx) - 3;
  const by = hAt(bx, bz);
  for (let y = by + 1; y <= by + 4; y++) set(bx, y, bz, 'birch_fence');
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
    if (Math.abs(dx) + Math.abs(dz) > 3) continue;
    const ring = Math.max(Math.abs(dx), Math.abs(dz));
    set(bx + dx, by + 5 - (ring === 2 ? 1 : 0), bz + dz, (Math.atan2(dz, dx) * 4 / Math.PI + 8) % 2 < 1 ? 'red_wool' : 'white_wool');
  }
  for (let dz = 0; dz <= 2; dz++) set(bx + 2, hAt(bx + 2, bz + dz) + 1, bz + dz, dz === 1 ? 'yellow_carpet' : 'orange_carpet');
  for (let dz = 0; dz <= 2; dz++) set(bx + 3, hAt(bx + 3, bz + dz) + 1, bz + dz, dz === 1 ? 'orange_carpet' : 'yellow_carpet');
  // Castillo de arena.
  const sx = 43;
  const sz = shoreZ(sx) - 2;
  const sy = hAt(sx, sz);
  for (let dz = 0; dz <= 2; dz++) for (let dx = 0; dx <= 2; dx++) set(sx + dx, sy + 1, sz + dz, 'sandstone');
  for (const [dx, dz] of [[0, 0], [2, 0], [0, 2], [2, 2]]) set(sx + dx, sy + 2, sz + dz, 'sandstone_wall');
  set(sx + 1, sy + 2, sz + 1, 'cut_sandstone');
  set(sx + 1, sy + 3, sz + 1, 'sandstone_wall');
  // Huevos de tortuga.
  for (const [x, z] of [[27, shoreZ(27) - 1], [28, shoreZ(28) - 2], [55, shoreZ(55) - 1]]) {
    if (hAt(x, z) > SEA) set(x, hAt(x, z) + 1, z, 'turtle_egg', { eggs: String(2 + Math.floor(rand() * 3)), hatch: '0' });
  }
  // Tesoro medio enterrado junto a la colina, con una X roja.
  const T = { x: 22, z: 30 };
  const ty = hAt(T.x, T.z);
  set(T.x, ty, T.z, 'chest', { facing: 'south' });
  for (const [dx, dz] of [[-2, -2], [-1, -1], [1, 1], [2, 2], [-2, 2], [-1, 1], [1, -1], [2, -2]]) {
    set(T.x + dx, hAt(T.x + dx, T.z + dz), T.z + dz, 'red_concrete');
  }
  set(T.x + 1, ty + 1, T.z + 2, 'gold_block');
  set(T.x - 2, ty + 1, T.z + 1, 'raw_gold_block');

  // ---------- Vegetación ----------
  const flowers = ['blue_orchid', 'allium', 'poppy', 'pink_tulip', 'orange_tulip', 'dandelion', 'torchflower'];
  for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    const top = hAt(x, z);
    if (top <= SEA || !isAir(x, top + 1, z)) continue;
    const g = get(x, top, z);
    const r = rand();
    if (g === 'grass_block' || g === 'moss_block') {
      if (r < 0.08) set(x, top + 1, z, pick(flowers));
      else if (r < 0.2) set(x, top + 1, z, 'short_grass');
      else if (r < 0.25) set(x, top + 1, z, 'fern');
      else if (r < 0.27 && isAir(x, top + 2, z)) { set(x, top + 1, z, 'large_fern', { half: 'lower' }); set(x, top + 2, z, 'large_fern', { half: 'upper' }); }
      else if (r < 0.29) {
        const hgt = 4 + Math.floor(rand() * 5);
        for (let i = 1; i <= hgt; i++) set(x, top + i, z, 'bamboo', { age: '1', leaves: hgt - i < 2 ? 'large' : hgt - i < 3 ? 'small' : 'none', stage: '0' });
      } else if (r < 0.31) {
        // Arbusto de jungla.
        set(x, top + 1, z, 'jungle_log', { axis: 'y' });
        for (const [dx, dy, dz] of [[1, 1, 0], [-1, 1, 0], [0, 1, 1], [0, 1, -1], [0, 2, 0], [1, 1, 1]]) {
          if (isAir(x + dx, top + dy, z + dz)) set(x + dx, top + dy, z + dz, 'jungle_leaves', { persistent: 'true' });
        }
      }
    } else if (g === 'sand' && r < 0.015) set(x, top + 1, z, 'dead_bush');
  }

  finalizeConnections(s);
  return s;
}
