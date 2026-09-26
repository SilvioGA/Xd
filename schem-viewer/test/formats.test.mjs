// Pruebas de los parsers: escribe NBT (con gzip) en cada formato y lo vuelve a leer.
// Ejecutar con: node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { parseSchematicFile } from '../js/formats.js';
import { Mesher } from '../js/mesher.js';
import { buildDemo } from '../js/demo.js';

// ---- Escritor NBT mínimo ----
const T = { byte: 1, short: 2, int: 3, long: 4, string: 8, list: 9, compound: 10, byteArray: 7, intArray: 11, longArray: 12 };
const tag = (type, value, itemType) => ({ type, value, itemType });
const c = (obj) => tag('compound', obj);

function writeNbt(root) {
  const out = [];
  const u8 = (v) => out.push(v & 255);
  const i16 = (v) => { u8(v >> 8); u8(v); };
  const i32 = (v) => { u8(v >>> 24); u8(v >>> 16); u8(v >>> 8); u8(v); };
  const i64 = (v) => { const b = BigInt.asUintN(64, BigInt(v)); i32(Number(b >> 32n)); i32(Number(b & 0xffffffffn)); };
  const str = (s) => { const b = Buffer.from(s, 'utf8'); i16(b.length); out.push(...b); };
  const payload = (t) => {
    switch (t.type) {
      case 'byte': return u8(t.value);
      case 'short': return i16(t.value);
      case 'int': return i32(t.value);
      case 'long': return i64(t.value);
      case 'string': return str(t.value);
      case 'byteArray': i32(t.value.length); for (const b of t.value) u8(b); return;
      case 'intArray': i32(t.value.length); for (const v of t.value) i32(v); return;
      case 'longArray': i32(t.value.length); for (const v of t.value) i64(v); return;
      case 'list': u8(T[t.itemType] || 0); i32(t.value.length); for (const v of t.value) payload(v); return;
      case 'compound':
        for (const [k, v] of Object.entries(t.value)) { u8(T[v.type]); str(k); payload(v); }
        return u8(0);
    }
  };
  u8(10); str(''); payload(root);
  return gzipSync(Buffer.from(out));
}

const varints = (ids) => {
  const b = [];
  for (let v of ids) { while (v >= 0x80) { b.push((v & 0x7f) | 0x80); v >>>= 7; } b.push(v); }
  return b;
};

// Estructura de prueba 3×2×2 con suficientes estados para forzar varints de 2 bytes.
const W = 3, H = 2, L = 2;
const expected = (x, y, z) => {
  if (y === 0) return 'minecraft:stone';
  if (x === 1 && z === 1) return 'minecraft:oak_stairs[facing=east,half=bottom]';
  if (x === 2) return 'minecraft:glass';
  return 'minecraft:air';
};

function spongePalette(extra = 0) {
  const pal = { 'minecraft:air': 0 };
  // Rellenar la paleta hasta >127 entradas para probar varints multi-byte.
  for (let i = 0; i < extra; i++) pal[`minecraft:filler_${i}`] = i + 1;
  let next = extra + 1;
  const ids = [];
  for (let y = 0; y < H; y++) for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    const key = expected(x, y, z);
    if (pal[key] === undefined) pal[key] = next++;
    ids.push(pal[key]);
  }
  const palTag = c(Object.fromEntries(Object.entries(pal).map(([k, v]) => [k, tag('int', v)])));
  return { palTag, data: varints(ids) };
}

function assertMatches(s) {
  assert.equal(s.width, W); assert.equal(s.height, H); assert.equal(s.length, L);
  for (let y = 0; y < H; y++) for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    const entry = s.palette[s.get(x, y, z)];
    assert.equal(entry.key, expected(x, y, z), `bloque en ${x},${y},${z}`);
  }
}

