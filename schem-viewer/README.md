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
- `js/demo.js`: casita de ejemplo que se carga al abrir.
