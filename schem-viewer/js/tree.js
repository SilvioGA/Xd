// Roble gigante (~45 bloques de alto): tronco con la base ensanchada, raíces que se
// hunden en el suelo, ramas generadas de forma recursiva, copas frondosas, lianas,
// musgo en la cara norte, hongos de repisa, colmena, farolillos y un columpio.
// El suelo lleva podzol, helechos, flores, setas, rocas y un tronco caído.

import { Schematic } from './schematic.js';
import { rng, finalizeConnections } from './lobby.js';

export const TREE_GROUND = 2; // Y de la capa de césped

export function buildTree() {
  const W = 57;
  const L = 57;
  const H = 54;
  const G = TREE_GROUND;
  const CX = 28.5;
  const CZ = 28.5;
  const s = new Schematic(W, H, L);
  s.format = 'Ejemplo integrado';
  s.meta = { name: 'Roble gigante', author: 'Visor de Schematics', dataVersion: 3465 };
  const rand = rng(31337);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const inside = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < W && y < H && z < L;
  const set = (x, y, z, name, props) => { if (inside(x, y, z)) s.set(x, y, z, name, props); };
  const get = (x, y, z) => (inside(x, y, z) ? s.palette[s.get(x, y, z)].name.slice(10) : 'out');
  const isAir = (x, y, z) => get(x, y, z) === 'air';
  const isWood = (x, y, z) => /_wood$/.test(get(x, y, z));

  // ---------- Suelo ----------
  const R = 27.5;
  for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    const d = Math.hypot(x + 0.5 - CX, z + 0.5 - CZ);
    if (d > R) continue;
    set(x, 0, z, 'stone');
    set(x, 1, z, 'dirt');
    let top = 'grass_block';
    if (d < 9 + Math.sin(Math.atan2(z - CZ, x - CX) * 5) * 1.5) top = rand() < 0.75 ? 'podzol' : 'coarse_dirt';
    else if (rand() < 0.05) top = 'coarse_dirt';
    else if (rand() < 0.06) top = 'moss_block';
    if (d > R - 1) top = 'mossy_cobblestone';
    set(x, G, z, top);
  }

  // ---------- Madera: segmentos con radio variable ----------
  const segments = [];
  const barkAt = (x, y, z) => {
    const n = Math.sin(x * 0.9 + y * 0.35) + Math.sin(z * 0.8 - y * 0.5) + Math.sin((x + z) * 0.4 + y * 0.9);
    return n > 1.6 ? 'dark_oak_wood' : 'oak_wood'; // vetas de corteza más oscura
  };
  const segment = (a, b, ra, rb) => {
    segments.push({ a, b, ra, rb });
    const r = Math.max(ra, rb) + 1;
    const x0 = Math.floor(Math.min(a[0], b[0]) - r), x1 = Math.ceil(Math.max(a[0], b[0]) + r);
    const y0 = Math.floor(Math.min(a[1], b[1]) - r), y1 = Math.ceil(Math.max(a[1], b[1]) + r);
    const z0 = Math.floor(Math.min(a[2], b[2]) - r), z1 = Math.ceil(Math.max(a[2], b[2]) + r);
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const len2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1;
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const p = [x + 0.5, y + 0.5, z + 0.5];
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / len2));
      const d = Math.hypot(p[0] - a[0] - ab[0] * t, p[1] - a[1] - ab[1] * t, p[2] - a[2] - ab[2] * t);
      if (d <= ra + (rb - ra) * t && (y > G || d < ra * 0.6)) set(x, y, z, barkAt(x, y, z), { axis: 'y' });
    }
  };
  // Curva suave entre dos puntos con un desvío en el medio, dividida en tramos.
  const limb = (a, b, ra, rb, bend = 0) => {
    const mid = [(a[0] + b[0]) / 2 + (rand() - 0.5) * bend, (a[1] + b[1]) / 2 + (rand() - 0.5) * bend * 0.5, (a[2] + b[2]) / 2 + (rand() - 0.5) * bend];
    const pts = [];
    const n = 6;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push([0, 1, 2].map((k) => (1 - t) ** 2 * a[k] + 2 * (1 - t) * t * mid[k] + t * t * b[k]));
    }
    for (let i = 0; i < n; i++) segment(pts[i], pts[i + 1], ra + ((rb - ra) * i) / n, ra + ((rb - ra) * (i + 1)) / n);
    return pts;
  };

  // Tronco con ligera curva y base ensanchada.
  const trunkTop = [CX + 1.2, G + 28, CZ - 0.8];
  const trunk = limb([CX, G + 0.5, CZ], trunkTop, 3.6, 2.2, 2);
  for (let y = G + 1; y <= G + 7; y++) {
    const r = 3.6 + 2.8 * Math.exp(-(y - G - 1) / 1.6);
    segment([CX, y, CZ], [CX, y + 0.5, CZ], r, r);
  }
  const trunkAt = (h) => {
    const t = h / 28;
    const i = Math.min(trunk.length - 2, Math.floor(t * (trunk.length - 1)));
    const f = t * (trunk.length - 1) - i;
    return [0, 1, 2].map((k) => trunk[i][k] * (1 - f) + trunk[i + 1][k] * f);
  };

  // Raíces superficiales que se hunden al alejarse.
  for (let i = 0; i < 9; i++) {
    const az = (i / 9) * Math.PI * 2 + (rand() - 0.5) * 0.4;
    const len = 8 + rand() * 5;
    const a = [CX + Math.cos(az) * 2.5, G + 2.2, CZ + Math.sin(az) * 2.5];
    const b = [CX + Math.cos(az) * (3 + len), G - 0.3, CZ + Math.sin(az) * (3 + len)];
    limb(a, b, 1.7, 0.55, 3);
  }

  // Ramas recursivas.
  const clusters = [];
  const grow = (start, az, el, len, r0, depth, lift = 0) => {
    const dir = [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)];
    const end = start.map((v, k) => v + dir[k] * len);
    const r1 = Math.max(0.75, r0 * 0.55); // con menos de ~0,75 las ramitas quedan unidas solo en diagonal
    const pts = limb(start, end, r0, r1, len * 0.25);
    if (depth === 3) {
      clusters.push({ c: end, r: 3.2 + rand() * 0.8 });
      return pts;
    }
    const kids = depth === 1 ? 3 : 2 + (rand() < 0.5 ? 1 : 0);
    for (let k = 0; k < kids; k++) {
      const p = pts[3 + Math.floor(rand() * 3)];
      const side = k % 2 ? 1 : -1;
      grow(p, az + side * (0.35 + rand() * 0.45), Math.min(1.2, el + 0.1 + lift + rand() * 0.25), len * (0.55 + rand() * 0.15), r1, depth + 1);
    }
    clusters.push({ c: end, r: depth === 1 ? 4.6 : 3.8 + rand() * 0.6 });
    if (depth === 2) clusters.push({ c: pts[4], r: 2.8 }); // relleno entre copas
    return pts;
  };
  const MAIN = 7;
  let swingPts = null;
  for (let i = 0; i < MAIN; i++) {
    const h = i === 0 ? 17 : 14 + (i / (MAIN - 1)) * 12;
    // La rama 0 apunta al sur (hacia quien mira) y es casi horizontal: de ella cuelga el columpio.
    const az = i === 0 ? Math.PI / 2 : (i / MAIN) * Math.PI * 2 + Math.PI / 2 + (rand() - 0.5) * 0.5;
    const el = i === 0 ? 0.12 : 0.35 + rand() * 0.35;
    const len = i === 0 ? 13 : 11 + rand() * 4;
    const pts = grow(trunkAt(h), az, el, len, i === 0 ? 1.6 : 1.8 - i * 0.08, 1, i === 0 ? 0.35 : 0);
    if (i === 0) swingPts = pts;
  }
  // Guías de la copa.
  for (const az of [0.4, 2.6, 4.5]) grow(trunkTop, az, 1.05, 11, 1.7, 2);

  // ---------- Hojas ----------
  const leafNoise = (x, y, z) => Math.sin(x * 0.7 + z * 0.3) + Math.sin(y * 0.9 - x * 0.4) + Math.sin(z * 0.6 + y * 0.5);
  for (const { c, r } of clusters) {
    for (let y = Math.floor(c[1] - r); y <= c[1] + r; y++) for (let z = Math.floor(c[2] - r); z <= c[2] + r; z++) for (let x = Math.floor(c[0] - r); x <= c[0] + r; x++) {
      const dy = (y + 0.5 - c[1]) * (y + 0.5 < c[1] ? 1.6 : 1.15); // copa aplanada por debajo
      const d = Math.hypot(x + 0.5 - c[0], dy, z + 0.5 - c[2]);
      if (d > r + leafNoise(x, y, z) * 0.35 || (d > r - 1 && rand() < 0.3) || !isAir(x, y, z)) continue;
      const n = leafNoise(x * 0.5, y * 0.5, z * 0.5);
      const leaf = n > 1.3 ? 'dark_oak_leaves' : n < -1.6 ? 'azalea_leaves' : rand() < 0.012 ? 'flowering_azalea_leaves' : 'oak_leaves';
      set(x, y, z, leaf, { persistent: 'true', distance: '1' });
    }
  }

  // ---------- Detalles del tronco y las ramas ----------
  // Musgo en la cara norte del tronco (z menor) y sobre raíces y ramas bajas.
  for (let y = G + 1; y <= G + 16; y++) for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    if (!isWood(x, y, z)) continue;
    const north = isAir(x, y, z - 1);
    const d = Math.hypot(x + 0.5 - CX, z + 0.5 - CZ);
    if (north && d < 7 && y < G + 12 && rand() < 0.55) set(x, y, z, 'moss_block');
    else if (isAir(x, y + 1, z) && rand() < 0.35) set(x, y + 1, z, 'moss_carpet');
  }
  // Hongos de repisa en el tronco.
  for (const [az, h] of [[0.6, 6], [2.4, 9], [3.9, 5], [5.2, 11], [1.4, 13]]) {
    const p = trunkAt(h);
    for (let r = 2; r <= 8; r++) {
      const x = Math.floor(p[0] + Math.cos(az) * r);
      const z = Math.floor(p[2] + Math.sin(az) * r);
      const y = Math.floor(p[1]);
      if (isWood(x, y, z) || get(x, y, z) === 'moss_block') continue;
      set(x, y, z, 'brown_mushroom_block');
      const ox = x + Math.round(Math.sin(az));
      const oz = z - Math.round(Math.cos(az));
      if (isAir(ox, y, oz)) set(ox, y, oz, 'brown_mushroom_block');
      break;
    }
  }
  // Lianas colgando de las copas.
  for (let y = G + 6; y < H; y++) for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    if (!/leaves$/.test(get(x, y, z)) || !isAir(x, y - 1, z) || rand() > 0.045) continue;
    // Lianas de bayas brillantes: cuelgan de cualquier bloque y no se caen.
    const len = 1 + Math.floor(rand() * 5);
    let i = 1;
    while (i < len && isAir(x, y - i - 1, z) && y - i - 1 > G + 2) {
      set(x, y - i, z, 'cave_vines_plant', { berries: rand() < 0.15 ? 'true' : 'false' });
      i++;
    }
    if (isAir(x, y - i, z) && y - i > G + 2) set(x, y - i, z, 'cave_vines', { berries: rand() < 0.2 ? 'true' : 'false', age: '25' });
  }

  // Columpio en la rama que apunta al sur.
  const sp = swingPts[4];
  const sz = Math.floor(sp[2]);
  const ropeX = [Math.floor(sp[0]) - 1, Math.floor(sp[0]) + 1];
  let bottom = -1;
  for (let y = Math.floor(sp[1]) + 2; y > G + 5 && bottom < 0; y--) {
    if (isWood(ropeX[0], y, sz) || isWood(ropeX[1], y, sz) || isWood(Math.floor(sp[0]), y, sz)) bottom = y;
  }
  if (bottom > 0) {
    for (const x of ropeX) {
      if (!isWood(x, bottom, sz)) set(x, bottom, sz, barkAt(x, bottom, sz), { axis: 'z' });
      for (let y = bottom - 1; y >= G + 3; y--) set(x, y, sz, 'chain', { axis: 'y' });
    }
    for (let x = ropeX[0]; x <= ropeX[1]; x++) set(x, G + 2, sz, 'oak_slab', { type: 'top' });
    set(Math.floor(sp[0]), G + 2, sz, 'oak_slab', { type: 'top' });
  }

  // Colmena y farolillos bajo ramas.
  let placedNest = false;
  let lanterns = 0;
  for (const { a, b } of segments) {
    if (a[1] < G + 12 || a[1] > G + 26) continue;
    const x = Math.floor((a[0] + b[0]) / 2);
    const z = Math.floor((a[2] + b[2]) / 2);
    let y = Math.floor((a[1] + b[1]) / 2) + 2;
    while (y > G && !isWood(x, y, z)) y--;
    while (y > G && isWood(x, y - 1, z)) y--; // parte de abajo de la rama
    if (!isWood(x, y, z) || !isAir(x, y - 1, z) || !isAir(x, y - 2, z)) continue;
    const d = Math.hypot(x - CX, z - CZ);
    if (!placedNest && d > 6 && d < 11) { set(x, y - 1, z, 'bee_nest', { facing: 'south', honey_level: '5' }); placedNest = true; continue; }
    if (lanterns < 3 && d > 10 && rand() < 0.3 && isAir(x, y - 3, z)) {
      set(x, y - 1, z, 'chain', { axis: 'y' });
      set(x, y - 2, z, 'lantern', { hanging: 'true' });
      lanterns++;
    }
  }

  // ---------- Suelo: tronco caído, rocas y plantas ----------
  const logZ = 10;
  for (let x = 38; x <= 47; x++) {
    set(x, G + 1, logZ, 'oak_log', { axis: 'x' });
    if (rand() < 0.5) set(x, G + 2, logZ, 'moss_carpet');
    if (x % 3 === 0) set(x, G + 1, logZ + 1, pick(['brown_mushroom', 'red_mushroom']));
  }
  for (const [bx, bz, br] of [[9, 36, 2.2], [44, 40, 1.8], [14, 13, 1.6], [36, 49, 1.5]]) {
    for (let y = G + 1; y <= G + 3; y++) for (let z = bz - 3; z <= bz + 3; z++) for (let x = bx - 3; x <= bx + 3; x++) {
      if (Math.hypot(x - bx, (y - G - 0.5) * 1.4, z - bz) <= br && isAir(x, y, z)) set(x, y, z, pick(['mossy_cobblestone', 'cobblestone', 'andesite', 'mossy_cobblestone']));
    }
  }
  const flowers = ['lily_of_the_valley', 'azure_bluet', 'dandelion', 'poppy', 'oxeye_daisy', 'cornflower', 'allium'];
  for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    const ground = get(x, G, z);
    if (!isAir(x, G + 1, z) || !['grass_block', 'podzol', 'coarse_dirt', 'moss_block'].includes(ground)) continue;
    const d = Math.hypot(x + 0.5 - CX, z + 0.5 - CZ);
    const r = rand();
    if (d < 11) {
      if (r < 0.12) set(x, G + 1, z, 'fern');
      else if (r < 0.17) set(x, G + 1, z, pick(['brown_mushroom', 'red_mushroom']));
      else if (r < 0.22) set(x, G + 1, z, 'moss_carpet');
    } else if (ground === 'grass_block') {
      if (r < 0.07) set(x, G + 1, z, pick(flowers));
      else if (r < 0.25) set(x, G + 1, z, 'short_grass');
      else if (r < 0.29) set(x, G + 1, z, 'fern');
      else if (r < 0.31 && isAir(x, G + 2, z)) { set(x, G + 1, z, 'tall_grass', { half: 'lower' }); set(x, G + 2, z, 'tall_grass', { half: 'upper' }); }
    }
  }

  finalizeConnections(s);
  return s;
}