test('Sponge v2', async () => {
  const { palTag, data } = spongePalette(200);
  const buf = writeNbt(c({
    Version: tag('int', 2), DataVersion: tag('int', 3465),
    Width: tag('short', W), Height: tag('short', H), Length: tag('short', L),
    PaletteMax: tag('int', 210), Palette: palTag, BlockData: tag('byteArray', data),
    BlockEntities: tag('list', [], 'compound'),
  }));
  const s = await parseSchematicFile(buf);
  assertMatches(s);
  assert.equal(s.meta.dataVersion, 3465);
});

test('Sponge v3', async () => {
  const { palTag, data } = spongePalette(0);
  const buf = writeNbt(c({ Schematic: c({
    Version: tag('int', 3), DataVersion: tag('int', 3953),
    Width: tag('short', W), Height: tag('short', H), Length: tag('short', L),
    Blocks: c({ Palette: palTag, Data: tag('byteArray', data), BlockEntities: tag('list', [], 'compound') }),
  }) }));
  assertMatches(await parseSchematicFile(buf));
});

test('Estructura vanilla .nbt', async () => {
  const palette = ['minecraft:stone', 'minecraft:oak_stairs', 'minecraft:glass'];
  const blocks = [];
  for (let y = 0; y < H; y++) for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    const e = expected(x, y, z);
    if (e === 'minecraft:air') continue;
    const state = palette.findIndex((p) => e.startsWith(p));
    blocks.push(c({ pos: tag('list', [tag('int', x), tag('int', y), tag('int', z)], 'int'), state: tag('int', state) }));
  }
  const buf = writeNbt(c({
    DataVersion: tag('int', 3465),
    size: tag('list', [tag('int', W), tag('int', H), tag('int', L)], 'int'),
    palette: tag('list', [
      c({ Name: tag('string', 'minecraft:stone') }),
      c({ Name: tag('string', 'minecraft:oak_stairs'), Properties: c({ facing: tag('string', 'east'), half: tag('string', 'bottom') }) }),
      c({ Name: tag('string', 'minecraft:glass') }),
    ], 'compound'),
    blocks: tag('list', blocks, 'compound'),
    entities: tag('list', [], 'compound'),
  }));
  assertMatches(await parseSchematicFile(buf));
});

test('Litematica (tamaño negativo y empaquetado entre longs)', async () => {
  // 5 estados -> 3 bits por bloque, así algunos valores cruzan el límite de 64 bits.
  const pal = ['minecraft:air', 'minecraft:stone', 'minecraft:oak_stairs', 'minecraft:glass', 'minecraft:dirt'];
  const sw = 7, sh = 2, sl = 5; // 70 bloques * 3 bits = 210 bits -> 4 longs
  const exp = (x, y, z) => (y === 0 ? 1 : (x + z) % 4 === 0 ? 3 : (x * z) % 5 === 1 ? 4 : 0);
  const vals = [];
  for (let y = 0; y < sh; y++) for (let z = 0; z < sl; z++) for (let x = 0; x < sw; x++) vals.push(exp(x, y, z));
  const longs = new Array(Math.ceil((vals.length * 3) / 64)).fill(0n);
  vals.forEach((v, i) => {
    const bit = BigInt(i * 3);
    const w = Number(bit / 64n);
    const off = bit % 64n;
    longs[w] |= (BigInt(v) << off) & ((1n << 64n) - 1n);
    if (off + 3n > 64n) longs[w + 1] |= BigInt(v) >> (64n - off);
  });
  const buf = writeNbt(c({
    Version: tag('int', 6), MinecraftDataVersion: tag('int', 3700),
    Metadata: c({ Name: tag('string', 'Prueba'), Author: tag('string', 'test'), EnclosingSize: c({ x: tag('int', sw), y: tag('int', sh), z: tag('int', sl) }) }),
    Regions: c({ main: c({
      // Tamaño negativo en X: la región va de x=-6 a x=0.
      Position: c({ x: tag('int', 0), y: tag('int', 0), z: tag('int', 0) }),
      Size: c({ x: tag('int', -sw), y: tag('int', sh), z: tag('int', sl) }),
      BlockStatePalette: tag('list', pal.map((n) => c({ Name: tag('string', n) })), 'compound'),
      BlockStates: tag('longArray', longs.map((v) => BigInt.asIntN(64, v))),
    }) }),
  }));
  const s = await parseSchematicFile(buf);
  assert.equal(s.width, sw); assert.equal(s.height, sh); assert.equal(s.length, sl);
  for (let y = 0; y < sh; y++) for (let z = 0; z < sl; z++) for (let x = 0; x < sw; x++) {
    assert.equal(s.palette[s.get(x, y, z)].name, pal[exp(x, y, z)], `bloque en ${x},${y},${z}`);
  }
  assert.equal(s.meta.name, 'Prueba');
});

