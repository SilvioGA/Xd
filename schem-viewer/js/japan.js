// Lobby japonés de 50×100. El jugador aparece en el extremo sur (z alto) mirando
// al norte, y todo el recorrido queda delante: torii gigante, túnel de torii,
// puente rojo sobre el arroyo, santuarios de modos de juego, jardín zen, pagoda
// y el templo principal al fondo. Bloques de Minecraft 1.20+.

import { Schematic } from './schematic.js';
import { rng, finalizeConnections } from './lobby.js';

export const JAPAN_SURFACE = 16;
// Celda donde queda el jugador al pegar (centro de la plaza de aparición).
export const JAPAN_SPAWN = [25, JAPAN_SURFACE + 1, 92];

export function buildJapaneseLobby() {
  const W = 50;
  const L = 100;
  const H = 56;
  const S = JAPAN_SURFACE;
  const MID = 24.5;
  const s = new Schematic(W, H, L);
  s.format = 'Ejemplo integrado';
  s.meta = { name: 'Lobby japonés 50×100', author: 'Visor de Schematics', dataVersion: 3465 };
  const rand = rng(2024);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  const inside = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < W && y < H && z < L;
  const set = (x, y, z, name, props) => { if (inside(x, y, z)) s.set(x, y, z, name, props); };
  const get = (x, y, z) => (inside(x, y, z) ? s.palette[s.get(x, y, z)].name.slice(10) : 'air');
  const isAir = (x, y, z) => get(x, y, z) === 'air';
  const fill = (x0, y0, z0, x1, y1, z1, name, props) => {
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) set(x, y, z, name, props);
  };

  // Distancia con signo a un rectángulo redondeado (negativa dentro).
  const CORNER = 12;
  const sdf = (x, z) => {
    const qx = Math.abs(x - MID) - (W / 2 - 0.5 - CORNER);
    const qz = Math.abs(z - 49.5) - (L / 2 - 0.5 - CORNER);
    const out = Math.hypot(Math.max(qx, 0), Math.max(qz, 0));
    return out + Math.min(Math.max(qx, qz), 0) - CORNER;
  };

  // ---------- Isla ----------
  for (let y = 0; y <= S; y++) {
    const t = (S - y) / S;
    for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
      const shrink = 23.5 * Math.pow(t, 1.35) + (t > 0.1 ? (Math.sin(x * 0.7 + y) + Math.sin(z * 0.45 - y * 0.8)) * 0.8 * t : 0);
      if (sdf(x, z) > -Math.max(0, shrink)) continue;
      let m;
      if (y >= S - 2) m = 'dirt';
      else if (t < 0.4) m = pick(['stone', 'stone', 'andesite', 'tuff', 'cobblestone']);
      else m = pick(['deepslate', 'deepslate', 'cobbled_deepslate', 'tuff', 'blackstone']);
      if (rand() < 0.01) m = t < 0.5 ? pick(['iron_ore', 'coal_ore', 'copper_ore']) : pick(['deepslate_diamond_ore', 'deepslate_gold_ore', 'amethyst_block']);
      set(x, y, z, m);
    }
  }
  for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    let low = -1;
    for (let y = 0; y <= S; y++) if (!isAir(x, y, z)) { low = y; break; }
    if (low <= 1) continue;
    const r = rand();
    if (r < 0.04) {
      const len = 1 + Math.floor(rand() * 4);
      for (let i = 1; i <= len && low - i >= 0; i++) set(x, low - i, z, i === len ? 'cave_vines' : 'cave_vines_plant', { berries: rand() < 0.5 ? 'true' : 'false' });
    } else if (r < 0.06) set(x, low - 1, z, 'hanging_roots');
    else if (r < 0.075) set(x, low - 1, z, 'shroomlight');
  }

  // Césped con musgo como base.
  for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    if (sdf(x, z) <= 0) set(x, S, z, rand() < 0.08 ? 'moss_block' : 'grass_block');
  }

  // ---------- Camino central ----------
  const pathZ0 = 28;
  const pathZ1 = 86;
  for (let z = pathZ0; z <= pathZ1; z++) for (let x = 22; x <= 27; x++) {
    const edge = x === 22 || x === 27;
    const tile = ((Math.floor((x - 23) / 2) + Math.floor(z / 2)) % 2 + 2) % 2;
    set(x, S, z, edge ? 'gravel' : tile ? 'polished_andesite' : 'smooth_stone');
  }

  // ---------- Piezas ----------
  const RED = 'red_concrete';
  const BLACK = 'polished_blackstone';

  // Torii. axis 'x': los pilares se reparten en X y el arco se ve desde el eje Z.
  const torii = ({ axis = 'x', at, a, b, h, plaque = false }) => {
    const P = (u, y, name, props) => (axis === 'x' ? set(u, y, at, name, props) : set(at, y, u, name, props));
    const outward = (left) => (axis === 'x' ? (left ? 'west' : 'east') : (left ? 'north' : 'south'));
    for (const u of [a, b]) {
      P(u, S + 1, BLACK);
      for (let y = S + 2; y <= S + h; y++) P(u, y, RED);
    }
    for (let u = a - 1; u <= b + 1; u++) P(u, S + h - 1, RED); // nuki
    for (let u = a - 1; u <= b + 1; u++) P(u, S + h + 1, RED); // shimaki
    for (let u = a - 1; u <= b + 1; u++) P(u, S + h + 2, BLACK); // kasagi
    P(a - 2, S + h + 2, 'polished_blackstone_stairs', { facing: outward(true), half: 'bottom' });
    P(b + 2, S + h + 2, 'polished_blackstone_stairs', { facing: outward(false), half: 'bottom' });
    P(a - 2, S + h + 1, 'polished_blackstone_slab', { type: 'top' });
    P(b + 2, S + h + 1, 'polished_blackstone_slab', { type: 'top' });
    const c0 = Math.floor((a + b) / 2);
    const c1 = Math.ceil((a + b) / 2);
    for (let u = c0; u <= c1; u++) P(u, S + h, plaque ? 'black_concrete' : RED); // placa central (gakuzuka)
    if (plaque) for (let u = c0; u <= c1; u++) P(u, S + h - 1, 'gold_block');
  };

  // Linterna de piedra (tōrō).
  const toro = (x, z, tall = false) => {
    let y = S + 1;
    set(x, y++, z, 'polished_andesite');
    set(x, y++, z, 'andesite_wall');
    if (tall) set(x, y++, z, 'andesite_wall');
    set(x, y++, z, 'shroomlight');
    set(x, y, z, 'andesite_slab', { type: 'bottom' });
  };

  // Tejado curvo japonés: aleros planos y parte alta empinada.
  // Altura de cada anillo en medios bloques: 1, 2, 3, 4, 6, 8, 10...
  const roofHalf = (k) => (k < 4 ? k + 1 : 4 + (k - 3) * 2);
  const roof = (x0, z0, x1, z1, y0, { rows = Infinity, ridgeOrnament = true } = {}) => {
    let k = 0;
    let lastY = y0;
    for (;; k++) {
      const xa = x0 + k, xb = x1 - k, za = z0 + k, zb = z1 - k;
      if (xa > xb || za > zb) break;
      const half = roofHalf(k);
      const last = xa + 1 >= xb || za + 1 >= zb || k + 1 >= rows;
      const yStair = y0 + half / 2 - 1;
      const ySlab = y0 + (half - 1) / 2;
      for (let z = za; z <= zb; z++) for (let x = xa; x <= xb; x++) {
        const onEdge = x === xa || x === xb || z === za || z === zb;
        if (!onEdge && !last) continue;
        if (last && k + 1 >= rows && rows !== Infinity) {
          // Techo plano (pagoda): se rellena para apoyar el piso siguiente.
          lastY = Math.floor(half % 2 ? ySlab : yStair);
          set(x, lastY, z, 'deepslate_tiles');
          continue;
        }
        if (half % 2) {
          set(x, ySlab, z, 'deepslate_tile_slab', { type: 'bottom' });
          lastY = ySlab;
        } else {
          let facing;
          if (z === za) facing = 'south';
          else if (z === zb) facing = 'north';
          else if (x === xa) facing = 'east';
          else if (x === xb) facing = 'west';
          else facing = 'south';
          if (last) set(x, yStair, z, 'deepslate_tiles');
          else set(x, yStair, z, 'deepslate_tile_stairs', { facing, half: 'bottom' });
          lastY = yStair;
        }
      }
      if (k === 0) {
        // Esquinas levantadas.
        for (const [x, z] of [[xa, za], [xb, za], [xa, zb], [xb, zb]]) set(x, y0 + 1, z, 'deepslate_tile_slab', { type: 'bottom' });
      }
      if (last) {
        if (rows === Infinity) {
          // Cumbrera con remates dorados (shachihoko).
          const long = xb - xa >= zb - za;
          for (let z = za; z <= zb; z++) for (let x = xa; x <= xb; x++) set(x, lastY + 1, z, 'deepslate_tile_slab', { type: 'bottom' });
          if (ridgeOrnament) {
            const ends = long ? [[xa, Math.round((za + zb) / 2)], [xb, Math.round((za + zb) / 2)]] : [[Math.round((xa + xb) / 2), za], [Math.round((xa + xb) / 2), zb]];
            for (const [x, z] of ends) { set(x, lastY + 1, z, 'deepslate_tiles'); set(x, lastY + 2, z, 'gold_block'); }
          }
        }
        return lastY;
      }
    }
    return lastY;
  };

  const cherry = (x0, z0, size, seed) => {
    const r = rng(seed);
    const top = S + 3 + size;
    for (let y = S + 1; y <= top; y++) set(x0, y, z0, 'cherry_log', { axis: 'y' });
    const blobs = [[x0, top + 1.5, z0, 2 + size * 0.45]];
    for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      if (r() < 0.3) continue;
      let x = x0, z = z0, y = top - 1;
      const len = 1 + Math.floor(size / 2);
      for (let i = 0; i < len; i++) { x += dx; z += dz; if (i) y++; set(x, y, z, 'cherry_wood'); }
      blobs.push([x, y + 1, z, 1.6 + size * 0.35]);
    }
    for (const [bx, by, bz, br] of blobs) {
      for (let y = Math.floor(by - br); y <= by + br; y++) for (let z = Math.floor(bz - br); z <= bz + br; z++) for (let x = Math.floor(bx - br); x <= bx + br; x++) {
        const d = Math.hypot(x - bx, (y - by) * 1.5, z - bz);
        if (d > br || (d > br - 0.8 && r() < 0.3) || !isAir(x, y, z)) continue;
        set(x, y, z, 'cherry_leaves', { persistent: 'true' });
        if (y < by - 0.5 && r() < 0.15 && isAir(x, y - 1, z)) set(x, y - 1, z, 'cherry_leaves', { persistent: 'true' });
      }
    }
    for (let i = 0; i < 10 + size * 4; i++) {
      const x = x0 + Math.round((r() - 0.5) * (4 + size * 2));
      const z = z0 + Math.round((r() - 0.5) * (4 + size * 2));
      if (get(x, S, z) === 'grass_block' && isAir(x, S + 1, z)) {
        set(x, S + 1, z, 'pink_petals', { flower_amount: String(1 + Math.floor(r() * 4)), facing: pick(['north', 'east', 'south', 'west']) });
      }
    }
  };

  // Arce japonés (momiji) con hojas rojas.
  const maple = (x0, z0, seed) => {
    const r = rng(seed);
    const top = S + 5;
    for (let y = S + 1; y <= top; y++) set(x0, y, z0, 'dark_oak_log', { axis: 'y' });
    for (let y = top - 1; y <= top + 3; y++) for (let z = z0 - 3; z <= z0 + 3; z++) for (let x = x0 - 3; x <= x0 + 3; x++) {
      const d = Math.hypot(x - x0, (y - top - 0.8) * 1.6, z - z0);
      if (d > 3.1 || (d > 2.4 && r() < 0.35) || !isAir(x, y, z)) continue;
      set(x, y, z, r() < 0.8 ? 'nether_wart_block' : 'orange_terracotta');
    }
  };

  const bamboo = (x, z, h) => {
    if (get(x, S, z) !== 'grass_block' && get(x, S, z) !== 'moss_block') return;
    for (let i = 0; i < h; i++) {
      const fromTop = h - 1 - i;
      set(x, S + 1 + i, z, 'bamboo', { age: '1', leaves: fromTop < 2 ? 'large' : fromTop < 3 ? 'small' : 'none', stage: '0' });
    }
  };

  // ---------- Muro perimetral (tsuiji) ----------
  for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    const d = sdf(x, z);
    if (d > 0 || d < -1.1) continue;
    set(x, S + 1, z, 'stone_bricks');
    set(x, S + 2, z, 'calcite');
    set(x, S + 3, z, 'calcite');
    set(x, S + 4, z, 'deepslate_tile_slab', { type: 'bottom' });
  }

  // ---------- 1. Plaza de aparición ----------
  const SP = { x: 24.5, z: 91.5 };
  for (let z = 84; z <= 98; z++) for (let x = 16; x <= 33; x++) {
    const d = Math.hypot(x - SP.x, z - SP.z);
    if (d > 6.6 || sdf(x, z) > -1.2) continue;
    // Flor de cerezo de 5 pétalos en mosaico.
    const a = Math.atan2(z - SP.z, x - SP.x);
    const petal = d < 1.2 ? 'yellow_concrete' : d < 4.6 * (0.55 + 0.45 * Math.abs(Math.cos((5 * a) / 2))) ? (d < 2.4 ? 'pink_concrete' : 'pink_terracotta') : 'white_concrete';
    set(x, S, z, d > 5.6 ? 'polished_deepslate' : petal);
  }
  toro(18, 91, true);
  toro(31, 91, true);
  cherry(12, 93, 3, 11);
  cherry(37, 93, 3, 12);
  cherry(9, 84, 2, 13);
  cherry(40, 84, 2, 14);

  // ---------- 2. Gran torii y túnel de torii ----------
  torii({ at: 85, a: 20, b: 29, h: 9, plaque: true });
  for (let z = 69; z <= 83; z += 2) torii({ at: z, a: 21, b: 28, h: 5 });
  for (const [x, z] of [[19, 86], [30, 86], [19, 68], [30, 68]]) toro(x, z);
  // Bosques de bambú a los lados del túnel.
  for (let z = 67; z <= 88; z++) for (let x = 1; x < W - 1; x++) {
    if (x > 13 && x < 36) continue;
    if (sdf(x, z) > -1.5 || rand() > 0.42) continue;
    bamboo(x, z, 7 + Math.floor(rand() * 6));
  }
  for (let z = 67; z <= 88; z++) for (let x = 1; x < W - 1; x++) {
    if (get(x, S, z) === 'grass_block' && isAir(x, S + 1, z) && (x <= 13 || x >= 36) && rand() < 0.3) set(x, S, z, 'podzol');
  }
  cherry(16, 76, 2, 21);
  cherry(33, 78, 2, 22);

  // ---------- 3. Arroyo, estanque y puente rojo ----------
  for (let z = 55; z <= 68; z++) for (let x = 0; x < W; x++) {
    if (sdf(x, z) > -1.3) continue;
    const stream = z >= 59 && z <= 64;
    const pond = Math.hypot((x - 10) / 7.5, (z - 61.5) / 5.2) < 1 || Math.hypot((x - 40) / 6, (z - 62) / 4.5) < 1;
    if (!stream && !pond) continue;
    set(x, S - 2, z, 'clay');
    set(x, S - 1, z, 'water');
    set(x, S, z, 'water');
    if (rand() < 0.06 && !(x >= 21 && x <= 28)) set(x, S + 1, z, 'lily_pad');
    if (rand() < 0.04) set(x, S - 1, z, 'sea_pickle', { pickles: '3', waterlogged: 'true' });
  }
  // Orilla de piedras.
  for (let z = 54; z <= 69; z++) for (let x = 0; x < W; x++) {
    if (get(x, S, z) === 'water') continue;
    const nearWater = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => get(x + dx, S, z + dz) === 'water');
    if (nearWater && sdf(x, z) < -1.2 && !(x >= 22 && x <= 27)) {
      set(x, S, z, pick(['mossy_cobblestone', 'cobblestone', 'andesite', 'moss_block']));
      if (rand() < 0.25) set(x, S + 1, z, pick(['mossy_cobblestone', 'andesite', 'moss_carpet']));
    }
  }
  // Puente arqueado (taikobashi) sobre el arroyo.
  for (let z = 56; z <= 67; z++) {
    const dz = z - 61.5;
    const halves = Math.max(0, Math.round(6 * (1 - (dz / 6.3) ** 2)));
    for (let x = 21; x <= 28; x++) {
      const rail = x === 21 || x === 28;
      const m = Math.floor(halves / 2);
      let topY;
      if (halves % 2) {
        if (m >= 1) set(x, S + m, z, rail ? RED : 'spruce_planks');
        set(x, S + m + 1, z, rail ? RED : 'spruce_slab', { type: 'bottom' });
        topY = S + m + 1;
      } else {
        if (m >= 1) set(x, S + m, z, rail ? RED : 'spruce_planks');
        else set(x, S, z, 'spruce_planks');
        topY = S + m;
      }
      if (rail) {
        set(x, topY + 1, z, 'mangrove_fence');
        if (z === 56 || z === 67 || z === 61 || z === 62) { set(x, topY + 1, z, RED); set(x, topY + 2, z, 'gold_block'); }
      }
    }
  }
  maple(6, 56, 31);
  maple(44, 57, 32);
  cherry(15, 67, 2, 33);
  cherry(35, 66, 3, 34);

  // ---------- 4. Santuarios de los modos de juego ----------
  const MODES = [
    { color: 'purple', z: 46, side: 0 },
    { color: 'cyan', z: 53, side: 0 },
    { color: 'lime', z: 46, side: 1 },
    { color: 'orange', z: 53, side: 1 },
  ];
  for (const { color, z: zc, side } of MODES) {
    const X = (x) => (side ? W - 1 - x : x);
    const F = (f) => (side ? { east: 'west', west: 'east' }[f] || f : f);
    const put = (x, y, z, name, props) => set(X(x), y, z, name, props?.facing ? { ...props, facing: F(props.facing) } : props);
    // Base elevada.
    for (let z = zc - 3; z <= zc + 3; z++) for (let x = 3; x <= 11; x++) put(x, S + 1, z, x === 11 || z === zc - 3 || z === zc + 3 ? 'stone_bricks' : 'polished_andesite');
    for (let z = zc - 1; z <= zc + 1; z++) put(12, S + 1, z, 'stone_brick_stairs', { facing: 'west', half: 'bottom' });
    // Cuerpo del santuario.
    for (let y = S + 2; y <= S + 5; y++) for (let z = zc - 2; z <= zc + 2; z++) for (let x = 4; x <= 9; x++) {
      const edgeX = x === 4 || x === 9;
      const edgeZ = z === zc - 2 || z === zc + 2;
      if (!edgeX && !edgeZ) continue;
      const corner = edgeX && edgeZ;
      if (corner) put(x, y, z, RED);
      else if (x === 9 && Math.abs(z - zc) <= 1 && y <= S + 4) put(x, y, z, `${color}_stained_glass`);
      else put(x, y, z, y === S + 5 ? 'dark_oak_planks' : y === S + 2 ? 'dark_oak_planks' : 'white_terracotta');
    }
    for (let z = zc - 1; z <= zc + 1; z++) for (let x = 5; x <= 8; x++) put(x, S + 5, z, 'dark_oak_planks'); // techo interior
    put(9, S + 5, zc, `${color}_glazed_terracotta`);
    const rx0 = side ? W - 1 - 11 : 2;
    const rx1 = side ? W - 1 - 2 : 11;
    roof(rx0, zc - 4, rx1, zc + 4, S + 6);
    // Mini torii del color del modo, farolillos y camino de grava.
    const tx = X(15);
    for (const z of [zc - 2, zc + 2]) {
      set(tx, S + 1, z, BLACK);
      for (let y = S + 2; y <= S + 4; y++) set(tx, y, z, `${color}_concrete`);
    }
    for (let z = zc - 3; z <= zc + 3; z++) set(tx, S + 5, z, `${color}_concrete`);
    for (let z = zc - 4; z <= zc + 4; z++) set(tx, S + 6, z, BLACK);
    for (let z = zc - 1; z <= zc + 1; z++) for (let x = 13; x <= 21; x++) put(x, S, z, x % 2 ? 'gravel' : 'polished_andesite');
    put(13, S + 1, zc - 3, 'lantern');
    put(13, S + 1, zc + 3, 'lantern');
    put(10, S + 4, zc - 3, 'lantern', { hanging: 'true' });
    put(10, S + 4, zc + 3, 'lantern', { hanging: 'true' });
  }
  for (const z of [44, 51, 58]) { toro(20, z); toro(29, z); }

  // ---------- 5. Patio: jardín zen y pagoda ----------
  // Jardín zen (izquierda): grava rastrillada con rocas.
  for (let z = 30; z <= 41; z++) for (let x = 3; x <= 18; x++) {
    if (sdf(x, z) > -1.5) continue;
    const border = x === 3 || x === 18 || z === 30 || z === 41;
    set(x, S, z, border ? 'polished_andesite' : z % 2 ? 'gravel' : 'light_gray_concrete_powder');
  }
  for (const [x, z, h] of [[7, 34, 3], [13, 37, 2], [15, 32, 1], [9, 39, 1]]) {
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const hh = h - (Math.abs(dx) + Math.abs(dz) > 1 ? 1 : 0) - (dx || dz ? 1 : 0) + 1;
      for (let y = 1; y <= hh; y++) set(x + dx, S + y, z + dz, pick(['andesite', 'stone', 'mossy_cobblestone', 'tuff']));
      if (hh >= 1 && rand() < 0.5) set(x + dx, S + hh + 1, z + dz, 'moss_carpet');
    }
  }
  toro(18, 29, true);
  // Pagoda de cinco pisos (derecha).
  const pc = { x: 40, z: 35 };
  for (let z = pc.z - 5; z <= pc.z + 5; z++) for (let x = pc.x - 5; x <= pc.x + 5; x++) {
    set(x, S + 1, z, 'stone_bricks');
    set(x, S + 2, z, 'polished_andesite');
  }
  for (let z = pc.z - 1; z <= pc.z + 1; z++) set(pc.x - 6, S + 1, z, 'stone_brick_stairs', { facing: 'east', half: 'bottom' });
  const tiers = [
    { hw: 4, h: 4 }, { hw: 3, h: 3 }, { hw: 3, h: 3 }, { hw: 2, h: 3 }, { hw: 2, h: 3 },
  ];
  let y = S + 3;
  for (const [i, t] of tiers.entries()) {
    for (let yy = y; yy < y + t.h; yy++) for (let z = pc.z - t.hw; z <= pc.z + t.hw; z++) for (let x = pc.x - t.hw; x <= pc.x + t.hw; x++) {
      const ex = Math.abs(x - pc.x) === t.hw;
      const ez = Math.abs(z - pc.z) === t.hw;
      if (!ex && !ez) continue;
      const pillar = (ex && ez) || (ex && (z - pc.z) % 2 === 0 && Math.abs(z - pc.z) !== t.hw) || (ez && (x - pc.x) % 2 === 0 && Math.abs(x - pc.x) !== t.hw);
      if (ex && ez) set(x, yy, z, RED);
      else if (yy === y + t.h - 1) set(x, yy, z, 'dark_oak_planks');
      else if (pillar) set(x, yy, z, RED);
      else set(x, yy, z, i === 0 && yy < y + 2 && (x === pc.x || z === pc.z) ? 'yellow_stained_glass' : 'white_terracotta');
    }
    const ro = t.hw + 2;
    y = roof(pc.x - ro, pc.z - ro, pc.x + ro, pc.z + ro, y + t.h, { rows: 3 }) + 1;
  }
  // Sōrin: remate con anillos dorados.
  for (let i = 0; i < 7; i++) set(pc.x, y + i, pc.z, i % 2 ? 'gold_block' : 'polished_blackstone_wall');
  set(pc.x, y + 7, pc.z, 'end_rod', { facing: 'up' });
  cherry(31, 32, 1, 41);

  // ---------- 6. Templo principal (honden) ----------
  // Plataforma de piedra.
  for (let z = 4; z <= 26; z++) for (let x = 6; x <= 43; x++) {
    for (let yy = S + 1; yy <= S + 3; yy++) set(x, yy, z, yy === S + 3 ? 'spruce_planks' : 'stone_bricks');
  }
  for (let x = 19; x <= 30; x++) {
    set(x, S + 1, 27, 'stone_bricks'); set(x, S + 2, 27, 'stone_bricks'); set(x, S + 3, 27, 'spruce_stairs', { facing: 'north', half: 'bottom' });
    set(x, S + 1, 28, 'stone_bricks'); set(x, S + 2, 28, 'stone_brick_stairs', { facing: 'north', half: 'bottom' });
    set(x, S + 1, 29, 'stone_brick_stairs', { facing: 'north', half: 'bottom' });
  }
  // Barandilla en el borde de la plataforma.
  for (let z = 4; z <= 26; z++) for (let x = 6; x <= 43; x++) {
    const edge = x === 6 || x === 43 || z === 4 || z === 26;
    if (edge && !(z === 26 && x >= 19 && x <= 30)) set(x, S + 4, z, 'dark_oak_fence');
  }
  // Cuerpo del templo.
  const hx0 = 10, hx1 = 39, hz0 = 8, hz1 = 22;
  const top = S + 11;
  for (let yy = S + 4; yy <= top; yy++) for (let z = hz0; z <= hz1; z++) for (let x = hx0; x <= hx1; x++) {
    const ex = x === hx0 || x === hx1;
    const ez = z === hz0 || z === hz1;
    if (!ex && !ez) continue;
    const pillar = (ex && ez) || (ez && (x - hx0) % 4 === 0) || (ex && (z - hz0) % 4 === 0);
    let m;
    if (pillar) m = RED;
    else if (yy === top) m = 'dark_oak_log';
    else if (yy === S + 4 || yy === top - 1) m = 'dark_oak_planks';
    else m = 'white_terracotta';
    const door = z === hz1 && x >= 21 && x <= 28 && yy <= S + 9;
    if (door) m = 'yellow_stained_glass';
    set(x, yy, z, m, m === 'dark_oak_log' ? { axis: ez ? 'x' : 'z' } : undefined);
  }
  // Marco dorado del portal principal.
  for (let x = 20; x <= 29; x++) set(x, S + 10, hz1, 'gold_block');
  for (let yy = S + 4; yy <= S + 9; yy++) { set(20, yy, hz1, RED); set(29, yy, hz1, RED); }
  fill(hx0 + 1, top, hz0 + 1, hx1 - 1, top, hz1 - 1, 'dark_oak_planks');
  // Gran tejado.
  roof(hx0 - 4, hz0 - 3, hx1 + 4, hz1 + 3, top + 1);
  // Farolillos colgando del alero y linternas de piedra en la escalera.
  for (const x of [14, 22, 27, 35]) {
    set(x, top, hz1 + 2, 'chain', { axis: 'y' });
    set(x, top - 1, hz1 + 2, 'lantern', { hanging: 'true' });
  }
  toro(17, 30, true);
  toro(32, 30, true);
  cherry(8, 29, 2, 51);
  maple(44, 28, 52);

  // ---------- Vegetación final ----------
  const flowers = ['azure_bluet', 'lily_of_the_valley', 'allium', 'oxeye_daisy', 'pink_tulip', 'white_tulip', 'cornflower'];
  for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    if (!['grass_block', 'moss_block', 'podzol'].includes(get(x, S, z)) || !isAir(x, S + 1, z)) continue;
    const r = rand();
    if (r < 0.06) set(x, S + 1, z, pick(flowers));
    else if (r < 0.22) set(x, S + 1, z, 'short_grass');
    else if (r < 0.28) set(x, S + 1, z, 'fern');
    else if (r < 0.3) set(x, S + 1, z, 'moss_carpet');
  }

  finalizeConnections(s);
  return s;
}
