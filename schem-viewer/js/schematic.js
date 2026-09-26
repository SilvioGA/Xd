// Modelo común para todos los formatos: volumen W×H×L con paleta de estados.
// Índice de un bloque: (y * length + z) * width + x  (mismo orden que Sponge).

const AIR_NAMES = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);

export function parseState(str) {
  let name = str;
  const props = {};
  const i = str.indexOf('[');
  if (i >= 0) {
    name = str.slice(0, i);
    const inner = str.slice(i + 1, str.lastIndexOf(']'));
    for (const kv of inner.split(',')) {
      const eq = kv.indexOf('=');
      if (eq > 0) props[kv.slice(0, eq).trim()] = kv.slice(eq + 1).trim();
    }
  }
  if (!name.includes(':')) name = 'minecraft:' + name;
  return { name, props };
}

export function stateKey(name, props) {
  if (!name.includes(':')) name = 'minecraft:' + name;
  const keys = props ? Object.keys(props).sort() : [];
  if (!keys.length) return name;
  return `${name}[${keys.map((k) => `${k}=${props[k]}`).join(',')}]`;
}

export class Schematic {
  constructor(width, height, length) {
    if (width <= 0 || height <= 0 || length <= 0) throw new Error('El schematic está vacío (tamaño 0).');
    const total = width * height * length;
    if (total > 150_000_000) throw new Error(`Demasiado grande: ${width}×${height}×${length} bloques.`);
    this.width = width;
    this.height = height;
    this.length = length;
    this.palette = [{ key: 'minecraft:air', name: 'minecraft:air', props: {} }];
    this.lookup = new Map([['minecraft:air', 0]]);
    this.blocks = new Uint32Array(total);
    this.format = '';
    this.meta = {};
    // Datos extra de bloques (texto de carteles, etc.): { pos: [x, y, z], id, nbt }.
    // nbt usa los tags de schem-writer.js y solo se usa al exportar.
    this.blockEntities = [];
  }

  index(x, y, z) {
    return (y * this.length + z) * this.width + x;
  }

  get(x, y, z) {
    if (x < 0 || y < 0 || z < 0 || x >= this.width || y >= this.height || z >= this.length) return 0;
    return this.blocks[(y * this.length + z) * this.width + x];
  }

  // Devuelve el id de paleta para un estado ("minecraft:stone" o nombre + props).
  state(nameOrKey, props) {
    const parsed = props ? { name: nameOrKey.includes(':') ? nameOrKey : 'minecraft:' + nameOrKey, props } : parseState(nameOrKey);
    if (AIR_NAMES.has(parsed.name)) return 0;
    const key = stateKey(parsed.name, parsed.props);
    let id = this.lookup.get(key);
    if (id === undefined) {
      id = this.palette.length;
      this.palette.push({ key, name: parsed.name, props: parsed.props });
      this.lookup.set(key, id);
    }
    return id;
  }

  set(x, y, z, nameOrKey, props) {
    this.blocks[this.index(x, y, z)] = this.state(nameOrKey, props);
  }

  countBlocks() {
    const counts = new Uint32Array(this.palette.length);
    const b = this.blocks;
    for (let i = 0; i < b.length; i++) counts[b[i]]++;
    return counts;
  }
}
