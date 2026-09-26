// Ratón piloto en go-kart: estatua de unos 25 bloques de alto, de perfil y mirando al este (+x).
// Kart rojo con franjas blancas, morro, alerón, motor con tubos de escape, volante y ruedas con
// llantas; el ratón lleva casco con gafas de piloto, bufanda amarilla al viento y guantes
// blancos. Está sobre una pista con bordillos, línea de meta a cuadros, arco de meta,
// neumáticos apilados y una nube de polvo detrás. Se modela con formas simples (cajas,
// elipsoides, cilindros y cápsulas) que luego se pasan a bloques.

import { Schematic } from './schematic.js';
import { rng } from './lobby.js';

const mkEll = (p, c, r) => Math.hypot((p[0] - c[0]) / r[0], (p[1] - c[1]) / r[1], (p[2] - c[2]) / r[2]);
const mkSeg = (p, a, b) => {
  const ab = b.map((v, i) => v - a[i]);
  const len2 = ab.reduce((acc, v) => acc + v * v, 0);
  const t = Math.max(0, Math.min(1, p.reduce((acc, v, i) => acc + (v - a[i]) * ab[i], 0) / len2));
  return { t, d: Math.hypot(...p.map((v, i) => v - a[i] - ab[i] * t)) };
};
const mkChain = (p, pts, r) => pts.slice(1).some((b, i) => mkSeg(p, pts[i], b).d <= r);
const mkBox = (p, x0, x1, y0, y1, z0, z1) => p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1 && p[2] >= z0 && p[2] <= z1;

// Ruedas: centro, radio y media anchura (eje z).
const MK_WHEELS = [
  { c: [11, 2.9, 8.4], r: 2.9, w: 1.3 }, { c: [11, 2.9, -8.4], r: 2.9, w: 1.3 },
  { c: [-9, 3.4, 8.7], r: 3.4, w: 1.8 }, { c: [-9, 3.4, -8.7], r: 3.4, w: 1.8 },
];
const MK_HEAD = { c: [-2.8, 15.6, 0], r: [4, 3.6, 3.6] };
const MK_TAIL = [[-7.5, 6.5, 1.5], [-12, 8.5, 4], [-15, 11, 5.5], [-15.5, 14.5, 5], [-13.8, 16.2, 4.2]];
const MK_SCARF = [[-5.8, 12.4, 2.4], [-9.5, 13.3, 3.6], [-13, 12.4, 4.6], [-16, 13.4, 5.4]];

