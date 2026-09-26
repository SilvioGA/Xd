// Piezas de construcción de estilo japonés compartidas por los lobbies:
// isla flotante con forma de rectángulo redondeado, torii, linternas de piedra,
// tejados curvos, cerezos, arces, bambú y muro perimetral (tsuiji).

import { Schematic } from './schematic.js';
import { rng } from './lobby.js';

export function createJapaneseKit({ W, L, H, S, seed, name, corner = 12 }) {
  const MID = (W - 1) / 2;
  const MIDZ = (L - 1) / 2;
  const s = new Schematic(W, H, L);
  s.format = 'Ejemplo integrado';
  s.meta = { name, author: 'Visor de Schematics', dataVersion: 3465 };
  const rand = rng(seed);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  const inside = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < W && y < H && z < L;
  const set = (x, y, z, name, props) => { if (inside(x, y, z)) s.set(x, y, z, name, props); };
  const get = (x, y, z) => (inside(x, y, z) ? s.palette[s.get(x, y, z)].name.slice(10) : 'air');
  const isAir = (x, y, z) => get(x, y, z) === 'air';
  const fill = (x0, y0, z0, x1, y1, z1, name, props) => {
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) set(x, y, z, name, props);
  };

  // Distancia con signo a un rectángulo redondeado (negativa dentro).
  const CORNER = corner;
  const sdf = (x, z) => {
    const qx = Math.abs(x - MID) - (W / 2 - 0.5 - CORNER);
    const qz = Math.abs(z - MIDZ) - (L / 2 - 0.5 - CORNER);
    const out = Math.hypot(Math.max(qx, 0), Math.max(qz, 0));
    return out + Math.min(Math.max(qx, qz), 0) - CORNER;
  };

  // Isla flotante: cono invertido bajo el rectángulo redondeado, con lianas colgando y césped arriba.
  const baseIsland = () => {
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
  };

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

  // Pagoda: base de piedra, pisos con pilares rojos y tejado propio, y remate dorado (sōrin).
  // stairs: lado de la base por el que se sube ('west', 'east', 'north' o 'south').
  const pagoda = (pc, { base, tiers, stairs = 'west' }) => {
    for (let z = pc.z - base; z <= pc.z + base; z++) for (let x = pc.x - base; x <= pc.x + base; x++) {
      set(x, S + 1, z, 'stone_bricks');
      set(x, S + 2, z, 'polished_andesite');
    }
    const facing = { west: 'east', east: 'west', north: 'south', south: 'north' }[stairs];
    for (let i = -1; i <= 1; i++) {
      if (stairs === 'west') set(pc.x - base - 1, S + 1, pc.z + i, 'stone_brick_stairs', { facing, half: 'bottom' });
      if (stairs === 'east') set(pc.x + base + 1, S + 1, pc.z + i, 'stone_brick_stairs', { facing, half: 'bottom' });
      if (stairs === 'north') set(pc.x + i, S + 1, pc.z - base - 1, 'stone_brick_stairs', { facing, half: 'bottom' });
      if (stairs === 'south') set(pc.x + i, S + 1, pc.z + base + 1, 'stone_brick_stairs', { facing, half: 'bottom' });
    }
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
    for (let i = 0; i < 7; i++) set(pc.x, y + i, pc.z, i % 2 ? 'gold_block' : 'polished_blackstone_wall');
    set(pc.x, y + 7, pc.z, 'end_rod', { facing: 'up' });
    return y + 7;
  };

  const perimeterWall = () => {
    // ---------- Muro perimetral (tsuiji) ----------
    for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
      const d = sdf(x, z);
      if (d > 0 || d < -1.1) continue;
      set(x, S + 1, z, 'stone_bricks');
      set(x, S + 2, z, 'calcite');
      set(x, S + 3, z, 'calcite');
      set(x, S + 4, z, 'deepslate_tile_slab', { type: 'bottom' });
    }
  };

  return {
    s, S, W, L, H, MID, rand, pick, set, get, isAir, fill, sdf,
    RED, BLACK, baseIsland, perimeterWall, torii, toro, roof, cherry, maple, bamboo, pagoda,
  };
}
