// Lobby de SkyWars de estética japonesa (50×76). El jugador aparece al sur mirando
// al norte y lo tiene todo delante: torii, jardín de agua con puente rojo, podio del
// ranking, pabellón de kits y, al fondo, el muro de carteles para unirse a las
// partidas, con el título SKYWARS y una pagoda detrás. Encima flotan islas como
// las de una partida. Bloques de Minecraft 1.20+.

import { finalizeConnections } from './lobby.js';
import { createJapaneseKit } from './jp-kit.js';
import { signNbt } from './schem-writer.js';

export const SKYWARS_SURFACE = 14;
export const SKYWARS_SPAWN = [25, SKYWARS_SURFACE + 1, 66];

// Letras de 3×5 (y la W de 5×5) para el título.
const FONT = {
  S: ['111', '100', '111', '001', '111'],
  K: ['101', '101', '110', '101', '101'],
  Y: ['101', '101', '010', '010', '010'],
  W: ['10001', '10001', '10101', '10101', '01010'],
  A: ['010', '101', '111', '101', '101'],
  R: ['110', '101', '110', '101', '101'],
};

const SOLO_MAPS = ['Sakura', 'Fuji', 'Kioto', 'Edo', 'Nara', 'Osaka', 'Kobe', 'Nikko', 'Hakone', 'Kamakura', 'Sapporo', 'Okinawa',
  'Hanami', 'Tsuki', 'Kaze', 'Yuki', 'Hoshi', 'Kumo', 'Umi', 'Mori', 'Yama', 'Kawa', 'Hana', 'Tora'];
const DUO_MAPS = ['Ryu', 'Kitsune', 'Tanuki', 'Koi', 'Tengu', 'Oni', 'Kappa', 'Neko', 'Taka', 'Kame', 'Tsuru', 'Inari',
  'Samurai', 'Ninja', 'Ronin', 'Shogun', 'Sensei', 'Daimyo', 'Katana', 'Shuriken', 'Bonsai', 'Origami', 'Zen', 'Kami'];