test('MCEdit .schematic clásico', async () => {
  const ids = [], data = [];
  for (let y = 0; y < H; y++) for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
    const e = expected(x, y, z);
    if (e === 'minecraft:stone') { ids.push(1); data.push(0); }
    else if (e.startsWith('minecraft:oak_stairs')) { ids.push(53); data.push(0); } // 0 = mirando al este
    else if (e === 'minecraft:glass') { ids.push(20); data.push(0); }
    else { ids.push(0); data.push(0); }
  }
  const buf = writeNbt(c({
    Width: tag('short', W), Height: tag('short', H), Length: tag('short', L),
    Materials: tag('string', 'Alpha'), Blocks: tag('byteArray', ids), Data: tag('byteArray', data),
  }));
  assertMatches(await parseSchematicFile(buf));
});

test('Formato desconocido da un error claro', async () => {
  await assert.rejects(parseSchematicFile(writeNbt(c({ foo: tag('int', 1) }))), /Formato no reconocido/);
});

test('El mesher genera geometría para el ejemplo y el pick encuentra bloques', () => {
  const s = buildDemo();
  const m = new Mesher(s);
  const r = m.buildChunk(0, 0, 0);
  assert.ok(r.opaque && r.opaque.indices.length > 0);
  assert.ok(r.transparent && r.transparent.indices.length > 0); // agua y cristal
  assert.equal(r.opaque.positions.length / 3, r.opaque.colors.length / 3);
  assert.equal(r.transparent.positions.length / 3, r.transparent.colors.length / 4);
  // Rayo vertical sobre el centro: debe tocar algo.
  const hit = m.pick([1.5, 100, 10.5], [0, -1, 0]);
  assert.ok(hit, 'el rayo debería tocar un bloque');
  // Recortar a la capa 0 deja solo piedra.
  m.setRange(0, 0);
  const hit0 = m.pick([1.5, 100, 10.5], [0, -1, 0]);
  assert.equal(s.palette[hit0.id].name, 'minecraft:stone');
});

test('blockInfo nunca falla y da colores válidos, incluso con bloques desconocidos', async () => {
  const { blockInfo } = await import('../js/blocks.js');
  const names = ['iron_trapdoor', 'iron_door', 'lime_concrete_powder', 'red_glazed_terracotta', 'blue_shulker_box',
    'stripped_oak_log', 'oak_log', 'bloque_inventado', 'mimod:cosa_rara', 'grass_block', 'white_stained_glass_pane',
    'cobblestone_wall', 'tube_coral_block', 'dead_brain_coral', 'waxed_oxidized_cut_copper_stairs', 'deepslate_diamond_ore'];
  for (const n of names) {
    const info = blockInfo({ name: n.includes(':') ? n : `minecraft:${n}`, props: {} });
    for (const k of ['side', 'top', 'bottom']) {
      assert.equal(info[k].length, 3, `${n}.${k}`);
      assert.ok(info[k].every((v) => Number.isFinite(v) && v >= 0 && v <= 1), `${n}.${k} = ${info[k]}`);
    }
  }
});

