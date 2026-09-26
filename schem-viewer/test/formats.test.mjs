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
