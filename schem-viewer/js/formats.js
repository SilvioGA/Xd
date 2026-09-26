// Parsers: Sponge .schem (v1, v2, v3), Litematica .litematic,
// estructuras vanilla .nbt y el .schematic clásico de MCEdit.

import { inflate, readNbt, LongArray } from './nbt.js';
import { Schematic, stateKey } from './schematic.js';
import { legacyState, DYES } from './legacy.js';

export async function parseSchematicFile(buffer) {
  const raw = await inflate(new Uint8Array(buffer));
  const { value } = readNbt(raw);
  return parseNbtRoot(value);
}

export function parseNbtRoot(value) {
  if (value.Regions && value.Metadata) return parseLitematic(value);

  let root = value;
  if (root.Schematic && typeof root.Schematic === 'object' && root.Width === undefined) root = root.Schematic;

  if (root.Width !== undefined && (root.Version === 3 || (root.Blocks && root.Blocks.Palette))) return parseSpongeV3(root);
  if (root.Width !== undefined && root.Palette && root.BlockData) return parseSpongeV12(root);
  if (root.Width !== undefined && root.Blocks instanceof Uint8Array) return parseLegacy(root);
  if (Array.isArray(root.size) && (root.palette || root.palettes) && root.blocks) return parseStructure(root);

  throw new Error('Formato no reconocido. Soportados: .schem, .litematic, .nbt y .schematic');
}

const u16 = (v) => (v ?? 0) & 0xffff;

function decodeVarints(bytes, count) {
  const out = new Uint32Array(count);
  let i = 0;
  let p = 0;
  while (i < count && p < bytes.length) {
    let v = 0;
    let shift = 0;
    let b;
    do {
      b = bytes[p++];
      v |= (b & 0x7f) << shift;
      shift += 7;
    } while (b & 0x80 && shift < 35);
    out[i++] = v;
  }
  return out;
}

function fillFromPalette(schem, paletteObj, data) {
  const remap = [];
  for (const [key, idx] of Object.entries(paletteObj)) remap[idx] = schem.state(key);
  const ids = decodeVarints(data, schem.blocks.length);
  const blocks = schem.blocks;
  for (let i = 0; i < blocks.length; i++) blocks[i] = remap[ids[i]] ?? 0;
}

function parseSpongeV12(root) {
  const schem = new Schematic(u16(root.Width), u16(root.Height), u16(root.Length));
  fillFromPalette(schem, root.Palette, root.BlockData);
  schem.format = `Sponge .schem v${root.Version ?? 1}`;
  schem.meta = {
    dataVersion: root.DataVersion,
    name: root.Metadata?.Name,
    author: root.Metadata?.Author,
    blockEntities: (root.BlockEntities || root.TileEntities || []).length,
    entities: (root.Entities || []).length,
  };
  return schem;
}

function parseSpongeV3(root) {
  const schem = new Schematic(u16(root.Width), u16(root.Height), u16(root.Length));
  const blocks = root.Blocks;
  if (blocks?.Palette && blocks?.Data) fillFromPalette(schem, blocks.Palette, blocks.Data);
  schem.format = 'Sponge .schem v3';
  schem.meta = {
    dataVersion: root.DataVersion,
    name: root.Metadata?.Name,
    author: root.Metadata?.Author,
    blockEntities: (blocks?.BlockEntities || []).length,
    entities: (root.Entities || []).length,
  };
  return schem;
}

function parseStructure(root) {
  const [w, h, l] = root.size;
  const schem = new Schematic(w, h, l);
  const palette = root.palette || root.palettes[0];
  const remap = palette.map((e) => schem.state(e.Name, e.Properties || {}));
  for (const b of root.blocks) {
    const [x, y, z] = b.pos;
    if (x < 0 || y < 0 || z < 0 || x >= w || y >= h || z >= l) continue;
    schem.blocks[schem.index(x, y, z)] = remap[b.state] ?? 0;
  }
  schem.format = 'Estructura vanilla .nbt';
  schem.meta = {
    dataVersion: root.DataVersion,
    author: root.author,
    blockEntities: root.blocks.filter((b) => b.nbt).length,
    entities: (root.entities || []).length,
  };
  return schem;
}

