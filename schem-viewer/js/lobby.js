// Lobby épico de 50×50: isla flotante con fuente central, aguja de amatista,
// cuatro portales para modos de juego, jardines de cerezos y islotes en las esquinas.
// Todos los bloques existen en Minecraft 1.20+.

import { Schematic } from './schematic.js';
import { blockInfo } from './blocks.js';

const SIZE = 50;
const HEIGHT = 48;
export const LOBBY_SURFACE = 20; // Y del suelo de la plaza
const CENTER = 24.5; // centro

function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FACING_CW = { north: 'east', east: 'south', south: 'west', west: 'north' };

export function buildLobby() {
  const s = new Schematic(SIZE, HEIGHT, SIZE);
  s.format = 'Ejemplo integrado';
  s.meta = { name: 'Lobby épico 50×50', author: 'Visor de Schematics', dataVersion: 3465 };
  const S = LOBBY_SURFACE;
  const rand = rng(1337);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const dist = (x, z) => Math.hypot(x - CENTER, z - CENTER);
  const angle = (x, z) => Math.atan2(z - CENTER, x - CENTER);

  const inside = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < SIZE && y < HEIGHT && z < SIZE;
  const set = (x, y, z, name, props) => { if (inside(x, y, z)) s.set(x, y, z, name, props); };
  const get = (x, y, z) => (inside(x, y, z) ? s.palette[s.get(x, y, z)].name : 'minecraft:air');
  const isAir = (x, y, z) => get(x, y, z) === 'minecraft:air';

  // Coloca con rotación de 90°·k alrededor del centro (0 = norte, 1 = este, ...).
  const rotSet = (k, x, y, z, name, props) => {
    let p = props ? { ...props } : undefined;
    for (let i = 0; i < k; i++) {
      [x, z] = [SIZE - 1 - z, x];
      if (p?.facing && FACING_CW[p.facing]) p.facing = FACING_CW[p.facing];
      if (p?.axis === 'x') p.axis = 'z';
      else if (p?.axis === 'z') p.axis = 'x';
    }
    set(x, y, z, name, p);
  };

  // ---------- Isla principal (cono invertido) ----------
  const R = 24.3;
  const depth = S; // de y=S hasta y=0
  const edgeNoise = (a, y) => Math.sin(a * 5 + y * 0.7) * 0.9 + Math.sin(a * 11 - y * 1.3) * 0.6 + Math.sin(a * 3 + 1.7) * 0.8;
  for (let y = 0; y <= S; y++) {
    const t = (S - y) / depth;
    const base = R * (1 - Math.pow(t, 1.5));
    for (let z = 0; z < SIZE; z++) for (let x = 0; x < SIZE; x++) {
      const d = dist(x, z);
      const a = angle(x, z);
      const r = y === S ? R : Math.min(R - 0.4, base + (t > 0.05 ? edgeNoise(a, y) * (0.4 + t) : 0));
      if (d > r) continue;
      let m;
      if (y >= S - 2) m = 'dirt';
      else if (t < 0.35) m = pick(['stone', 'stone', 'stone', 'andesite', 'cobblestone', 'tuff']);
      else if (t < 0.7) m = pick(['stone', 'deepslate', 'andesite', 'tuff', 'cobbled_deepslate']);
      else m = pick(['deepslate', 'deepslate', 'cobbled_deepslate', 'blackstone']);
      if (d > r - 1.3 && y < S - 2 && rand() < 0.25) m = pick(['mossy_cobblestone', 'moss_block', 'mossy_stone_bricks']);
      if (rand() < 0.012) m = t < 0.5 ? pick(['coal_ore', 'iron_ore', 'copper_ore', 'gold_ore']) : pick(['deepslate_diamond_ore', 'deepslate_emerald_ore', 'deepslate_redstone_ore', 'amethyst_block']);
      set(x, y, z, m);
    }
  }

  // Lianas brillantes, raíces y luces colgando de la parte de abajo.
  for (let z = 0; z < SIZE; z++) for (let x = 0; x < SIZE; x++) {
    let low = -1;
    for (let y = 0; y <= S; y++) if (!isAir(x, y, z)) { low = y; break; }
    if (low <= 1) continue;
    const r = rand();
    if (r < 0.05) {
      const len = 1 + Math.floor(rand() * 4);
      for (let i = 1; i <= len && low - i >= 0; i++) {
        const last = i === len || low - i === 0;
        set(x, low - i, z, last ? 'cave_vines' : 'cave_vines_plant', { berries: rand() < 0.45 ? 'true' : 'false', ...(last ? { age: '25' } : {}) });
      }
    } else if (r < 0.075) set(x, low - 1, z, 'hanging_roots');
    else if (r < 0.095) set(x, low - 1, z, 'shroomlight');
  }

  // ---------- Suelo ----------
  const onPath = (x, z) => Math.abs(x - CENTER) < 3 || Math.abs(z - CENTER) < 3;
  for (let z = 0; z < SIZE; z++) for (let x = 0; x < SIZE; x++) {
    const d = dist(x, z);
    if (d > R) continue;
    const a = angle(x, z);
    let m;
    if (d < 10) {
      // Rosa de los vientos: sectores y anillos alternos.
      const sector = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 16);
      const ring = Math.floor(d / 2);
      m = (sector + ring) % 2 ? 'smooth_quartz' : 'polished_andesite';
      if (Math.abs(d - 8.5) < 0.5) m = 'polished_deepslate';
      const star = Math.abs(Math.sin(2 * a));
      if (d > 6.8 && d < 9.8 && star < 0.12) m = 'gold_block';
    } else if (d < 11.2) m = 'polished_deepslate';
    else if (d > 21.6) m = pick(['stone_bricks', 'stone_bricks', 'mossy_stone_bricks', 'cracked_stone_bricks']);
    else if (onPath(x, z)) {
      const lateral = Math.min(Math.abs(x - CENTER), Math.abs(z - CENTER));
      m = lateral < 1 ? 'polished_blackstone_bricks' : lateral < 2 ? 'stone_bricks' : 'chiseled_stone_bricks';
      if (lateral >= 1 && lateral < 2 && rand() < 0.2) m = 'mossy_stone_bricks';
    } else m = 'grass_block';
    set(x, S, z, m);
  }

  // Seto alrededor de la plaza (con huecos en los caminos).
  for (let z = 0; z < SIZE; z++) for (let x = 0; x < SIZE; x++) {
    const d = dist(x, z);
    if (d >= 11.2 && d < 12.3 && !onPath(x, z)) {
      set(x, S + 1, z, rand() < 0.3 ? 'flowering_azalea_leaves' : 'azalea_leaves', { persistent: 'true' });
    }
  }

  // ---------- Fuente central ----------
  for (let z = 0; z < SIZE; z++) for (let x = 0; x < SIZE; x++) {
    const d = dist(x, z);
    if (d < 5.6) {
      set(x, S, z, d < 1.7 ? 'prismarine_bricks' : (Math.abs(d - 3.5) < 0.5 && Math.abs(Math.sin(2 * angle(x, z))) < 0.3 ? 'sea_lantern' : 'prismarine'));
      set(x, S + 1, z, 'water');
    } else if (d < 6.7) {
      set(x, S, z, 'dark_prismarine');
      set(x, S + 1, z, 'quartz_bricks');
      set(x, S + 2, z, 'smooth_quartz_slab', { type: 'bottom' });
    }
  }
  // Columna y segundo piso.
  for (let z = 0; z < SIZE; z++) for (let x = 0; x < SIZE; x++) {
    const d = dist(x, z);
    if (d < 1.7) for (let y = S + 1; y <= S + 5; y++) set(x, y, z, y === S + 3 ? 'dark_prismarine' : 'prismarine_bricks');
    if (d >= 1.7 && d < 3.3) { set(x, S + 4, z, 'dark_prismarine'); set(x, S + 5, z, 'water'); }
    if (d >= 3.3 && d < 3.9) { set(x, S + 4, z, 'dark_prismarine'); set(x, S + 5, z, 'prismarine_brick_slab', { type: 'bottom' }); }
  }

  // Aguja de amatista con bandas de luz.
  const spireBase = S + 6;
  const spireTop = S + 24;
  for (let y = spireBase; y <= spireTop; y++) {
    const t = (y - spireBase) / (spireTop - spireBase);
    const r = Math.max(0.75, 1.75 - t * 1.3); // la punta termina en un pilar de 2×2
    for (let z = 20; z < 30; z++) for (let x = 20; x < 30; x++) {
      const d = dist(x, z);
      if (d > r) continue;
      const band = (y - spireBase) % 5 === 2;
      set(x, y, z, band ? 'sea_lantern' : d < 0.8 ? 'budding_amethyst' : 'amethyst_block');
    }
  }
  for (const [x, z] of [[24, 24], [25, 24], [24, 25], [25, 25]]) {
    set(x, spireTop + 1, z, 'end_rod', { facing: 'up' });
    set(x, spireTop + 2, z, 'end_rod', { facing: 'up' });
  }
  set(24, spireTop + 3, 24, 'end_rod', { facing: 'up' });
  set(25, spireTop + 3, 25, 'end_rod', { facing: 'up' });

  // Anillos flotantes unidos a la aguja con cadenas.
  const halo = (y, r0, r1, a, b) => {
    for (let z = 0; z < SIZE; z++) for (let x = 0; x < SIZE; x++) {
      const d = dist(x, z);
      if (d >= r0 && d < r1) {
        const sector = Math.floor(((angle(x, z) + Math.PI) / (Math.PI * 2)) * 12);
        set(x, y, z, sector % 2 ? a : b);
      }
    }
    for (let i = 1; i < r0 - 0.5; i++) {
      for (const k of [0, 1]) {
        set(24 + k, y, 24 - i, 'chain', { axis: 'z' });
        set(24 + k, y, 25 + i, 'chain', { axis: 'z' });
        set(24 - i, y, 24 + k, 'chain', { axis: 'x' });
        set(25 + i, y, 24 + k, 'chain', { axis: 'x' });
      }
    }
  };
  halo(S + 12, 4.4, 5.4, 'chiseled_quartz_block', 'gold_block');
  halo(S + 18, 2.9, 3.7, 'amethyst_block', 'smooth_quartz');
  // Lámparas colgando del anillo inferior.
  for (const [x, z] of [[20, 24], [29, 25], [24, 29], [25, 20]]) {
    if (!isAir(x, S + 12, z)) { set(x, S + 11, z, 'chain', { axis: 'y' }); set(x, S + 10, z, 'soul_lantern', { hanging: 'true' }); }
  }

  // ---------- Portales ----------
  const MODES = ['purple', 'orange', 'cyan', 'lime'];
  for (let k = 0; k < 4; k++) {
    const color = MODES[k];
    const g = (i, h, j, name, props) => rotSet(k, 19 + i, S + h, 5 + j, name, props); // i: 0..11, j: 0..2 (2 = cara a la plaza)
    const openTop = [0, 0, 8, 9, 10, 10, 10, 10, 9, 8, 0, 0];
    for (let i = 0; i < 12; i++) {
      const pillar = i < 2 || i > 9;
      for (let j = 0; j < 3; j++) {
        for (let h = 1; h <= 12; h++) {
          const open = !pillar && h <= openTop[i];
          if (open) {
            if (j === 1) g(i, h, j, `${color}_stained_glass`);
            continue;
          }
          let m = 'deepslate_bricks';
          if (pillar && (h === 1 || h === 6)) m = 'polished_blackstone_bricks';
          if (pillar && (i === 0 || i === 11) && (j === 0 || j === 2)) m = 'polished_deepslate';
          if (!pillar && h === openTop[i] + 1) m = 'polished_blackstone_bricks';
          if (!pillar && h >= 11 && (i === 5 || i === 6)) m = h === 12 ? `${color}_glazed_terracotta` : 'chiseled_polished_blackstone';
          g(i, h, j, m);
        }
      }
      // Remates del arco hacia la plaza (escaleras invertidas).
      if (!pillar && openTop[i] < 10) {
        const facing = i < 6 ? 'west' : 'east'; // la mitad llena de la escalera, hacia el pilar
        g(i, openTop[i], 2, 'deepslate_brick_stairs', { facing, half: 'top' });
        g(i, openTop[i], 0, 'deepslate_brick_stairs', { facing, half: 'top' });
      }
    }
    // Pilares: coronas con farolillos.
    for (const i of [0, 1, 10, 11]) for (let j = 0; j < 3; j++) g(i, 13, j, 'polished_blackstone_bricks');
    for (const i of [0, 1, 10, 11]) { g(i, 14, 1, 'polished_blackstone_brick_wall'); g(i, 15, 1, 'soul_lantern'); }
    // Cresta del arco.
    for (let i = 3; i <= 8; i++) g(i, 13, 1, 'deepslate_brick_wall');
    g(5, 13, 1, `${color}_stained_glass`);
    g(6, 13, 1, `${color}_stained_glass`);
    g(5, 14, 1, 'end_rod', { facing: 'up' });
    g(6, 14, 1, 'end_rod', { facing: 'up' });
    // Estandartes hacia la plaza y farolillos colgando dentro del arco.
    g(0, 8, 3, `${color}_wall_banner`, { facing: 'south' });
    g(1, 8, 3, `${color}_wall_banner`, { facing: 'south' });
    g(10, 8, 3, `${color}_wall_banner`, { facing: 'south' });
    g(11, 8, 3, `${color}_wall_banner`, { facing: 'south' });
    g(3, 8, 2, 'lantern', { hanging: 'true' });
    g(8, 8, 2, 'lantern', { hanging: 'true' });
    // Alfombra de color que guía hasta el portal.
    for (let j = 3; j <= 8; j++) for (const i of [5, 6]) {
      if (j % 3 !== 1) rotSet(k, 19 + i, S, 5 + j, `${color}_concrete`);
    }
    for (const i of [2, 3, 4, 5, 6, 7, 8, 9]) g(i, 0, 1, 'crying_obsidian');
    // Escalón de entrada.
    for (let i = 2; i <= 9; i++) g(i, 0, 3, 'polished_blackstone_bricks');
  }

  // ---------- Farolas en los caminos ----------
  for (let k = 0; k < 4; k++) {
    for (const j of [13, 18]) {
      for (const i of [21, 28]) {
        rotSet(k, i, S + 1, j, 'dark_oak_fence');
        rotSet(k, i, S + 2, j, 'dark_oak_fence');
        rotSet(k, i, S + 3, j, 'dark_oak_fence');
        rotSet(k, i, S + 4, j, 'lantern');
      }
    }
  }

  // ---------- Muralla perimetral ----------
  const pillarAngles = [];
  for (let i = 0; i < 12; i++) pillarAngles.push(((15 + 30 * i) * Math.PI) / 180);
  for (let z = 0; z < SIZE; z++) for (let x = 0; x < SIZE; x++) {
    const d = dist(x, z);
    if (d >= 23.1 && d < 24.3) set(x, S + 1, z, rand() < 0.2 ? 'mossy_stone_brick_wall' : 'stone_brick_wall');
  }
  for (const a of pillarAngles) {
    const x = Math.round(CENTER + Math.cos(a) * 23.2);
    const z = Math.round(CENTER + Math.sin(a) * 23.2);
    for (let y = S + 1; y <= S + 4; y++) set(x, y, z, y === S + 1 ? 'chiseled_stone_bricks' : 'deepslate_bricks');
    set(x, S + 5, z, 'polished_blackstone_bricks');
    set(x, S + 6, z, 'lantern');
  }

  // ---------- Jardines ----------
  const cherry = (x0, z0, seed) => {
    const r = rng(seed);
    const top = S + 6;
    for (let y = S + 1; y <= top; y++) set(x0, y, z0, 'cherry_log', { axis: 'y' });
    const blobs = [[x0, top + 2, z0, 3.2]];
    for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      if (r() < 0.25) continue;
      let x = x0;
      let z = z0;
      let y = top - 1;
      for (let i = 0; i < 3; i++) {
        x += dx; z += dz; y += i > 0 ? 1 : 0;
        set(x, y, z, 'cherry_wood');
      }
      blobs.push([x, y + 1, z, 2.6]);
    }
    for (const [bx, by, bz, br] of blobs) {
      for (let y = Math.floor(by - br); y <= by + br; y++) for (let z = Math.floor(bz - br); z <= bz + br; z++) for (let x = Math.floor(bx - br); x <= bx + br; x++) {
        const d = Math.hypot(x - bx, (y - by) * 1.5, z - bz);
        if (d > br || (d > br - 0.8 && r() < 0.35) || !isAir(x, y, z)) continue;
        set(x, y, z, 'cherry_leaves', { persistent: 'true' });
        if (y < by && r() < 0.18 && isAir(x, y - 1, z)) {
          set(x, y - 1, z, 'cherry_leaves', { persistent: 'true' });
        }
      }
    }
    for (let i = 0; i < 26; i++) {
      const x = x0 + Math.round((r() - 0.5) * 9);
      const z = z0 + Math.round((r() - 0.5) * 9);
      if (get(x, S, z) === 'minecraft:grass_block' && isAir(x, S + 1, z)) {
        set(x, S + 1, z, 'pink_petals', { flower_amount: String(1 + Math.floor(r() * 4)), facing: pick(['north', 'east', 'south', 'west']) });
      }
    }
  };
  const bush = (x0, z0, r0) => {
    for (let y = S + 1; y <= S + 3; y++) for (let z = z0 - 2; z <= z0 + 2; z++) for (let x = x0 - 2; x <= x0 + 2; x++) {
      const d = Math.hypot(x - x0, (y - S - 1) * 1.3, z - z0);
      if (d <= r0 && isAir(x, y, z) && get(x, S, z) === 'minecraft:grass_block') {
        set(x, y, z, rand() < 0.4 ? 'flowering_azalea_leaves' : 'azalea_leaves', { persistent: 'true' });
      }
    }
  };
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    cherry(Math.round(CENTER + Math.cos(a) * 15.5), Math.round(CENTER + Math.sin(a) * 15.5), 100 + k);
    for (const off of [-0.42, 0.42]) {
      bush(Math.round(CENTER + Math.cos(a + off) * 19.5), Math.round(CENTER + Math.sin(a + off) * 19.5), 2);
    }
  }
  const flowers = ['poppy', 'dandelion', 'allium', 'azure_bluet', 'oxeye_daisy', 'cornflower', 'lily_of_the_valley', 'pink_tulip', 'white_tulip', 'blue_orchid'];
  for (let z = 0; z < SIZE; z++) for (let x = 0; x < SIZE; x++) {
    if (get(x, S, z) !== 'minecraft:grass_block' || !isAir(x, S + 1, z)) continue;
    const r = rand();
    if (r < 0.12) set(x, S + 1, z, pick(flowers));
    else if (r < 0.3) set(x, S + 1, z, 'short_grass');
    else if (r < 0.34) { set(x, S + 1, z, 'tall_grass', { half: 'lower' }); set(x, S + 2, z, 'tall_grass', { half: 'upper' }); }
  }

  // ---------- Islotes flotantes en las esquinas ----------
  const islet = (cx, cz, top, kind) => {
    for (let dy = 0; dy < 7; dy++) {
      const r = 3.6 * (1 - Math.pow(dy / 7, 1.2));
      for (let z = Math.floor(cz - 4); z <= cz + 4; z++) for (let x = Math.floor(cx - 4); x <= cx + 4; x++) {
        if (Math.hypot(x - cx, z - cz) > r + (rand() - 0.5) * 0.6) continue;
        set(x, top - dy, z, dy === 0 ? 'grass_block' : dy < 2 ? 'dirt' : pick(['stone', 'andesite', 'mossy_cobblestone', 'tuff']));
      }
    }
    const x = Math.round(cx);
    const z = Math.round(cz);
    if (kind === 0) {
      for (let y = top + 1; y <= top + 3; y++) set(x, y, z, 'cherry_log', { axis: 'y' });
      for (let y = top + 3; y <= top + 5; y++) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        if (Math.hypot(dx, (y - top - 4) * 1.4, dz) <= 2.3 && isAir(x + dx, y, z + dz)) set(x + dx, y, z + dz, 'cherry_leaves', { persistent: 'true' });
      }
    } else if (kind === 1) {
      set(x, top, z, 'budding_amethyst');
      set(x, top + 1, z, 'amethyst_block');
      set(x, top + 2, z, 'amethyst_cluster', { facing: 'up' });
      set(x + 1, top + 1, z, 'amethyst_cluster', { facing: 'up' });
      set(x - 1, top + 1, z + 1, 'amethyst_cluster', { facing: 'up' });
      set(x, top + 1, z - 1, 'amethyst_cluster', { facing: 'up' });
    } else if (kind === 2) {
      for (let y = top + 1; y <= top + 4; y++) set(x, y, z, y === top + 4 ? 'cracked_stone_bricks' : 'mossy_stone_bricks');
      set(x + 1, top + 1, z, 'mossy_stone_bricks');
      set(x, top + 5, z, 'lantern');
    } else {
      set(x, top + 1, z, 'mossy_cobblestone');
      set(x, top + 2, z, 'campfire', { lit: 'true' });
      set(x + 1, top + 1, z + 1, 'lantern');
    }
    for (let i = 0; i < 6; i++) {
      const fx = x + Math.round((rand() - 0.5) * 5);
      const fz = z + Math.round((rand() - 0.5) * 5);
      if (get(fx, top, fz) === 'minecraft:grass_block' && isAir(fx, top + 1, fz)) set(fx, top + 1, fz, rand() < 0.5 ? 'short_grass' : pick(flowers));
    }
  };
  islet(4, 4, S + 7, 0);
  islet(45, 4, S + 2, 1);
  islet(45, 45, S + 10, 2);
  islet(4, 45, S - 3, 3);

  finalizeConnections(s);
  return s;
}