test('El lobby se exporta a .schem v2 y se vuelve a leer igual', async () => {
  const { buildLobby } = await import('../js/lobby.js');
  const { toSpongeV2 } = await import('../js/schem-writer.js');
  const s = buildLobby();
  assert.equal(s.width, 50); assert.equal(s.length, 50);
  // Hojas persistentes (si no, se caen en el juego) y vallas/muros con conexiones calculadas.
  const counts = s.countBlocks();
  for (const e of s.palette.filter((_, i) => counts[i] > 0)) {
    if (e.name.endsWith('_leaves')) assert.equal(e.props.persistent, 'true', e.key);
    if (/_(fence|wall|pane)$/.test(e.name)) assert.ok(e.props.north !== undefined, e.key);
  }
  const back = await parseSchematicFile(gzipSync(toSpongeV2(s, { origin: [25, 21, 33] })));
  assert.equal(back.format, 'Sponge .schem v2');
  for (let i = 0; i < s.blocks.length; i += 97) {
    assert.equal(back.palette[back.blocks[i]].key, s.palette[s.blocks[i]].key);
  }
});

test('El lobby japonés tiene el spawn delante de todo y se exporta bien', async () => {
  const { buildJapaneseLobby, JAPAN_SPAWN } = await import('../js/japan.js');
  const { toSpongeV2 } = await import('../js/schem-writer.js');
  const s = buildJapaneseLobby();
  assert.equal(s.width, 50); assert.equal(s.length, 100);
  const [sx, sy, sz] = JAPAN_SPAWN;
  // El jugador aparece sobre suelo firme, con dos bloques de aire libres.
  assert.notEqual(s.get(sx, sy - 1, sz), 0);
  assert.equal(s.get(sx, sy, sz), 0);
  assert.equal(s.get(sx, sy + 1, sz), 0);
  // Al fondo está el portal principal del templo.
  const temple = s.palette.findIndex((e) => e.name === 'minecraft:yellow_stained_glass');
  assert.ok(temple > 0);
  const counts = s.countBlocks();
  for (const e of s.palette.filter((_, i) => counts[i] > 0)) {
    if (e.name.endsWith('_leaves')) assert.equal(e.props.persistent, 'true', e.key);
  }
  const back = await parseSchematicFile(gzipSync(toSpongeV2(s, { origin: JAPAN_SPAWN })));
  for (let i = 0; i < s.blocks.length; i += 101) assert.equal(back.palette[back.blocks[i]].key, s.palette[s.blocks[i]].key);
});

test('Lobby SkyWars: 24 carteles para unirse y cabeceras, con texto que sobrevive a la exportación', async () => {
  const { buildSkyWarsLobby, SKYWARS_SPAWN } = await import('../js/skywars.js');
  const { toSpongeV2 } = await import('../js/schem-writer.js');
  const { inflate, readNbt } = await import('../js/nbt.js');
  const s = buildSkyWarsLobby();
  const join = s.blockEntities.filter((be) => be.nbt.front_text.value.messages.value[0].value.includes('SkyWars'));
  assert.equal(join.length, 24); // 12 Solo + 12 Duos
  assert.equal(s.blockEntities.length, 28); // + 4 carteles de cabecera
  for (const be of s.blockEntities) {
    const entry = s.palette[s.get(...be.pos)];
    assert.match(entry.name, /_wall_sign$/, `hay un cartel en ${be.pos}`);
    assert.equal(entry.props.facing, 'south');
    // El cartel está apoyado en un bloque sólido.
    const [x, y, z] = be.pos;
    assert.notEqual(s.get(x, y, z - 1), 0, `el cartel de ${be.pos} tiene soporte`);
  }
  const [sx, sy, sz] = SKYWARS_SPAWN;
  assert.notEqual(s.get(sx, sy - 1, sz), 0);
  assert.equal(s.get(sx, sy, sz), 0);
  assert.equal(s.get(sx, sy + 1, sz), 0);
  // Recorrido corto: entre 15 y 22 bloques del spawn a los carteles.
  const dist = sz - Math.max(...join.map((be) => be.pos[2]));
  assert.ok(dist >= 15 && dist <= 22, `distancia ${dist}`);
  const raw = await inflate(gzipSync(toSpongeV2(s, { origin: SKYWARS_SPAWN })));
  const { value } = readNbt(raw);
  assert.equal(value.BlockEntities.length, 28);
  const first = value.BlockEntities[0];
  assert.equal(first.Id, 'minecraft:sign');
  assert.match(first.front_text.messages[0], /SkyWars/);
  assert.equal(first.front_text.messages.length, 4);
});

