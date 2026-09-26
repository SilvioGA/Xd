// Genera geometría por chunks (32³) con eliminación de caras ocultas,
// oclusión ambiental por vértice y sombreado por cara estilo Minecraft.
// No depende de three.js: devuelve arrays tipados.

import { blockInfo, connectorBoxes } from './blocks.js';

export const CHUNK = 32;

const FACES = [
  { n: [1, 0, 0], shade: 0.62, c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { n: [-1, 0, 0], shade: 0.62, c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
  { n: [0, 1, 0], shade: 1.0, c: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },
  { n: [0, -1, 0], shade: 0.5, c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], shade: 0.8, c: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
  { n: [0, 0, -1], shade: 0.8, c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
];

// Para cada cara y esquina: vecinos (lado1, lado2, esquina) usados para la AO.
for (const f of FACES) {
  const axes = [0, 1, 2].filter((a) => f.n[a] === 0);
  f.ao = f.c.map((corner) => {
    const s1 = [...f.n];
    const s2 = [...f.n];
    s1[axes[0]] += corner[axes[0]] ? 1 : -1;
    s2[axes[1]] += corner[axes[1]] ? 1 : -1;
    const cc = [s1[0] + s2[0] - f.n[0], s1[1] + s2[1] - f.n[1], s1[2] + s2[2] - f.n[2]];
    return [s1, s2, cc];
  });
}
const AO_LEVELS = [0.52, 0.7, 0.86, 1];
const DIR_NAMES = ['north', 'east', 'south', 'west'];
const DIR_OFFSETS = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] };

class Buf {
  constructor(Type, size = 4096) {
    this.Type = Type;
    this.a = new Type(size);
    this.n = 0;
  }
  reserve(k) {
    if (this.n + k <= this.a.length) return;
    let size = this.a.length * 2;
    while (size < this.n + k) size *= 2;
    const b = new this.Type(size);
    b.set(this.a.subarray(0, this.n));
    this.a = b;
  }
  out() {
    return this.a.slice(0, this.n);
  }
}

class Part {
  constructor(alpha) {
    this.alpha = alpha;
    this.pos = new Buf(Float32Array);
    this.col = new Buf(Float32Array);
    this.idx = new Buf(Uint32Array);
    this.verts = 0;
  }
  quad(p, colors, flip) {
    const pos = this.pos;
    const col = this.col;
    const idx = this.idx;
    pos.reserve(12);
    col.reserve(this.alpha ? 16 : 12);
    idx.reserve(6);
    for (let i = 0; i < 12; i++) pos.a[pos.n++] = p[i];
    for (let i = 0; i < colors.length; i++) col.a[col.n++] = colors[i];
    const v = this.verts;
    const I = idx.a;
    let k = idx.n;
    if (flip) {
      I[k++] = v + 1; I[k++] = v + 2; I[k++] = v + 3;
      I[k++] = v + 1; I[k++] = v + 3; I[k++] = v;
    } else {
      I[k++] = v; I[k++] = v + 1; I[k++] = v + 2;
      I[k++] = v; I[k++] = v + 2; I[k++] = v + 3;
    }
    idx.n = k;
    this.verts += 4;
  }
  result() {
    if (!this.verts) return null;
    return { positions: this.pos.out(), colors: this.col.out(), indices: this.idx.out(), itemSize: this.alpha ? 4 : 3 };
  }
}

function noise(x, y, z) {
  let h = Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return 0.94 + (((h >>> 0) % 1000) / 1000) * 0.1;
}

export class Mesher {
  constructor(schem) {
    this.s = schem;
    this.infos = schem.palette.map((e) => blockInfo(e));
    this.hidden = new Uint8Array(this.infos.length);
    this.yMin = 0;
    this.yMax = schem.height - 1;
    this.connCache = new Map();
  }

  setRange(yMin, yMax) {
    this.yMin = yMin;
    this.yMax = yMax;
  }

  visibleId(x, y, z) {
    const s = this.s;
    if (x < 0 || z < 0 || x >= s.width || z >= s.length || y < this.yMin || y > this.yMax || y < 0 || y >= s.height) return 0;
    const id = s.blocks[(y * s.length + z) * s.width + x];
    if (!id || this.hidden[id] || this.infos[id].air) return 0;
    return id;
  }

  opaqueAt(x, y, z) {
    const id = this.visibleId(x, y, z);
    return id !== 0 && this.infos[id].opaque === true;
  }

  // Cajas de vallas/muros/paneles cuyo estado no trae las conexiones (p. ej. .schematic clásico).
  connectorFor(info, x, y, z) {
    let mask = 0;
    const conn = {};
    DIR_NAMES.forEach((d, i) => {
      const [dx, dz] = DIR_OFFSETS[d];
      const id = this.visibleId(x + dx, y, z + dz);
      if (!id) return;
      const other = this.infos[id];
      const ok = other.opaque || other.connect === info.connect
        || (info.connect === 'fence' && other.name.endsWith('_fence_gate'))
        || (info.connect !== 'fence' && other.connect && other.connect !== 'fence');
      if (ok) {
        conn[d] = info.connect === 'wall' ? 'low' : 'true';
        mask |= 1 << i;
      }
    });
    const key = `${info.connect}:${mask}`;
    let boxes = this.connCache.get(key);
    if (!boxes) {
      boxes = connectorBoxes(info.connect, conn);
      this.connCache.set(key, boxes);
    }
    return boxes;
  }

  buildChunk(cx, cy, cz) {
    const s = this.s;
    const x0 = cx * CHUNK;
    const y0 = Math.max(cy * CHUNK, this.yMin);
    const z0 = cz * CHUNK;
    const x1 = Math.min(x0 + CHUNK, s.width);
    const y1 = Math.min(cy * CHUNK + CHUNK, s.height, this.yMax + 1);
    const z1 = Math.min(z0 + CHUNK, s.length);
    const opaque = new Part(false);
    const trans = new Part(true);
    const p = new Float32Array(12);
    const cols = new Float32Array(16);
    const ao = [0, 0, 0, 0];

    for (let y = y0; y < y1; y++) {
      for (let z = z0; z < z1; z++) {
        for (let x = x0; x < x1; x++) {
          const id = this.visibleId(x, y, z);
          if (!id) continue;
          const info = this.infos[id];
          const nz = noise(x, y, z);

          if (info.cube) {
            const part = info.transparent ? trans : opaque;
            const stride = info.transparent ? 4 : 3;
            for (let f = 0; f < 6; f++) {
              const F = FACES[f];
              const nx = x + F.n[0];
              const ny = y + F.n[1];
              const nzz = z + F.n[2];
              const nid = this.visibleId(nx, ny, nzz);
              if (nid) {
                const ninfo = this.infos[nid];
                if (ninfo.opaque) continue;
                if (info.transparent && ninfo.transparent && ninfo.name === info.name) continue;
              }
              const base = f === 2 ? info.top : f === 3 ? info.bottom : info.side;
              for (let v = 0; v < 4; v++) {
                const c = F.c[v];
                p[v * 3] = x + c[0];
                p[v * 3 + 1] = y + c[1];
                p[v * 3 + 2] = z + c[2];
                const [a, b, d] = F.ao[v];
                const s1 = this.opaqueAt(x + a[0], y + a[1], z + a[2]) ? 1 : 0;
                const s2 = this.opaqueAt(x + b[0], y + b[1], z + b[2]) ? 1 : 0;
                const sc = this.opaqueAt(x + d[0], y + d[1], z + d[2]) ? 1 : 0;
                ao[v] = s1 && s2 ? 0 : 3 - (s1 + s2 + sc);
                const k = F.shade * AO_LEVELS[ao[v]] * nz;
                cols[v * stride] = base[0] * k;
                cols[v * stride + 1] = base[1] * k;
                cols[v * stride + 2] = base[2] * k;
                if (stride === 4) cols[v * stride + 3] = info.alpha;
              }
              part.quad(p, stride === 4 ? cols : cols.subarray(0, 12), ao[0] + ao[2] < ao[1] + ao[3]);
            }
            continue;
          }

          const boxes = info.boxes || (info.connect ? this.connectorFor(info, x, y, z) : null);
          if (!boxes) continue;
          const part = info.transparent ? trans : opaque;
          const stride = info.transparent ? 4 : 3;
          for (const bx of boxes) {
            for (let f = 0; f < 6; f++) {
              const F = FACES[f];
              // Cara pegada al borde del bloque y tapada por un vecino opaco: se omite.
              const axis = F.n[0] ? 0 : F.n[1] ? 1 : 2;
              const onEdge = F.n[axis] > 0 ? bx[axis + 3] >= 1 : bx[axis] <= 0;
              if (onEdge && this.opaqueAt(x + F.n[0], y + F.n[1], z + F.n[2])) continue;
              const base = f === 2 ? info.top : f === 3 ? info.bottom : info.side;
              const k = F.shade * nz;
              for (let v = 0; v < 4; v++) {
                const c = F.c[v];
                p[v * 3] = x + (c[0] ? bx[3] : bx[0]);
                p[v * 3 + 1] = y + (c[1] ? bx[4] : bx[1]);
                p[v * 3 + 2] = z + (c[2] ? bx[5] : bx[2]);
                cols[v * stride] = base[0] * k;
                cols[v * stride + 1] = base[1] * k;
                cols[v * stride + 2] = base[2] * k;
                if (stride === 4) cols[v * stride + 3] = info.alpha;
              }
              part.quad(p, stride === 4 ? cols : cols.subarray(0, 12), false);
            }
          }
        }
      }
    }
    return { opaque: opaque.result(), transparent: trans.result() };
  }

  // Recorre la rejilla con DDA y devuelve el primer bloque visible que cruza el rayo.
  pick(origin, dir) {
    const s = this.s;
    const lo = [0, this.yMin, 0];
    const hi = [s.width, this.yMax + 1, s.length];
    let tmin = 0;
    let tmax = Infinity;
    for (let a = 0; a < 3; a++) {
      if (Math.abs(dir[a]) < 1e-12) {
        if (origin[a] < lo[a] || origin[a] > hi[a]) return null;
        continue;
      }
      let t1 = (lo[a] - origin[a]) / dir[a];
      let t2 = (hi[a] - origin[a]) / dir[a];
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
    const t = tmin + 1e-6;
    const pos = [origin[0] + dir[0] * t, origin[1] + dir[1] * t, origin[2] + dir[2] * t];
    const cell = pos.map((v, a) => Math.min(Math.max(Math.floor(v), lo[a]), hi[a] - 1));
    const step = dir.map((d) => (d > 0 ? 1 : -1));
    const tDelta = dir.map((d) => (d === 0 ? Infinity : Math.abs(1 / d)));
    const tNext = dir.map((d, a) => {
      if (d === 0) return Infinity;
      const edge = d > 0 ? cell[a] + 1 : cell[a];
      return t + (edge - pos[a]) / d;
    });
    const maxSteps = s.width + s.height + s.length + 3;
    for (let i = 0; i < maxSteps; i++) {
      const id = this.visibleId(cell[0], cell[1], cell[2]);
      if (id) return { x: cell[0], y: cell[1], z: cell[2], id };
      const a = tNext[0] < tNext[1] ? (tNext[0] < tNext[2] ? 0 : 2) : (tNext[1] < tNext[2] ? 1 : 2);
      cell[a] += step[a];
      if (cell[a] < lo[a] || cell[a] >= hi[a]) return null;
      tNext[a] += tDelta[a];
    }
    return null;
  }
}
