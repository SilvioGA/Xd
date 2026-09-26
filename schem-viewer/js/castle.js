// Castillo de princesas (95×100): muralla blanca con almenas, foso con nenúfares y puente de
// cerezo, puerta con un corazón encima y cuatro torres de techo cónico rosa con banderas.
// En el patio: fuente del corazón, jardines de flores, cerezos, cenador y carroza de calabaza.
// El palacio tiene escalinata, pórtico con balcón y rosetón; dentro, salón de baile con
// columnas, lámparas de oro, trono y dos escaleras hacia la planta alta (dormitorio de la
// princesa con cama con dosel, salón de té y biblioteca). La torre principal (casi 80 bloques)
// tiene una escalera de mano hasta la habitación de arriba, con balcón circular.

import { Schematic } from './schematic.js';
import { rng, finalizeConnections } from './lobby.js';

export const CASTLE_GROUND = 4;

export function buildCastle() {
  const W = 95; // eje de simetría en x = 47,5 (la celda x se refleja en 94 - x)
  const L = 100;
  const H = 82;
  const G = CASTLE_GROUND;
  const s = new Schematic(W, H, L);
  s.format = 'Ejemplo integrado';
  s.meta = { name: 'Castillo de princesas', author: 'Visor de Schematics', dataVersion: 3465, spawn: [47.5, G + 1, L - 2.5, 0] };
  const rand = rng(1999);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const inside = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < W && y < H && z < L;
  const set = (x, y, z, name, props) => { if (inside(x, y, z)) s.set(x, y, z, name, props); };
  const get = (x, y, z) => (inside(x, y, z) ? s.palette[s.get(x, y, z)].name.slice(10) : 'out');
  const isAir = (x, y, z) => get(x, y, z) === 'air';
  const fill = (x0, y0, z0, x1, y1, z1, name, props) => {
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) set(x, y, z, name, props);
  };
  const disc = (cx, cz, r, fn) => {
    for (let z = Math.floor(cz - r - 1); z <= Math.ceil(cz + r + 1); z++) for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
      if (d <= r) fn(x, z, d);
    }
  };
  const white = () => { const r = rand(); return r < 0.7 ? 'smooth_quartz' : r < 0.88 ? 'quartz_bricks' : 'calcite'; };
  const stairs = (x, y, z, name, facing, half = 'bottom') => set(x, y, z, name, { facing, half, shape: 'straight', waterlogged: 'false' });
  const door = (x, y, z, facing, hinge = 'left', wood = 'cherry') => {
    set(x, y, z, `${wood}_door`, { facing, half: 'lower', hinge, open: 'false', powered: 'false' });
    set(x, y + 1, z, `${wood}_door`, { facing, half: 'upper', hinge, open: 'false', powered: 'false' });
  };
  const hang = (x, y, z, chain = 0) => {
    for (let i = 1; i <= chain; i++) set(x, y + i, z, 'chain', { axis: 'y' });
    set(x, y, z, 'lantern', { hanging: 'true', waterlogged: 'false' });
  };
  const lamp = (x, z) => { set(x, G + 1, z, 'diorite_wall'); set(x, G + 2, z, 'diorite_wall'); set(x, G + 3, z, 'lantern', { hanging: 'false' }); };
  const flower2 = (x, y, z, name) => { set(x, y, z, name, { half: 'lower' }); set(x, y + 1, z, name, { half: 'upper' }); };
  const leaves = (name) => [name, { persistent: 'true' }];

  // Corazón de 5×4 en un plano vertical (mirando al sur), con su esquina superior izquierda en (x0, yTop).
  const HEART = ['.X.X.', 'XXXXX', '.XXX.', '..X..'];
  const heart = (x0, yTop, z, name = 'pink_concrete') => HEART.forEach((row, i) => [...row].forEach((c, j) => {
    if (c === 'X') set(x0 + j, yTop - i, z, name);
  }));

  // Remate dorado con bandera rosa en la punta de cada techo.
  const finial = (x, y, z) => {
    set(x, y, z, 'gold_block');
    set(x, y + 1, z, 'end_rod', { facing: 'up' });
    set(x, y + 2, z, 'end_rod', { facing: 'up' });
    set(x, y + 3, z, 'pink_banner', { rotation: '0' });
  };
  // Techo cónico rosa con alero magenta.
  const cone = (cx, cz, R, yb, h) => {
    disc(cx, cz, R, (x, z, d) => {
      const top = yb + Math.floor(h * (1 - d / R));
      for (let y = yb; y <= top; y++) set(x, y, z, y === yb && d > R - 1.3 ? 'magenta_concrete' : 'pink_concrete');
    });
    finial(Math.floor(cx), yb + h + 1, Math.floor(cz));
  };
  // Torre redonda hueca: muro de un bloque, suelos, ventanas en arco, cornisa y techo cónico.
  const tower = (cx, cz, r, y0, y1, o = {}) => {
    const { floors = [], windows = [], dirs = 4, base, floorMat = 'cherry_planks', glass = 'light_blue_stained_glass_pane' } = o;
    disc(cx, cz, r, (x, z, d) => {
      if (base !== undefined) for (let y = base; y < y0; y++) set(x, y, z, 'quartz_bricks');
      for (let y = y0; y <= y1; y++) {
        if (d > r - 1) set(x, y, z, y === y0 || y === y1 ? 'quartz_bricks' : white());
        else set(x, y, z, y === y0 || y === y1 || floors.includes(y) ? floorMat : 'air');
      }
    });
    for (const wy of windows) for (let i = 0; i < dirs; i++) {
      const a = (i / dirs) * Math.PI * 2;
      for (let t = r - 1.4; t <= r + 0.01; t += 0.2) {
        const x = Math.floor(cx + Math.sin(a) * t);
        const z = Math.floor(cz + Math.cos(a) * t);
        const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
        if (d > r - 1 && d <= r) { set(x, wy, z, glass); set(x, wy + 1, z, glass); }
      }
    }
    disc(cx, cz, r + 0.9, (x, z, d) => { if (d > r) set(x, y1, z, 'quartz_bricks'); });
    cone(cx, cz, o.R ?? r + 1.3, y1 + 1, o.h ?? Math.round(r * 2.6));
  };

  // ---------- Terreno ----------
  fill(0, 0, 0, W - 1, 0, L - 1, 'stone');
  fill(0, 1, 0, W - 1, G - 1, L - 1, 'dirt');
  fill(0, G, 0, W - 1, G, L - 1, 'grass_block');

  // ---------- Foso ----------
  const CW = { x0: 16, x1: 78, z0: 14, z1: 77 }; // caja exterior de la muralla
  const outDist = (x, z) => Math.hypot(Math.max(CW.x0 - x, 0, x - CW.x1), Math.max(CW.z0 - z, 0, z - CW.z1));
  for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    const d = outDist(x, z);
    if (d >= 7 && d <= 11) {
      set(x, 1, z, pick(['sand', 'sand', 'clay', 'gravel']));
      for (let y = 2; y < G; y++) set(x, y, z, 'water');
      set(x, G, z, 'air');
      if (rand() < 0.05) set(x, G, z, 'lily_pad');
    } else if ((d >= 6 && d < 7) || (d > 11 && d <= 12)) set(x, G, z, pick(['stone_bricks', 'mossy_stone_bricks', 'stone_bricks']));
  }

  // ---------- Muralla ----------
  const inWall = (x, z) => x >= CW.x0 && x <= CW.x1 && z >= CW.z0 && z <= CW.z1
    && (x <= CW.x0 + 2 || x >= CW.x1 - 2 || z <= CW.z0 + 2 || z >= CW.z1 - 2);
  for (let z = CW.z0; z <= CW.z1; z++) for (let x = CW.x0; x <= CW.x1; x++) {
    if (!inWall(x, z)) continue;
    for (let y = G; y <= G + 10; y++) set(x, y, z, y <= G + 1 || y === G + 10 ? 'quartz_bricks' : white());
    const outerX = x === CW.x0 || x === CW.x1;
    const outerZ = z === CW.z0 || z === CW.z1;
    if (outerX || outerZ) {
      set(x, G + 11, z, 'quartz_bricks');
      if ((outerZ ? x : z) % 2 === 0) set(x, G + 12, z, 'quartz_bricks');
    }
  }

  // Puerta: arco de 5 de ancho con el rastrillo subido, cuerpo alto con almenas y un corazón.
  const ARCH = { 45: 6, 46: 7, 47: 8, 48: 7, 49: 6 };
  fill(45, G + 11, 75, 49, G + 13, 77, 'quartz_bricks');
  for (let x = 45; x <= 49; x++) {
    set(x, G + 14, 77, 'quartz_bricks');
    set(x, G + 14, 75, 'quartz_bricks');
    if (x % 2 === 1) { set(x, G + 15, 77, 'quartz_bricks'); set(x, G + 15, 75, 'quartz_bricks'); }
    for (let z = 75; z <= 77; z++) {
      for (let y = G + 1; y <= G + ARCH[x]; y++) set(x, y, z, 'air');
      set(x, G + ARCH[x] + 1, z, 'chiseled_quartz_block');
    }
    set(x, G + ARCH[x], 76, 'iron_bars');
  }
  heart(45, G + 13, 78);

  // Torres de las esquinas y de la puerta.
  const wallTowers = [];
  for (const [cx, cz] of [[17.5, 15.5], [77.5, 15.5], [17.5, 76.5], [77.5, 76.5]]) {
    tower(cx, cz, 5, G, G + 14, { floors: [G + 10], windows: [G + 4, G + 11], R: 6.3, h: 13 });
    wallTowers.push([cx, cz, 5]);
  }
  for (const cx of [40.5, 54.5]) {
    tower(cx, 77.5, 4, G, G + 17, { floors: [G + 10], windows: [G + 4, G + 13], R: 5.3, h: 11 });
    wallTowers.push([cx, 77.5, 4]);
  }
  // Pasos desde el adarve hacia dentro de las torres.
  for (const [cx, cz, r] of wallTowers) {
    disc(cx, cz, r, (x, z, d) => {
      if (d > r - 1 && inWall(x, z)) { set(x, G + 11, z, 'air'); set(x, G + 12, z, 'air'); }
    });
  }
  // Escaleras de subida al adarve, a los dos lados de la puerta (por dentro).
  for (let k = 1; k <= 10; k++) {
    for (const [x, facing] of [[23 + k, 'east'], [71 - k, 'west']]) {
      for (let y = G + 1; y < G + k; y++) set(x, y, 74, 'quartz_bricks');
      stairs(x, G + k, 74, 'quartz_stairs', facing);
    }
  }

  // Estandartes rosas y magenta colgando por fuera de la muralla.
  let flag = 0;
  const wallBanner = (x, z, facing) => {
    if (!isAir(x, G + 8, z)) return;
    set(x, G + 8, z, `${flag++ % 2 ? 'magenta' : 'pink'}_wall_banner`, { facing });
  };
  for (let x = 24; x <= 70; x += 6) { if (x < 36 || x > 58) wallBanner(x, CW.z1 + 1, 'south'); wallBanner(x, CW.z0 - 1, 'north'); }
  for (let z = 24; z <= 68; z += 6) { wallBanner(CW.x0 - 1, z, 'west'); wallBanner(CW.x1 + 1, z, 'east'); }

  // ---------- Palacio ----------
  const X0 = 30;
  const X1 = 64;
  const Z0 = 20;
  const Z1 = 44;
  const F1 = G + 2; // suelo del salón de baile
  const F2 = G + 11; // suelo de la planta alta
  const RB = G + 18; // techo de la planta alta / base del tejado
  const PIL = new Set([34, 38, 42, 52, 56, 60]);
  fill(X0, G, Z0, X1, F1, Z1, 'quartz_bricks');
  for (let y = F1 + 1; y <= RB; y++) for (let z = Z0; z <= Z1; z++) for (let x = X0; x <= X1; x++) {
    if (x !== X0 && x !== X1 && z !== Z0 && z !== Z1) continue;
    const facade = (z === Z0 || z === Z1) && PIL.has(x);
    set(x, y, z, facade ? 'quartz_pillar' : y === F2 || y === RB ? 'chiseled_quartz_block' : white(), facade ? { axis: 'y' } : undefined);
  }
  fill(X0 + 1, F2, Z0 + 1, X1 - 1, F2, Z1 - 1, 'smooth_quartz');
  fill(X0 + 1, RB, Z0 + 1, X1 - 1, RB, Z1 - 1, 'smooth_quartz');

  // Ventanas: azules abajo, rosas arriba.
  for (const zf of [Z0, Z1]) {
    for (const [a, b] of [[36, 37], [40, 41], [53, 54], [57, 58]]) for (const x of [a, b]) {
      for (let y = G + 4; y <= G + 7; y++) set(x, y, zf, 'light_blue_stained_glass_pane');
      for (let y = G + 13; y <= G + 15; y++) set(x, y, zf, 'pink_stained_glass_pane');
    }
  }
  for (const xf of [X0, X1]) {
    for (const [a, b] of [[27, 28], [31, 32], [35, 36]]) for (const z of [a, b]) {
      for (let y = G + 4; y <= G + 7; y++) set(xf, y, z, 'light_blue_stained_glass_pane');
      for (let y = G + 13; y <= G + 15; y++) set(xf, y, z, 'pink_stained_glass_pane');
    }
  }
  for (let x = 45; x <= 49; x++) for (let y = G + 7; y <= G + 9; y++) set(x, y, Z0, 'pink_stained_glass_pane'); // detrás del trono

  // Entrada en arco.
  const DOORWAY = { 45: 4, 46: 5, 47: 6, 48: 5, 49: 4 };
  for (let x = 45; x <= 49; x++) {
    for (let y = F1 + 1; y <= F1 + DOORWAY[x]; y++) set(x, y, Z1, 'air');
    set(x, F1 + DOORWAY[x] + 1, Z1, 'chiseled_quartz_block');
  }

  // Terraza, escalinata, pórtico con columnas y balcón encima.
  fill(40, G, 45, 54, F1 - 1, 50, 'quartz_bricks');
  fill(40, F1, 45, 54, F1, 50, 'smooth_quartz');
  for (let x = 42; x <= 52; x++) {
    set(x, G + 1, 51, 'quartz_bricks');
    stairs(x, G + 2, 51, 'quartz_stairs', 'north');
    stairs(x, G + 1, 52, 'quartz_stairs', 'north');
  }
  for (let z = 45; z <= 50; z++) { set(40, F1 + 1, z, 'diorite_wall'); set(54, F1 + 1, z, 'diorite_wall'); }
  for (const x of [41, 53]) set(x, F1 + 1, 50, 'diorite_wall');
  for (const x of [41, 44, 50, 53]) for (let y = F1 + 1; y < F2; y++) set(x, y, 49, 'quartz_pillar', { axis: 'y' });
  fill(40, F2, 45, 54, F2, 50, 'smooth_quartz');
  for (let x = 40; x <= 54; x++) set(x, F2 + 1, 50, 'diorite_wall');
  for (let z = 45; z <= 49; z++) { set(40, F2 + 1, z, 'diorite_wall'); set(54, F2 + 1, z, 'diorite_wall'); }
  for (const x of [40, 54]) set(x, F2 + 2, 50, 'potted_pink_tulip');
  hang(47, F2 - 1, 47);
  door(47, F2 + 1, Z1, 'south');
  for (const x of [46, 48]) for (let y = F2 + 1; y <= F2 + 3; y++) set(x, y, Z1, 'pink_stained_glass_pane');
  set(47, F2 + 3, Z1, 'pink_stained_glass_pane');

  // Tejado rosa a dos aguas con un hastial delantero (el del rosetón). El desván queda hueco.
  for (let x = X0; x <= X1; x++) for (let z = Z0 - 1; z <= Z1 + 1; z++) {
    let top = RB + Math.min(z - (Z0 - 1), Z1 + 1 - z);
    if (x >= 39 && x <= 55 && z >= 32) top = Math.max(top, RB + 1 + Math.min(x - 40, 54 - x));
    const wallCol = z >= Z0 && z <= Z1 && (x === X0 || x === X1 || z === Z0 || z === Z1);
    if (wallCol) for (let y = RB + 1; y < top; y++) set(x, y, z, white());
    set(x, top, z, 'pink_concrete');
  }
  // Rosetón.
  for (let y = RB + 1; y <= RB + 8; y++) for (let x = 43; x <= 52; x++) {
    const d = Math.hypot(x + 0.5 - 47.5, y + 0.5 - (RB + 4.5));
    if (d <= 0.8) set(x, y, Z1, 'yellow_stained_glass');
    else if (d <= 1.8) set(x, y, Z1, 'pink_stained_glass');
    else if (d <= 2.6) set(x, y, Z1, 'light_blue_stained_glass');
    else if (d <= 3.3 && get(x, y, Z1) !== 'pink_concrete') set(x, y, Z1, 'chiseled_quartz_block');
  }

  // Torres de las esquinas del palacio; sus salas se abren al salón como miradores.
  for (const [cx, cz] of [[30.5, 20.5], [64.5, 20.5], [30.5, 44.5], [64.5, 44.5]]) {
    tower(cx, cz, 4.5, F1, G + 26, { base: G, floors: [F2, RB], windows: [G + 5, G + 14, G + 21], floorMat: 'smooth_quartz', R: 5.8, h: 15 });
  }
  for (const [y0, y1] of [[F1 + 1, F2 - 1], [F2 + 1, RB - 1]]) fill(X0 + 1, y0, Z0 + 1, X1 - 1, y1, Z1 - 1, 'air');

  // Torre principal con balcón circular y torrecillas sobre el tejado.
  const TC = [47.5, 30.5];
  const TOP_FLOOR = G + 34;
  tower(TC[0], TC[1], 6, RB, G + 44, { floors: [TOP_FLOOR], windows: [G + 22, G + 27, G + 37, G + 40], dirs: 8, floorMat: 'smooth_quartz', R: 7.4, h: 24 });
  disc(TC[0], TC[1], 8, (x, z, d) => {
    if (d <= 6) return;
    set(x, TOP_FLOOR, z, 'smooth_quartz');
    if (d <= 7) set(x, TOP_FLOOR - 1, z, 'quartz_bricks');
    if (d > 7) set(x, TOP_FLOOR + 1, z, 'diorite_wall');
  });
  door(47, TOP_FLOOR + 1, 36, 'south');
  for (const cx of [36.5, 58.5]) tower(cx, 32.5, 3, RB, G + 37, { windows: [G + 32], R: 4.2, h: 11 });

  // ---------- Salón de baile ----------
  for (let z = Z0 + 1; z < Z1; z++) for (let x = X0 + 1; x < X1; x++) {
    set(x, F1, z, ((x >> 1) + (z >> 1)) & 1 ? 'pink_glazed_terracotta' : 'smooth_quartz');
  }
  // Alfombra hasta el trono.
  for (let z = 26; z < Z1; z++) for (let x = 45; x <= 49; x++) set(x, F1 + 1, z, x === 45 || x === 49 ? 'magenta_carpet' : 'pink_carpet');
  // Estrado y trono.
  fill(42, F1 + 1, 21, 52, F1 + 1, 24, 'smooth_quartz');
  for (let x = 42; x <= 52; x++) stairs(x, F1 + 1, 25, 'quartz_stairs', 'north');
  fill(43, F1 + 2, 21, 51, F1 + 2, 24, 'pink_carpet');
  stairs(47, F1 + 2, 22, 'quartz_stairs', 'north');
  for (const x of [46, 48]) { set(x, F1 + 2, 22, 'gold_block'); set(x, F1 + 2, 21, 'pink_wool'); set(x, F1 + 3, 21, 'pink_wool'); }
  for (let y = F1 + 2; y <= F1 + 4; y++) set(47, y, 21, 'pink_wool');
  set(47, F1 + 5, 21, 'gold_block');
  for (const x of [46, 48]) set(x, F1 + 4, 21, 'gold_block');
  for (const x of [43, 51]) set(x, F1 + 4, 21, 'pink_wall_banner', { facing: 'south' });
  // Columnas.
  for (const x of [41, 53]) for (const z of [28, 33, 38]) {
    set(x, F1 + 1, z, 'chiseled_quartz_block');
    for (let y = F1 + 2; y < F2 - 1; y++) set(x, y, z, 'quartz_pillar', { axis: 'y' });
    set(x, F2 - 1, z, 'gold_block');
  }
  // Lámparas de oro.
  for (const z of [29, 35, 41]) {
    set(47, F2 - 1, z, 'chain', { axis: 'y' });
    set(47, F2 - 2, z, 'chain', { axis: 'y' });
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) set(47 + dx, F2 - 3, z + dz, 'gold_block');
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) set(47 + dx, F2 - 2, z + dz, 'lantern', { hanging: 'false' });
    hang(47, F2 - 4, z);
  }
  // Mesas del banquete a los lados.
  for (const [tx, chairs] of [[34, [[33, 'west'], [35, 'east']]], [60, [[61, 'east'], [59, 'west']]]]) {
    for (let z = 25; z <= 33; z++) {
      set(tx, F1 + 1, z, 'cherry_fence');
      set(tx, F1 + 2, z, z === 27 || z === 31 ? 'cake' : 'white_carpet');
      if (z > 25 && z < 33 && z % 2 === 0) for (const [cx, f] of chairs) stairs(cx, F1 + 1, z, 'cherry_stairs', f);
    }
  }
  // Escaleras dobles a la planta alta.
  for (const [xs, rail] of [[[38, 39], 40], [[55, 56], 54]]) {
    for (let k = 1; k <= 9; k++) {
      const z = Z1 - 1 - k;
      const y = F1 + k;
      for (const x of xs) {
        for (let yy = F1 + 1; yy < y; yy++) set(x, yy, z, 'quartz_bricks');
        stairs(x, y, z, 'quartz_stairs', 'north');
      }
      if (k < 9) set(rail, y + 1, z, 'diorite_wall');
    }
    for (const x of xs) for (let z = 35; z <= 38; z++) set(x, F2, z, 'air');
    for (let z = 35; z <= 38; z++) set(rail, F2 + 1, z, 'diorite_wall');
    for (const x of xs) set(x, F2 + 1, 39, 'diorite_wall');
  }

  // ---------- Planta alta ----------
  for (const [x, facing] of [[37, 'east'], [57, 'west']]) {
    for (let y = F2 + 1; y < RB; y++) for (let z = Z0 + 1; z < Z1; z++) set(x, y, z, white());
    door(x, F2 + 1, 32, facing);
  }
  // Salón de té con alfombra, mesa con tarta y la escalera de mano de la torre.
  for (let z = 26; z <= 41; z++) for (let x = 42; x <= 52; x++) {
    if (isAir(x, F2 + 1, z)) set(x, F2 + 1, z, x === 42 || x === 52 || z === 26 || z === 41 ? 'magenta_carpet' : 'pink_carpet');
  }
  set(47, F2 + 1, 33, 'cherry_fence');
  set(47, F2 + 2, 33, 'cake');
  for (const [x, z, f] of [[46, 33, 'west'], [48, 33, 'east'], [47, 32, 'north'], [47, 34, 'south']]) stairs(x, F2 + 1, z, 'cherry_stairs', f);
  hang(47, RB - 1, 37);
  for (let y = F2 + 1; y < RB; y++) set(47, y, 24, 'quartz_pillar', { axis: 'y' });
  for (let y = F2 + 1; y <= TOP_FLOOR + 1; y++) set(47, y, 25, 'ladder', { facing: 'south', waterlogged: 'false' });
  for (const x of [43, 51]) { set(x, F2 + 1, 21, 'note_block'); set(x, F2 + 2, 21, 'potted_allium'); }
  set(47, F2 + 1, 21, 'jukebox');
  // Dormitorio de la princesa (ala oeste).
  for (let z = Z0 + 1; z < Z1; z++) for (let x = X0 + 1; x < 37; x++) if (isAir(x, F2 + 1, z)) set(x, F2 + 1, z, 'pink_carpet');
  for (const x of [32, 33]) {
    set(x, F2 + 1, 27, 'pink_bed', { part: 'head', facing: 'north', occupied: 'false' });
    set(x, F2 + 1, 28, 'pink_bed', { part: 'foot', facing: 'north', occupied: 'false' });
  }
  for (const [x, z] of [[31, 26], [34, 26], [31, 29], [34, 29]]) for (let y = F2 + 1; y <= F2 + 3; y++) set(x, y, z, 'cherry_fence');
  fill(31, F2 + 4, 26, 34, F2 + 4, 29, 'pink_wool');
  set(32, F2 + 5, 27, 'gold_block');
  set(33, F2 + 5, 27, 'gold_block');
  set(36, F2 + 1, 30, 'smooth_quartz_slab', { type: 'top', waterlogged: 'false' });
  set(36, F2 + 2, 30, 'potted_pink_tulip');
  set(35, F2 + 1, 30, 'cherry_slab', { type: 'bottom', waterlogged: 'false' });
  for (const z of [35, 36]) for (const y of [F2 + 1, F2 + 2]) set(36, y, z, 'pink_shulker_box', { facing: 'up' });
  for (const z of [37, 38]) for (const y of [F2 + 1, F2 + 2]) set(31, y, z, 'bookshelf');
  set(31, F2 + 1, 32, 'chest', { facing: 'east', type: 'single', waterlogged: 'false' });
  hang(33, RB - 1, 33);
  // Biblioteca (ala este).
  for (let z = Z0 + 1; z < Z1; z++) for (let x = 58; x < X1; x++) if (isAir(x, F2 + 1, z)) set(x, F2 + 1, z, 'light_blue_carpet');
  for (let z = 25; z <= 39; z++) {
    if (z === 27 || z === 28 || z === 31 || z === 32 || z === 35 || z === 36) continue; // ventanas
    for (let y = F2 + 1; y <= F2 + 3; y++) set(63, y, z, 'bookshelf');
  }
  set(60, F2 + 1, 32, 'lectern', { facing: 'west', has_book: 'true', powered: 'false' });
  stairs(60, F2 + 1, 29, 'cherry_stairs', 'north');
  stairs(60, F2 + 1, 35, 'cherry_stairs', 'south');
  set(59, F2 + 1, 24, 'potted_pink_tulip');
  hang(60, RB - 1, 32);

  // Habitación de la torre: alfombra redonda, lámpara, bancos junto a las ventanas y un cofre.
  disc(TC[0], TC[1], 5, (x, z, d) => {
    if (isAir(x, TOP_FLOOR + 1, z)) set(x, TOP_FLOOR + 1, z, d < 2 ? 'magenta_carpet' : 'pink_carpet');
  });
  hang(47, G + 42, 30, 1);
  set(43, TOP_FLOOR + 1, 30, 'chest', { facing: 'east', type: 'single', waterlogged: 'false' });
  stairs(51, TOP_FLOOR + 1, 30, 'cherry_stairs', 'east');

  // ---------- Patio ----------
  const pathMask = new Uint8Array(W * L);
  const pave = (x, z) => {
    if (x < 19 || x > 75 || z < 17 || z > 77) return;
    set(x, G, z, pick(['calcite', 'calcite', 'polished_diorite', 'smooth_quartz']));
    pathMask[z * W + x] = 1;
  };
  const FC = [47.5, 63.5]; // fuente
  for (let z = 53; z <= 77; z++) for (let x = 45; x <= 49; x++) pave(x, z);
  for (let z = 53; z <= 55; z++) for (let x = 38; x <= 56; x++) pave(x, z);
  for (let z = 62; z <= 64; z++) for (let x = 19; x <= 75; x++) pave(x, z);
  disc(FC[0], FC[1], 6.5, (x, z) => pave(x, z));

  // Fuente del corazón.
  disc(FC[0], FC[1], 4.4, (x, z, d) => {
    set(x, G - 1, z, 'smooth_quartz');
    if (d > 3.3) { set(x, G, z, 'smooth_quartz'); set(x, G + 1, z, 'smooth_quartz'); } else set(x, G, z, 'water');
  });
  disc(FC[0], FC[1], 2.5, (x, z, d) => {
    if (d <= 1.5) for (let y = G; y <= G + 2; y++) set(x, y, z, 'quartz_pillar', { axis: 'y' });
    set(x, G + 3, z, 'smooth_quartz');
    set(x, G + 4, z, d > 1.5 ? 'smooth_quartz' : 'water');
  });
  for (let y = G + 4; y <= G + 6; y++) set(47, y, 63, 'quartz_pillar', { axis: 'y' });
  heart(45, G + 10, 63);

  // Macizos de flores con seto de azalea florida.
  const bed = (x0, z0, x1, z1) => {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      if (pathMask[z * W + x] || !isAir(x, G + 1, z) || get(x, G, z) !== 'grass_block') continue;
      const edge = x === x0 || x === x1 || z === z0 || z === z1;
      if (edge) { set(x, G + 1, z, ...leaves('flowering_azalea_leaves')); continue; }
      const r = rand();
      if (r < 0.07) flower2(x, G + 1, z, pick(['peony', 'rose_bush', 'lilac']));
      else set(x, G + 1, z, ['pink_tulip', 'allium', 'white_tulip', 'pink_tulip', 'azure_bluet'][(z - z0) % 5]);
    }
  };
  bed(21, 67, 42, 72);
  bed(52, 67, 73, 72);
  bed(21, 54, 27, 60);
  bed(67, 54, 73, 60);

  // Carroza de calabaza con ruedas de oro.
  const CC = [33.5, G + 4.5, 57.5];
  for (let y = G + 2; y <= G + 7; y++) for (let z = 54; z <= 61; z++) for (let x = 30; x <= 37; x++) {
    const d = Math.hypot((x + 0.5 - CC[0]) / 2.5, (y + 0.5 - CC[1]) / 2.4, (z + 0.5 - CC[2]) / 3.2);
    if (d <= 1) set(x, y, z, d > 0.62 ? 'pumpkin' : 'air');
  }
  for (const x of [31, 35]) for (const y of [G + 4, G + 5]) for (const z of [57, 58]) set(x, y, z, 'glass_pane');
  set(33, G + 7, 57, 'gold_block');
  set(33, G + 8, 57, 'gold_block');
  set(33, G + 7, 58, 'lime_concrete');
  for (const x of [30, 36]) for (const zc of [55, 60]) {
    for (let y = G + 1; y <= G + 3; y++) for (let z = zc - 1; z <= zc + 1; z++) if (y !== G + 2 || z !== zc) set(x, y, z, 'gold_block');
  }

  // Cenador blanco con techo rosa.
  const GZ = [61.5, 57.5];
  disc(GZ[0], GZ[1], 3.5, (x, z) => set(x, G, z, 'smooth_quartz'));
  for (const [x, z] of [[59, 55], [64, 55], [59, 60], [64, 60]]) for (let y = G + 1; y <= G + 4; y++) set(x, y, z, 'quartz_pillar', { axis: 'y' });
  cone(GZ[0], GZ[1], 4.3, G + 5, 6);
  hang(61, G + 4, 57);
  stairs(60, G + 1, 57, 'cherry_stairs', 'west');
  stairs(63, G + 1, 57, 'cherry_stairs', 'east');

  // Cerezos.
  const cherry = (x0, z0, size) => {
    const top = G + 3 + size;
    for (let y = G + 1; y <= top; y++) set(x0, y, z0, 'cherry_log', { axis: 'y' });
    const blobs = [[x0, top + 1.5, z0, 2 + size * 0.45]];
    for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      if (rand() < 0.3) continue;
      let x = x0;
      let z = z0;
      let y = top - 1;
      const len = 1 + Math.floor(size / 2);
      for (let i = 0; i < len; i++) { x += dx; z += dz; if (i) y++; set(x, y, z, 'cherry_wood', { axis: 'y' }); }
      blobs.push([x, y + 1, z, 1.6 + size * 0.35]);
    }
    for (const [bx, by, bz, br] of blobs) {
      for (let y = Math.floor(by - br); y <= by + br; y++) for (let z = Math.floor(bz - br); z <= bz + br; z++) for (let x = Math.floor(bx - br); x <= bx + br; x++) {
        const d = Math.hypot(x - bx, (y - by) * 1.5, z - bz);
        if (d > br || (d > br - 0.8 && rand() < 0.3) || !isAir(x, y, z)) continue;
        set(x, y, z, ...leaves('cherry_leaves'));
        if (y < by - 0.5 && rand() < 0.15 && isAir(x, y - 1, z)) set(x, y - 1, z, ...leaves('cherry_leaves'));
      }
    }
    for (let i = 0; i < 10 + size * 4; i++) {
      const x = x0 + Math.round((rand() - 0.5) * (4 + size * 2));
      const z = z0 + Math.round((rand() - 0.5) * (4 + size * 2));
      if (get(x, G, z) === 'grass_block' && isAir(x, G + 1, z)) {
        set(x, G + 1, z, 'pink_petals', { flower_amount: String(1 + Math.floor(rand() * 4)), facing: pick(['north', 'east', 'south', 'west']) });
      }
    }
  };
  for (const [x, z, size] of [[23, 29, 2], [24, 39, 3], [71, 29, 2], [70, 39, 3], [24, 47, 2], [70, 47, 2]]) cherry(x, z, size);
  for (const [x, z, size] of [[5, 93, 3], [20, 95, 2], [33, 93, 2], [61, 93, 2], [74, 95, 2], [89, 93, 3], [2, 40, 2], [92, 55, 2]]) cherry(x, z, size);
  for (const [x, z] of [[44, 57], [50, 57], [44, 72], [50, 72]]) lamp(x, z);

  // ---------- Puente y camino de llegada ----------
  for (let z = 78; z < L; z++) for (let x = 45; x <= 49; x++) {
    if (z >= 82 && z <= 90) set(x, G, z, 'cherry_planks');
    else set(x, G, z, pick(['calcite', 'calcite', 'polished_diorite', 'dirt_path']));
    for (let y = G + 1; y <= G + 3; y++) if (get(x, y, z).includes('petals') || get(x, y, z).includes('leaves')) set(x, y, z, 'air');
  }
  for (let z = 82; z <= 90; z++) for (const x of [44, 50]) { set(x, G, z, 'cherry_planks'); set(x, G + 1, z, 'cherry_fence'); }
  for (const z of [82, 90]) for (const x of [44, 50]) set(x, G + 2, z, 'lantern', { hanging: 'false' });
  for (const z of [80, 94, 98]) for (const x of [44, 50]) lamp(x, z);

  // Flores silvestres por el prado.
  for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    if (get(x, G, z) !== 'grass_block' || !isAir(x, G + 1, z)) continue;
    const out = outDist(x, z) > 0;
    const r = rand();
    if (r < (out ? 0.05 : 0.015)) set(x, G + 1, z, pick(['pink_tulip', 'allium', 'azure_bluet', 'oxeye_daisy', 'cornflower', 'white_tulip']));
    else if (out && r < 0.07) flower2(x, G + 1, z, pick(['lilac', 'peony', 'rose_bush']));
    else if (r < 0.12) set(x, G + 1, z, 'short_grass');
  }

  finalizeConnections(s);
  return s;
}