test('Colores de bloques con varios prefijos (chiseled_polished_blackstone)', async () => {
  const { blockInfo } = await import('../js/blocks.js');
  const a = blockInfo({ name: 'minecraft:chiseled_polished_blackstone', props: {} }).side;
  const b = blockInfo({ name: 'minecraft:blackstone', props: {} }).side;
  assert.deepEqual(a, b);
});

test('Conejos: el bueno mide al menos 20 bloques y es simétrico; el malvado y el del amor están al lado', async () => {
  const { buildRabbit, RABBIT_BASE, RABBIT_FRAME, EVIL_OFFSET, LOVE_OFFSET } = await import('../js/rabbit.js');
  const s = buildRabbit();
  let top = 0;
  const statue = new Set(['minecraft:white_wool', 'minecraft:white_concrete', 'minecraft:pink_wool', 'minecraft:snow_block']);
  for (let y = 0; y < s.height; y++) for (let z = 0; z < s.length; z++) for (let x = 0; x < s.width; x++) {
    if (statue.has(s.palette[s.get(x, y, z)].name)) top = Math.max(top, y);
  }
  assert.ok(top - RABBIT_BASE + 1 >= 20, `altura ${top - RABBIT_BASE + 1}`);
  // Las orejas del conejo bueno (cuadro x = 0..28) son simétricas respecto a su centro, x = 14.
  for (let y = top - 6; y <= top; y++) for (let z = 0; z < s.length; z++) for (let x = 0; x < RABBIT_FRAME; x++) {
    assert.equal(s.get(x, y, z) !== 0, s.get(RABBIT_FRAME - 1 - x, y, z) !== 0, `simetría en ${x},${y},${z}`);
  }
  // El conejo malvado está al lado, con su propia peana, ojos rojos, colmillos y espada.
  const names = new Set();
  for (let y = 0; y < s.height; y++) for (let z = 0; z < s.length; z++) for (let x = EVIL_OFFSET; x < EVIL_OFFSET + RABBIT_FRAME; x++) names.add(s.palette[s.get(x, y, z)].name.slice(10));
  for (const n of ['gray_wool', 'redstone_block', 'iron_block', 'gold_block', 'magma_block', 'soul_fire', 'wither_skeleton_skull']) assert.ok(names.has(n), n);
  assert.ok(!names.has('grass_block'), 'la peana del malvado no es de césped');
  // El conejo del amor, con su peana: pelaje rosa, ojos de corazón y un gran corazón.
  const love = new Map();
  for (let y = 0; y < s.height; y++) for (let z = 0; z < s.length; z++) for (let x = LOVE_OFFSET; x < s.width; x++) {
    const n = s.palette[s.get(x, y, z)].name.slice(10);
    love.set(n, (love.get(n) || 0) + 1);
  }
  for (const n of ['pink_wool', 'red_concrete', 'pink_petals', 'pink_terracotta']) assert.ok(love.has(n), n);
  assert.ok(love.get('red_concrete') > 60, 'corazón grande, ojos y mosaico');
});

