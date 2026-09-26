// Lobby de SkyWars: templo japonés tallado en una montaña, en otoño (60×50).
// Apareces al sur mirando al norte. Caminas unos 20 bloques (puente de piedra
// sobre el arroyo) hasta la fachada del templo, excavada en el acantilado, donde
// está el muro de carteles para unirse a las partidas: 12 de Solo y 12 de Duos.
// Encima, el título SKYWARS grabado en oro en la roca; a la izquierda una cascada
// y a la derecha una escalera tallada que sube a un santuario con campana.
// Bloques de Minecraft 1.20+.

import { finalizeConnections } from './lobby.js';
import { createJapaneseKit } from './jp-kit.js';
import { signNbt } from './schem-writer.js';

export const SKYWARS_SURFACE = 4;
export const SKYWARS_SPAWN = [30, SKYWARS_SURFACE + 1, 43];

const FONT = {
  S: ['111', '100', '111', '001', '111'],
  K: ['101', '101', '110', '101', '101'],
  Y: ['101', '101', '010', '010', '010'],
  W: ['10001', '10001', '10101', '10101', '01010'],
  A: ['010', '101', '111', '101', '101'],
  R: ['110', '101', '110', '101', '101'],
};

const SOLO_MAPS = ['Fuji', 'Kioto', 'Nara', 'Edo', 'Nikko', 'Hakone', 'Kamakura', 'Osaka', 'Kobe', 'Sapporo', 'Okinawa', 'Kiso'];
const DUO_MAPS = ['Ryu', 'Kitsune', 'Tengu', 'Oni', 'Kappa', 'Tanuki', 'Koi', 'Taka', 'Tsuru', 'Kame', 'Inari', 'Tora'];

