// Genera los lobbies de ejemplo en .schem para WorldEdit.
// Uso: node tools/generar-lobby.mjs [skywars|japones|epico|conejo] [salida.schem]
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { buildLobby, LOBBY_SURFACE } from '../js/lobby.js';
import { buildJapaneseLobby, JAPAN_SPAWN } from '../js/japan.js';
import { buildSkyWarsLobby, SKYWARS_SPAWN } from '../js/skywars.js';
import { buildRabbit, RABBIT_BASE } from '../js/rabbit.js';
import { toSpongeV2 } from '../js/schem-writer.js';

const LOBBIES = {
  // origin: celda donde queda el jugador al hacer //paste.
  conejo: { build: buildRabbit, origin: [14, RABBIT_BASE, 26], name: 'Conejo gigante', file: 'conejo-gigante.schem' },
  skywars: { build: buildSkyWarsLobby, origin: SKYWARS_SPAWN, name: 'Lobby SkyWars', file: 'lobby-skywars.schem' },
  japones: { build: buildJapaneseLobby, origin: JAPAN_SPAWN, name: 'Lobby japonés', file: 'lobby-japones.schem' },
  epico: { build: buildLobby, origin: [25, LOBBY_SURFACE + 1, 33], name: 'Lobby épico', file: 'lobby-epico.schem' },
};

const which = process.argv[2] || 'skywars';
const def = LOBBIES[which];
if (!def) {
  console.error(`Lobby desconocido: ${which}. Opciones: ${Object.keys(LOBBIES).join(', ')}`);
  process.exit(1);
}
const out = process.argv[3] || def.file;
const s = def.build();
writeFileSync(out, gzipSync(toSpongeV2(s, { dataVersion: 3465, origin: def.origin, name: def.name, author: 'Visor de Schematics' })));
const counts = s.countBlocks();
const total = counts.reduce((a, b, i) => a + (i ? b : 0), 0);
console.log(`${out}: ${s.width}×${s.height}×${s.length}, ${total} bloques`);