test('Roble gigante: al menos 40 de alto, hojas persistentes y ramas unidas al tronco', async () => {
  const { buildTree, TREE_GROUND } = await import('../js/tree.js');
  const s = buildTree();
  const nm = (x, y, z) => s.palette[s.get(x, y, z)].name;
  let top = 0;
  let wood = 0;
  for (let y = 0; y < s.height; y++) for (let z = 0; z < s.length; z++) for (let x = 0; x < s.width; x++) {
    const n = nm(x, y, z);
    if (/leaves|_wood$/.test(n)) top = y;
    if (/_wood$/.test(n) && y > TREE_GROUND) wood++;
  }
  assert.ok(top - TREE_GROUND >= 40, `altura ${top - TREE_GROUND}`);
  const counts = s.countBlocks();
  for (const e of s.palette.filter((_, i) => counts[i] > 0)) if (e.name.endsWith('_leaves')) assert.equal(e.props.persistent, 'true');
  // Casi toda la madera sobre el suelo está unida al tronco (se admiten puntas sueltas dentro de la copa).
  const seen = new Set();
  const q = [[28, TREE_GROUND + 1, 28]];
  let connected = 0;
  while (q.length) {
    const [x, y, z] = q.pop();
    const k = `${x},${y},${z}`;
    if (seen.has(k) || !/_wood$|moss_block|bee_nest/.test(nm(x, y, z))) continue;
    seen.add(k);
    if (/_wood$/.test(nm(x, y, z)) && y > TREE_GROUND) connected++;
    for (const [a, b, c] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) q.push([x + a, y + b, z + c]);
  }
  assert.ok(connected / wood > 0.99, `${connected} de ${wood}`);
});

test('Isla tropical: mar, playa, arrecife, palmeras con cocos y muelle', async () => {
  const { buildIsland, ISLAND_SEA } = await import('../js/island.js');
  const s = buildIsland();
  const counts = s.countBlocks();
  const total = (re) => s.palette.reduce((n, e, i) => n + (re.test(e.name) ? counts[i] : 0), 0);
  assert.ok(total(/:water$/) > 5000, 'hay mar');
  assert.ok(total(/:sand$/) > 800, 'hay playa');
  assert.ok(total(/coral_block$/) > 100, 'hay arrecife');
  assert.ok(total(/jungle_log$/) > 60 && total(/:cocoa$/) > 10, 'palmeras con cocos');
  assert.ok(total(/hay_block$/) > 30, 'cabaña con tejado de paja');
  // Las esquinas son mar abierto y la superficie del agua está a la altura del mar.
  assert.equal(s.palette[s.get(0, ISLAND_SEA, 0)].name, 'minecraft:water');
  assert.equal(s.get(0, ISLAND_SEA + 1, 0), 0);
  for (const e of s.palette.filter((_, i) => counts[i] > 0)) if (e.name.endsWith('_leaves')) assert.equal(e.props.persistent, 'true');
});

