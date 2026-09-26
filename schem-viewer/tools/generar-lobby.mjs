// Genera los lobbies de ejemplo en .schem para WorldEdit.
// Uso: node tools/generar-lobby.mjs [castillo2|unicornio|cementerio|castillo|mansion|isla|arbol|conejo|skywars|japones|epico] [salida.schem]
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { buildLobby, LOBBY_SURFACE } from '../js/lobby.js';
import { buildJapaneseLobby, JAPAN_SPAWN } from '../js/japan.js';
import { buildSkyWarsLobby, SKYWARS_SPAWN } from '../js/skywars.js';
import { buildRabbit, RABBIT_BASE } from '../js/rabbit.js';
import { buildTree, TREE_GROUND } from '../js/tree.js';
import { buildIsland, ISLAND_SEA } from '../js/island.js';
import { buildMansion, MANSION_GROUND } from '../js/mansion.js';
import { buildCastle, CASTLE_GROUND } from '../js/castle.js';
import { buildCastle2, CASTLE2_GROUND } from '../js/castle2.js';
import { buildCemetery, CEMETERY_GROUND } from '../js/cemetery.js';
import { buildUnicorn } from '../js/unicorn.js';
import { toSpongeV2 } from '../js/schem-writer.js';

const LOBBIES = {
  // origin: celda donde queda el jugador al hacer //paste.
  // El jugador aparece en la puerta de la muralla, mirando a la casa.
  // El jugador aparece al final del camino, mirando al puente y la puerta.
  // El jugador aparece delante de la gran puerta, mirando a la avenida.
  // El jugador queda en el prado, delante del unicornio.
  unicornio: { build: buildUnicorn, origin: [31, 2, 32], name: 'Unicornio rosa', file: 'unicornio-rosa.schem' },
  cementerio: { build: buildCemetery, origin: [40, CEMETERY_GROUND + 1, 87], name: 'Cementerio épico', file: 'cementerio-epico.schem' },
  castillo2: { build: buildCastle2, origin: [47, CASTLE2_GROUND + 1, 97], name: 'Castillo de princesas v2', file: 'castillo-princesas-v2.schem' },
  castillo: { build: buildCastle, origin: [47, CASTLE_GROUND + 1, 97], name: 'Castillo de princesas', file: 'castillo-princesas.schem' },
  mansion: { build: buildMansion, origin: [31, MANSION_GROUND + 1, 59], name: 'Mansión survival', file: 'mansion-survival.schem' },
  isla: { build: buildIsland, origin: [38, ISLAND_SEA + 2, 66], name: 'Isla tropical', file: 'isla-tropical.schem' },
  arbol: { build: buildTree, origin: [28, TREE_GROUND + 1, 54], name: 'Roble gigante', file: 'roble-gigante.schem' },
  // El jugador queda delante de los tres conejos, frente al del medio.
  conejo: { build: buildRabbit, origin: [47, RABBIT_BASE - 1, 36], name: 'Conejos: bueno, malvado y del amor', file: 'conejos.schem' },
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
