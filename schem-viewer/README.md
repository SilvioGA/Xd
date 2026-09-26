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

## Modo jugador

**Modo jugador** te pone dentro de la construcción en primera persona, con colisiones reales.
Si el schematic no trae punto de aparición, apareces en el borde sur mirando al norte.

| Acción | Teclado | Móvil |
|---|---|---|
| Moverse | `W` `A` `S` `D` o flechas | ▲ ◀ ▼ ▶ |
| Mirar | ratón (se captura al hacer clic) | arrastrar |
| Saltar / subir volando | `Espacio` | Saltar |
| Correr | mantener `Mayús`, doble toque de `W` o `R` para dejarlo activado | Correr |
| Volar (atraviesa paredes) | `F`; volando, `Mayús` baja y correr va al doble de rápido | Volar |
| Soltar el ratón / salir | `Esc` | Salir del modo jugador |

## Estructura

- `js/nbt.js`: lector NBT (gzip/zlib vía `DecompressionStream`).
- `js/formats.js`: parsers de cada formato → modelo común (`js/schematic.js`).
- `js/legacy.js`: IDs numéricos antiguos → nombres modernos.
- `js/blocks.js`: colores y formas de los bloques.
- `js/mesher.js`: geometría por chunks de 32³ con caras ocultas eliminadas; selección por DDA.
- `js/main.js`: escena three.js e interfaz.
- `js/player.js`: física del modo jugador (colisiones, escalones, escaleras de mano, agua, vuelo, correr).
- `js/castle.js`, `js/mansion.js`, `js/island.js`, `js/tree.js`, `js/rabbit.js`, `js/demo.js`, `js/lobby.js`, `js/japan.js` y `js/skywars.js`: ejemplos generados por código.
- `js/jp-kit.js`: piezas japonesas compartidas (isla, torii, tōrō, tejados curvos, pagoda, cerezos, bambú).
- `js/schem-writer.js`: exportador a Sponge `.schem` v2, incluido el texto de los carteles.

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

## Lobby SkyWars: templo de la montaña 60×50

`js/skywars.js`: un valle de otoño al pie de una montaña nevada. Apareces al sur mirando
al norte y caminas unos 20 bloques, cruzando un puente de piedra sobre el arroyo, hasta
la fachada del templo tallado en el acantilado. Ahí está el **muro de carteles** para
unirse a las partidas: 12 de Solo (abedul, franja celeste) y 12 de Duos (bambú, franja
naranja), cada grupo con su cartel de cabecera. Encima, el título SKYWARS grabado en oro
en la roca. A la izquierda cae una cascada y a la derecha una escalera tallada sube a un
santuario con campana.

```bash
node tools/generar-lobby.mjs skywars lobby-skywars.schem
```

Los carteles ya llevan texto (`[SkyWars]`, mapa, modo). Regístralos en tu plugin para que
muestren el estado de cada partida.

## Conejos: bueno, malvado y del amor

`js/rabbit.js`: dos estatuas de 28 bloques de alto, una al lado de la otra, cada una con su
peana. El conejo bueno es blanco, con el interior de las orejas rosa, nariz en triángulo y una
zanahoria sobre las patas, sobre césped con flores. El malvado tiene el pelaje oscuro con
manchas, una oreja rota, ojos rojos con cejas de enfado, colmillos, una cicatriz y una espada
clavada en el suelo; su peana es de netherrack con grietas de magma, fuego de almas, huesos,
rosas de wither, calaveras y pinchos. El conejo del amor es rosa, con ojos de corazón,
mofletes sonrojados y un gran corazón rojo abrazado contra el pecho; tiene corazones flotando
junto a las orejas y una peana de flores (pétalos rosas, rosales, peonías) con un corazón en
mosaico en el suelo.

```bash
node tools/generar-lobby.mjs conejo conejos.schem
```

## Roble gigante

`js/tree.js`: roble de 45 bloques de alto. Tronco con la base ensanchada y vetas de corteza
oscura, nueve raíces que se hunden en el suelo, ramas generadas de forma recursiva con copas
de hojas de roble, roble oscuro y azalea, lianas de bayas brillantes, musgo en la cara norte,
hongos de repisa, una colmena, farolillos y un columpio. Alrededor: podzol, helechos, setas,
flores, rocas con musgo y un tronco caído.

```bash
node tools/generar-lobby.mjs arbol roble-gigante.schem
```

## Isla tropical

`js/island.js`: isla de 72×72 en mar abierto. Fondo de arena que se hunde hacia fuera, arrecife
de coral de cinco colores con abanicos y pepinos de mar, kelp y praderas de algas. En tierra:
playa, colina con una cascada que cae a una poza, palmeras curvadas con cocos, cabaña tiki de
bambú con tejado de paja y antorchas, muelle con farolillos, hamaca entre dos palmeras,
sombrilla y toalla, castillo de arena, huevos de tortuga, fogata y un tesoro medio enterrado.

```bash
node tools/generar-lobby.mjs isla isla-tropical.schem
```

El mar llega hasta los bordes del schematic: pégalo en un océano (o en un mundo vacío) para que
el agua no se derrame por los lados.

## Castillo de princesas

`js/castle.js`: castillo de cuento de 95×100 con techos cónicos rosas y banderas en cada torre.

- **Exterior**: foso con nenúfares, puente de cerezo con farolas, muralla blanca con almenas,
  adarve con escaleras de subida y cuatro torres; la puerta tiene rastrillo y un corazón encima.
- **Patio**: fuente con un corazón rosa, macizos de flores con setos de azalea, cerezos,
  cenador y una carroza de calabaza con ruedas de oro.
- **Palacio**: escalinata, pórtico con balcón y rosetón en el hastial. Dentro, salón de baile
  con suelo a cuadros, columnas, lámparas de oro, mesas de banquete y trono; dos escaleras suben
  a la planta alta: dormitorio de la princesa (cama con dosel, tocador, armario de shulkers),
  salón de té y biblioteca.
- **Torre principal** de casi 80 bloques: se sube por una escalera de mano desde el salón de té
  hasta la habitación de arriba, que tiene un balcón circular.

```bash
node tools/generar-lobby.mjs castillo castillo-princesas.schem
```

Al hacer `//paste` quedas al final del camino, mirando al puente y la puerta.

## Mansión survival

`js/mansion.js`: finca de 64×62 lista para jugar en survival.

- **Casa de dos plantas** con entramado de madera oscura y tejado de pizarra.
  - Planta baja: almacén con 12 cofres dobles etiquetados, cocina (ahumadores, caldero con agua),
    taller con todas las mesas de trabajo (hornos, alto horno, yunque, afiladora, herrería,
    cortapiedras, telar, cartografía, flechas) y sala de pociones con verrugas del Nether.
  - Planta alta: dormitorio principal, dormitorio de invitados, biblioteca con cofre de ender
    y **sala de encantamientos con 22 librerías bien colocadas (nivel 30)**.
- **Cultivos**: cuatro parcelas de 9×9 con agua en el centro (trigo, zanahoria, patata,
  remolacha), caña de azúcar junto a un canal, melones y calabazas.
- **Corrales** para vacas, ovejas y gallinas (con gallinero), heno y bebederos. Los animales los
  traes tú.
- **Fuente de agua infinita**, portal del Nether sin encender, colmenas con flores, granja de
  árboles y muralla con farolas para que no aparezcan mobs.

```bash
node tools/generar-lobby.mjs mansion mansion-survival.schem
```
