// Lobby japonés de 50×100. El jugador aparece en el extremo sur (z alto) mirando
// al norte, y todo el recorrido queda delante: torii gigante, túnel de torii,
// puente rojo sobre el arroyo, santuarios de modos de juego, jardín zen, pagoda
// y el templo principal al fondo. Bloques de Minecraft 1.20+.

import { finalizeConnections } from './lobby.js';
import { createJapaneseKit } from './jp-kit.js';

export const JAPAN_SURFACE = 16;
// Celda donde queda el jugador al pegar (centro de la plaza de aparición).
export const JAPAN_SPAWN = [25, JAPAN_SURFACE + 1, 92];

export function buildJapaneseLobby() {
  const kit = createJapaneseKit({ W: 50, L: 100, H: 56, S: JAPAN_SURFACE, seed: 2024, name: 'Lobby japonés 50×100' });
  const { s, S, W, L, rand, pick, set, get, isAir, fill, sdf, RED, BLACK, torii, toro, roof, cherry, maple, bamboo, pagoda } = kit;

  kit.baseIsland();

  // ---------- Camino central ----------
  const pathZ0 = 28;
  const pathZ1 = 86;
  for (let z = pathZ0; z <= pathZ1; z++) for (let x = 22; x <= 27; x++) {
    const edge = x === 22 || x === 27;
    const tile = ((Math.floor((x - 23) / 2) + Math.floor(z / 2)) % 2 + 2) % 2;
    set(x, S, z, edge ? 'gravel' : tile ? 'polished_andesite' : 'smooth_stone');
  }

  kit.perimeterWall();

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
  pagoda({ x: 40, z: 35 }, {
    base: 5,
    stairs: 'west',
    tiers: [{ hw: 4, h: 4 }, { hw: 3, h: 3 }, { hw: 3, h: 3 }, { hw: 2, h: 3 }, { hw: 2, h: 3 }],
  });
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

  const [spx, spy, spz] = JAPAN_SPAWN;
  s.meta.spawn = [spx + 0.5, spy, spz + 0.5, 0]; // mirando al norte
  finalizeConnections(s);
  return s;
}
