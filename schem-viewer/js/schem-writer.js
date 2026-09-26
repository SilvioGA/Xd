// Escritor de Sponge .schem v2 (el que lee WorldEdit/FAWE en 1.13+).
// Devuelve el NBT sin comprimir; hay que pasarlo por gzip antes de guardarlo.

const TAGS = { byte: 1, short: 2, int: 3, long: 4, string: 8, list: 9, compound: 10, byteArray: 7, intArray: 11, longArray: 12 };

export const tag = (type, value, itemType) => ({ type, value, itemType });
export const compound = (obj) => tag('compound', obj);

export function writeNbt(root, rootName = '') {
  const out = [];
  const te = new TextEncoder();
  const u8 = (v) => out.push(v & 255);
  const i16 = (v) => { u8(v >> 8); u8(v); };
  const i32 = (v) => { u8(v >>> 24); u8(v >>> 16); u8(v >>> 8); u8(v); };
  const i64 = (v) => { const b = BigInt.asUintN(64, BigInt(v)); i32(Number(b >> 32n)); i32(Number(b & 0xffffffffn)); };
  const str = (s) => { const b = te.encode(s); i16(b.length); for (const x of b) out.push(x); };
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
      case 'list': u8(t.value.length ? TAGS[t.itemType] : 0); i32(t.value.length); for (const v of t.value) payload(v); return;
      case 'compound':
        for (const [k, v] of Object.entries(t.value)) { u8(TAGS[v.type]); str(k); payload(v); }
        return u8(0);
      default: throw new Error(`Tipo NBT desconocido: ${t.type}`);
    }
  };
  u8(10); str(rootName); payload(root);
  return new Uint8Array(out);
}

// origin: posición (dentro del schematic) donde quedará el jugador al hacer //paste.
export function toSpongeV2(schem, { dataVersion = 3465, origin = [0, 0, 0], name, author } = {}) {
  const used = new Map();
  const ids = new Uint32Array(schem.blocks.length);
  const palette = {};
  for (let i = 0; i < schem.blocks.length; i++) {
    const p = schem.blocks[i];
    let id = used.get(p);
    if (id === undefined) {
      id = used.size;
      used.set(p, id);
      palette[schem.palette[p].key] = tag('int', id);
    }
    ids[i] = id;
  }
  const data = [];
  for (let v of ids) {
    while (v >= 0x80) { data.push((v & 0x7f) | 0x80); v >>>= 7; }
    data.push(v);
  }
  const meta = {
    WEOffsetX: tag('int', -origin[0]),
    WEOffsetY: tag('int', -origin[1]),
    WEOffsetZ: tag('int', -origin[2]),
  };
  if (name) meta.Name = tag('string', name);
  if (author) meta.Author = tag('string', author);
  return writeNbt(compound({
    Version: tag('int', 2),
    DataVersion: tag('int', dataVersion),
    Metadata: compound(meta),
    Width: tag('short', schem.width),
    Height: tag('short', schem.height),
    Length: tag('short', schem.length),
    Offset: tag('intArray', [0, 0, 0]),
    PaletteMax: tag('int', used.size),
    Palette: compound(palette),
    BlockData: tag('byteArray', data),
    BlockEntities: tag('list', [], 'compound'),
  }), 'Schematic');
}
