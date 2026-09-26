// Mansión de campo para survival (80×72), con personalidad y todo funcional:
// - Casa asimétrica: planta baja de piedra con musgo y enredaderas, planta alta de entramado
//   volada sobre la fachada, tejado empinado con buhardillas, chimenea y jardineras.
// - Torre redonda con tejado cónico: taller abajo, sala de mapas en medio y sala de
//   encantamientos arriba (22 librerías, nivel 30), comunicadas por escaleras de mano.
// - Invernadero de cristal con cultivos (trigo, zanahoria, patata, remolacha) siempre regados.
// - Establo rojo de tejado quebrado con cuadras para vacas, ovejas, cerdos y gallinas.
// - Molino de viento con campo de trigo, huerto de frutales con colmenas y pozo, estanque con
//   caña de azúcar (agua infinita), portal del Nether en ruinas y seto alrededor.

import { Schematic } from './schematic.js';
import { rng, finalizeConnections } from './lobby.js';
import { signNbt } from './schem-writer.js';

export const MANSION_GROUND = 2;

export function buildMansion() {
  const W = 80;
  const L = 72;
  const H = 42;
  const G = MANSION_GROUND;
  const s = new Schematic(W, H, L);
  s.format = 'Ejemplo integrado';
  s.meta = { name: 'Mansión de campo', author: 'Visor de Schematics', dataVersion: 3465, spawn: [35.5, G + 1, L - 3.5, 0] };
  const rand = rng(4242);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const inside = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < W && y < H && z < L;
  const set = (x, y, z, name, props) => { if (inside(x, y, z)) s.set(x, y, z, name, props); };
  const get = (x, y, z) => (inside(x, y, z) ? s.palette[s.get(x, y, z)].name.slice(10) : 'out');
  const isAir = (x, y, z) => get(x, y, z) === 'air';
  const fill = (x0, y0, z0, x1, y1, z1, name, props) => {
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) set(x, y, z, name, props);
  };
  const signText = (x, y, z, lines) => s.blockEntities.push({
    id: 'minecraft:sign', pos: [x, y, z], nbt: signNbt(lines.map((t, i) => (i === 1 ? { text: t, bold: true } : t))),
  });
  const wallSign = (x, y, z, facing, lines, wood = 'spruce') => {
    set(x, y, z, `${wood}_wall_sign`, { facing, waterlogged: 'false' });
    signText(x, y, z, lines);
  };
  const lampPost = (x, z) => { set(x, G + 1, z, 'spruce_fence'); set(x, G + 2, z, 'spruce_fence'); set(x, G + 3, z, 'lantern'); };
  const hang = (x, y, z, chain = 0) => {
    for (let i = 1; i <= chain; i++) set(x, y + i, z, 'chain', { axis: 'y' });
    set(x, y, z, 'lantern', { hanging: 'true' });
  };
  const door = (x, y, z, wood, facing, hinge = 'left') => {
    set(x, y, z, `${wood}_door`, { facing, half: 'lower', hinge, open: 'false', powered: 'false' });
    set(x, y + 1, z, `${wood}_door`, { facing, half: 'upper', hinge, open: 'false', powered: 'false' });
  };
  // Cofre doble en (x, z)+(x+1, z) mirando al norte/sur, o en (x, z)+(x, z+1) mirando al este/oeste.
  const doubleChest = (x, y, z, facing) => {
    if (facing === 'south' || facing === 'north') {
      const west = facing === 'south' ? 'right' : 'left';
      set(x, y, z, 'chest', { facing, type: west, waterlogged: 'false' });
      set(x + 1, y, z, 'chest', { facing, type: west === 'right' ? 'left' : 'right', waterlogged: 'false' });
    } else {
      const north = facing === 'east' ? 'left' : 'right';
      set(x, y, z, 'chest', { facing, type: north, waterlogged: 'false' });
      set(x, y, z + 1, 'chest', { facing, type: north === 'right' ? 'left' : 'right', waterlogged: 'false' });
    }
  };
  const bed = (x, y, zHead, color) => {
    set(x, y, zHead, `${color}_bed`, { part: 'head', facing: 'north', occupied: 'false' });
    set(x, y, zHead + 1, `${color}_bed`, { part: 'foot', facing: 'north', occupied: 'false' });
  };
  const path = (x0, z0, x1, z1, w = 1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0));
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / n);
      const z = Math.round(z0 + ((z1 - z0) * i) / n);
      for (let dz = -w; dz <= w; dz++) for (let dx = -w; dx <= w; dx++) {
        if (get(x + dx, G, z + dz) === 'grass_block') set(x + dx, G, z + dz, rand() < 0.8 ? 'dirt_path' : 'coarse_dirt');
      }
    }
  };
  const stone = () => pick(['stone_bricks', 'stone_bricks', 'cobblestone', 'mossy_stone_bricks', 'mossy_cobblestone', 'cracked_stone_bricks']);

  // ---------- Terreno ----------
  fill(0, 0, 0, W - 1, 0, L - 1, 'stone');
  fill(0, 1, 0, W - 1, 1, L - 1, 'dirt');
  for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) set(x, G, z, rand() < 0.06 ? 'moss_block' : 'grass_block');

  // ---------- Seto perimetral con portón de piedra ----------
  const GATE = [34, 37];
  for (let x = 0; x < W; x++) for (let z = 0; z < L; z++) {
    if (x !== 0 && x !== W - 1 && z !== 0 && z !== L - 1) continue;
    if (z === L - 1 && x >= GATE[0] && x <= GATE[1]) {
      set(x, G + 1, z, 'spruce_fence_gate', { facing: 'south', open: 'false', in_wall: 'false' });
      continue;
    }
    for (let y = G + 1; y <= G + 2; y++) set(x, y, z, rand() < 0.12 ? 'flowering_azalea_leaves' : 'azalea_leaves', { persistent: 'true' });
  }
  for (const x of [GATE[0] - 1, GATE[1] + 1]) {
    fill(x, G + 1, L - 1, x, G + 3, L - 1, 'stone_bricks');
    set(x, G + 4, L - 1, 'chiseled_stone_bricks');
    set(x, G + 5, L - 1, 'lantern');
  }

  // ---------- Casa principal ----------
  const X0 = 24, X1 = 47, Z0 = 14, Z1 = 29;
  const F2 = G + 6;
  const TOP = G + 12;
  const JZ = Z1 + 1; // la planta alta vuela un bloque sobre la fachada
  // Suelos y techos.
  for (let z = Z0; z <= JZ; z++) for (let x = X0; x <= X1; x++) {
    if (z <= Z1) { set(x, G - 1, z, 'stone_bricks'); set(x, G, z, x >= 31 && x <= 40 ? ((x + z) % 2 ? 'polished_andesite' : 'polished_diorite') : 'spruce_planks'); }
    set(x, F2, z, z === JZ ? 'dark_oak_planks' : 'spruce_planks');
    set(x, TOP, z, 'spruce_planks');
  }
  // Planta baja de piedra (con ventanas de 2 de ancho y 3 de alto).
  const lowWin = (a) => a % 5 === 2 || a % 5 === 3;
  for (let z = Z0; z <= Z1; z++) for (let x = X0; x <= X1; x++) {
    const ew = x === X0 || x === X1;
    const ns = z === Z0 || z === Z1;
    if (!ew && !ns) continue;
    const corner = ew && ns;
    for (let y = G; y < F2; y++) {
      const win = !corner && y >= G + 2 && y <= G + 4 && (ns ? lowWin(x - X0) : lowWin(z - Z0));
      set(x, y, z, win ? 'glass_pane' : corner ? 'stone_bricks' : stone());
    }
  }
  // Ménsulas bajo la planta volada.
  for (let x = X0; x <= X1; x++) set(x, F2 - 1, JZ, 'spruce_stairs', { facing: 'north', half: 'top' });
  // Planta alta de entramado: postes, vigas y paneles de yeso con ventanas.
  for (let z = Z0; z <= JZ; z++) for (let x = X0; x <= X1; x++) {
    const ew = x === X0 || x === X1;
    const ns = z === Z0 || z === JZ;
    if (!ew && !ns) continue;
    const post = (ns && (x - X0) % 4 === 0) || (ew && (z - Z0) % 4 === 0) || (ew && ns);
    for (let y = F2 + 1; y < TOP; y++) {
      let m;
      if (post) m = 'dark_oak_log';
      else if (y === F2 + 1) m = 'dark_oak_planks';
      else if (y >= F2 + 2 && y <= F2 + 4 && ((ns && (x - X0) % 4 === 2) || (ew && (z - Z0) % 4 === 2))) m = 'glass_pane';
      else m = 'white_terracotta';
      set(x, y, z, m, m === 'dark_oak_log' ? { axis: 'y' } : undefined);
    }
  }
  // Tabiques interiores con puertas.
  const partition = (x0, z0, x1, z1) => {
    fill(x0, G + 1, z0, x1, F2 - 1, z1, 'spruce_planks');
    fill(x0, F2 + 1, z0, x1, TOP - 1, z1, 'spruce_planks');
  };
  partition(30, Z0 + 1, 30, Z1 - 1);
  partition(41, Z0 + 1, 41, Z1 - 1);
  fill(30, F2 + 1, Z1, 30, TOP - 1, JZ - 1, 'spruce_planks');
  fill(41, F2 + 1, Z1, 41, TOP - 1, JZ - 1, 'spruce_planks');
  partition(X0 + 1, 21, 29, 21);
  partition(42, 21, X1 - 1, 21);
  for (const y of [G + 1, F2 + 1]) {
    door(30, y, 18, 'spruce', 'west');
    door(30, y, 25, 'spruce', 'west');
    door(41, y, 18, 'spruce', 'east');
    door(41, y, 25, 'spruce', 'east');
  }
  // Entrada y balcón.
  door(35, G + 1, Z1, 'dark_oak', 'north', 'left');
  door(36, G + 1, Z1, 'dark_oak', 'north', 'right');
  door(35, F2 + 1, JZ, 'dark_oak', 'north', 'left');
  door(36, F2 + 1, JZ, 'dark_oak', 'north', 'right');
  // Escalera principal (sube hacia el norte) con hueco y barandilla.
  for (let i = 0; i <= 5; i++) {
    for (const x of [35, 36]) {
      set(x, G + 1 + i, 24 - i, 'spruce_stairs', { facing: 'north', half: 'bottom' });
      for (let y = G + 1; y < G + 1 + i; y++) set(x, y, 24 - i, 'spruce_planks');
    }
  }
  for (let z = 20; z <= 24; z++) for (const x of [35, 36]) set(x, F2, z, 'air');
  for (let z = 20; z <= 25; z++) { set(34, F2 + 1, z, 'spruce_fence'); set(37, F2 + 1, z, 'spruce_fence'); }
  set(35, F2 + 1, 25, 'spruce_fence');
  set(36, F2 + 1, 25, 'spruce_fence');

  // Tejado empinado a dos aguas con hastiales de entramado.
  const RZ0 = Z0 - 1;
  const RZ1 = JZ + 1;
  const half = Math.floor((RZ1 - RZ0) / 2);
  for (let k = 0; k <= half; k++) {
    const y = TOP + k;
    for (let x = X0 - 1; x <= X1 + 1; x++) {
      set(x, y, RZ0 + k, 'deepslate_tile_stairs', { facing: 'south', half: 'bottom' });
      set(x, y, RZ1 - k, 'deepslate_tile_stairs', { facing: 'north', half: 'bottom' });
      if (k > 0) { set(x, y - 1, RZ0 + k, 'deepslate_tiles'); set(x, y - 1, RZ1 - k, 'deepslate_tiles'); }
    }
    for (let z = RZ0 + k + 1; z < RZ1 - k; z++) for (const x of [X0, X1]) set(x, y, z, (z - RZ0) % 3 === 0 ? 'dark_oak_log' : 'white_terracotta', (z - RZ0) % 3 === 0 ? { axis: 'y' } : undefined);
  }
  const ridge = TOP + half;
  for (let x = X0 - 1; x <= X1 + 1; x++) for (let z = RZ0 + half; z <= RZ1 - half; z++) set(x, ridge + 1, z, 'deepslate_tile_slab', { type: 'bottom' });
  for (const x of [X0, X1]) { set(x, TOP + 3, 21, 'glass_pane'); set(x, TOP + 3, 22, 'glass_pane'); }
  // Buhardillas en la vertiente sur.
  for (const cx of [28, 39]) {
    const fz = RZ1 - 3;
    for (let x = cx - 1; x <= cx + 1; x++) for (let z = fz - 3; z <= fz; z++) for (let y = TOP + 1; y <= TOP + 3; y++) {
      const shell = x !== cx || z === fz;
      set(x, y, z, shell ? (x === cx && z === fz && y === TOP + 2 ? 'glass_pane' : 'white_terracotta') : 'air');
    }
    for (let z = fz - 3; z <= fz + 1; z++) {
      set(cx - 2, TOP + 3, z, 'deepslate_tile_stairs', { facing: 'east', half: 'bottom' });
      set(cx + 2, TOP + 3, z, 'deepslate_tile_stairs', { facing: 'west', half: 'bottom' });
      set(cx - 1, TOP + 4, z, 'deepslate_tile_stairs', { facing: 'east', half: 'bottom' });
      set(cx + 1, TOP + 4, z, 'deepslate_tile_stairs', { facing: 'west', half: 'bottom' });
      set(cx, TOP + 5, z, 'deepslate_tile_slab', { type: 'bottom' });
      set(cx, TOP + 4, z, z <= fz ? 'white_terracotta' : 'deepslate_tiles');
    }
  }
  // Chimenea de piedra en la fachada norte, con hogar en la cocina.
  for (let y = G; y <= ridge + 3; y++) for (const [x, z] of [[27, 12], [28, 12], [27, 13], [28, 13]]) set(x, y, z, y > ridge ? 'stone_bricks' : stone());
  set(27, ridge + 4, 12, 'campfire', { lit: 'true', signal_fire: 'false', facing: 'south' });
  fill(26, G + 1, Z0 + 1, 29, G + 3, Z0 + 1, 'stone_bricks');
  set(27, G + 1, Z0 + 1, 'campfire', { lit: 'true', signal_fire: 'false', facing: 'south' });
  set(28, G + 1, Z0 + 1, 'campfire', { lit: 'true', signal_fire: 'false', facing: 'south' });
  set(27, G + 2, Z0 + 1, 'air');
  set(28, G + 2, Z0 + 1, 'air');
  // Porche con columnas y balcón encima.
  for (let z = JZ + 1; z <= JZ + 4; z++) for (let x = 31; x <= 40; x++) {
    set(x, G, z, 'polished_andesite');
    set(x, F2, z, 'dark_oak_planks');
    if (x === 31 || x === 40 || z === JZ + 4) set(x, F2 + 1, z, 'dark_oak_fence');
  }
  for (const [x, z] of [[31, JZ + 4], [40, JZ + 4], [31, JZ + 1], [40, JZ + 1]]) fill(x, G + 1, z, x, F2 - 1, z, 'stripped_dark_oak_log', { axis: 'y' });
  hang(33, F2 - 1, JZ + 3);
  hang(38, F2 - 1, JZ + 3);
  // Enredaderas en la piedra y jardineras bajo las ventanas de arriba.
  for (let x = X0; x <= X1; x++) for (let y = G + 1; y < F2 - 1; y++) {
    if (rand() < 0.22 && isAir(x, y, Z0 - 1)) set(x, y, Z0 - 1, 'vine', { south: 'true', north: 'false', east: 'false', west: 'false', up: 'false' });
  }
  for (let z = Z0; z <= Z1; z++) for (let y = G + 1; y < F2 - 1; y++) {
    if (rand() < 0.2 && isAir(X0 - 1, y, z)) set(X0 - 1, y, z, 'vine', { east: 'true', north: 'false', south: 'false', west: 'false', up: 'false' });
  }
  for (let x = X0; x <= X1; x++) {
    if ((x - X0) % 4 === 2 && (x < 31 || x > 40)) { set(x, F2 + 1, JZ + 1, 'moss_block'); set(x, F2 + 2, JZ + 1, 'flowering_azalea'); }
  }

  // ---------- Torre redonda (esquina sureste) ----------
  const T = { x: 49, z: 30 };
  const TR = 4.6;
  const TTOP = TOP + 6;
  const tdist = (x, z) => Math.hypot(x - T.x, z - T.z);
  for (let z = T.z - 5; z <= T.z + 5; z++) for (let x = T.x - 5; x <= T.x + 5; x++) {
    const d = tdist(x, z);
    if (d > TR) continue;
    const wall = d > TR - 1.05;
    for (let y = G - 1; y <= TTOP; y++) {
      if (wall) {
        const a = Math.atan2(z - T.z, x - T.x);
        const slit = [0, Math.PI / 2, Math.PI, -Math.PI / 2].some((q) => Math.abs(Math.atan2(Math.sin(a - q), Math.cos(a - q))) < 0.2);
        const winY = [G + 3, F2 + 3, TOP + 3].includes(y) || [G + 2, F2 + 2, TOP + 2].includes(y);
        set(x, y, z, slit && winY && y > G ? 'glass_pane' : y === TTOP ? 'chiseled_stone_bricks' : stone());
      } else if (y === G || y === F2 || y === TOP) set(x, y, z, y === G ? 'polished_andesite' : 'spruce_planks');
      else if (y > G) set(x, y, z, 'air');
    }
  }
  // Tejado cónico con remate.
  for (let k = 0; k <= 12; k++) {
    const r = TR + 0.6 - k * 0.42;
    for (let z = T.z - 6; z <= T.z + 6; z++) for (let x = T.x - 6; x <= T.x + 6; x++) {
      const d = tdist(x, z);
      if (d <= r && d > r - 1.2) set(x, TTOP + 1 + k, z, 'deepslate_tiles');
    }
  }
  set(T.x, TTOP + 14, T.z, 'lightning_rod', { facing: 'up', powered: 'false' });
  // Paso abierto entre el taller y la torre, en las dos plantas de abajo.
  for (const y0 of [G + 1, F2 + 1]) for (let y = y0; y <= y0 + 2; y++) for (const [x, z] of [[46, 27], [46, 28], [47, 27], [47, 28]]) if (tdist(x, z) <= TR) set(x, y, z, 'air');
  // Escaleras de mano junto a la pared norte de la torre, con huecos en los suelos.
  for (let y = G + 1; y <= TOP; y++) set(T.x, y, T.z - 3, 'ladder', { facing: 'south', waterlogged: 'false' });
  set(T.x, TOP + 1, T.z - 3, 'ladder', { facing: 'south', waterlogged: 'false' });
  // Sala de encantamientos (arriba): mesa y 22 librerías a 2 bloques.
  set(T.x, TOP + 1, T.z + 1, 'enchanting_table');
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
    const ring = Math.max(Math.abs(dx), Math.abs(dz)) === 2;
    if (!ring || (Math.abs(dx) === 2 && Math.abs(dz) === 2) || (dz === -2 && dx === 0)) continue;
    set(T.x + dx, TOP + 1, T.z + 1 + dz, 'bookshelf');
    set(T.x + dx, TOP + 2, T.z + 1 + dz, 'bookshelf');
  }
  hang(T.x, TTOP - 1, T.z + 1, 1);
  set(T.x + 3, TOP + 1, T.z - 1, 'anvil', { facing: 'north' });
  // Sala de mapas (planta media).
  set(T.x + 2, F2 + 1, T.z + 2, 'cartography_table');
  set(T.x - 1, F2 + 1, T.z + 3, 'lectern', { facing: 'north', has_book: 'false', powered: 'false' });
  set(T.x + 3, F2 + 1, T.z, 'chest', { facing: 'west', type: 'single', waterlogged: 'false' });
  hang(T.x, TOP - 1, T.z + 1);

  // ---------- Interiores de la casa ----------
  // Cocina (noroeste): hogar, ahumadores, horno, caldero con agua, mesa.
  set(25, G + 1, 16, 'smoker', { facing: 'east', lit: 'false' });
  set(25, G + 1, 17, 'smoker', { facing: 'east', lit: 'false' });
  set(25, G + 1, 18, 'furnace', { facing: 'east', lit: 'false' });
  set(25, G + 1, 19, 'water_cauldron', { level: '3' });
  set(25, G + 1, 20, 'barrel', { facing: 'up' });
  set(29, G + 1, 20, 'crafting_table');
  set(29, G + 1, 16, 'composter', { level: '0' });
  for (let z = 17; z <= 19; z++) { set(27, G + 1, z, 'spruce_fence'); set(27, G + 2, z, 'spruce_pressure_plate', { powered: 'false' }); set(28, G + 1, z, 'spruce_stairs', { facing: 'west', half: 'bottom' }); }
  hang(27, F2 - 1, 18);
  // Almacén (suroeste): cofres dobles apilados con carteles.
  const labels = [['Madera', 'Troncos y tablas'], ['Piedra', 'Roca y tierra'], ['Minerales', 'Hierro, oro...'], ['Comida', ''], ['Cultivos', 'Semillas'], ['Mobs', 'Huesos, cuerda'], ['Herramientas', 'y armaduras'], ['Varios', '']];
  let li = 0;
  for (const z of [23, 25, 27]) {
    doubleChest(25, G + 1, z, 'east');
    doubleChest(25, G + 2, z, 'east');
    if (li < labels.length) wallSign(25, G + 3, z, 'east', ['', labels[li][0], labels[li][1], '']);
    if (li + 1 < labels.length) wallSign(25, G + 3, z + 1, 'east', ['', labels[li + 1][0], labels[li + 1][1], '']);
    li += 2;
  }
  doubleChest(27, G + 1, 22, 'south');
  doubleChest(27, G + 2, 22, 'south');
  wallSign(27, G + 3, 22, 'south', ['', labels[6][0], labels[6][1], '']);
  wallSign(28, G + 3, 22, 'south', ['', labels[7][0], '', '']);
  set(25, G, 22, 'spruce_planks'); // paso libre desde la puerta del invernadero
  hang(27, F2 - 1, 25);
  // Vestíbulo: alfombra, lámparas con cadena, macetas.
  for (let z = 25; z <= 28; z++) for (const x of [35, 36]) set(x, G + 1, z, 'red_carpet');
  hang(33, F2 - 1, 22, 1);
  hang(38, F2 - 1, 22, 1);
  hang(35, F2 - 1, 16, 1);
  for (const [x, z] of [[31, 28], [40, 28], [31, 15], [40, 15]]) set(x, G + 1, z, 'potted_fern');
  for (let z = 15; z <= 18; z++) { set(31, G + 1, z, 'bookshelf'); set(40, G + 1, z, 'bookshelf'); }
  // Pociones (noreste).
  set(43, G + 1, 16, 'brewing_stand');
  set(45, G + 1, 16, 'brewing_stand');
  set(44, G + 1, 16, 'water_cauldron', { level: '3' });
  doubleChest(42, G + 1, 20, 'north');
  for (let z = 17; z <= 19; z++) { set(46, G + 1, z, 'soul_sand'); set(46, G + 2, z, 'nether_wart', { age: '3' }); }
  hang(44, F2 - 1, 18);
  // Taller (sureste y planta baja de la torre): todas las mesas de trabajo.
  const tools = [['crafting_table'], ['furnace', { facing: 'south', lit: 'false' }], ['furnace', { facing: 'south', lit: 'false' }], ['blast_furnace', { facing: 'south', lit: 'false' }], ['smithing_table']];
  tools.forEach(([n, p], i) => set(42 + i, G + 1, 22, n, p));
  const ring = [['furnace', { facing: 'north', lit: 'false' }], ['stonecutter', { facing: 'north' }], ['grindstone', { face: 'floor', facing: 'north' }], ['anvil', { facing: 'east' }], ['loom', { facing: 'west' }], ['fletching_table'], ['cartography_table']];
  const spots = [[T.x - 2, T.z + 3], [T.x - 1, T.z + 3], [T.x + 1, T.z + 3], [T.x + 2, T.z + 3], [T.x + 3, T.z + 1], [T.x + 3, T.z], [T.x + 3, T.z - 1]];
  ring.forEach(([n, p], i) => set(spots[i][0], G + 1, spots[i][1], n, p));
  doubleChest(42, G + 1, 27, 'north');
  hang(44, F2 - 1, 25);
  // Planta alta: dormitorios, biblioteca y cuarto de invitados.
  bed(26, F2 + 1, 16, 'red');
  bed(27, F2 + 1, 16, 'red');
  set(25, F2 + 1, 16, 'chest', { facing: 'south', type: 'single', waterlogged: 'false' });
  set(29, F2 + 1, 16, 'lantern');
  for (let z = 18; z <= 20; z++) for (let x = 25; x <= 29; x++) set(x, F2 + 1, z, x === 25 || x === 29 || z === 20 ? 'red_carpet' : 'white_carpet');
  bed(26, F2 + 1, 23, 'light_blue');
  bed(28, F2 + 1, 23, 'lime');
  set(27, F2 + 1, 23, 'barrel', { facing: 'up' });
  for (let z = 15; z <= 20; z++) for (let y = F2 + 1; y <= F2 + 3; y++) set(46, y, z, 'bookshelf');
  set(43, F2 + 1, 17, 'lectern', { facing: 'east', has_book: 'false', powered: 'false' });
  set(42, F2 + 1, 15, 'ender_chest', { facing: 'south', waterlogged: 'false' });
  bed(43, F2 + 1, 23, 'yellow');
  set(42, F2 + 1, 23, 'chest', { facing: 'east', type: 'single', waterlogged: 'false' });
  for (const [x, z] of [[27, 18], [27, 25], [44, 18], [44, 26], [35, 17], [35, 27]]) hang(x, TOP - 1, z);

  // ---------- Invernadero de cristal (oeste) ----------
  const GX0 = 9, GX1 = 23, GZ0 = 16, GZ1 = 27;
  for (let z = GZ0; z <= GZ1; z++) for (let x = GX0; x <= GX1; x++) {
    const edge = x === GX0 || x === GX1 || z === GZ0 || z === GZ1;
    set(x, G - 1, z, 'stone_bricks');
    if (edge) {
      set(x, G, z, 'stone_bricks');
      set(x, G + 1, z, 'stone_bricks');
      const post = (x - GX0) % 4 === 0 || (z - GZ0) % 4 === 0 && (x === GX0 || x === GX1);
      for (let y = G + 2; y <= G + 4; y++) set(x, y, z, post && (x === GX0 || x === GX1 || (x - GX0) % 4 === 0) ? 'dark_oak_log' : 'glass', post ? { axis: 'y' } : undefined);
    }
  }
  // Techo de cristal a dos aguas.
  const gh = Math.floor((GZ1 - GZ0) / 2);
  for (let k = 0; k <= gh; k++) for (let x = GX0; x <= GX1; x++) {
    for (const z of [GZ0 + k, GZ1 - k]) set(x, G + 5 + Math.min(k, 3), z, (x - GX0) % 4 === 0 ? 'dark_oak_planks' : 'glass');
    if (k <= 3) for (const z of [GZ0 + k, GZ1 - k]) for (let y = G + 5; y < G + 5 + k; y++) if (x === GX0 || x === GX1) set(x, y, z, 'glass');
  }
  for (let z = GZ0 + 4; z <= GZ1 - 4; z++) for (let x = GX0; x <= GX1; x++) set(x, G + 8, z, (x - GX0) % 4 === 0 ? 'dark_oak_planks' : 'glass');
  // Bancales: dos canales de agua (hidratan todo) y un pasillo central.
  const crops = [['wheat', '7'], ['carrots', '7'], ['potatoes', '7'], ['beetroots', '3']];
  for (let z = GZ0 + 1; z <= GZ1 - 1; z++) for (let x = GX0 + 1; x <= GX1 - 1; x++) {
    if (x === 16) { set(x, G, z, 'gravel'); continue; }
    if (z === 19 || z === 24) { set(x, G, z, 'water'); set(x, G - 1, z, 'clay'); continue; }
    set(x, G, z, 'farmland', { moisture: '7' });
    const [crop, age] = crops[(x < 16 ? 0 : 1) + (z > 21 ? 2 : 0)];
    set(x, G + 1, z, crop, { age });
  }
  for (const z of [19, 24]) set(16, G, z, 'spruce_planks');
  door(16, G + 1, GZ1, 'birch', 'north');
  set(16, G + 1, GZ0, 'composter', { level: '0' });
  hang(12, G + 7, 21);
  hang(20, G + 7, 21);
  hang(16, G + 7, 18);
  hang(16, G + 7, 25);
  wallSign(17, G + 2, GZ1 + 1, 'south', ['', 'Invernadero', 'Trigo, zanahoria,', 'patata, remolacha'], 'birch'); // en el poste de madera
  // Paso del invernadero a la casa (el invernadero está pegado al muro oeste).
  set(GX1, G + 1, 22, 'air');
  set(GX1, G + 2, 22, 'air');
  set(GX1 - 1, G, 22, 'spruce_planks');
  set(GX1 - 1, G + 1, 22, 'air');
  door(X0, G + 1, 22, 'spruce', 'east');

  // ---------- Establo rojo (este) ----------
  const BX0 = 58, BX1 = 75, BZ0 = 40, BZ1 = 57, BTOP = G + 6;
  const bw = BX1 - BX0;
  const roofH = (k) => (k < 4 ? k * 2 : 6 + Math.round((k - 3) * 0.7)); // tejado quebrado (gambrel)
  for (let z = BZ0; z <= BZ1; z++) for (let x = BX0; x <= BX1; x++) {
    set(x, G, z, x >= 62 && x <= 71 ? 'coarse_dirt' : 'spruce_planks');
    const edge = x === BX0 || x === BX1 || z === BZ0 || z === BZ1;
    if (!edge) continue;
    const corner = (x === BX0 || x === BX1) && (z === BZ0 || z === BZ1);
    for (let y = G + 1; y <= BTOP; y++) set(x, y, z, corner ? 'stripped_birch_log' : y === BTOP ? 'white_terracotta' : 'red_terracotta', corner ? { axis: 'y' } : undefined);
  }
  for (let k = 0; k <= Math.ceil(bw / 2); k++) {
    const y0 = BTOP + roofH(k);
    const yPrev = k === 0 ? BTOP : BTOP + roofH(k - 1);
    for (let z = BZ0 - 1; z <= BZ1 + 1; z++) for (const [x, facing] of [[BX0 - 1 + k, 'east'], [BX1 + 1 - k, 'west']]) {
      for (let y = yPrev + 1; y < y0; y++) set(x, y, z, 'deepslate_tiles');
      set(x, y0, z, 'deepslate_tile_stairs', { facing, half: 'bottom' });
    }
    // Hastiales rojos.
    for (const z of [BZ0, BZ1]) for (let x = BX0 + k; x <= BX1 - k; x++) for (let y = yPrev + 1; y < y0; y++) set(x, y, z, 'red_terracotta');
  }
  // Portón grande en la fachada sur (da al pasillo central), con marco blanco, y puerta del pajar.
  for (let x = 64; x <= 69; x++) for (let y = G + 1; y <= G + 4; y++) set(x, y, BZ1, 'air');
  for (let x = 63; x <= 70; x++) set(x, G + 5, BZ1, 'white_terracotta');
  for (const x of [63, 70]) for (let y = G + 1; y <= G + 4; y++) set(x, y, BZ1, 'white_terracotta');
  for (let y = BTOP + 2; y <= BTOP + 4; y++) for (const x of [66, 67]) set(x, y, BZ1, 'white_terracotta');
  set(66, BTOP + 3, BZ1, 'spruce_trapdoor', { facing: 'south', half: 'bottom', open: 'true' });
  set(67, BTOP + 3, BZ1, 'spruce_trapdoor', { facing: 'south', half: 'bottom', open: 'true' });
  // Cuadras a los lados del pasillo, con puertas, heno, bebedero y cartel.
  const stall = (x0, x1, z0, z1, gateX, gateFacing, label) => {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const edge = z === z0 || z === z1 || x === gateX;
      if (!edge) continue;
      const gate = x === gateX && z === Math.floor((z0 + z1) / 2);
      set(x, G + 1, z, gate ? 'spruce_fence_gate' : 'spruce_fence', gate ? { facing: gateFacing, open: 'false', in_wall: 'false' } : undefined);
    }
    const inner = gateX === x0 ? x1 : x0;
    set(inner, G + 1, z0 + 1, 'hay_block', { axis: 'y' });
    set(inner, G + 2, z0 + 1, 'hay_block', { axis: 'y' });
    set(inner, G + 1, z1 - 1, 'water_cauldron', { level: '3' });
    const sx = gateX + (gateX === x0 ? -1 : 1);
    wallSign(sx, G + 2, Math.floor((z0 + z1) / 2) - 1, gateFacing === 'west' ? 'west' : 'east', ['', label, '', ''], 'spruce');
    set(gateX, G + 2, Math.floor((z0 + z1) / 2) - 1, 'spruce_planks');
  };
  stall(BX0 + 1, 61, BZ0 + 1, 48, 61, 'east', 'Vacas');
  stall(BX0 + 1, 61, 49, BZ1 - 1, 61, 'east', 'Ovejas');
  stall(72, BX1 - 1, BZ0 + 1, 48, 72, 'west', 'Cerdos');
  stall(72, BX1 - 1, 49, BZ1 - 1, 72, 'west', 'Gallinas');
  for (const z of [44, 48, 53]) hang(66, BTOP + 3, z, 6); // cadenas hasta la cumbrera
  for (const [x, z] of [[63, 41], [70, 41], [63, 56], [70, 56]]) { set(x, G + 1, z, 'hay_block', { axis: 'y' }); set(x, G + 2, z, 'hay_block', { axis: 'x' }); }

  // ---------- Molino de viento y campo de trigo (noreste) ----------
  const M = { x: 66, z: 9 };
  for (let y = G; y <= G + 17; y++) {
    const r = y < G + 5 ? 4.2 : 3.7 - (y - G - 5) * 0.08;
    for (let z = M.z - 5; z <= M.z + 5; z++) for (let x = M.x - 5; x <= M.x + 5; x++) {
      const d = Math.hypot(x - M.x, z - M.z);
      if (d > r) continue;
      if (d > r - 1.1) set(x, y, z, y < G + 5 ? stone() : (y - G) % 5 === 0 ? 'dark_oak_planks' : 'white_terracotta');
      else if (y === G || y === G + 8) set(x, y, z, 'spruce_planks');
      else set(x, y, z, 'air');
    }
  }
  for (let k = 0; k <= 5; k++) for (let z = M.z - 4; z <= M.z + 4; z++) for (let x = M.x - 4; x <= M.x + 4; x++) {
    const d = Math.hypot(x - M.x, z - M.z);
    if (d <= 3.6 - k * 0.65 && d > 2.4 - k * 0.65) set(x, G + 18 + k, z, 'dark_oak_planks');
  }
  set(M.x, G + 24, M.z, 'dark_oak_fence');
  door(M.x, G + 1, M.z + 4, 'spruce', 'north');
  set(M.x - 2, G + 1, M.z, 'hay_block', { axis: 'y' });
  set(M.x + 2, G + 1, M.z - 1, 'barrel', { facing: 'up' });
  hang(M.x, G + 7, M.z);
  // Aspas en X con lona blanca, en la cara sur.
  const hubZ = M.z + 4;
  const hubY = G + 14;
  set(M.x, hubY, hubZ, 'dark_oak_log', { axis: 'z' });
  set(M.x, hubY, hubZ + 1, 'dark_oak_log', { axis: 'z' });
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    for (let i = 1; i <= 7; i++) {
      const x = M.x + sx * i;
      const y = hubY + sy * i;
      if (y <= G + 1) break;
      set(x, y, hubZ + 1, 'spruce_fence');
      if (i >= 2) {
        set(x - sx, y, hubZ + 1, 'white_wool');
        if (i >= 3) set(x - sx * 2, y, hubZ + 1, 'white_wool');
      }
    }
  }
  // Campo de trigo con dos acequias.
  for (let z = 19; z <= 34; z++) for (let x = 56; x <= 77; x++) {
    if (z === 22 || z === 31) { set(x, G, z, 'water'); set(x, G - 1, z, 'clay'); continue; }
    if (z === 26 || z === 27) continue;
    set(x, G, z, 'farmland', { moisture: '7' });
    set(x, G + 1, z, 'wheat', { age: String(4 + Math.floor(rand() * 4)) });
  }
  for (const x of [56, 66, 77]) for (const z of [26, 27]) set(x, G, z, 'dirt_path');
  for (const x of [55, 66, 78]) lampPost(x, 26);
  set(55, G + 1, 19, 'oak_planks');
  wallSign(54, G + 1, 19, 'west', ['', 'Campo de trigo', '', ''], 'oak');

  // ---------- Huerto de frutales con colmenas y pozo (suroeste) ----------
  const fruitTree = (x0, z0, flowering) => {
    for (let y = G + 1; y <= G + 4; y++) set(x0, y, z0, 'oak_log', { axis: 'y' });
    for (let y = G + 3; y <= G + 7; y++) for (let z = z0 - 3; z <= z0 + 3; z++) for (let x = x0 - 3; x <= x0 + 3; x++) {
      const d = Math.hypot(x - x0, (y - G - 5) * 1.3, z - z0);
      if (d <= 2.8 && !(d > 2.2 && rand() < 0.35) && isAir(x, y, z)) {
        set(x, y, z, flowering && rand() < 0.4 ? 'flowering_azalea_leaves' : 'oak_leaves', { persistent: 'true' });
      }
    }
  };
  const trees = [[8, 42], [17, 42], [26, 42], [8, 52], [26, 52], [8, 62], [17, 62], [26, 62]];
  trees.forEach(([x, z], i) => fruitTree(x, z, i % 3 === 1));
  for (const [x, z] of [[8, 42], [26, 52]]) set(x, G + 3, z + 1, 'bee_nest', { facing: 'south', honey_level: '0' });
  // Pozo de piedra con agua infinita, techo y cubo (caldero).
  const WL = { x: 17, z: 52 };
  for (let z = WL.z - 2; z <= WL.z + 2; z++) for (let x = WL.x - 2; x <= WL.x + 2; x++) {
    const edge = Math.abs(x - WL.x) === 2 || Math.abs(z - WL.z) === 2;
    if (edge) { set(x, G + 1, z, stone()); continue; }
    for (let y = G - 2; y <= G; y++) set(x, y, z, 'water');
    set(x, G - 3, z, 'stone');
  }
  for (const [x, z] of [[WL.x - 2, WL.z - 2], [WL.x + 2, WL.z + 2], [WL.x - 2, WL.z + 2], [WL.x + 2, WL.z - 2]]) fill(x, G + 2, z, x, G + 3, z, 'spruce_fence');
  for (let x = WL.x - 3; x <= WL.x + 3; x++) {
    set(x, G + 4, WL.z - 2, 'spruce_stairs', { facing: 'south', half: 'bottom' });
    set(x, G + 4, WL.z + 2, 'spruce_stairs', { facing: 'north', half: 'bottom' });
    for (let z = WL.z - 1; z <= WL.z + 1; z++) set(x, G + 5, z, 'spruce_slab', { type: 'bottom' });
  }
  set(WL.x, G + 4, WL.z, 'chain', { axis: 'y' });
  set(WL.x, G + 3, WL.z, 'chain', { axis: 'y' });
  set(WL.x, G + 2, WL.z, 'lantern', { hanging: 'true' });
  // Flores y bancos.
  for (let z = 38; z <= 66; z++) for (let x = 3; x <= 30; x++) {
    if (get(x, G, z) !== 'grass_block' || !isAir(x, G + 1, z)) continue;
    const r = rand();
    if (r < 0.1) set(x, G + 1, z, pick(['poppy', 'dandelion', 'cornflower', 'allium', 'oxeye_daisy', 'azure_bluet', 'lily_of_the_valley']));
    else if (r < 0.25) set(x, G + 1, z, 'short_grass');
  }
  for (const x of [12, 13]) set(x, G + 1, 57, 'spruce_stairs', { facing: 'north', half: 'bottom' });

  // ---------- Estanque con caña de azúcar y embarcadero ----------
  const P = { x: 47, z: 58 };
  for (let z = P.z - 6; z <= P.z + 6; z++) for (let x = P.x - 8; x <= P.x + 8; x++) {
    const d = Math.hypot((x - P.x) / 7, (z - P.z) / 4.8) + Math.sin(x * 0.9 + z * 0.7) * 0.05;
    if (d < 1) {
      set(x, G - 2, z, 'clay');
      set(x, G - 1, z, 'water');
      set(x, G, z, 'water');
      if (rand() < 0.08) set(x, G + 1, z, 'lily_pad');
    } else if (d < 1.25) {
      set(x, G, z, 'sand');
      if (x < P.x && rand() < 0.75) for (let y = G + 1; y <= G + 3; y++) set(x, y, z, 'sugar_cane', { age: '0' });
    }
  }
  // Quita la caña que no toca el agua.
  for (let z = P.z - 7; z <= P.z + 7; z++) for (let x = P.x - 9; x <= P.x + 9; x++) {
    if (get(x, G + 1, z) !== 'sugar_cane') continue;
    const wet = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => get(x + a, G, z + b) === 'water');
    if (!wet) for (let y = G + 1; y <= G + 3; y++) set(x, y, z, 'air');
  }
  for (let x = P.x + 3; x <= P.x + 9; x++) for (const z of [P.z - 1, P.z]) {
    set(x, G + 1, z, 'spruce_slab', { type: 'bottom' });
    if (x === P.x + 3 || x === P.x + 6) set(x, G, z, 'stripped_spruce_log', { axis: 'y' });
  }
  lampPost(P.x + 10, P.z - 2);

  // ---------- Portal del Nether en ruinas (noroeste) ----------
  const PX = 6, PZ = 7;
  for (let z = PZ - 3; z <= PZ + 3; z++) for (let x = PX - 3; x <= PX + 6; x++) {
    const r = rand();
    set(x, G, z, r < 0.35 ? 'netherrack' : r < 0.45 ? 'magma_block' : r < 0.55 ? 'gilded_blackstone' : 'polished_blackstone_bricks');
  }
  for (let x = PX; x <= PX + 3; x++) for (let y = G + 1; y <= G + 5; y++) {
    if (x === PX || x === PX + 3 || y === G + 1 || y === G + 5) set(x, y, PZ, 'obsidian');
  }
  for (const [x, y, z, m] of [[PX - 1, G + 1, PZ, 'polished_blackstone_bricks'], [PX - 1, G + 2, PZ, 'cracked_polished_blackstone_bricks'], [PX + 4, G + 1, PZ, 'polished_blackstone_bricks'],
    [PX + 4, G + 2, PZ, 'gilded_blackstone'], [PX + 4, G + 3, PZ, 'polished_blackstone_brick_wall'], [PX - 2, G + 1, PZ + 2, 'crying_obsidian'], [PX + 5, G + 1, PZ - 2, 'crying_obsidian']]) set(x, y, z, m);
  set(PX + 1, G + 6, PZ, 'chain', { axis: 'y' });
  set(PX + 2, G + 6, PZ, 'polished_blackstone_brick_wall');
  set(PX + 1, G + 1, PZ + 2, 'polished_blackstone_bricks');
  wallSign(PX + 1, G + 1, PZ + 3, 'south', ['', 'Portal al Nether', 'Enciéndelo con', 'un mechero'], 'crimson');
  for (const x of [PX - 2, PX + 5]) { set(x, G + 1, PZ + 3, 'polished_blackstone_brick_wall'); set(x, G + 2, PZ + 3, 'soul_lantern'); }

  // ---------- Caminos y farolas ----------
  for (let z = JZ + 5; z <= L - 2; z++) for (let x = GATE[0]; x <= GATE[1]; x++) set(x, G, z, (x + z) % 5 === 0 ? 'mossy_cobblestone' : 'gravel');
  path(37, 66, 66, 66, 1); // al establo
  path(66, 66, 66, 58, 1);
  path(33, 38, 16, 38, 0); // al huerto
  path(16, 38, 16, 28, 0); // al invernadero
  path(40, 36, 55, 36, 0); // hacia el campo y el molino
  path(55, 36, 55, 18, 0);
  path(55, 18, 62, 14, 0);
  path(20, 12, 10, 11, 0); // al portal
  path(24, 13, 20, 12, 0);
  for (const [x, z] of [[33, 40], [38, 40], [33, 50], [38, 50], [33, 60], [38, 60], [45, 46], [52, 50], [20, 36], [14, 30], [54, 30], [54, 22], [60, 12],
    [22, 8], [44, 8], [76, 4], [4, 30], [76, 38], [76, 66], [60, 66], [4, 68], [40, 66], [30, 66], [52, 40]]) {
    if (isAir(x, G + 1, z) && get(x, G, z) !== 'water') lampPost(x, z);
  }

  finalizeConnections(s);
  return s;
}