export function buildSkyWarsLobby() {
  const W = 60;
  const L = 50;
  const H = 64;
  const kit = createJapaneseKit({ W, L, H, S: SKYWARS_SURFACE, seed: 99, name: 'Templo de la montaña (SkyWars)' });
  const { s, S, rand, pick, set, get, isAir, RED, BLACK, roof, toro, maple } = kit;
  const MIDX = (W - 1) / 2; // 29.5
  const FACE = 22; // fachada del templo; los carteles van en z = 23

  const n2 = (x, z) => Math.sin(x * 0.31 + z * 0.17) + Math.sin(x * 0.13 - z * 0.29 + 1.3) * 1.4 + Math.sin(x * 0.57 + z * 0.41 + 2.1) * 0.5;
  const inFacade = (x) => x >= 12 && x <= 47;

  // ---------- Relieve ----------
  // Acantilado al norte (más alto en el centro), colinas bajas a los lados del valle.
  const faceZ = (x) => (inFacade(x) ? FACE : FACE - Math.round(Math.max(0, n2(x, 3)) * 1.3));
  const height = (x, z) => {
    if (z > faceZ(x)) {
      const side = Math.min(x, W - 1 - x);
      if (z <= 44 && side < 7) return S + Math.max(0, Math.round((7 - side) * 1.1 + n2(x, z) * 0.9));
      return S;
    }
    const k = 0.6 + 0.95 * (1 - Math.abs(x - MIDX) / 30);
    const cliff = S + 23 + (FACE - z) * k + Math.max(0, n2(x, z)) * 1.6;
    const peak = S + 57 * Math.max(0, 1 - Math.hypot((x - MIDX) / 17, (z - 4) / 14));
    return Math.min(H - 3, Math.round(Math.max(cliff, peak) + n2(z, x) * 0.8));
  };
  const hm = [];
  for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) hm[z * W + x] = height(x, z);
  const h = (x, z) => (x < 0 || z < 0 || x >= W || z >= L ? S : hm[z * W + x]);

  const SNOW = S + 41;
  const rockAt = (x, y, z) => {
    if (y < S - 1) return pick(['stone', 'deepslate', 'stone']);
    const band = Math.floor((y + n2(x, z) * 0.8) / 3);
    const layer = ['stone', 'andesite', 'stone', 'tuff', 'granite', 'stone', 'andesite', 'calcite'][((band % 8) + 8) % 8];
    return rand() < 0.08 ? pick(['cobblestone', 'mossy_cobblestone', 'gravel']) : layer;
  };
  for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    const top = h(x, z);
    const slope = Math.max(...[[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => Math.abs(h(x + dx, z + dz) - top)));
    for (let y = 0; y <= top; y++) {
      let m;
      if (y === top) {
        if (top >= SNOW) m = 'snow_block';
        else if (slope <= 1) m = top > S + 14 ? pick(['podzol', 'coarse_dirt', 'grass_block']) : rand() < 0.15 ? pick(['podzol', 'coarse_dirt']) : 'grass_block';
        else m = rockAt(x, y, z);
      } else if (y >= top - 2 && slope <= 1 && top < SNOW) m = 'dirt';
      else m = rockAt(x, y, z);
      set(x, y, z, m);
    }
    if (top >= SNOW - 2 && slope <= 2) set(x, top + 1, z, 'snow', { layers: String(1 + Math.floor(rand() * 3)) });
  }

  // ---------- Cascada (izquierda) ----------
  const FALL_TOP = Math.min(h(6, 16), h(7, 16), h(8, 16)) - 1; // el agua nace dentro de la roca
  for (let x = 6; x <= 8; x++) {
    for (let y = S; y <= H - 1; y++) for (let z = 17; z <= FACE; z++) if (y > S - 3 && y <= h(x, z)) set(x, y, z, 'air');
    set(x, FALL_TOP, 16, 'water');
    for (let y = S; y < FALL_TOP; y++) set(x, y, 17, 'water', { level: '8' });
    set(x, FALL_TOP, 17, 'water', { level: '1' });
  }
  // Roca a los lados del salto para que el agua no se derrame.
  for (let y = S; y <= FALL_TOP; y++) for (const x of [5, 9]) if (isAir(x, y, 17)) set(x, y, 17, 'mossy_cobblestone');

  // ---------- Agua: poza, arroyo y estanque ----------
  const gorge = (x, z) => x >= 6 && x <= 8 && z >= 17 && z <= FACE;
  const water = (x, z, depth) => {
    if (z <= faceZ(x) && !gorge(x, z)) return; // no se mete bajo el acantilado
    for (let y = S - depth; y <= S - 1; y++) set(x, y, z, 'water');
    set(x, S - depth - 1, z, 'clay');
    for (let y = S; y <= Math.max(S, h(x, z)) + 1; y++) set(x, y, z, 'air'); // también bajo las colinas
  };
  for (let z = 17; z <= 29; z++) for (let x = 2; x <= 13; x++) {
    if (Math.hypot((x - 7.5) / 6, (z - 23) / 6.3) < 1) water(x, z, 3);
  }
  const river = [[12, 27], [18, 31], [25, 32], [34, 32], [41, 33], [46, 33]];
  for (let i = 0; i < river.length - 1; i++) {
    const [ax, az] = river[i];
    const [bx, bz] = river[i + 1];
    const steps = Math.max(Math.abs(bx - ax), Math.abs(bz - az)) * 2;
    for (let t = 0; t <= steps; t++) {
      const cx = ax + ((bx - ax) * t) / steps;
      const cz = az + ((bz - az) * t) / steps;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) water(Math.round(cx + dx), Math.round(cz + dz), 2);
    }
  }
  for (let z = 27; z <= 39; z++) for (let x = 41; x <= 53; x++) {
    if (Math.hypot((x - 47) / 5.5, (z - 33) / 5) < 1) water(x, z, 2);
  }
  // Orillas de piedra y nenúfares.
  for (let z = 15; z <= 41; z++) for (let x = 0; x < W; x++) {
    if (get(x, S - 1, z) === 'water') {
      if (rand() < 0.05 && isAir(x, S, z) && !(z >= 17 && z <= 22 && x >= 6 && x <= 8)) set(x, S, z, 'lily_pad');
      continue;
    }
    if (h(x, z) !== S || get(x, S, z) === 'air') continue;
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => get(x + dx, S - 1, z + dz) === 'water');
    if (near) {
      set(x, S, z, pick(['mossy_cobblestone', 'cobblestone', 'andesite', 'moss_block', 'gravel']));
      if (rand() < 0.2 && isAir(x, S + 1, z)) set(x, S + 1, z, pick(['mossy_cobblestone', 'andesite', 'moss_carpet']));
    }
  }

  // ---------- Camino, puente de piedra y plaza de aparición ----------
  for (let z = 23; z <= 38; z++) for (let x = 27; x <= 32; x++) {
    if (get(x, S - 1, z) === 'water') continue;
    const edge = x === 27 || x === 32;
    set(x, S, z, edge ? 'gravel' : ((x + z) % 3 === 0 ? 'mossy_stone_bricks' : 'stone_bricks'));
  }
  for (let z = 29; z <= 35; z++) for (let x = 26; x <= 33; x++) {
    set(x, S, z, x === 26 || x === 33 ? 'chiseled_stone_bricks' : 'polished_andesite');
    if (x === 26 || x === 33) set(x, S + 1, z, 'stone_brick_wall');
    set(x, S - 1, z, get(x, S - 1, z) === 'water' ? 'water' : 'stone_bricks');
  }
  for (const x of [26, 33]) for (const z of [29, 35]) { set(x, S + 1, z, 'chiseled_stone_bricks'); set(x, S + 2, z, 'lantern'); }
  // Plaza de aparición.
  const SPX = 29.5;
  const SPZ = 43;
  for (let z = 37; z <= 49; z++) for (let x = 22; x <= 37; x++) {
    const d = Math.hypot(x - SPX, z - SPZ);
    if (d > 5.6) continue;
    let m = 'polished_andesite';
    if (d < 1.2) m = 'chiseled_stone_bricks';
    else if (d < 2.4) m = 'polished_diorite';
    else if (d < 3.4) m = 'mossy_stone_bricks';
    else if (d > 4.6) m = 'polished_deepslate';
    set(x, S, z, m);
  }
  for (const [x, z] of [[25, 39], [34, 39], [25, 47], [34, 47]]) toro(x, z, true);
  // Muro bajo detrás del spawn.
  for (let x = 0; x < W; x++) { set(x, S + 1, 49, 'mossy_stone_brick_wall'); if (x % 6 === 0) set(x, S + 2, 49, 'lantern'); }

  // ---------- Templo tallado en la roca ----------
  // Veranda de piedra frente a la fachada.
  for (let z = 23; z <= 27; z++) for (let x = 13; x <= 46; x++) set(x, S, z, z === 27 ? 'polished_andesite' : 'stone_bricks');
  const pillars = new Set([15, 22, 37, 44]);
  const panels = [
    { x0: 16, x1: 21, signs: 17, wood: 'birch', stripe: 'light_blue_concrete', mode: 'Solo', color: 'dark_aqua', maps: SOLO_MAPS, header: 'aqua' },
    { x0: 38, x1: 43, signs: 39, wood: 'bamboo', stripe: 'orange_concrete', mode: 'Duos', color: 'gold', maps: DUO_MAPS, header: 'gold' },
  ];
  for (let y = S + 1; y <= S + 11; y++) for (let x = 14; x <= 45; x++) {
    let m;
    const panel = panels.find((p) => x >= p.x0 && x <= p.x1);
    if (x === 14 || x === 45) m = y === S + 11 ? 'chiseled_stone_bricks' : 'stone_bricks';
    else if (pillars.has(x)) m = y === S + 1 ? BLACK : RED;
    else if (y === S + 1) m = 'polished_blackstone_bricks';
    else if (y === S + 7 || y === S + 11) m = 'dark_oak_log';
    else if (panel) {
      if (y === S + 5) m = panel.stripe;
      else if (y >= S + 8) m = (x + y) % 2 ? 'dark_oak_planks' : 'white_terracotta'; // celosía shoji
      else m = 'white_terracotta';
    } else m = 'white_terracotta';
    set(x, y, FACE, m, m === 'dark_oak_log' ? { axis: 'x' } : undefined);
  }
  // Gran puerta central, hundida en la roca.
  for (let y = S + 1; y <= S + 9; y++) for (let x = 24; x <= 35; x++) {
    const frame = x === 24 || x === 35 || y === S + 9;
    if (frame) set(x, y, FACE, 'chiseled_polished_blackstone');
    else {
      set(x, y, FACE, 'air');
      set(x, y, FACE - 1, 'black_concrete');
    }
  }
  for (const x of [27, 32]) set(x, S + 8, FACE, 'lantern', { hanging: 'true' });
  for (let x = 25; x <= 34; x++) set(x, S + 10, FACE, x === 29 || x === 30 ? 'gold_block' : 'dark_oak_planks');
  for (const x of [23, 36]) for (let y = S + 1; y <= S + 10; y++) set(x, y, FACE, y === S + 1 ? 'polished_blackstone_bricks' : 'stone_bricks');

  // Carteles para unirse (4 × 3 por modo) y cabecera de cada modo.
  for (const p of panels) {
    let i = 0;
    for (let y = S + 4; y >= S + 2; y--) for (let x = p.signs; x < p.signs + 4; x++) {
      set(x, y, FACE + 1, `${p.wood}_wall_sign`, { facing: 'south', waterlogged: 'false' });
      s.blockEntities.push({
        id: 'minecraft:sign',
        pos: [x, y, FACE + 1],
        nbt: signNbt([
          { text: '[SkyWars]', color: 'dark_red', bold: true },
          { text: p.maps[i++], color: 'black' },
          { text: p.mode, color: p.color },
          { text: 'Clic para unirte', color: 'dark_gray' },
        ]),
      });
    }
    const hx = p.signs + 1;
    set(hx, S + 6, FACE + 1, `${p.wood}_wall_sign`, { facing: 'south', waterlogged: 'false' });
    set(hx + 1, S + 6, FACE + 1, `${p.wood}_wall_sign`, { facing: 'south', waterlogged: 'false' });
    s.blockEntities.push({ id: 'minecraft:sign', pos: [hx, S + 6, FACE + 1], nbt: signNbt(['', { text: `✦ ${p.mode.toUpperCase()}`, color: p.header, bold: true }, '', ''], { glowing: true }) });
    s.blockEntities.push({ id: 'minecraft:sign', pos: [hx + 1, S + 6, FACE + 1], nbt: signNbt(['', { text: 'Elige arena ✦', color: p.header, bold: true }, '', ''], { glowing: true }) });
  }

  // Alero de tejas que sale de la roca, con farolillos.
  roof(12, 19, 47, 26, S + 12, { ridgeOrnament: false });
  for (const x of [15, 22, 37, 44]) set(x, S + 11, 25, 'lantern', { hanging: 'true' });
  toro(23, 26, true);
  toro(36, 26, true);

  // Título grabado en oro sobre una placa tallada en la roca.
  for (let y = S + 15; y <= S + 21; y++) for (let x = 13; x <= 46; x++) {
    const frame = x === 13 || x === 46 || y === S + 15 || y === S + 21;
    set(x, y, FACE, frame ? 'chiseled_deepslate' : 'polished_deepslate');
    for (let z = FACE + 1; z <= FACE + 2; z++) if (!isAir(x, y, z)) set(x, y, z, 'air');
  }
  let cx = 15;
  const word = (w) => {
    for (const ch of w) {
      const g = FONT[ch];
      for (let row = 0; row < 5; row++) for (let col = 0; col < g[row].length; col++) {
        if (g[row][col] === '1') set(cx + col, S + 20 - row, FACE + 1, 'gold_block');
      }
      cx += g[0].length + 1;
    }
  };
  word('SKY');
  cx += 1;
  word('WARS');

  // ---------- Escalera tallada y santuario de la campana (derecha) ----------
  const TOP = S + 10;
  for (let i = 0; i <= 9; i++) {
    const z = FACE - i;
    const y = S + 1 + i;
    for (let x = 49; x <= 51; x++) {
      for (let yy = y; yy <= H - 1; yy++) if (yy <= h(x, z) + 1) set(x, yy, z, 'air');
      set(x, y - 1, z, 'stone_bricks');
      set(x, y, z, 'stone_brick_stairs', { facing: 'north', half: 'bottom' });
    }
    if (i % 3 === 1) { set(48, y + 1, z, 'lantern'); set(52, y + 1, z, 'lantern'); }
  }
  for (let z = 8; z <= 12; z++) for (let x = 46; x <= 54; x++) {
    for (let y = TOP + 1; y <= H - 1; y++) if (y <= h(x, z) + 1) set(x, y, z, 'air');
    set(x, TOP, z, 'polished_andesite');
  }
  // Pequeño santuario con campana.
  for (const [x, z] of [[48, 9], [52, 9], [48, 12], [52, 12]]) for (let y = TOP + 1; y <= TOP + 4; y++) set(x, y, z, RED);
  for (let x = 48; x <= 52; x++) { set(x, TOP + 5, 9, 'dark_oak_log', { axis: 'x' }); set(x, TOP + 5, 12, 'dark_oak_log', { axis: 'x' }); }
  roof(46, 7, 54, 14, TOP + 6);
  set(50, TOP + 4, 10, 'bell', { attachment: 'ceiling', facing: 'south' });
  set(50, TOP + 5, 10, 'dark_oak_planks');
  set(50, TOP + 1, 12, 'polished_andesite');
  set(50, TOP + 2, 12, 'shroomlight');

  // ---------- Árboles de otoño ----------
  const ginkgo = (x0, z0) => {
    const r = rand;
    const base = h(x0, z0);
    const top = base + 5;
    for (let y = base + 1; y <= top; y++) set(x0, y, z0, 'spruce_log', { axis: 'y' });
    for (let y = top - 2; y <= top + 3; y++) for (let z = z0 - 3; z <= z0 + 3; z++) for (let x = x0 - 3; x <= x0 + 3; x++) {
      const d = Math.hypot(x - x0, (y - top - 0.5) * 1.3, z - z0);
      if (d > 2.9 - Math.max(0, y - top - 1) * 0.6 || (d > 2.2 && r() < 0.35) || !isAir(x, y, z)) continue;
      set(x, y, z, r() < 0.85 ? 'yellow_concrete_powder' : 'hay_block');
    }
  };
  const pine = (x0, z0) => {
    const base = h(x0, z0);
    const top = base + 3 + Math.floor(rand() * 2);
    for (let y = base + 1; y <= top; y++) set(x0, y, z0, 'dark_oak_log', { axis: 'y' });
    // Copa en "almohadillas" planas, estilo bonsái.
    const pads = [[0, 0, top + 1, 2.2], [rand() < 0.5 ? -2 : 2, rand() < 0.5 ? -1 : 1, top - 1, 1.6]];
    for (const [dx, dz, py, pr] of pads) {
      if (dx || dz) set(x0 + Math.sign(dx), py, z0, 'dark_oak_log', { axis: 'x' });
      for (let z = z0 + dz - 2; z <= z0 + dz + 2; z++) for (let x = x0 + dx - 2; x <= x0 + dx + 2; x++) {
        if (Math.hypot(x - x0 - dx, z - z0 - dz) <= pr && isAir(x, py, z)) set(x, py, z, 'spruce_leaves', { persistent: 'true' });
        if (Math.hypot(x - x0 - dx, z - z0 - dz) <= pr - 1 && isAir(x, py + 1, z)) set(x, py + 1, z, 'spruce_leaves', { persistent: 'true' });
      }
    }
  };
  const mapleAt = (x, z, seed) => {
    // El arce del kit crece desde el suelo del valle; aquí ajustamos a la altura del terreno.
    if (h(x, z) === S) maple(x, z, seed);
  };
  mapleAt(20, 43, 201);
  mapleAt(39, 43, 202);
  mapleAt(8, 34, 203);
  mapleAt(51, 43, 204);
  mapleAt(10, 37, 205);
  ginkgo(22, 36);
  ginkgo(37, 36);
  ginkgo(4, 43);
  ginkgo(55, 43);
  ginkgo(14, 40);
  // Pinos en las repisas del acantilado.
  for (let z = 2; z < FACE - 1; z++) for (let x = 2; x < W - 2; x++) {
    const top = h(x, z);
    if (top < S + 20 || top > SNOW - 3 || (x >= 5 && x <= 10) || (x >= 45 && x <= 55 && z >= 6)) continue;
    const flat = [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dz]) => Math.abs(h(x + dx, z + dz) - top) <= 1);
    if (flat && rand() < 0.035 && isAir(x, top + 1, z)) pine(x, z);
  }
  for (const [x, z] of [[3, 30], [56, 29], [2, 38], [57, 40]]) pine(x, z);

  // Hojas caídas y plantas.
  for (let z = FACE + 1; z < L - 1; z++) for (let x = 0; x < W; x++) {
    const top = h(x, z);
    if (!['grass_block', 'podzol', 'coarse_dirt'].includes(get(x, top, z)) || !isAir(x, top + 1, z)) continue;
    const r = rand();
    if (r < 0.1) set(x, top + 1, z, pick(['red_carpet', 'orange_carpet', 'yellow_carpet', 'brown_carpet']));
    else if (r < 0.24) set(x, top + 1, z, pick(['short_grass', 'fern', 'short_grass']));
    else if (r < 0.27) set(x, top + 1, z, pick(['sweet_berry_bush', 'dead_bush']));
  }

  finalizeConnections(s);
  return s;
}