function mouseKartAt(p) {
  const [x, y, z] = p;
  // ---- Ratón ----
  // Orejas redondas, rosas por dentro.
  for (const sd of [-1, 1]) {
    const c = [-4.2, 20.2, sd * 3.3];
    if (mkEll(p, c, [2.9, 2.9, 0.9]) <= 1) return mkEll(p, [-3.9, 20.1, sd * 3.9], [2.1, 2.1, 0.6]) <= 1 ? 'pink_concrete' : 'light_gray_wool';
  }
  // Nariz, hocico y cabeza con casco y gafas.
  if (mkEll(p, [3.7, 14.9, 0], [0.95, 0.95, 0.95]) <= 1) return 'pink_concrete';
  if (mkEll(p, [1.2, 14.6, 0], [2.7, 2, 2.1]) <= 1) return y < 13.6 ? 'white_wool' : 'light_gray_wool';
  if (mkEll(p, MK_HEAD.c, MK_HEAD.r.map((v) => v * 1.13)) <= 1 && y > 16.1 && x < 0.2) {
    if (y > 17.1 && y < 18.4 && x > -1.8) return Math.abs(Math.abs(z) - 1.7) < 0.9 ? 'light_blue_stained_glass' : 'black_concrete';
    return Math.abs(z) < 0.7 ? 'white_concrete' : 'red_concrete';
  }
  if (mkEll(p, MK_HEAD.c, MK_HEAD.r) <= 1) return 'light_gray_wool';
  // Bufanda al viento.
  const nd = Math.hypot(x + 3.3, z);
  if (Math.abs(y - 12.3) < 0.8 && nd > 2.2 && nd < 3.3) return 'yellow_wool';
  if (mkChain(p, MK_SCARF, 0.95) && Math.abs(y - (12.8 + Math.sin(x) * 0.4)) < 0.9) return 'yellow_wool';
  // Guantes en el volante, brazos, piernas y pies.
  for (const sd of [-1, 1]) {
    if (mkEll(p, [2.4, 9.8, sd * 1.9], [1.1, 1.1, 1.1]) <= 1) return 'white_wool';
    if (mkSeg(p, [-3.6, 11.3, sd * 2.9], [1.8, 9.6, sd * 1.9]).d <= 1.05) return 'light_gray_wool';
    if (mkEll(p, [5, 5.1, sd * 1.6], [1.2, 0.9, 1]) <= 1) return 'pink_concrete';
    if (mkSeg(p, [-3, 6, sd * 1.6], [4.2, 5.1, sd * 1.6]).d <= 1.15) return 'light_gray_wool';
  }
  // Cuerpo con la barriga blanca.
  if (mkEll(p, [-4.4, 8.6, 0], [3, 3.9, 3.2]) <= 1) return x > -2.6 && Math.abs(z) < 2 ? 'white_wool' : 'light_gray_wool';
  // Cola rosa.
  if (mkChain(p, MK_TAIL, 0.62)) return 'pink_wool';

  // ---- Kart ----
  // Volante (aro, radios y columna).
  const wd = Math.hypot(y - 9, z);
  if (x >= 1.4 && x <= 2.6 && wd <= 2.3) {
    if (wd > 1.3) return 'black_concrete';
    if (Math.abs(z) < 0.5 || Math.abs(y - 9) < 0.5) return 'gray_concrete';
  }
  if (mkSeg(p, [6.5, 4, 0], [2.2, 8.7, 0]).d <= 0.55) return 'black_concrete';
  // Ruedas: neumático negro, llanta gris y buje.
  for (const wh of MK_WHEELS) {
    const d = Math.hypot(x - wh.c[0], y - wh.c[1]);
    if (d <= wh.r && Math.abs(z - wh.c[2]) <= wh.w) {
      if (d > wh.r - 1.1) return 'black_concrete';
      return d < 0.8 ? 'iron_block' : Math.abs(z) > Math.abs(wh.c[2]) + wh.w - 0.6 ? 'light_gray_concrete' : 'gray_concrete';
    }
  }
  // Ejes.
  if ((Math.hypot(x - 11, y - 2.9) < 0.6 || Math.hypot(x + 9, y - 3.4) < 0.6) && Math.abs(z) < 8) return 'gray_concrete';
  // Asiento, motor y tubos de escape, alerón.
  if (mkBox(p, -8.6, -7.2, 3.5, 11.2, -3, 3) || mkBox(p, -8.2, -1.8, 3.5, 5, -3, 3)) return 'black_concrete';
  for (const sd of [-1, 1]) {
    const e = mkSeg(p, [-11, 6, sd * 2.5], [-14, 9.4, sd * 2.5]);
    if (e.d <= 0.65) return e.t > 0.85 ? 'black_concrete' : 'light_gray_concrete';
  }
  if (mkBox(p, -12.2, -8.6, 3.5, 7.2, -3.6, 3.6)) return Math.floor(x) % 2 ? 'iron_block' : 'gray_concrete';
  if (mkBox(p, -14.2, -12, 10.5, 11.4, -8.2, 8.2)) return Math.abs(z) > 7.2 ? 'white_concrete' : 'red_concrete';
  for (const sd of [-1, 1]) if (mkBox(p, -13.4, -12.6, 7, 10.5, sd * 5 - 0.5, sd * 5 + 0.5)) return 'black_concrete';
  // Pontones laterales con franja blanca y el número 1 en un círculo blanco.
  if (mkBox(p, -5, 7, 1.8, 5.3, 5, 7.9) || mkBox(p, -5, 7, 1.8, 5.3, -7.9, -5)) {
    const cd = Math.hypot(x - 1, y - 3.5);
    if (Math.abs(z) > 7.2 && cd < 1.9) return Math.abs(x - 1) < 0.5 && y > 2.2 && y < 4.8 ? 'black_concrete' : 'white_concrete';
    return y > 4.2 && y < 4.9 ? 'white_concrete' : 'red_concrete';
  }
  // Chasis, morro y alerón delantero, parachoques trasero.
  if (mkBox(p, -12.5, 13, 1.8, 3.6, -6.5, 6.5)) return 'red_concrete';
  if (x > 13 && x <= 18 && y >= 1.8 && y <= 3.6 - (x - 13) * 0.28 && Math.abs(z) <= 4.6 - (x - 13) * 0.55) return 'red_concrete';
  if (mkBox(p, 17, 19.2, 1.1, 2.1, -7.6, 7.6)) return Math.abs(z) > 6.4 ? 'red_concrete' : 'white_concrete';
  if (mkBox(p, -13.6, -12.4, 1.5, 3.1, -7, 7)) return 'black_concrete';
  return null;
}

