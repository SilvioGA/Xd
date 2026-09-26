// Genera lobby-epico.schem. Uso: node tools/generar-lobby.mjs [salida.schem]
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { buildLobby, LOBBY_SURFACE } from '../js/lobby.js';
import { toSpongeV2 } from '../js/schem-writer.js';

const out = process.argv[2] || 'lobby-epico.schem';
const s = buildLobby();
// Al pegar, el jugador queda en el centro de la plaza, de pie sobre el suelo.
const nbt = toSpongeV2(s, { dataVersion: 3465, origin: [25, LOBBY_SURFACE + 1, 33], name: 'Lobby épico', author: 'Visor de Schematics' });
writeFileSync(out, gzipSync(nbt));
const counts = s.countBlocks();
const total = counts.reduce((a, b, i) => a + (i ? b : 0), 0);
console.log(`${out}: ${s.width}×${s.height}×${s.length}, ${total} bloques, ${s.palette.length - 1} estados`);
