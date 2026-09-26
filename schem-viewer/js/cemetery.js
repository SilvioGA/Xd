// Cementerio épico (81×90): verja de hierro entre pilares con farolillos de almas, gran puerta
// entre dos columnas monumentales, avenida con columnas detalladas (plinto, basa con molduras,
// fuste estriado, collarino, capitel y ábaco) coronadas por hogueras de almas, y al fondo un
// mausoleo en forma de templo con ocho columnas, frontón y un sarcófago con velas.
// Entre medias: tumbas de varios tipos, obeliscos, criptas, árboles muertos y telarañas.

import { Schematic } from './schematic.js';
import { rng, finalizeConnections } from './lobby.js';

export const CEMETERY_GROUND = 4;

export function buildCemetery() {
  const W = 81; // eje de simetría en x = 40,5 (x se refleja en 80 - x)
  const L = 90;
  const H = 50;
  const G = CEMETERY_GROUND;
  const s = new Schematic(W, H, L);
  s.format = 'Ejemplo integrado';
  s.meta = { name: 'Cementerio épico', author: 'Visor de Schematics', dataVersion: 3465, spawn: [40.5, G + 1, L - 2.5, 0] };
  const rand = rng(1313);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const inside = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < W && y < H && z < L;
  const set = (x, y, z, name, props) => { if (inside(x, y, z)) s.set(x, y, z, name, props); };
  const get = (x, y, z) => (inside(x, y, z) ? s.palette[s.get(x, y, z)].name.slice(10) : 'out');
  const isAir = (x, y, z) => get(x, y, z) === 'air';
  const fill = (x0, y0, z0, x1, y1, z1, name, props) => {
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) set(x, y, z, name, props);
  };
  const stairs = (x, y, z, name, facing, half = 'bottom') => set(x, y, z, name, { facing, half, shape: 'straight', waterlogged: 'false' });
  const slab = (x, y, z, name, type = 'bottom') => set(x, y, z, name, { type, waterlogged: 'false' });
  const hang = (x, y, z, chain = 0) => {
    for (let i = 1; i <= chain; i++) set(x, y + i, z, 'chain', { axis: 'y' });
    set(x, y, z, 'soul_lantern', { hanging: 'true', waterlogged: 'false' });
  };
  const candle = (x, y, z) => set(x, y, z, pick(['candle', 'white_candle', 'black_candle']), { candles: String(1 + Math.floor(rand() * 3)), lit: 'true', waterlogged: 'false' });
  const stone = () => pick(['stone_bricks', 'stone_bricks', 'mossy_stone_bricks', 'cracked_stone_bricks']);
  const dark = () => pick(['deepslate_bricks', 'deepslate_bricks', 'cracked_deepslate_bricks', 'deepslate_tiles']);
  const used = new Uint8Array(W * L); // celdas ocupadas por caminos o construcciones
  const mark = (x0, z0, x1, z1) => {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (x >= 0 && z >= 0 && x < W && z < L) used[z * W + x] = 1;
  };
  const free = (x0, z0, x1, z1) => {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (x < 0 || z < 0 || x >= W || z >= L || used[z * W + x]) return false;
    return true;
  };

  // Columna detallada de 5×5 centrada en (cx, cz) que arranca en y0. Devuelve la primera altura libre.
  const RING = [];
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
    if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
    if (Math.abs(dx) === 2 || Math.abs(dz) === 2) {
      RING.push([dx, dz, Math.abs(dx) === 2 ? (dx > 0 ? 'west' : 'east') : dz > 0 ? 'north' : 'south']);
    }
  }
  const column = (cx, y0, cz, h) => {
    mark(cx - 2, cz - 2, cx + 2, cz + 2);
    // Plinto y basa: moldura de escaleras que se abre hacia fuera.
    fill(cx - 2, y0, cz - 2, cx + 2, y0, cz + 2, 'polished_blackstone_bricks');
    fill(cx - 1, y0 + 1, cz - 1, cx + 1, y0 + 1, cz + 1, 'polished_blackstone');
    for (const [dx, dz, f] of RING) stairs(cx + dx, y0 + 1, cz + dz, 'polished_blackstone_brick_stairs', f);
    fill(cx - 1, y0 + 2, cz - 1, cx + 1, y0 + 2, cz + 1, 'chiseled_stone_bricks');
    // Fuste estriado: cruz de piedra pulida con muretes en las esquinas; musgo y enredaderas.
    for (let y = y0 + 3; y < y0 + 3 + h; y++) {
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const corner = dx && dz;
        if (corner) set(cx + dx, y, cz + dz, rand() < 0.2 ? 'mossy_stone_brick_wall' : 'andesite_wall');
        else if (!dx && !dz) set(cx, y, cz, 'stone_bricks');
        else set(cx + dx, y, cz + dz, rand() < 0.12 ? 'mossy_stone_bricks' : 'polished_andesite');
      }
      if (rand() < 0.12) {
        const [dx, dz, side] = pick([[0, -2, 'south'], [0, 2, 'north'], [-2, 0, 'east'], [2, 0, 'west']]);
        const x = cx + dx / 2 * 2;
        const z = cz + dz / 2 * 2;
        if (isAir(x, y, z)) set(x, y, z, 'vine', { [side]: 'true' });
      }
    }
    const t = y0 + 3 + h;
    fill(cx - 1, t, cz - 1, cx + 1, t, cz + 1, 'chiseled_stone_bricks'); // collarino
    fill(cx - 1, t + 1, cz - 1, cx + 1, t + 1, cz + 1, 'polished_blackstone');
    for (const [dx, dz, f] of RING) stairs(cx + dx, t + 1, cz + dz, 'polished_blackstone_brick_stairs', f, 'top'); // capital
    fill(cx - 2, t + 2, cz - 2, cx + 2, t + 2, cz + 2, 'polished_blackstone_bricks'); // ábaco
    for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) hang(cx + dx, t + 1, cz + dz, 0);
    return t + 3;
  };
  // Remate de columna: pebetero con fuego de almas.
  const brazier = (cx, y, cz) => {
    set(cx, y, cz, 'chiseled_polished_blackstone');
    for (const [dx, dz, f] of [[1, 0, 'west'], [-1, 0, 'east'], [0, 1, 'north'], [0, -1, 'south']]) stairs(cx + dx, y, cz + dz, 'polished_blackstone_stairs', f, 'top');
    set(cx, y + 1, cz, 'soul_campfire', { lit: 'true', facing: 'south', signal_fire: 'false', waterlogged: 'false' });
  };

  // ---------- Terreno ----------
  fill(0, 0, 0, W - 1, 0, L - 1, 'stone');
  fill(0, 1, 0, W - 1, G - 1, L - 1, 'dirt');
  for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    const r = rand();
    set(x, G, z, r < 0.4 ? 'grass_block' : r < 0.65 ? 'podzol' : r < 0.83 ? 'coarse_dirt' : r < 0.93 ? 'rooted_dirt' : 'moss_block');
  }

  // ---------- Avenida y caminos ----------
  const pave = (x, z) => {
    set(x, G, z, pick(['polished_blackstone_bricks', 'cracked_polished_blackstone_bricks', 'deepslate_tiles', 'cobbled_deepslate', 'polished_blackstone_bricks']));
    mark(x, z, x, z);
  };
  for (let z = 27; z < L; z++) for (let x = 38; x <= 42; x++) pave(x, z);
  for (let z = 54; z <= 56; z++) for (let x = 5; x <= 75; x++) pave(x, z);

  // ---------- Verja: muro bajo con barrotes entre pilares con farolillo de almas ----------
  const X0 = 2;
  const X1 = 78;
  const Z0 = 2;
  const Z1 = 84;
  const pillar = (x, z) => {
    set(x, G + 1, z, 'polished_blackstone_bricks');
    set(x, G + 2, z, stone());
    set(x, G + 3, z, stone());
    set(x, G + 4, z, 'chiseled_polished_blackstone');
    set(x, G + 5, z, 'soul_lantern', { hanging: 'false', waterlogged: 'false' });
  };
  const fence = (x, z, post) => {
    mark(x, z, x, z);
    if (post) { pillar(x, z); return; }
    set(x, G + 1, z, 'stone_brick_wall');
    set(x, G + 2, z, 'iron_bars');
    set(x, G + 3, z, 'iron_bars');
  };
  for (let x = X0; x <= X1; x++) {
    fence(x, Z0, (x - X0) % 6 === 0);
    if (x < 32 || x > 48) fence(x, Z1, (x - X0) % 6 === 0);
  }
  for (let z = Z0; z <= Z1; z++) { fence(X0, z, (z - Z0) % 6 === 0 || z === Z1); fence(X1, z, (z - Z0) % 6 === 0 || z === Z1); }
  for (const x of [37, 43]) { set(x, G + 1, Z1, 'stone_brick_wall'); set(x, G + 2, Z1, 'iron_bars'); set(x, G + 3, Z1, 'iron_bars'); }

  // ---------- Gran puerta ----------
  let top = 0;
  for (const cx of [34, 46]) top = column(cx, G + 1, Z1, 9);
  fill(37, top - 1, Z1 - 1, 43, top - 1, Z1 + 1, 'polished_blackstone_bricks'); // dintel
  for (let x = 37; x <= 43; x++) {
    stairs(x, top - 2, Z1 - 1, 'polished_blackstone_brick_stairs', 'south', 'top');
    stairs(x, top - 2, Z1 + 1, 'polished_blackstone_brick_stairs', 'north', 'top');
  }
  // Frontón con calavera y dos pebeteros.
  for (let i = 0; i <= 3; i++) for (let x = 37 + i; x <= 43 - i; x++) {
    const edge = x === 37 + i || x === 43 - i;
    for (const z of [Z1 - 1, Z1, Z1 + 1]) {
      if (edge) stairs(x, top + i, z, 'polished_blackstone_brick_stairs', x < 40 ? 'east' : x > 40 ? 'west' : 'south');
      else set(x, top + i, z, 'polished_blackstone_bricks');
    }
  }
  set(40, top + 3, Z1, 'chiseled_polished_blackstone');
  set(40, top + 4, Z1, 'wither_skeleton_skull', { rotation: '0' });
  set(40, top, Z1 + 2, 'wither_skeleton_wall_skull', { facing: 'south' });
  for (const cx of [34, 46]) brazier(cx, top, Z1);
  for (const x of [38, 42]) hang(x, top - 3, Z1, 1);
  hang(40, top - 4, Z1, 2);

  // ---------- Columnata de la avenida ----------
  for (const z of [38, 48, 62, 72]) for (const cx of [34, 46]) brazier(cx, column(cx, G + 1, z, 7), z);

  // ---------- Mausoleo (templo) ----------
  const P = G + 3; // suelo del templo
  fill(24, G + 1, 6, 56, P, 26, 'polished_deepslate');
  mark(22, 4, 58, 30);
  for (let x = 24; x <= 56; x++) {
    stairs(x, G + 3, 27, 'polished_deepslate_stairs', 'north');
    set(x, G + 2, 27, 'polished_deepslate');
    stairs(x, G + 2, 28, 'polished_deepslate_stairs', 'north');
    set(x, G + 1, 28, 'polished_deepslate');
    stairs(x, G + 1, 29, 'polished_deepslate_stairs', 'north');
  }
  for (let z = 6; z <= 26; z++) for (let x = 24; x <= 56; x++) if (x === 24 || x === 56 || z === 6 || z === 26) set(x, P, z, 'deepslate_tiles');
  // Cella.
  const CT = P + 15; // techo
  for (let y = P + 1; y < CT; y++) for (let z = 8; z <= 19; z++) for (let x = 31; x <= 49; x++) {
    if (x === 31 || x === 49 || z === 8 || z === 19) set(x, y, z, y === P + 1 ? 'polished_blackstone_bricks' : dark());
  }
  for (let y = P + 1; y <= P + 7; y++) for (let x = 38; x <= 42; x++) if (y < P + 7 || (x > 38 && x < 42)) set(x, y, 19, 'air');
  for (const x of [38, 42]) set(x, P + 7, 19, 'chiseled_deepslate');
  // Ventanas altas moradas.
  for (const z of [11, 16]) for (const x of [31, 49]) for (let y = P + 5; y <= P + 10; y++) set(x, y, z, 'purple_stained_glass_pane');
  for (const x of [35, 45]) for (let y = P + 6; y <= P + 11; y++) set(x, y, 8, 'purple_stained_glass_pane');
  // Columnas del templo: cuatro delante y dos a cada lado.
  for (const [cx, cz] of [[28, 23], [34, 23], [46, 23], [52, 23], [28, 10], [52, 10], [28, 16], [52, 16]]) column(cx, P + 1, cz, 9);
  // Entablamento y techo plano.
  fill(24, CT, 6, 56, CT + 1, 26, 'polished_blackstone_bricks');
  for (let x = 24; x <= 56; x++) set(x, CT, 26, 'chiseled_polished_blackstone');
  // Frontón de pendiente suave (medio bloque por columna) con tejado de pizarra oscura.
  for (let x = 23; x <= 57; x++) {
    const rise = (17 - Math.abs(x - 40)) / 2;
    const full = Math.floor(rise);
    for (let z = 5; z <= 27; z++) {
      const face = z === 26 || z === 6;
      for (let k = 0; k < full; k++) set(x, CT + 2 + k, z, face && k < full - 1 ? (k === 0 ? 'polished_blackstone_bricks' : 'deepslate_tiles') : k === full - 1 ? 'deepslate_tiles' : 'air');
      if (rise > full) slab(x, CT + 2 + full, z, 'deepslate_tile_slab');
    }
  }
  set(40, CT + 5, 27, 'wither_skeleton_wall_skull', { facing: 'south' });
  brazier(40, CT + 10, 16);
  // Interior: sarcófago con velas, bancos de piedra y farolillos colgantes.
  fill(32, P, 9, 48, P, 18, 'polished_deepslate');
  for (let z = 10; z <= 17; z++) for (let x = 39; x <= 41; x++) set(x, P + 1, z, 'red_carpet');
  fill(38, P + 1, 11, 42, P + 1, 13, 'polished_blackstone_bricks');
  fill(38, P + 2, 11, 42, P + 2, 13, 'polished_blackstone_brick_slab', { type: 'bottom', waterlogged: 'false' });
  for (let x = 39; x <= 41; x++) set(x, P + 2, 12, 'chiseled_polished_blackstone');
  set(40, P + 3, 12, 'wither_skeleton_skull', { rotation: '0' });
  for (const [x, z] of [[38, 11], [42, 11], [38, 13], [42, 13]]) candle(x, P + 3, z);
  for (const x of [34, 46]) for (const z of [11, 14, 17]) stairs(x, P + 1, z, 'deepslate_brick_stairs', x < 40 ? 'west' : 'east');
  for (const [x, z] of [[35, 12], [45, 12], [40, 16]]) hang(x, CT - 2, z, 1);
  for (const x of [33, 47]) { set(x, P + 1, 9, 'soul_campfire', { lit: 'true', facing: 'south', signal_fire: 'false', waterlogged: 'false' }); set(x, P + 5, 9, 'black_wall_banner', { facing: 'south' }); }
  for (let x = 32; x <= 48; x++) for (const z of [9, 18]) if (isAir(x, P + 1, z) && rand() < 0.3) set(x, P + 1, z, 'cobweb');

  // ---------- Obeliscos y criptas ----------
  const obelisk = (cx, cz, h) => {
    mark(cx - 2, cz - 2, cx + 2, cz + 2);
    fill(cx - 1, G + 1, cz - 1, cx + 1, G + 1, cz + 1, 'polished_blackstone_bricks');
    for (const [dx, dz, f] of [[0, -2, 'south'], [0, 2, 'north'], [-2, 0, 'east'], [2, 0, 'west']]) stairs(cx + dx, G + 1, cz + dz, 'polished_blackstone_brick_stairs', f);
    fill(cx - 1, G + 2, cz - 1, cx + 1, G + 2, cz + 1, 'chiseled_stone_bricks');
    for (let y = G + 3; y < G + 3 + h; y++) set(cx, y, cz, y === G + 3 + Math.floor(h / 2) ? 'chiseled_polished_blackstone' : 'polished_andesite');
    set(cx, G + 3 + h, cz, 'polished_andesite_wall');
    for (const [dx, dz, f] of [[0, -1, 'north'], [0, 1, 'south'], [-1, 0, 'west'], [1, 0, 'east']]) set(cx + dx, G + 4, cz + dz, 'soul_wall_torch', { facing: f });
  };
  const crypt = (cx, cz) => {
    mark(cx - 4, cz - 4, cx + 4, cz + 5);
    fill(cx - 3, G + 1, cz - 3, cx + 3, G + 1, cz + 3, 'polished_deepslate');
    for (let y = G + 2; y <= G + 6; y++) for (let z = cz - 3; z <= cz + 3; z++) for (let x = cx - 3; x <= cx + 3; x++) {
      const edge = Math.abs(x - cx) === 3 || Math.abs(z - cz) === 3;
      const corner = Math.abs(x - cx) === 3 && Math.abs(z - cz) === 3;
      if (edge) set(x, y, z, corner ? 'polished_blackstone_bricks' : dark());
    }
    for (let i = 0; i <= 3; i++) for (let z = cz - 4; z <= cz + 4; z++) for (let x = cx - 4 + i; x <= cx + 4 - i; x++) {
      if (x === cx - 4 + i) stairs(x, G + 7 + i, z, 'deepslate_tile_stairs', 'east');
      else if (x === cx + 4 - i) stairs(x, G + 7 + i, z, 'deepslate_tile_stairs', 'west');
      else if (z === cz + 3 || z === cz - 3 || i === 3) set(x, G + 7 + i, z, 'deepslate_tiles');
    }
    set(cx, G + 11, cz, 'cobblestone_wall');
    set(cx, G + 12, cz, 'cobblestone_wall');
    for (const dx of [-1, 1]) set(cx + dx, G + 11, cz, 'cobblestone_wall');
    set(cx, G + 2, cz + 3, 'iron_door', { facing: 'north', half: 'lower', hinge: 'left', open: 'false', powered: 'false' });
    set(cx, G + 3, cz + 3, 'iron_door', { facing: 'north', half: 'upper', hinge: 'left', open: 'false', powered: 'false' });
    for (const dx of [-2, 2]) {
      for (let y = G + 2; y <= G + 5; y++) set(cx + dx, y, cz + 4, 'andesite_wall');
      set(cx + dx, G + 6, cz + 4, 'soul_lantern', { hanging: 'false', waterlogged: 'false' });
    }
    set(cx, G + 5, cz + 4, 'chiseled_deepslate');
    for (let x = cx - 1; x <= cx + 1; x++) stairs(x, G + 1, cz + 4, 'polished_deepslate_stairs', 'north');
  };
  crypt(14, 42);
  crypt(66, 42);
  obelisk(14, 70, 9);
  obelisk(66, 70, 9);
  obelisk(24, 62, 6);
  obelisk(56, 62, 6);

  const post = (x, z) => {
    mark(x, z, x, z);
    set(x, G + 1, z, 'polished_blackstone_wall');
    set(x, G + 2, z, 'polished_blackstone_wall');
    set(x, G + 3, z, 'soul_lantern', { hanging: 'false', waterlogged: 'false' });
  };
  for (const x of [10, 22, 58, 70]) { post(x, 53); post(x, 57); }
  for (const x of [37, 43]) for (const z of [33, 43, 67, 77]) post(x, z);

  // ---------- Tumbas ----------
  const grave = (x, z) => {
    mark(x - 1, z, x + 1, z + 2);
    for (const dz of [1, 2]) set(x, G, z + dz, pick(['podzol', 'coarse_dirt', 'rooted_dirt']));
    const t = rand();
    if (t < 0.3) {
      set(x, G + 1, z, pick(['chiseled_stone_bricks', 'stone_bricks', 'mossy_stone_bricks']));
      slab(x, G + 2, z, pick(['stone_brick_slab', 'mossy_stone_brick_slab']));
    } else if (t < 0.55) {
      const wall = pick(['cobblestone_wall', 'mossy_cobblestone_wall', 'stone_brick_wall']);
      for (let y = G + 1; y <= G + 3; y++) set(x, y, z, wall);
      set(x - 1, G + 2, z, wall);
      set(x + 1, G + 2, z, wall);
    } else if (t < 0.75) {
      set(x, G + 1, z, 'polished_andesite');
      set(x, G + 2, z, 'polished_andesite');
      stairs(x, G + 3, z, 'andesite_stairs', 'north');
      for (const dz of [1, 2]) slab(x, G + 1, z + dz, 'stone_brick_slab');
    } else if (t < 0.9) {
      set(x, G + 1, z, 'cracked_stone_bricks');
      set(x, G + 2, z, 'skeleton_skull', { rotation: '0' });
    } else {
      stairs(x, G + 1, z, 'mossy_stone_brick_stairs', 'south');
    }
    const d = rand();
    if (d < 0.25 && isAir(x, G + 1, z + 1)) candle(x, G + 1, z + 1);
    else if (d < 0.45 && isAir(x, G + 1, z + 1)) set(x, G + 1, z + 1, pick(['wither_rose', 'poppy', 'lily_of_the_valley', 'dead_bush']));
    if (rand() < 0.08 && isAir(x + 1, G + 1, z)) set(x + 1, G + 1, z, 'cobweb');
  };
  for (const [x0, x1] of [[6, 31], [49, 74]]) {
    for (let z = 31; z <= 78; z += 5) {
      if (z >= 52 && z <= 57) continue;
      for (let x = x0; x <= x1; x += 4) {
        const gx = x + (rand() < 0.3 ? 1 : 0);
        if (free(gx - 1, z, gx + 1, z + 2)) grave(gx, z);
      }
    }
  }
  // Tumbas antiguas detrás del templo.
  for (let x = 8; x <= 72; x += 5) if (free(x - 1, 3, x + 1, 5)) grave(x, 3);

  // ---------- Árboles muertos, farolillos y detalles ----------
  const deadTree = (x0, z0, h) => {
    mark(x0, z0, x0, z0);
    for (let y = G + 1; y <= G + h; y++) set(x0, y, z0, 'dark_oak_log', { axis: 'y' });
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) {
      if (rand() < 0.4) continue;
      let x = x0;
      let z = z0;
      let y = G + h - 1 - Math.floor(rand() * 3);
      const len = 2 + Math.floor(rand() * 3);
      for (let i = 0; i < len; i++) {
        x += dx; z += dz;
        if (rand() < 0.5) y++;
        set(x, y, z, i === len - 1 ? 'dark_oak_fence' : 'dark_oak_wood', i === len - 1 ? undefined : { axis: 'y' });
        if (rand() < 0.15 && isAir(x, y - 1, z)) set(x, y - 1, z, 'cobweb');
      }
    }
  };
  for (const [x, z, h] of [[8, 34, 7], [29, 47, 6], [72, 35, 8], [51, 76, 6], [8, 60, 6], [73, 64, 7], [20, 78, 7], [60, 50, 6], [3, 88, 6], [77, 87, 7], [20, 87, 5]]) {
    if (!used[z * W + x]) deadTree(x, z, h);
  }
  // Hierba, helechos, arbustos secos y calabazas por el suelo.
  for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    if (used[z * W + x] || !isAir(x, G + 1, z)) continue;
    const g = get(x, G, z);
    if (g !== 'grass_block' && g !== 'podzol' && g !== 'coarse_dirt' && g !== 'moss_block') continue;
    const r = rand();
    if (r < 0.1) set(x, G + 1, z, pick(['short_grass', 'fern', 'short_grass']));
    else if (r < 0.13) set(x, G + 1, z, 'dead_bush');
    else if (r < 0.137) set(x, G + 1, z, pick(['carved_pumpkin', 'jack_o_lantern']), { facing: pick(['south', 'east', 'west']) });
    else if (r < 0.145) set(x, G + 1, z, 'wither_rose');
  }

  finalizeConnections(s);
  return s;
}