function parseLitematic(root) {
  const regions = Object.entries(root.Regions);
  if (!regions.length) throw new Error('El .litematic no tiene regiones.');

  // Calcula la caja mínima que contiene todas las regiones.
  const boxes = regions.map(([name, r]) => {
    const pos = r.Position;
    const size = r.Size;
    const min = {
      x: pos.x + (size.x < 0 ? size.x + 1 : 0),
      y: pos.y + (size.y < 0 ? size.y + 1 : 0),
      z: pos.z + (size.z < 0 ? size.z + 1 : 0),
    };
    return { name, r, min, sx: Math.abs(size.x), sy: Math.abs(size.y), sz: Math.abs(size.z) };
  });
  const minX = Math.min(...boxes.map((b) => b.min.x));
  const minY = Math.min(...boxes.map((b) => b.min.y));
  const minZ = Math.min(...boxes.map((b) => b.min.z));
  const maxX = Math.max(...boxes.map((b) => b.min.x + b.sx));
  const maxY = Math.max(...boxes.map((b) => b.min.y + b.sy));
  const maxZ = Math.max(...boxes.map((b) => b.min.z + b.sz));

  const schem = new Schematic(maxX - minX, maxY - minY, maxZ - minZ);

  for (const { r, min, sx, sy, sz } of boxes) {
    const palette = r.BlockStatePalette || [];
    const remap = palette.map((e) => schem.state(e.Name, e.Properties || {}));
    const bits = Math.max(2, Math.ceil(Math.log2(Math.max(palette.length, 1))));
    const mask = (1 << bits) - 1;
    const states = r.BlockStates;
    const words = states instanceof LongArray ? states.words : new Uint32Array(0);
    const ox = min.x - minX;
    const oy = min.y - minY;
    const oz = min.z - minZ;
    let i = 0;
    for (let y = 0; y < sy; y++) {
      for (let z = 0; z < sz; z++) {
        for (let x = 0; x < sx; x++, i++) {
          const bit = i * bits;
          const w = bit >>> 5;
          const off = bit & 31;
          let v = words[w] >>> off;
          if (off + bits > 32) v |= words[w + 1] << (32 - off);
          v &= mask;
          if (v) schem.blocks[schem.index(x + ox, y + oy, z + oz)] = remap[v] ?? 0;
        }
      }
    }
  }

  const md = root.Metadata || {};
  schem.format = `Litematica .litematic v${root.Version ?? '?'}`;
  schem.meta = {
    dataVersion: root.MinecraftDataVersion,
    name: md.Name,
    author: md.Author,
    regions: regions.length,
    blockEntities: regions.reduce((n, [, r]) => n + (r.TileEntities || []).length, 0),
    entities: regions.reduce((n, [, r]) => n + (r.Entities || []).length, 0),
  };
  return schem;
}

function parseLegacy(root) {
  const schem = new Schematic(u16(root.Width), u16(root.Height), u16(root.Length));
  const ids = root.Blocks;
  const data = root.Data || new Uint8Array(ids.length);
  const add = root.AddBlocks;
  const cache = new Map();
  const blocks = schem.blocks;
  const W = schem.width;
  const Lz = schem.length;
  // Color de los estandartes: en el formato antiguo va en el bloque con datos ("Base" es el
  // valor del tinte: 0 = negro ... 15 = blanco).
  const bannerColor = new Map();
  for (const te of root.TileEntities || []) {
    if (!/banner/i.test(te.id || '') || te.Base === undefined) continue;
    bannerColor.set((te.y * Lz + te.z) * W + te.x, DYES[15 - (te.Base & 15)]);
  }
  for (let i = 0; i < blocks.length; i++) {
    let id = ids[i];
    // AddBlocks: medio byte por bloque; los índices pares usan la mitad baja (como WorldEdit).
    if (add && i >> 1 < add.length) id |= i & 1 ? (add[i >> 1] & 0xf0) << 4 : (add[i >> 1] & 0x0f) << 8;
    if (id === 0) continue;
    if ((id === 176 || id === 177) && bannerColor.has(i)) {
      const [name, props] = legacyState(id, data[i] & 15);
      blocks[i] = schem.state(stateKey(name.replace('white_', `${bannerColor.get(i)}_`), props));
      continue;
    }
    const key = (id << 4) | (data[i] & 15);
    let s = cache.get(key);
    if (s === undefined) {
      const [name, props] = legacyState(id, data[i] & 15);
      s = schem.state(stateKey(name, props));
      cache.set(key, s);
    }
    blocks[i] = s;
  }
  schem.format = 'MCEdit .schematic (clásico)';
  schem.meta = {
    blockEntities: (root.TileEntities || []).length,
    entities: (root.Entities || []).length,
  };
  return schem;
}

// Versión aproximada de Minecraft a partir del DataVersion.
const VERSIONS = [
  [4435, '1.21.6'], [4325, '1.21.5'], [4189, '1.21.4'], [4082, '1.21.3'], [3955, '1.21.1'], [3953, '1.21'],
  [3839, '1.20.6'], [3700, '1.20.4'], [3578, '1.20.2'], [3465, '1.20.1'], [3463, '1.20'],
  [3337, '1.19.4'], [3218, '1.19.3'], [3120, '1.19.2'], [3105, '1.19'], [2975, '1.18.2'], [2860, '1.18'],
  [2730, '1.17.1'], [2724, '1.17'], [2586, '1.16.5'], [2566, '1.16'], [2230, '1.15.2'], [2225, '1.15'],
  [1976, '1.14.4'], [1952, '1.14'], [1631, '1.13.2'], [1519, '1.13'], [1343, '1.12.2'],
];

export function mcVersion(dataVersion) {
  if (!dataVersion) return null;
  for (const [dv, name] of VERSIONS) if (dataVersion >= dv) return name;
  return '< 1.12';
}