export function buildSkyWarsLobby() {
  const kit = createJapaneseKit({ W: 50, L: 76, H: 52, S: SKYWARS_SURFACE, seed: 7, name: 'Lobby SkyWars japonés' });
  const { s, S, W, rand, pick, set, get, isAir, sdf, RED, BLACK, torii, toro, roof, cherry, maple, bamboo, pagoda } = kit;

  kit.baseIsland();

  // ---------- Camino central ----------
  for (let z = 24; z <= 62; z++) for (let x = 22; x <= 27; x++) {
    const edge = x === 22 || x === 27;
    const tile = ((Math.floor((x - 23) / 2) + Math.floor(z / 2)) % 2 + 2) % 2;
    set(x, S, z, edge ? 'gravel' : tile ? 'polished_andesite' : 'smooth_stone');
  }
  kit.perimeterWall();

  // ---------- Pagoda de fondo (se ve por encima del muro de carteles) ----------
  pagoda({ x: 24, z: 6 }, {
    base: 4,
    stairs: 'south',
    tiers: [{ hw: 3, h: 4 }, { hw: 3, h: 3 }, { hw: 2, h: 3 }, { hw: 2, h: 3 }, { hw: 1, h: 3 }],
  });
  cherry(12, 7, 3, 101);
  cherry(37, 7, 3, 102);

  // ---------- Muro de carteles ----------
  const FACE = 18; // fachada; los carteles van en z = 19 mirando al sur
  const X0 = 9;
  const X1 = 40;
  const pillars = new Set([9, 14, 19, 30, 35, 40]);
  const bays = [
    { x0: 10, maps: SOLO_MAPS.slice(0, 12), mode: 'Solo', wood: 'cherry', stripe: 'light_blue_concrete', color: 'dark_aqua' },
    { x0: 15, maps: SOLO_MAPS.slice(12), mode: 'Solo', wood: 'cherry', stripe: 'light_blue_concrete', color: 'dark_aqua' },
    { x0: 31, maps: DUO_MAPS.slice(0, 12), mode: 'Duos', wood: 'bamboo', stripe: 'orange_concrete', color: 'gold' },
    { x0: 36, maps: DUO_MAPS.slice(12), mode: 'Duos', wood: 'bamboo', stripe: 'orange_concrete', color: 'gold' },
  ];
  // Cuerpo del edificio (fachada, laterales y fondo).
  for (let y = S + 1; y <= S + 12; y++) for (let z = 14; z <= FACE; z++) for (let x = X0; x <= X1; x++) {
    const front = z === FACE;
    const shell = front || z === 14 || x === X0 || x === X1;
    if (!shell) continue;
    let m = 'white_terracotta';
    if (y === S + 1) m = 'stone_bricks';
    else if (y === S + 6 || y === S + 12) m = 'dark_oak_log';
    else if (pillars.has(x) && y <= S + 5) m = RED;
    else if (front && y >= S + 7 && y <= S + 11) m = x === X0 || x === X1 ? 'dark_oak_log' : 'black_concrete';
    else if (front && y === S + 5) m = x >= 20 && x <= 29 ? 'gold_block' : bays.find((b) => x >= b.x0 && x < b.x0 + 4)?.stripe || RED;
    const props = m === 'dark_oak_log' ? { axis: y === S + 6 || y === S + 12 ? (x === X0 || x === X1 ? 'z' : 'x') : 'y' } : undefined;
    set(x, y, z, m, props);
  }
  // Emblema central: sol rojo sobre blanco con marco dorado.
  for (let y = S + 2; y <= S + 4; y++) for (let x = 20; x <= 29; x++) {
    const dx = x - 24.5;
    const dy = y - (S + 3);
    const sun = Math.hypot(dx * 0.8, dy * 1.2) < 1.9;
    set(x, y, FACE, x === 20 || x === 29 ? 'gold_block' : sun ? 'red_concrete' : 'white_concrete');
  }
  // Título "SKY WARS" en oro, en relieve sobre el panel negro.
  let cx = 10;
  const word = (w) => {
    for (const ch of w) {
      const g = FONT[ch];
      for (let row = 0; row < 5; row++) for (let col = 0; col < g[row].length; col++) {
        if (g[row][col] === '1') set(cx + col, S + 11 - row, FACE + 1, 'gold_block');
      }
      cx += g[0].length + 1;
    }
  };
  word('SKY');
  cx += 1;
  word('WARS');
  // Carteles: 4 columnas × 3 filas por módulo.
  for (const bay of bays) {
    let i = 0;
    for (let y = S + 4; y >= S + 2; y--) for (let x = bay.x0; x < bay.x0 + 4; x++) {
      const map = bay.maps[i++];
      set(x, y, FACE + 1, `${bay.wood}_wall_sign`, { facing: 'south', waterlogged: 'false' });
      s.blockEntities.push({
        id: 'minecraft:sign',
        pos: [x, y, FACE + 1],
        nbt: signNbt([
          { text: '[SkyWars]', color: 'dark_red', bold: true },
          { text: map, color: 'black' },
          { text: bay.mode, color: bay.color },
          { text: 'Clic para unirte', color: 'dark_gray' },
        ]),
      });
    }
  }
  // Tejado curvo sobre el muro, con farolillos colgando del alero.
  roof(6, 12, 43, 22, S + 13);
  for (const x of [9, 14, 19, 30, 35, 40]) set(x, S + 12, 21, 'lantern', { hanging: 'true' });
  // Veranda de madera frente a los carteles.
  for (let z = 19; z <= 23; z++) for (let x = 7; x <= 42; x++) set(x, S, z, z === 23 ? 'stripped_spruce_wood' : 'spruce_planks', z === 23 ? { axis: 'x' } : undefined);
  toro(7, 22, true);
  toro(42, 22, true);
  toro(20, 23);
  toro(29, 23);

  // ---------- Jardín de agua con puente rojo ----------
  for (let z = 24; z <= 38; z++) for (let x = 0; x < W; x++) {
    if (sdf(x, z) > -1.3) continue;
    const stream = z >= 29 && z <= 33;
    const pond = Math.hypot((x - 9) / 7, (z - 31) / 4.6) < 1 || Math.hypot((x - 40) / 7, (z - 31) / 4.6) < 1;
    if (!stream && !pond) continue;
    set(x, S - 2, z, 'clay');
    set(x, S - 1, z, 'water');
    set(x, S, z, 'water');
    if (rand() < 0.07 && !(x >= 21 && x <= 28)) set(x, S + 1, z, 'lily_pad');
    if (rand() < 0.04) set(x, S - 1, z, 'sea_pickle', { pickles: '3', waterlogged: 'true' });
  }
  for (let z = 23; z <= 39; z++) for (let x = 0; x < W; x++) {
    if (get(x, S, z) === 'water' || (x >= 22 && x <= 27) || z < 24) continue;
    const nearWater = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => get(x + dx, S, z + dz) === 'water');
    if (nearWater && sdf(x, z) < -1.2) {
      set(x, S, z, pick(['mossy_cobblestone', 'cobblestone', 'andesite', 'moss_block']));
      if (rand() < 0.25 && isAir(x, S + 1, z)) set(x, S + 1, z, pick(['mossy_cobblestone', 'andesite', 'moss_carpet']));
    }
  }
  for (let z = 26; z <= 36; z++) {
    const dz = z - 31;
    const halves = Math.max(0, Math.round(6 * (1 - (dz / 5.6) ** 2)));
    for (let x = 21; x <= 28; x++) {
      const rail = x === 21 || x === 28;
      const m = Math.floor(halves / 2);
      let topY;
      if (m >= 1) set(x, S + m, z, rail ? RED : 'spruce_planks');
      else set(x, S, z, 'spruce_planks');
      if (halves % 2) {
        set(x, S + m + 1, z, rail ? RED : 'spruce_slab', { type: 'bottom' });
        topY = S + m + 1;
      } else topY = S + m;
      if (rail) {
        set(x, topY + 1, z, 'mangrove_fence');
        if (z === 26 || z === 36 || z === 31) { set(x, topY + 1, z, RED); set(x, topY + 2, z, 'gold_block'); }
      }
    }
  }
  maple(4, 25, 111);
  maple(45, 26, 112);

  // ---------- Podio del ranking (izquierda, mirando al camino) ----------
  for (let z = 39; z <= 51; z++) for (let x = 4; x <= 18; x++) {
    if (sdf(x, z) < -1.5) set(x, S, z, (x + z) % 2 ? 'polished_andesite' : 'stone_bricks');
  }
  const podium = [
    { z: 42, h: 2, top: 'iron_block', color: 'light_gray' },
    { z: 45, h: 3, top: 'gold_block', color: 'yellow' },
    { z: 48, h: 1, top: 'copper_block', color: 'orange' },
  ];
  for (const p of podium) {
    for (let z = p.z; z <= p.z + 2; z++) for (let x = 10; x <= 12; x++) {
      for (let y = S + 1; y < S + p.h; y++) set(x, y, z, 'polished_deepslate');
      set(x, S + p.h, z, p.top);
    }
    set(13, S + 1, p.z + 1, 'polished_deepslate_stairs', { facing: 'west', half: 'bottom' });
    set(7, S + 7, p.z + 1, `${p.color}_wall_banner`, { facing: 'east' });
  }
  // Muro de fondo del podio con tejadillo.
  for (let y = S + 1; y <= S + 9; y++) for (let z = 40; z <= 50; z++) {
    const post = z === 40 || z === 50 || z === 45;
    set(6, y, z, y === S + 1 ? 'stone_bricks' : post ? RED : y === S + 9 ? 'dark_oak_log' : 'white_terracotta', y === S + 9 && !post ? { axis: 'z' } : undefined);
  }
  roof(4, 38, 8, 52, S + 10);
  toro(15, 40);
  toro(15, 50);

  // ---------- Pabellón de kits (derecha) ----------
  for (let z = 39; z <= 51; z++) for (let x = 33; x <= 45; x++) set(x, S, z, 'spruce_planks');
  for (const [x, z] of [[33, 39], [45, 39], [33, 51], [45, 51], [33, 45], [45, 45]]) {
    set(x, S + 1, z, BLACK);
    for (let y = S + 2; y <= S + 6; y++) set(x, y, z, RED);
  }
  for (let x = 33; x <= 45; x++) { set(x, S + 7, 39, 'dark_oak_log', { axis: 'x' }); set(x, S + 7, 51, 'dark_oak_log', { axis: 'x' }); }
  for (let z = 40; z <= 50; z++) { set(33, S + 7, z, 'dark_oak_log', { axis: 'z' }); set(45, S + 7, z, 'dark_oak_log', { axis: 'z' }); }
  roof(31, 37, 47, 53, S + 8);
  const npcs = ['lime', 'purple', 'red'];
  npcs.forEach((color, i) => {
    const z = 42 + i * 3;
    set(39, S + 1, z, 'chiseled_stone_bricks');
    set(39, S + 2, z, `${color}_carpet`);
    set(38, S + 1, z, 'stone_brick_stairs', { facing: 'east', half: 'bottom' });
    for (let y = S + 6; y <= S + 10; y++) set(39, y, z, 'chain', { axis: 'y' }); // hasta el tejado
    set(39, S + 5, z, 'lantern', { hanging: 'true' });
  });
  toro(31, 40);
  toro(31, 50);

  // ---------- Torii y plaza de aparición ----------
  for (const z of [52, 54, 56]) torii({ at: z, a: 21, b: 28, h: 5 });
  torii({ at: 58, a: 20, b: 29, h: 9, plaque: true });
  const SP = { x: 24.5, z: 66 };
  for (let z = 59; z <= 74; z++) for (let x = 16; x <= 33; x++) {
    const d = Math.hypot(x - SP.x, z - SP.z);
    if (d > 6.6 || sdf(x, z) > -1.2) continue;
    const a = Math.atan2(z - SP.z, x - SP.x);
    const petal = d < 1.2 ? 'yellow_concrete' : d < 4.6 * (0.55 + 0.45 * Math.abs(Math.cos((5 * a) / 2))) ? (d < 2.4 ? 'pink_concrete' : 'pink_terracotta') : 'white_concrete';
    set(x, S, z, d > 5.6 ? 'polished_deepslate' : petal);
  }
  toro(18, 66, true);
  toro(31, 66, true);
  cherry(11, 66, 3, 121);
  cherry(38, 66, 3, 122);
  cherry(15, 58, 2, 123);
  cherry(34, 58, 2, 124);

  // Bambú en los márgenes libres.
  for (let z = 50; z <= 72; z++) for (let x = 1; x < W - 1; x++) {
    if (x > 8 && x < 41) continue;
    if (sdf(x, z) > -1.5 || rand() > 0.45) continue;
    bamboo(x, z, 6 + Math.floor(rand() * 6));
  }

  // ---------- Islas flotantes de SkyWars ----------
  const skyIsland = (cx, cz, top, r, mid = false) => {
    const depth = Math.round(r * 1.6);
    for (let dy = 0; dy <= depth; dy++) {
      const rr = r * (1 - Math.pow(dy / (depth + 1), 1.1));
      for (let z = Math.floor(cz - r - 1); z <= cz + r + 1; z++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        if (Math.hypot(x - cx, z - cz) > rr + (rand() - 0.5) * 0.5) continue;
        set(x, top - dy, z, dy === 0 ? 'grass_block' : dy < 2 ? 'dirt' : pick(['stone', 'andesite', 'cobblestone', 'tuff', 'iron_ore']));
      }
    }
    const x = Math.round(cx);
    const z = Math.round(cz);
    if (mid) {
      set(x, top + 1, z, 'enchanting_table');
      set(x - 2, top + 1, z, 'chest', { facing: 'south' });
      set(x + 2, top + 1, z, 'chest', { facing: 'south' });
      set(x, top + 1, z - 2, 'anvil', { facing: 'east' });
      set(x, top + 1, z + 2, 'crafting_table');
      for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
        set(x + dx, top + 1, z + dz, 'dark_oak_fence');
        set(x + dx, top + 2, z + dz, 'lantern');
      }
    } else {
      set(x, top + 1, z, 'chest', { facing: 'south' });
      set(x + 1, top + 1, z - 1, 'cherry_log', { axis: 'y' });
      set(x + 1, top + 2, z - 1, 'cherry_log', { axis: 'y' });
      for (let dz = -2; dz <= 1; dz++) for (let dx = -1; dx <= 3; dx++) for (let dy = 3; dy <= 4; dy++) {
        if (Math.hypot(dx - 1, dz + 0.5, (dy - 3.3) * 1.4) < 2.1 && isAir(x + dx, top + dy, z + dz)) {
          set(x + dx, top + dy, z + dz, 'cherry_leaves', { persistent: 'true' });
        }
      }
    }
  };
  skyIsland(24.5, 31, S + 22, 4.2, true);
  skyIsland(6, 36, S + 17, 2.8);
  skyIsland(43, 34, S + 19, 2.8);
  skyIsland(7, 57, S + 20, 2.6);
  skyIsland(42, 58, S + 16, 2.6);

  // ---------- Vegetación ----------
  const flowers = ['azure_bluet', 'lily_of_the_valley', 'allium', 'oxeye_daisy', 'pink_tulip', 'white_tulip', 'cornflower'];
  for (let z = 0; z < s.length; z++) for (let x = 0; x < W; x++) {
    if (!['grass_block', 'moss_block'].includes(get(x, S, z)) || !isAir(x, S + 1, z)) continue;
    const r = rand();
    if (r < 0.06) set(x, S + 1, z, pick(flowers));
    else if (r < 0.2) set(x, S + 1, z, 'short_grass');
    else if (r < 0.26) set(x, S + 1, z, 'fern');
  }

  finalizeConnections(s);
  return s;
}
