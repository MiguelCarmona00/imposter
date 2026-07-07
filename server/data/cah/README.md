# Datos de Cartas Contra la Humanidad (CAH)

## Estructura

```
data/cah/
├── source/                  # Inglés — nunca se usa en tiempo de juego, solo como fuente
│   ├── raw-official.json    # Dump íntegro del dataset compacto (crhallberg/json-against-humanity)
│   ├── packs-catalog.json   # Catálogo de los 71 packs oficiales (generado por listPacks.js)
│   ├── black.en.json        # Subset filtrado (packs elegidos) listo para traducir
│   └── white.en.json
└── es/                      # Español — lo que realmente carga el servidor (games/cah/cardData.js)
    ├── black.json           # {id, packId, text, pick, needsReview, reviewReason, reviewedBy?, duplicateOf?}
    └── white.json           # {id, packId, text, needsReview, reviewReason, reviewedBy?, duplicateOf?}
```

`es/black.json` y `es/white.json` son el **único** dato que carga el servidor en tiempo de
ejecución (`server/games/cah/cardData.js`). Contienen las **1.796 cartas oficiales**
(333 negras + 1.463 blancas — Base Set + 1ª + 2ª Expansión) traducidas al español. El
antiguo mazo semilla (`packId: "seed"`, ~55 negras / ~150 blancas, escrito a mano para
poder jugar antes de tener la traducción real) fue **sustituido por completo** y ya no
existe en estos ficheros.

## Pipeline para generar el mazo oficial en español

```
node scripts/cah/downloadDataset.js   # descarga raw-official.json (público, sin coste)
node scripts/cah/listPacks.js         # lista los 71 packs oficiales con nº de cartas
# -> edita scripts/cah/selectedPacks.json con los packs que quieras incluir
node scripts/cah/buildSourceDeck.js   # filtra a source/black.en.json + white.en.json
node scripts/cah/translateBatch.js    # traduce por lotes con la API de Claude (tiene coste, requiere ANTHROPIC_API_KEY)
```

**Packs elegidos actualmente** (`scripts/cah/selectedPacks.json`): CAH Base Set + First
Expansion + Second Expansion → **1.796 cartas** (1.463 blancas + 333 negras), ya generadas
en `source/black.en.json` / `source/white.en.json`. Es algo más que el rango ~1200-1500
cartas que se había estimado a ciegas; si se prefiere menos volumen para la primera
revisión manual, basta con quitar "CAH: Second Expansion" del array (deja 1.688 cartas) o
dejar solo el Base Set (1.549 cartas) y volver a correr `buildSourceDeck.js`.

## Cómo se tradujo el mazo actual (2026-07-06/07)

El mazo en `es/` **no** se generó ejecutando `translateBatch.js` contra la API de
Anthropic — se evitó deliberadamente para no incurrir en coste de API. En su lugar, las
1.796 cartas de `source/black.en.json` / `source/white.en.json` se tradujeron a mano
dentro de una sesión de Claude Code, repartiendo el trabajo en 15 lotes (5 de negras,
10 de blancas) procesados por subagentes en paralelo, cada uno siguiendo las mismas
reglas de traducción/adaptación que el `SYSTEM_PROMPT` de `translateBatch.js`. El
resultado se fusionó y se validó contra el dataset fuente (mismos ids, mismo `pick`,
mismo número de huecos `_____`) antes de escribirlo aquí. 49 cartas negras y 225 blancas
quedaron marcadas `needsReview: true` — ver más abajo.

Si en el futuro se amplían los packs seleccionados (`scripts/cah/selectedPacks.json`) y
se quiere traducir el nuevo subconjunto, `translateBatch.js` sigue siendo válido para
ese trabajo incremental (tiene coste real de API) — respeta cualquier carta que ya tenga
`reviewedBy` y no la vuelve a traducir ni a pisar. Las cartas actuales no tienen
`reviewedBy` todavía (solo `needsReview`), así que una ejecución de `translateBatch.js`
sin especificar packs nuevos las volvería a traducir y sobrescribiría estas versiones —
añadid `reviewedBy` a medida que el grupo las revise para protegerlas.

## Cartas duplicadas (2026-07-07)

El dataset "oficial" de crhallberg incluye, para el set base + 1ª/2ª expansión, varias
cartas en inglés que en realidad son la misma carta con variación ortográfica US/UK
(`mom`/`mum`, `color`/`colour`...), presencia de símbolo de marca (`Pepsi` vs `Pepsi®`),
estilo de comillas o puntuación menor. Al traducir correctamente al español esa distinción
desaparece y quedan como texto idéntico. Se detectaron **11 grupos en negras (11 cartas
redundantes)** y **30 grupos en blancas (31 cartas redundantes)** — un ~2,3% del mazo.

Se decidió **no borrarlas** (todavía pueden salir en partida como cartas distintas) sino
**marcarlas** con un campo `"duplicateOf": "<id de la carta canónica>"` en la copia
redundante (se conserva el id numéricamente más bajo del grupo como canónica). Sirve como
documentación para una futura limpieza/revisión manual; no cambia el comportamiento del
juego. Buscar `duplicateOf` en `es/black.json` / `es/white.json` para ver la lista completa.

## Revisión manual del grupo

Cada carta traducida lleva `needsReview` (true cuando el modelo tuvo que adaptar un juego
de palabras o referencia cultural sin equivalente directo) y `reviewReason` (motivo breve).
Al revisar una carta a mano, añadidle un campo `"reviewedBy": "<nombre>"` — las
re-ejecuciones de `translateBatch.js` respetan cualquier carta que ya tenga `reviewedBy`
y no la vuelven a traducir ni a pisar.
