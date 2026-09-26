// Estructura de ejemplo generada por código: una casita con jardín.

import { Schematic } from './schematic.js';

export function buildDemo() {
  const W = 23;
  const H = 16;
  const L = 21;
  const s = new Schematic(W, H, L);
  s.format = 'Ejemplo integrado';
  s.meta = { name: 'Casita de ejemplo', author: 'Visor de Schematics' };

  const set = (x, y, z, name, props) => {
    if (x >= 0 && y >= 0 && z >= 0 && x < W && y < H && z < L) s.set(x, y, z, name, props);
  };
  const fill = (x0, y0, z0, x1, y1, z1, name, props) => {
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) set(x, y, z, name, props);
  };

  // Terreno.
  fill(0, 0, 0, W - 1, 0, L - 1, 'stone');
  fill(0, 1, 0, W - 1, 1, L - 1, 'dirt');
  fill(0, 2, 0, W - 1, 2, L - 1, 'grass_block');

  // Estanque.
  fill(15, 1, 12, 20, 2, 18, 'water');
  fill(16, 1, 13, 19, 1, 17, 'sand');
  for (let x = 14; x <= 21; x++) for (let z = 11; z <= 19; z++) {
    const edge = x === 14 || x === 21 || z === 11 || z === 19;
    if (edge) set(x, 2, z, 'gravel');
  }
  set(17, 3, 14, 'lily_pad');
  set(19, 3, 16, 'lily_pad');

  // Casa: base de piedra, suelo de tablones, esquinas de tronco.
  const [hx0, hz0, hx1, hz1] = [3, 3, 11, 10];
  fill(hx0, 2, hz0, hx1, 2, hz1, 'cobblestone');
  fill(hx0 + 1, 3, hz0 + 1, hx1 - 1, 3, hz1 - 1, 'oak_planks');
  for (let y = 3; y <= 6; y++) {
    for (let x = hx0; x <= hx1; x++) for (let z = hz0; z <= hz1; z++) {
      const cornerX = x === hx0 || x === hx1;
      const cornerZ = z === hz0 || z === hz1;
      if (cornerX && cornerZ) set(x, y, z, 'oak_log', { axis: 'y' });
      else if (cornerX || cornerZ) set(x, y, z, y === 3 ? 'cobblestone' : 'oak_planks');
    }
  }
  // Viga superior.
  for (let x = hx0; x <= hx1; x++) { set(x, 7, hz0, 'spruce_log', { axis: 'x' }); set(x, 7, hz1, 'spruce_log', { axis: 'x' }); }
  for (let z = hz0 + 1; z < hz1; z++) { set(hx0, 7, z, 'spruce_log', { axis: 'z' }); set(hx1, 7, z, 'spruce_log', { axis: 'z' }); }

  // Ventanas.
  for (const x of [5, 9]) { set(x, 5, hz1, 'glass_pane', { east: 'true', west: 'true' }); set(x, 5, hz0, 'glass_pane', { east: 'true', west: 'true' }); }
  for (const z of [5, 8]) { set(hx0, 5, z, 'glass_pane', { north: 'true', south: 'true' }); set(hx1, 5, z, 'light_blue_stained_glass'); }

  // Puerta y escalón.
  set(7, 4, hz1, 'oak_door', { facing: 'south', half: 'lower', hinge: 'left', open: 'false' });
  set(7, 5, hz1, 'oak_door', { facing: 'south', half: 'upper', hinge: 'left', open: 'false' });
  set(7, 3, hz1, 'oak_planks');
  set(7, 3, hz1 + 1, 'stone_brick_stairs', { facing: 'north', half: 'bottom' });
  set(6, 5, hz1 + 1, 'wall_torch', { facing: 'south' });
  set(8, 5, hz1 + 1, 'wall_torch', { facing: 'south' });

  // Tejado a dos aguas con escaleras.
  for (let i = 0; i <= 5; i++) {
    const y = 7 + i;
    const zn = hz0 - 1 + i;
    const zs = hz1 + 1 - i;
    if (zn > zs) break;
    for (let x = hx0 - 1; x <= hx1 + 1; x++) {
      if (zn === zs) set(x, y, zn, 'dark_oak_slab', { type: 'bottom' });
      else {
        set(x, y, zn, 'dark_oak_stairs', { facing: 'south', half: 'bottom' });
        set(x, y, zs, 'dark_oak_stairs', { facing: 'north', half: 'bottom' });
      }
    }
    // Hastiales.
    for (let z = zn + 1; z < zs; z++) {
      if (i > 0) { set(hx0, y, z, 'oak_planks'); set(hx1, y, z, 'oak_planks'); }
    }
  }
  set(hx1 + 1, 10, 6, 'bricks');
  set(hx1 + 1, 11, 6, 'bricks');
  set(hx1 + 1, 12, 6, 'bricks');
  set(hx1 + 1, 13, 6, 'campfire', { lit: 'true' });

  // Interior.
  set(4, 4, 4, 'crafting_table');
  set(5, 4, 4, 'furnace', { facing: 'south' });
  set(6, 4, 4, 'chest', { facing: 'south' });
  set(10, 4, 4, 'red_bed', { part: 'head', facing: 'north' });
  set(10, 4, 5, 'red_bed', { part: 'foot', facing: 'north' });
  set(4, 4, 9, 'bookshelf');
  set(4, 5, 9, 'bookshelf');
  set(7, 4, 7, 'red_carpet');
  set(8, 4, 7, 'red_carpet');
  set(10, 6, 9, 'lantern', { hanging: 'false' });

  // Árbol.
  const [tx, tz] = [17, 5];
  for (let y = 3; y <= 8; y++) set(tx, y, tz, 'oak_log', { axis: 'y' });
  for (let y = 6; y <= 9; y++) {
    const r = y >= 8 ? 1 : 2;
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      if (Math.abs(dx) === r && Math.abs(dz) === r && (y === 9 || (dx + dz + y) % 2)) continue;
      if (dx === 0 && dz === 0 && y <= 8) continue;
      set(tx + dx, y, tz + dz, 'oak_leaves', { persistent: 'true' });
    }
  }

  // Valla alrededor del jardín.
  for (let x = 0; x < W; x++) { set(x, 3, 0, 'oak_fence'); set(x, 3, L - 1, 'oak_fence'); }
  for (let z = 1; z < L - 1; z++) { set(0, 3, z, 'oak_fence'); set(W - 1, 3, z, 'oak_fence'); }
  set(7, 3, L - 1, 'oak_fence_gate', { facing: 'south', open: 'false' });
  set(0, 4, 0, 'torch');
  set(W - 1, 4, 0, 'torch');
  set(0, 4, L - 1, 'torch');
  set(W - 1, 4, L - 1, 'torch');

  // Camino y flores.
  for (let z = hz1 + 2; z < L - 1; z++) set(7, 2, z, 'dirt_path');
  const flowers = ['poppy', 'dandelion', 'blue_orchid', 'allium', 'oxeye_daisy', 'cornflower', 'pink_tulip'];
  let k = 0;
  for (let z = hz1 + 2; z < L - 2; z += 2) {
    set(5, 3, z, flowers[k++ % flowers.length]);
    set(9, 3, z, flowers[k++ % flowers.length]);
  }
  for (const [x, z] of [[13, 3], [20, 9], [2, 14], [12, 17], [3, 18], [20, 2]]) set(x, 3, z, 'short_grass');
  for (const [x, z] of [[1, 12], [13, 8]]) { set(x, 3, z, 'tall_grass', { half: 'lower' }); set(x, 4, z, 'tall_grass', { half: 'upper' }); }

  return s;
}
