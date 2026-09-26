// Mansión funcional para survival (64×62). Todo está pensado para usarse:
// - Casa de dos plantas: almacén con cofres dobles etiquetados, cocina, taller con todas las
//   mesas de trabajo, sala de pociones, dormitorios, biblioteca con cofre de ender y sala de
//   encantamientos con 22 librerías (nivel 30).
// - Parcelas de 9×9 con agua en el centro (hidrata toda la tierra): trigo, zanahoria, patata y
//   remolacha; caña de azúcar junto a un canal; melones y calabazas.
// - Corrales para vacas, ovejas y gallinas, fuente de agua infinita, portal del Nether (sin
//   encender), colmenas, granja de árboles y muralla con farolas para que no aparezcan mobs.

import { Schematic } from './schematic.js';
import { rng, finalizeConnections } from './lobby.js';
import { signNbt } from './schem-writer.js';

export const MANSION_GROUND = 2;

export function buildMansion() {
  const W = 64;
  const L = 62;
  const H = 30;
  const G = MANSION_GROUND;
  const s = new Schematic(W, H, L);
  s.format = 'Ejemplo integrado';
  s.meta = { name: 'Mansión survival', author: 'Visor de Schematics', dataVersion: 3465 };
  const rand = rng(4242);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const inside = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < W && y < H && z < L;
  const set = (x, y, z, name, props) => { if (inside(x, y, z)) s.set(x, y, z, name, props); };
  const get = (x, y, z) => (inside(x, y, z) ? s.palette[s.get(x, y, z)].name.slice(10) : 'out');
  const fill = (x0, y0, z0, x1, y1, z1, name, props) => {
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) set(x, y, z, name, props);
  };
  const sign = (x, y, z, facing, lines, wood = 'spruce') => {
    set(x, y, z, `${wood}_wall_sign`, { facing, waterlogged: 'false' });
    s.blockEntities.push({ id: 'minecraft:sign', pos: [x, y, z], nbt: signNbt(lines.map((t, i) => (i === 1 ? { text: t, bold: true } : t))) });
  };
  const lampPost = (x, z) => { set(x, G + 1, z, 'spruce_fence'); set(x, G + 2, z, 'spruce_fence'); set(x, G + 3, z, 'lantern'); };
  const door = (x, y, z, wood, facing, hinge = 'left') => {
    set(x, y, z, `${wood}_door`, { facing, half: 'lower', hinge, open: 'false', powered: 'false' });
    set(x, y + 1, z, `${wood}_door`, { facing, half: 'upper', hinge, open: 'false', powered: 'false' });
  };
  // Cofre doble: (x, z) y (x+1, z) mirando al sur, o (x, z) y (x, z+1) mirando al este/oeste.
  const doubleChest = (x, y, z, facing) => {
    if (facing === 'south' || facing === 'north') {
      const westType = facing === 'south' ? 'right' : 'left';
      set(x, y, z, 'chest', { facing, type: westType, waterlogged: 'false' });
      set(x + 1, y, z, 'chest', { facing, type: westType === 'right' ? 'left' : 'right', waterlogged: 'false' });
    } else {
      const northType = facing === 'east' ? 'left' : 'right';
      set(x, y, z, 'chest', { facing, type: northType, waterlogged: 'false' });
      set(x, y, z + 1, 'chest', { facing, type: northType === 'right' ? 'left' : 'right', waterlogged: 'false' });
    }
  };

  // ---------- Terreno ----------
  fill(0, 0, 0, W - 1, 0, L - 1, 'stone');
  fill(0, 1, 0, W - 1, 1, L - 1, 'dirt');
  fill(0, G, 0, W - 1, G, L - 1, 'grass_block');

  // ---------- Muralla con puerta al sur ----------
  for (let x = 0; x < W; x++) for (let z = 0; z < L; z++) {
    if (x !== 0 && x !== W - 1 && z !== 0 && z !== L - 1) continue;
    const gate = z === L - 1 && x >= 30 && x <= 33;
    if (gate) { set(x, G, z, 'stone_bricks'); set(x, G + 1, z, 'spruce_fence_gate', { facing: 'south', open: 'false', in_wall: 'false' }); continue; }
    const post = (x + z) % 8 === 0;
    set(x, G + 1, z, post ? 'chiseled_stone_bricks' : 'stone_bricks');
    set(x, G + 2, z, post ? 'stone_bricks' : 'stone_brick_wall');
    if (post) set(x, G + 3, z, 'lantern');
  }
  for (const x of [29, 34]) { set(x, G + 1, L - 1, 'chiseled_stone_bricks'); set(x, G + 2, L - 1, 'chiseled_stone_bricks'); set(x, G + 3, L - 1, 'lantern'); }

  // ---------- Mansión ----------
  const X0 = 18, X1 = 45, Z0 = 8, Z1 = 27;
  const F2 = G + 6; // suelo de la segunda planta
  const TOP = G + 12; // techo de la segunda planta
  const PX = new Set([18, 22, 26, 30, 33, 37, 41, 45]);
  const PZ = new Set([8, 12, 17, 22, 27]);
  // Suelos.
  for (let z = Z0; z <= Z1; z++) for (let x = X0; x <= X1; x++) {
    const hall = x >= 30 && x <= 33;
    set(x, G, z, hall ? ((x + z) % 2 ? 'polished_diorite' : 'polished_andesite') : 'spruce_planks');
    set(x, G - 1, z, 'stone_bricks');
    set(x, F2, z, 'spruce_planks');
    set(x, TOP, z, 'spruce_planks');
  }
  // Muros exteriores con entramado de madera oscura y ventanas.
  for (let z = Z0; z <= Z1; z++) for (let x = X0; x <= X1; x++) {
    const ew = x === X0 || x === X1;
    const ns = z === Z0 || z === Z1;
    if (!ew && !ns) continue;
    const pillar = (ns && PX.has(x)) || (ew && PZ.has(z));
    for (let y = G; y <= TOP; y++) {
      let m;
      if (y === G) m = 'stone_bricks';
      else if (pillar) m = 'dark_oak_log';
      else if (y === F2 || y === TOP) m = 'dark_oak_planks';
      else if (y === G + 1) m = 'stone_bricks';
      else if ((y >= G + 2 && y <= G + 4) || (y >= F2 + 2 && y <= F2 + 4)) m = 'glass_pane';
      else m = 'white_terracotta';
      set(x, y, z, m, m === 'dark_oak_log' ? { axis: 'y' } : undefined);
    }
  }
  for (let x = X0 + 1; x <= 28; x++) for (let y = G + 2; y <= G + 4; y++) set(x, y, Z0, 'white_terracotta');
  // Tabiques interiores (madera) y puertas.
  const partition = (x0, z0, x1, z1) => {
    for (const [y0, y1] of [[G + 1, F2 - 1], [F2 + 1, TOP - 1]]) fill(x0, y0, z0, x1, y1, z1, 'spruce_planks');
  };
  partition(29, Z0 + 1, 29, Z1 - 1);
  partition(34, Z0 + 1, 34, Z1 - 1);
  partition(X0 + 1, 17, 28, 17);
  partition(35, 17, X1 - 1, 17);
  for (const y of [G + 1, F2 + 1]) {
    door(29, y, 22, 'spruce', 'west');
    door(29, y, 12, 'spruce', 'west');
    door(34, y, 22, 'spruce', 'east');
    door(34, y, 12, 'spruce', 'east');
  }
  // Puerta principal doble y puerta al balcón.
  door(31, G + 1, Z1, 'dark_oak', 'north', 'left');
  door(32, G + 1, Z1, 'dark_oak', 'north', 'right');
  door(31, F2 + 1, Z1, 'dark_oak', 'north', 'left');
  door(32, F2 + 1, Z1, 'dark_oak', 'north', 'right');
  // Escalera del vestíbulo hacia la segunda planta: empieza en z = 19 y sube hacia el norte,
  // lejos de la puerta del balcón. El hueco queda en z = 15..19 con barandilla al sur.
  for (let i = 0; i <= 5; i++) {
    const y = G + 1 + i;
    const z = 19 - i;
    for (const x of [31, 32]) {
      set(x, y, z, 'spruce_stairs', { facing: 'north', half: 'bottom' });
      for (let yy = G + 1; yy < y; yy++) set(x, yy, z, 'spruce_planks');
    }
  }
  for (let z = 15; z <= 19; z++) for (const x of [31, 32]) set(x, F2, z, 'air');
  set(31, F2 + 1, 20, 'spruce_fence');
  set(32, F2 + 1, 20, 'spruce_fence');

  // Tejado a dos aguas de tejas de pizarra, con hastiales y chimenea.
  for (let k = 0; k <= 10; k++) {
    const y = TOP + k;
    for (let x = X0 - 1; x <= X1 + 1; x++) {
      set(x, y, Z0 - 1 + k, 'deepslate_tile_stairs', { facing: 'south', half: 'bottom' });
      set(x, y, Z1 + 1 - k, 'deepslate_tile_stairs', { facing: 'north', half: 'bottom' });
    }
    for (let z = Z0 + k; z <= Z1 - k; z++) for (const x of [X0, X1]) set(x, y, z, k === 0 ? 'dark_oak_planks' : 'white_terracotta');
  }
  for (let x = X0 - 1; x <= X1 + 1; x++) set(x, TOP + 11, 17, 'deepslate_tile_slab', { type: 'bottom' });
  for (let x = X0 - 1; x <= X1 + 1; x++) set(x, TOP + 11, 18, 'deepslate_tile_slab', { type: 'bottom' });
  for (const x of [X0, X1]) for (let y = TOP + 3; y <= TOP + 5; y++) { set(x, y, 17, 'glass_pane'); set(x, y, 18, 'glass_pane'); }
  // Chimenea de ladrillo en la esquina de la cocina, con humo (fogata) arriba.
  for (let y = G + 1; y <= TOP + 5; y++) for (const [x, z] of [[19, 25], [20, 25], [19, 26], [20, 26]]) set(x, y, z, 'bricks');
  set(19, TOP + 6, 25, 'campfire', { lit: 'true', signal_fire: 'false', facing: 'south' });

  // Porche con columnas; su techo es el balcón de la segunda planta.
  for (let z = Z1 + 1; z <= Z1 + 4; z++) for (let x = 28; x <= 35; x++) {
    set(x, G, z, 'polished_andesite');
    set(x, F2, z, 'dark_oak_planks');
    const edge = x === 28 || x === 35 || z === Z1 + 4;
    if (edge) set(x, F2 + 1, z, 'dark_oak_fence');
  }
  for (const [x, z] of [[28, Z1 + 4], [35, Z1 + 4], [28, Z1 + 1], [35, Z1 + 1]]) for (let y = G + 1; y < F2; y++) set(x, y, z, 'stripped_dark_oak_log', { axis: 'y' });
  for (const x of [30, 33]) set(x, F2 - 1, Z1 + 3, 'lantern', { hanging: 'true' });
  for (const x of [29, 34]) set(x, F2 + 1, Z1 + 3, 'potted_red_tulip');

  // ---------- Interiores: planta baja ----------
  const hang = (x, y, z) => set(x, y, z, 'lantern', { hanging: 'true' });
  // Almacén (noroeste): cofres dobles apilados con carteles.
  const labels = [['Madera', 'Troncos y tablas'], ['Piedra', 'Roca y tierra'], ['Minerales', 'Hierro, oro, diamante'], ['Comida', 'Carne y pan'], ['Cultivos', 'Semillas y cosecha'], ['Mobs', 'Huesos, cuerda...'], ['Herramientas', 'Y armaduras'], ['Varios', '']];
  let li = 0;
  for (const x of [19, 21, 24, 26]) {
    doubleChest(x, G + 1, Z0 + 1, 'south');
    doubleChest(x, G + 2, Z0 + 1, 'south');
    sign(x, G + 3, Z0 + 1, 'south', ['', labels[li][0], labels[li][1], '']);
    sign(x + 1, G + 3, Z0 + 1, 'south', ['', labels[li + 1][0], labels[li + 1][1], '']);
    li += 2;
  }
  for (const z of [11, 14]) { doubleChest(X0 + 1, G + 1, z, 'east'); doubleChest(X0 + 1, G + 2, z, 'east'); }
  set(27, G + 1, 15, 'barrel', { facing: 'up' });
  set(27, G + 1, 14, 'barrel', { facing: 'up' });
  hang(24, F2 - 1, 13);
  // Cocina (suroeste): ahumadores, caldero con agua, mesa y sillas, chimenea.
  set(19, G + 1, 18, 'smoker', { facing: 'south', lit: 'false' });
  set(20, G + 1, 18, 'smoker', { facing: 'south', lit: 'false' });
  set(21, G + 1, 18, 'furnace', { facing: 'south', lit: 'false' });
  set(22, G + 1, 18, 'crafting_table');
  set(23, G + 1, 18, 'water_cauldron', { level: '3' });
  set(24, G + 1, 18, 'barrel', { facing: 'up' });
  for (let x = 23; x <= 26; x++) { set(x, G + 1, 22, 'spruce_fence'); set(x, G + 2, 22, 'spruce_pressure_plate', { powered: 'false' }); }
  for (let x = 23; x <= 26; x++) { set(x, G + 1, 21, 'spruce_stairs', { facing: 'north', half: 'bottom' }); set(x, G + 1, 23, 'spruce_stairs', { facing: 'south', half: 'bottom' }); }
  set(22, G + 1, 26, 'composter', { level: '0' });
  hang(24, F2 - 1, 22);
  // Taller (sureste): todas las mesas de trabajo y hornos.
  const workshop = [
    ['crafting_table'], ['furnace', { facing: 'south', lit: 'false' }], ['furnace', { facing: 'south', lit: 'false' }],
    ['furnace', { facing: 'south', lit: 'false' }], ['blast_furnace', { facing: 'south', lit: 'false' }],
    ['smithing_table'], ['stonecutter', { facing: 'south' }], ['grindstone', { face: 'floor', facing: 'south' }],
    ['anvil', { facing: 'east' }], ['loom', { facing: 'south' }],
  ];
  workshop.forEach(([name, props], i) => set(35 + i, G + 1, 18, name, props));
  set(44, G + 1, 20, 'cartography_table');
  set(44, G + 1, 21, 'fletching_table');
  doubleChest(44, G + 1, 23, 'west');
  set(36, G + 1, 26, 'composter', { level: '0' });
  hang(39, F2 - 1, 22);
  // Sala de pociones (noreste): soportes de pociones, caldero y verrugas del Nether.
  set(37, G + 1, 10, 'brewing_stand');
  set(39, G + 1, 10, 'brewing_stand');
  set(38, G + 1, 10, 'water_cauldron', { level: '3' });
  doubleChest(41, G + 1, Z0 + 1, 'south');
  for (let x = 36; x <= 39; x++) { set(x, G + 1, 15, 'soul_sand'); set(x, G + 2, 15, 'nether_wart', { age: '3' }); }
  set(44, G + 1, 12, 'bookshelf');
  set(44, G + 1, 13, 'bookshelf');
  hang(39, F2 - 1, 12);
  hang(31, F2 - 1, 11);
  hang(32, F2 - 1, 11);

  // ---------- Interiores: segunda planta ----------
  const bed = (x, y, zHead, color) => {
    set(x, y, zHead, `${color}_bed`, { part: 'head', facing: 'north', occupied: 'false' });
    set(x, y, zHead + 1, `${color}_bed`, { part: 'foot', facing: 'north', occupied: 'false' });
  };
  // Dormitorio principal (suroeste): dos camas, cofre, alfombra.
  bed(21, F2 + 1, 18, 'red');
  bed(22, F2 + 1, 18, 'red');
  set(20, F2 + 1, 18, 'chest', { facing: 'south', type: 'single', waterlogged: 'false' });
  set(23, F2 + 1, 18, 'lantern');
  for (let z = 21; z <= 24; z++) for (let x = 21; x <= 27; x++) set(x, F2 + 1, z, x === 21 || x === 27 || z === 21 || z === 24 ? 'red_carpet' : 'white_carpet');
  hang(23, TOP - 1, 22);
  // Dormitorio de invitados (noroeste).
  bed(20, F2 + 1, 9, 'light_blue');
  bed(24, F2 + 1, 9, 'lime');
  bed(26, F2 + 1, 9, 'yellow');
  set(22, F2 + 1, 9, 'barrel', { facing: 'up' });
  hang(23, TOP - 1, 13);
  // Sala de encantamientos (sureste): mesa con librerías a 2 bloques (nivel 30) y yunque.
  const ET = { x: 39, z: 22 };
  set(ET.x, F2 + 1, ET.z, 'enchanting_table');
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
    const ring = Math.max(Math.abs(dx), Math.abs(dz)) === 2;
    const corner = Math.abs(dx) === 2 && Math.abs(dz) === 2;
    const entry = dz === 2 && dx === 0;
    if (!ring || corner || entry) continue;
    set(ET.x + dx, F2 + 1, ET.z + dz, 'bookshelf');
    set(ET.x + dx, F2 + 2, ET.z + dz, 'bookshelf');
  }
  set(43, F2 + 1, 19, 'anvil', { facing: 'north' });
  set(43, F2 + 1, 25, 'grindstone', { face: 'floor', facing: 'north' });
  hang(39, TOP - 1, 22);
  // Biblioteca (noreste): estanterías, atril y cofre de ender.
  for (let x = 35; x <= 44; x++) for (let y = F2 + 1; y <= F2 + 3; y++) set(x, y, Z0 + 1, 'bookshelf');
  set(38, F2 + 1, 13, 'lectern', { facing: 'south', has_book: 'false', powered: 'false' });
  set(42, F2 + 1, 15, 'ender_chest', { facing: 'north', waterlogged: 'false' });
  set(36, F2 + 1, 15, 'cartography_table');
  hang(39, TOP - 1, 13);
  hang(31, TOP - 1, 12);
  hang(32, TOP - 1, 16);
  for (const [x, z] of [[30, 9], [33, 9]]) set(x, F2 + 1, z, 'potted_fern');

  // ---------- Jardín delantero: fuente de agua infinita y caminos ----------
  const FC = { x: 31.5, z: 38 };
  for (let z = 32; z <= 44; z++) for (let x = 25; x <= 38; x++) {
    const d = Math.hypot(x + 0.5 - FC.x - 0.5, z + 0.5 - FC.z - 0.5);
    if (d < 3.2) { set(x, G, z, 'water'); set(x, G - 1, z, 'stone_bricks'); }
    else if (d < 4.2) set(x, G, z, 'stone_bricks'), set(x, G + 1, z, 'stone_brick_slab', { type: 'bottom' });
    else if (d < 5.6) set(x, G, z, 'dirt_path');
  }
  for (let y = G; y <= G + 2; y++) for (const [x, z] of [[31, 38], [32, 38]]) set(x, y, z, 'chiseled_stone_bricks');
  set(31, G + 3, 38, 'sea_lantern');
  set(32, G + 3, 38, 'sea_lantern');
  for (let z = Z1 + 5; z <= L - 2; z++) for (let x = 30; x <= 33; x++) {
    if (get(x, G, z) === 'grass_block') set(x, G, z, 'dirt_path');
  }
  for (const z of [47, 53, 59]) { lampPost(29, z); lampPost(34, z); }

  // ---------- Cultivos (oeste): parcelas de 9×9 con agua en el centro ----------
  const plot = (x0, z0, crop, label) => {
    for (let z = z0; z < z0 + 9; z++) for (let x = x0; x < x0 + 9; x++) {
      if (x === x0 + 4 && z === z0 + 4) { set(x, G, z, 'water'); set(x, G - 1, z, 'clay'); continue; }
      set(x, G, z, 'farmland', { moisture: '7' });
      set(x, G + 1, z, crop, { age: crop === 'beetroots' ? '3' : '7' });
    }
    // Borde con farolas en las esquinas para que crezca de noche y no aparezcan mobs.
    for (const [x, z] of [[x0 - 1, z0 - 1], [x0 + 9, z0 - 1], [x0 - 1, z0 + 9], [x0 + 9, z0 + 9]]) lampPost(x, z);
    // Cartel de pie mirando al norte (hacia el camino de la casa).
    set(x0 + 4, G + 1, z0 - 1, 'oak_sign', { rotation: '8', waterlogged: 'false' });
    s.blockEntities.push({ id: 'minecraft:sign', pos: [x0 + 4, G + 1, z0 - 1], nbt: signNbt(['', { text: label, bold: true }, '', '']) });
  };
  plot(4, 32, 'wheat', 'Trigo');
  plot(15, 32, 'carrots', 'Zanahorias');
  plot(4, 44, 'potatoes', 'Patatas');
  plot(15, 44, 'beetroots', 'Remolacha');
  set(14, G + 1, 42, 'composter', { level: '0' });
  doubleChest(13, G + 1, 30, 'south');
  // Caña de azúcar a ambos lados de un canal.
  for (let x = 3; x <= 25; x++) {
    set(x, G, 56, 'water');
    set(x, G - 1, 56, 'clay');
    for (const z of [55, 57]) {
      set(x, G, z, 'sand');
      for (let y = G + 1; y <= G + 3; y++) set(x, y, z, 'sugar_cane', { age: '0' });
    }
  }

  // ---------- Animales (este): corrales con puerta, heno y bebedero ----------
  const pen = (x0, z0, x1, z1, label, extras) => {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const edge = x === x0 || x === x1 || z === z0 || z === z1;
      if (!edge) continue;
      const gate = x === x0 && z === Math.floor((z0 + z1) / 2);
      set(x, G + 1, z, gate ? 'oak_fence_gate' : 'oak_fence', gate ? { facing: 'east', open: 'false', in_wall: 'false' } : undefined);
    }
    lampPost(x0, z0);
    lampPost(x1, z1);
    set(x0 + 1, G + 1, z0 + 1, 'hay_block', { axis: 'y' });
    set(x0 + 2, G + 1, z0 + 1, 'hay_block', { axis: 'x' });
    set(x1 - 1, G + 1, z0 + 1, 'water_cauldron', { level: '3' });
    set(x1 - 2, G + 1, z0 + 1, 'water_cauldron', { level: '3' });
    set(x0 - 1, G + 1, Math.floor((z0 + z1) / 2) - 2, 'oak_planks');
    sign(x0 - 2, G + 1, Math.floor((z0 + z1) / 2) - 2, 'west', ['', label, '', ''], 'oak');
    if (extras) extras();
  };
  pen(38, 32, 47, 40, 'Vacas');
  pen(50, 32, 59, 40, 'Ovejas');
  pen(38, 43, 47, 51, 'Gallinas', () => {
    // Gallinero con techo y nidos de heno.
    fill(43, G + 1, 47, 46, G + 1, 50, 'oak_planks');
    for (const [x, z] of [[43, 47], [46, 47], [43, 50], [46, 50]]) fill(x, G + 2, z, x, G + 3, z, 'oak_fence');
    fill(42, G + 4, 46, 47, G + 4, 51, 'spruce_slab', { type: 'bottom' });
    for (const [x, z] of [[44, 48], [45, 49]]) set(x, G + 2, z, 'hay_block', { axis: 'y' });
  });
  // Melones y calabazas: filas de tallos con agua y tierra libre para los frutos.
  for (let x = 51; x <= 59; x++) {
    const rows = [['dirt'], ['farmland', 'melon_stem'], ['water'], ['farmland', 'pumpkin_stem'], ['dirt'], ['farmland', 'melon_stem'], ['water'], ['farmland', 'pumpkin_stem'], ['dirt']];
    rows.forEach(([ground, stem], i) => {
      const z = 43 + i;
      set(x, G, z, ground, ground === 'farmland' ? { moisture: '7' } : undefined);
      if (ground === 'water') set(x, G - 1, z, 'clay');
      if (stem) set(x, G + 1, z, stem, { age: '7' });
      if (ground === 'dirt' && x % 3 === 0) set(x, G + 1, z, (x + i) % 2 ? 'melon' : 'pumpkin');
    });
  }
  lampPost(50, 42);
  lampPost(60, 52);
  set(55, G + 1, 42, 'oak_planks');
  sign(55, G + 1, 41, 'north', ['', 'Melones', 'y calabazas', ''], 'oak');

  // ---------- Portal del Nether (sin encender) ----------
  for (let x = 51; x <= 56; x++) for (let z = 14; z <= 20; z++) set(x, G, z, 'polished_blackstone_bricks');
  for (let x = 52; x <= 55; x++) for (let y = G + 1; y <= G + 5; y++) {
    const frame = x === 52 || x === 55 || y === G + 1 || y === G + 5;
    if (frame) set(x, y, 17, 'obsidian');
  }
  set(51, G + 1, 19, 'polished_blackstone_bricks');
  sign(51, G + 1, 20, 'south', ['', 'Portal al Nether', 'Enciéndelo con', 'mechero'], 'crimson');
  for (const x of [51, 56]) { set(x, G + 1, 15, 'polished_blackstone_brick_wall'); set(x, G + 2, 15, 'soul_lantern'); }

  // ---------- Colmenas y jardín de flores (este de la casa) ----------
  for (let z = 22; z <= 27; z++) for (let x = 49; x <= 60; x++) {
    set(x, G + 1, z, pick(['poppy', 'dandelion', 'cornflower', 'allium', 'oxeye_daisy', 'azure_bluet', 'lily_of_the_valley']));
  }
  for (const x of [52, 57]) { set(x, G + 1, 24, 'oak_fence'); set(x, G + 2, 24, 'beehive', { facing: 'south', honey_level: '0' }); }
  lampPost(49, 21);
  lampPost(60, 28);

  // ---------- Granja de árboles (detrás de la casa) ----------
  const saplings = ['oak_sapling', 'birch_sapling', 'spruce_sapling'];
  for (let x = 3; x <= 60; x += 4) for (const z of [2, 5]) {
    set(x, G + 1, z, saplings[(x + z) % 3], { stage: '0' });
    if (x + 2 < W - 1) set(x + 2, G + 1, z, 'torch');
  }

  // ---------- Farolas en el jardín para que no aparezcan mobs ----------
  for (const [x, z] of [[3, 29], [26, 29], [37, 29], [60, 30], [3, 53], [26, 53], [37, 53], [48, 58], [60, 58], [10, 8], [10, 20], [50, 10], [60, 16]]) {
    if (get(x, G + 1, z) === 'air') lampPost(x, z);
  }

  finalizeConnections(s);
  return s;
}