// Calcula las conexiones de vallas, muros y paneles según sus vecinos,
// igual que haría Minecraft al colocarlos a mano.
export function finalizeConnections(s) {
  const infos = s.palette.map((e) => blockInfo(e));
  const kind = (name) => {
    const n = name.slice(name.indexOf(':') + 1);
    if (n.endsWith('_fence')) return 'fence';
    if (n.endsWith('_wall')) return 'wall'; // los bloques de pared se llaman wall_torch, *_wall_sign, etc.
    if (n.endsWith('_pane') || n === 'iron_bars') return 'pane';
    return null;
  };
  const kinds = s.palette.map((e) => kind(e.name));
  const dirs = [['north', 0, -1], ['east', 1, 0], ['south', 0, 1], ['west', -1, 0]];
  const updates = [];
  for (let y = 0; y < s.height; y++) for (let z = 0; z < s.length; z++) for (let x = 0; x < s.width; x++) {
    const id = s.get(x, y, z);
    const k = kinds[id];
    if (!k) continue;
    const props = {};
    const conn = {};
    for (const [d, dx, dz] of dirs) {
      const nid = s.get(x + dx, y, z + dz);
      const nk = kinds[nid];
      const ninfo = infos[nid];
      const nname = s.palette[nid].name;
      conn[d] = nid !== 0 && (
        (ninfo.cube && !ninfo.air && !nname.endsWith('_leaves'))
        || nk === k
        || (k !== 'fence' && nk && nk !== 'fence')
        || (k === 'fence' && nname.endsWith('_fence_gate'))
      );
    }
    if (k === 'wall') {
      for (const [d] of dirs) props[d] = conn[d] ? 'low' : 'none';
      const straight = (conn.north && conn.south && !conn.east && !conn.west) || (conn.east && conn.west && !conn.north && !conn.south);
      const above = s.get(x, y + 1, z);
      props.up = straight && above === 0 ? 'false' : 'true';
    } else {
      for (const [d] of dirs) props[d] = conn[d] ? 'true' : 'false';
    }
    props.waterlogged = 'false';
    updates.push([x, y, z, s.palette[id].name, props]);
  }
  for (const [x, y, z, name, props] of updates) s.set(x, y, z, name, props);
}