export function buildMouseKart() {
  const W = 58;
  const L = 36;
  const H = 34;
  const OX = 27; // x del mundo del origen del kart
  const OY = 2; // las ruedas apoyan en y = 2 (la pista está en y = 1)
  const OZ = 17;
  const s = new Schematic(W, H, L);
  s.format = 'Ejemplo integrado';
  s.meta = { name: 'Ratón en go-kart', author: 'Visor de Schematics', dataVersion: 3465, spawn: [OX + 0.5, 2, L - 1.5, 0] };
  const rand = rng(4040);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const inside = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < W && y < H && z < L;
  const set = (x, y, z, name, props) => { if (inside(x, y, z)) s.set(x, y, z, name, props); };
  const get = (x, y, z) => (inside(x, y, z) ? s.palette[s.get(x, y, z)].name.slice(10) : 'out');
  const isAir = (x, y, z) => get(x, y, z) === 'air';

  // Pista: asfalto entre bordillos rojos y blancos, con césped fuera y la línea de meta a cuadros.
  const R0 = 5;
  const R1 = 29;
  const FINISH = 47;
  for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    set(x, 0, z, 'dirt');
    let top;
    if (z < R0 - 1 || z > R1 + 1) top = 'grass_block';
    else if (z === R0 - 1 || z === R1 + 1) top = Math.floor(x / 2) % 2 ? 'red_concrete' : 'white_concrete';
    else if (x === FINISH || x === FINISH + 1) top = (x + z) % 2 ? 'black_concrete' : 'white_concrete';
    else top = rand() < 0.06 ? 'black_concrete' : rand() < 0.05 ? 'light_gray_concrete' : 'gray_concrete';
    set(x, 1, z, top);
  }
  // Líneas discontinuas en el centro.
  for (let x = 1; x < W; x += 6) for (let dx = 0; dx < 3; dx++) if (x + dx !== FINISH && x + dx !== FINISH + 1) set(x + dx, 1, OZ, 'white_concrete');

  // Arco de meta con pancarta a cuadros.
  for (const z of [R0 - 3, R1 + 3]) {
    for (let y = 2; y <= 18; y++) for (const x of [FINISH, FINISH + 1]) set(x, y, z, y % 4 === 0 ? 'white_concrete' : 'red_concrete');
    set(FINISH, 19, z, 'gold_block');
    set(FINISH + 1, 19, z, 'gold_block');
  }
  for (let z = R0 - 3; z <= R1 + 3; z++) for (let y = 16; y <= 18; y++) for (const x of [FINISH, FINISH + 1]) set(x, y, z, (Math.floor(z / 1) + y + x) % 2 ? 'black_wool' : 'white_wool');

  // El kart con el ratón.
  for (let y = OY; y < H; y++) for (let z = OZ - 12; z <= OZ + 12; z++) for (let x = OX - 17; x <= OX + 20; x++) {
    const m = mouseKartAt([x + 0.5 - OX, y + 0.5 - OY, z + 0.5 - OZ]);
    if (m) set(x, y, z, m);
  }
  // Ojos negros con brillo (mirando al frente), dientes y bigotes.
  for (const sd of [-1, 1]) {
    const y = OY + 15;
    const z = OZ + (sd > 0 ? 1 : -2);
    let x = OX + 6;
    while (x > OX - 3 && isAir(x, y, z)) x--;
    set(x, y, z, 'black_concrete');
    set(x, y + 1, z, 'black_concrete');
    if (!isAir(x, y + 1, z + sd)) set(x, y + 1, z + sd, 'white_concrete');
    for (const dy of [0, 1]) set(OX + 2, OY + 14 + dy, OZ + (sd > 0 ? 2 : -3), 'end_rod', { facing: sd > 0 ? 'south' : 'north' });
  }
  set(OX + 2, OY + 12, OZ, 'white_concrete');
  set(OX + 2, OY + 12, OZ - 1, 'white_concrete');

  // Nube de polvo detrás del kart.
  for (const [cx, cy, cz, r] of [[-17, 3, 6, 2.2], [-20, 4, 3, 2.6], [-23, 5, 7, 2], [-19, 2.5, -5, 2], [-22.5, 4, -2, 2.4]]) {
    for (let y = 2; y < 9; y++) for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
      if (Math.hypot(x + 0.5 - (OX + cx), y + 0.5 - (OY + cy), z + 0.5 - (OZ + cz)) <= r && isAir(x, y, z)) set(x, y, z, pick(['white_wool', 'white_concrete_powder', 'light_gray_wool']));
    }
  }

  // Neumáticos apilados en las esquinas de la pista.
  for (const [x, z] of [[2, 1], [5, 1], [52, 1], [55, 1], [2, 33], [5, 33], [52, 33], [55, 33]]) {
    for (let y = 2; y <= 4; y++) {
      for (let dz = 0; dz <= 1; dz++) for (let dx = 0; dx <= 1; dx++) set(x + dx, y, z + dz, y === 3 ? 'white_wool' : 'black_wool');
    }
  }
  // Banderas a cuadros en el césped.
  for (const [x, z] of [[20, 1], [36, 1], [20, 33], [36, 33]]) {
    for (let y = 2; y <= 6; y++) set(x, y, z, 'iron_bars');
    set(x + 1, 6, z, 'black_wool');
    set(x + 2, 6, z, 'white_wool');
    set(x + 1, 5, z, 'white_wool');
    set(x + 2, 5, z, 'black_wool');
  }
  return s;
}
