# Visor de Schematics

Visor 3D en el navegador para construcciones de Minecraft. Es una web estática, sin build: abre `index.html` desde un servidor local.

```bash
cd schem-viewer
npm start          # sirve en http://localhost:8080
npm test           # pruebas de los parsers y el mesher (Node 18+)
```

## Formatos

| Formato | Extensión | Notas |
|---|---|---|
| Sponge (WorldEdit / FAWE) | `.schem` | v1, v2 y v3 |
| Litematica | `.litematic` | varias regiones, tamaños negativos |
| Estructura vanilla | `.nbt` | structure blocks / datapacks |
| MCEdit clásico | `.schematic` | IDs numéricos (≤ 1.12), tabla aproximada |

## Qué hace

- Arrastra un archivo a la ventana o usa **Abrir archivo**. Todo se procesa en local; no se sube nada.
- Colores aproximados por bloque (sin texturas) con oclusión ambiental y sombreado por cara.
- Formas reales para losas, escaleras, vallas, muros, paneles, puertas, trampillas, antorchas, plantas, alfombras, etc.
- **Capas**: recorta por altura o muestra una sola capa (`[` y `]`).
- **Materiales**: lista con cantidades en stacks de 64 y shulkers; puedes ocultar bloques concretos y copiar la lista.
- Pasa el ratón por un bloque para ver su nombre, coordenadas y propiedades.

## Estructura

- `js/nbt.js`: lector NBT (gzip/zlib vía `DecompressionStream`).
- `js/formats.js`: parsers de cada formato → modelo común (`js/schematic.js`).
- `js/legacy.js`: IDs numéricos antiguos → nombres modernos.
- `js/blocks.js`: colores y formas de los bloques.
- `js/mesher.js`: geometría por chunks de 32³ con caras ocultas eliminadas; selección por DDA.
- `js/main.js`: escena three.js e interfaz.
- `js/demo.js` y `js/lobby.js`: ejemplos generados por código (casita y lobby épico).
- `js/schem-writer.js`: exportador a Sponge `.schem` v2.

## Lobby épico 50×50

`js/lobby.js` genera un lobby flotante: fuente central con aguja de amatista y anillos,
cuatro portales de colores para modos de juego, jardines de cerezos y cuatro islotes.

```bash
node tools/generar-lobby.mjs epico lobby-epico.schem
```

Para pegarlo con WorldEdit (1.20+): copia el archivo a `plugins/WorldEdit/schematics/`,
colócate donde quieras la plaza y ejecuta `//schem load lobby-epico` y `//paste`.
Quedarás de pie en la plaza, al sur de la fuente. La isla se extiende 21 bloques hacia abajo.

## Lobby japonés 50×100

`js/japan.js` genera un lobby alargado. Apareces en el extremo sur mirando al norte
y todo queda delante: plaza con flor de cerezo, gran torii, túnel de torii entre bambú,
puente rojo sobre el arroyo, cuatro santuarios de colores (modos de juego), jardín zen,
pagoda de cinco pisos y el templo principal con el portal dorado al fondo.

```bash
node tools/generar-lobby.mjs japones lobby-japones.schem
```

Al hacer `//paste` quedas en el centro de la plaza de aparición. Mira al norte
(`/tp @s ~ ~ ~ 180 0`) y usa `/setworldspawn` para fijar el spawn ahí.