test('Mansión survival: todo funciona como en el juego', async () => {
  const { buildMansion, MANSION_GROUND: G } = await import('../js/mansion.js');
  const s = buildMansion();
  const nm = (x, y, z) => s.palette[s.get(x, y, z)].name.slice(10);
  const all = (name) => {
    const out = [];
    for (let y = 0; y < s.height; y++) for (let z = 0; z < s.length; z++) for (let x = 0; x < s.width; x++) if (nm(x, y, z) === name) out.push([x, y, z]);
    return out;
  };

  // Encantamientos: al menos 15 librerías válidas (a 2 bloques, con aire en medio) → nivel 30.
  const [[ex, ey, ez]] = all('enchanting_table');
  let power = 0;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dz) continue;
    if (nm(ex + dx, ey, ez + dz) !== 'air' || nm(ex + dx, ey + 1, ez + dz) !== 'air') continue;
    for (const dy of [0, 1]) if (nm(ex + dx * 2, ey + dy, ez + dz * 2) === 'bookshelf') power++;
    if (dx && dz) {
      for (const dy of [0, 1]) {
        if (nm(ex + dx * 2, ey + dy, ez + dz) === 'bookshelf') power++;
        if (nm(ex + dx, ey + dy, ez + dz * 2) === 'bookshelf') power++;
      }
    }
  }
  assert.ok(power >= 15, `librerías que cuentan: ${power}`);

  // Toda la tierra de cultivo tiene agua a 4 bloques o menos (misma altura o una más abajo).
  for (const [x, y, z] of all('farmland')) {
    let wet = false;
    for (let dz = -4; dz <= 4 && !wet; dz++) for (let dx = -4; dx <= 4 && !wet; dx++) for (const dy of [0, 1]) if (nm(x + dx, y + dy, z + dz) === 'water') wet = true;
    assert.ok(wet, `tierra seca en ${x},${y},${z}`);
  }
  // Los cultivos están sobre tierra de cultivo y la caña de azúcar junto al agua.
  for (const crop of ['wheat', 'carrots', 'potatoes', 'beetroots']) for (const [x, y, z] of all(crop)) assert.equal(nm(x, y - 1, z), 'farmland');
  for (const [x, y, z] of all('sugar_cane')) {
    let yy = y;
    while (nm(x, yy - 1, z) === 'sugar_cane') yy--;
    assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => nm(x + a, yy - 1, z + b) === 'water'), `caña sin agua en ${x},${z}`);
  }

  // Camas completas (cabecera + pies) y puertas completas (mitad de abajo + mitad de arriba).
  const props = (x, y, z) => s.palette[s.get(x, y, z)].props;
  for (const color of ['red', 'light_blue', 'lime', 'yellow']) {
    for (const [x, y, z] of all(`${color}_bed`)) {
      const p = props(x, y, z);
      const dz = p.part === 'head' ? 1 : -1; // todas miran al norte
      assert.equal(nm(x, y, z + dz), `${color}_bed`, `cama incompleta en ${x},${y},${z}`);
    }
  }
  for (const wood of ['spruce', 'dark_oak', 'birch']) for (const [x, y, z] of all(`${wood}_door`)) {
    const other = props(x, y, z).half === 'lower' ? y + 1 : y - 1;
    assert.equal(nm(x, other, z), `${wood}_door`, `puerta incompleta en ${x},${y},${z}`);
  }

  // Portal del Nether: 14 de obsidiana con hueco de 2×3.
  const obs = all('obsidian');
  assert.equal(obs.length, 14);
  const xs = obs.map((o) => o[0]);
  const ys = obs.map((o) => o[1]);
  const pz = obs[0][2];
  for (let x = Math.min(...xs) + 1; x < Math.max(...xs); x++) for (let y = Math.min(...ys) + 1; y < Math.max(...ys); y++) assert.equal(nm(x, y, pz), 'air');

  // Muralla cerrada salvo la puerta del sur.
  for (let x = 0; x < s.width; x++) for (const z of [0, s.length - 1]) assert.notEqual(nm(x, G + 1, z), 'air', `hueco en la muralla ${x},${z}`);
  for (let z = 0; z < s.length; z++) for (const x of [0, s.width - 1]) assert.notEqual(nm(x, G + 1, z), 'air', `hueco en la muralla ${x},${z}`);

  // Fuente de agua infinita: al menos un cuadrado de 2×2 de agua.
  const water = new Set(all('water').filter(([, y]) => y === G).map(([x, , z]) => `${x},${z}`));
  assert.ok([...water].some((k) => { const [x, z] = k.split(',').map(Number); return water.has(`${x + 1},${z}`) && water.has(`${x},${z + 1}`) && water.has(`${x + 1},${z + 1}`); }));
});

