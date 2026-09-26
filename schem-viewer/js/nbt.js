// Lector NBT (formato binario de Minecraft, big-endian).
// Byte arrays -> Uint8Array, Int arrays -> Int32Array, Long -> BigInt,
// Long arrays -> LongArray (palabras de 32 bits, útil para datos empaquetados).

export class LongArray {
  constructor(words) {
    // words[2*i] = 32 bits bajos del long i, words[2*i+1] = 32 bits altos.
    this.words = words;
    this.length = words.length >>> 1;
  }
}

export async function inflate(u8) {
  let format = null;
  if (u8[0] === 0x1f && u8[1] === 0x8b) format = 'gzip';
  else if (u8[0] === 0x78 && [0x01, 0x5e, 0x9c, 0xda].includes(u8[1])) format = 'deflate';
  if (!format) return u8;
  const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream(format));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export function readNbt(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const td = new TextDecoder();
  let p = 0;

  const str = () => {
    const len = dv.getUint16(p);
    p += 2;
    const s = td.decode(u8.subarray(p, p + len));
    p += len;
    return s;
  };

  const payload = (type) => {
    switch (type) {
      case 1: return dv.getInt8(p++);
      case 2: { const v = dv.getInt16(p); p += 2; return v; }
      case 3: { const v = dv.getInt32(p); p += 4; return v; }
      case 4: { const v = dv.getBigInt64(p); p += 8; return v; }
      case 5: { const v = dv.getFloat32(p); p += 4; return v; }
      case 6: { const v = dv.getFloat64(p); p += 8; return v; }
      case 7: {
        const len = dv.getInt32(p); p += 4;
        const v = u8.slice(p, p + len); p += len;
        return v;
      }
      case 8: return str();
      case 9: {
        const t = dv.getUint8(p++);
        const len = dv.getInt32(p); p += 4;
        const arr = new Array(Math.max(0, len));
        for (let i = 0; i < len; i++) arr[i] = payload(t);
        return arr;
      }
      case 10: {
        const obj = {};
        for (;;) {
          const t = dv.getUint8(p++);
          if (t === 0) break;
          const name = str();
          obj[name] = payload(t);
        }
        return obj;
      }
      case 11: {
        const len = dv.getInt32(p); p += 4;
        const v = new Int32Array(len);
        for (let i = 0; i < len; i++, p += 4) v[i] = dv.getInt32(p);
        return v;
      }
      case 12: {
        const len = dv.getInt32(p); p += 4;
        const words = new Uint32Array(len * 2);
        for (let i = 0; i < len; i++, p += 8) {
          words[2 * i + 1] = dv.getUint32(p);
          words[2 * i] = dv.getUint32(p + 4);
        }
        return new LongArray(words);
      }
      default:
        throw new Error(`Tag NBT desconocido: ${type} en el byte ${p}`);
    }
  };

  const rootType = dv.getUint8(p++);
  if (rootType !== 10) throw new Error('El archivo no es NBT válido (la raíz no es un compound).');
  const name = str();
  return { name, value: payload(10) };
}