test('Modo jugador: cae al suelo, sube losas, choca con paredes y trepa escaleras de mano', async () => {
  const { Schematic } = await import('../js/schematic.js');
  const { PlayerPhysics, findSpawn } = await import('../js/player.js');
  const make = (ladder) => {
    const s = new Schematic(12, 8, 12);
    for (let z = 0; z < 12; z++) for (let x = 0; x < 12; x++) s.set(x, 0, z, 'stone');
    for (let x = 0; x < 12; x++) for (let y = 1; y <= 3; y++) s.set(x, y, 2, 'stone'); // pared al norte
    for (let x = 0; x < 12; x++) s.set(x, 1, 6, 'stone_slab', { type: 'bottom' }); // fila de losas
    if (ladder) for (let y = 1; y <= 3; y++) s.set(5, y, 3, 'ladder', { facing: 'south' });
    return s;
  };
  const run = (p, input, seconds) => {
    let maxY = -Infinity;
    for (let t = 0; t < seconds; t += 1 / 60) { p.step(1 / 60, input); maxY = Math.max(maxY, p.pos[1]); }
    return maxY;
  };

  const s = make(false);
  const p = new PlayerPhysics(new Mesher(s));
  p.reset([5.5, 5, 8.5, 0]);
  run(p, {}, 1.5);
  assert.ok(Math.abs(p.pos[1] - 1) < 1e-6 && p.onGround, `de pie sobre el suelo (y=${p.pos[1]})`);
  const maxY = run(p, { forward: true }, 3);
  assert.ok(Math.abs(maxY - 1.5) < 1e-6, `sube a la losa sin saltar (máx y=${maxY})`);
  assert.ok(Math.abs(p.pos[2] - 3.3) < 1e-3, `la pared lo detiene (z=${p.pos[2]})`);
  assert.ok(Math.abs(p.pos[1] - 1) < 1e-6, 'vuelve a bajar al suelo');

  const s2 = make(true);
  const q = new PlayerPhysics(new Mesher(s2));
  q.reset([5.5, 1, 5.5, 0]);
  const climbed = run(q, { forward: true }, 2);
  assert.ok(climbed >= 3.9, `trepa por la escalera hasta arriba de la pared (máx y=${climbed})`);

  // Volando atraviesa la pared; al dejar de volar dentro de ella, sube hasta un hueco libre.
  const fl = new PlayerPhysics(new Mesher(s));
  fl.reset([5.5, 1, 4.5, 0]);
  fl.setFlying(true);
  run(fl, { forward: true }, 0.6);
  assert.ok(fl.pos[2] < 2.5, `volando cruza la pared (z=${fl.pos[2]})`);
  fl.pos = [5.5, 1.5, 2.5];
  fl.setFlying(false);
  assert.ok(fl.pos[1] >= 4 && !fl.blockedAt(fl.pos), `sale del bloque (y=${fl.pos[1]})`);

  // Una alfombra flotando tiene colisión: el jugador se queda de pie encima.
  const s3 = new Schematic(6, 8, 6);
  s3.set(2, 3, 2, 'yellow_carpet');
  const cp = new PlayerPhysics(new Mesher(s3));
  cp.reset([2.5, 5, 2.5, 0]);
  run(cp, {}, 1);
  assert.ok(Math.abs(cp.pos[1] - (3 + 1 / 16)) < 1e-6 && cp.onGround, `de pie sobre la alfombra flotante (y=${cp.pos[1]})`);

  // Punto de aparición automático: de pie en el borde sur, mirando al norte.
  const sp = findSpawn(s, p);
  assert.equal(sp[1], 1);
  assert.equal(sp[2], 11.5);
});

test('Formato clásico: estandartes con orientación y color, y AddBlocks como WorldEdit', async () => {
  // 2×1×1: un estandarte de pared amarillo mirando al este y un bloque con id 256+1 (AddBlocks).
  const buf = writeNbt(c({
    Width: tag('short', 2), Height: tag('short', 1), Length: tag('short', 1), Materials: tag('string', 'Alpha'),
    Blocks: tag('byteArray', [177, 1]), Data: tag('byteArray', [5, 0]),
    AddBlocks: tag('byteArray', [0x10]), // par: mitad baja (0) → sigue siendo 177; impar: mitad alta (1) → 257
    TileEntities: tag('list', [c({ id: tag('string', 'Banner'), x: tag('int', 0), y: tag('int', 0), z: tag('int', 0), Base: tag('int', 11), Patterns: tag('list', [], 'compound') })], 'compound'),
  }));
  const s = await parseSchematicFile(buf);
  assert.equal(s.palette[s.get(0, 0, 0)].key, 'minecraft:yellow_wall_banner[facing=east]');
  assert.equal(s.palette[s.get(1, 0, 0)].name, 'minecraft:stone');
});
