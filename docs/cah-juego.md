# Cartas Contra la Humanidad — el nuevo minijuego

Segundo minijuego de la plataforma, junto a "El Impostor". Es la versión
multijugador clásica de Cartas Contra la Humanidad: una carta negra plantea
una frase o pregunta con uno o dos huecos, y cada jugador rellena esos huecos
con carta(s) blanca(s) de su mano intentando que el "Card Czar" de la ronda
la elija como la más graciosa.

## Explicación superficial

Desde que se creó la sala hasta que termina la partida:

1. Al crear o unirse a una sala, ahora se elige primero el juego (Impostor o
   Cartas Contra la Humanidad) desde un menú nuevo.
2. El anfitrión configura una única opción: a cuántos puntos se gana la
   partida (entre 3 y 15, se sugiere 7).
3. Cada ronda, un jugador distinto es el **Card Czar** (rota automáticamente
   entre todos) y no juega cartas esa ronda — solo elige ganador.
4. Al resto les toca una carta negra en pantalla (la frase/pregunta) y tienen
   una mano de **10 cartas blancas**. Deben elegir 1 o 2 (según lo que pida
   la carta negra) para completarla.
5. Cuando todos han enviado, las respuestas se muestran de forma anónima
   (barajadas, sin decir quién jugó qué) para que el Card Czar elija la que
   más le guste.
6. Quien ganó la ronda suma un punto; las cartas jugadas se descartan y a
   todos se les reponen cartas nuevas hasta volver a tener 10 en mano para la
   siguiente ronda.
7. Si a un jugador no le gusta alguna carta de su mano, puede descartarla
   (una vez por ronda) para que se la cambien por otra distinta en la ronda
   siguiente — el detalle de esto está en
   [`docs/cah-descarte-cartas.md`](./cah-descarte-cartas.md).
8. La partida termina cuando alguien llega a los puntos objetivo (o si se
   agota el mazo, si el anfitrión la termina a mano, o si se queda sin
   jugadores suficientes). Se muestra un marcador final y el anfitrión puede
   empezar otra partida con los mismos ajustes o volver a la sala.

Todo el contenido de las cartas está en **español** — son las 1.796 cartas
oficiales de Cartas Contra la Humanidad (mazo base + 1ª y 2ª expansión)
traducidas para el grupo, no un mazo genérico ni cartas escritas a mano.

## Explicación detallada

### Arquitectura: de un juego a una plataforma de minijuegos

Antes de esto, `server/server.js` era un único archivo con toda la lógica de
"El Impostor" mezclada con la gestión de salas/sockets. Para añadir CAH sin
duplicar esa gestión de salas, se convirtió en un **registro de módulos por
juego**:

- `server/games/impostor.js` y `server/games/cah/` (este último dividido en
  varios archivos, ver abajo) exportan la misma interfaz:
  `createInitialState`, `getSettingsPayload`, `applySettings`, `startGame`,
  `endGame`, `onPlayerDisconnect`, `registerSocketHandlers`.
- `server/games/index.js` los expone como `games.impostor` / `games.cah`, y
  `server.js` llama siempre a `games[room.game].<lo que toque>` en vez de
  tener el código de un juego concreto incrustado.
- `room.game` ahora viaja desde el cliente en `createRoom`/`joinRoom` y el
  servidor lo valida (antes no sabía de qué juego era una sala).
- En el cliente, `client/src/gameConfig.js` es la fuente única de metadatos
  por juego (nombre, icono, jugadores mínimos/máximos) — la usan tanto
  `GameSelector.jsx` (elegir juego) como `Room.jsx` (activar "Empezar
  Juego" solo con jugadores suficientes).

Si se añade un tercer minijuego en el futuro, el patrón a seguir es el mismo:
`server/games/<id>/`, `client/src/games/<id>/`, una entrada en
`gameConfig.js` — no lógica suelta dentro de `server.js`.

### Los datos: de dónde salen las cartas

`server/data/cah/`:

- `es/black.json` / `es/white.json` — lo único que carga el servidor en
  tiempo real (`server/games/cah/cardData.js`). 1.796 cartas (333 negras +
  1.463 blancas), en español.
- `source/` — el inglés original y los artefactos intermedios del pipeline
  (nunca se usan en partida, solo para regenerar/ampliar el mazo).

Origen: **JSON Against Humanity** (`crhallberg/json-against-humanity`), un
dataset comunitario del contenido oficial de Cards Against Humanity®
(licencia Creative Commons BY-NC-SA — no hay API oficial de la propia
empresa). El pipeline en `server/scripts/cah/`:

```
downloadDataset.js  → descarga el dataset completo (público, gratis)
listPacks.js        → cataloga los 71 packs oficiales
buildSourceDeck.js  → filtra a los packs elegidos (selectedPacks.json)
translateBatch.js   → traduce por lotes con la API de Claude (tiene coste)
```

Los packs elegidos son el **Base Set + 1ª + 2ª Expansión** (1.796 cartas). En
la práctica, `translateBatch.js` **no se ha ejecutado nunca** — para evitar
el coste de API, la traducción de esas 1.796 cartas se hizo a mano dentro de
sesiones de Claude Code, repartida en lotes procesados por subagentes,
siguiendo las mismas reglas de adaptación (mantener el tono, adaptar juegos
de palabras y referencias culturales en vez de traducir literalmente). Cada
carta lleva `needsReview`/`reviewReason`: alrededor de un 15% quedaron
marcadas para que el grupo las revise a mano (son las que dependían de un
juego de palabras o referencia sin equivalente directo en español). Detalles
completos en `server/data/cah/README.md`.

Aparte, unas 42 cartas (de las 1.796) quedaron marcadas con
`"duplicateOf": "<id>"`: son cartas que en inglés eran ligeramente distintas
(variantes ortográficas US/UK, símbolos de marca registrada, comillas) pero
que al traducirlas correctamente al español quedan con el mismo texto que
otra carta ya existente. Se decidió marcarlas en vez de borrarlas — siguen
pudiendo salir en partida.

También se exploró ampliar el mazo con los 134 packs hechos por la
comunidad (unas 23.000 cartas más), pero se descartó por ser demasiado
trabajo de traducción manual para un proyecto sin presupuesto — queda
documentado el catálogo (`server/data/cah/source/fan-packs-catalog.json`,
generado por `server/scripts/cah/listFanPacks.js`) por si se retoma más
adelante.

### El motor de rondas (`server/games/cah/roundEngine.js`)

Estado por sala (`room.cah`): mazos y descartes de cartas negras/blancas,
mano de cada jugador, orden y posición del Card Czar, ronda actual, carta
negra activa, fase (`submitting` → `revealing` → `result`), envíos de la
ronda y puntuaciones.

Flujo de una ronda (`dealRound`):
1. Se elige el siguiente Card Czar recorriendo un orden barajado al empezar
   la partida, saltando a quien ya no esté en la sala.
2. Se roba una carta negra (`deckManager.draw`, ver más abajo).
3. Se envía `cahRoundStart` a cada jugador con su vista personalizada: el
   Card Czar recibe `hand: []` (no juega esta ronda), el resto recibe su
   mano actual.
4. Cada jugador no-Czar llama a `cahSubmitCards` con exactamente `pick`
   cartas de su mano (`handleSubmitCards` valida esto y rechaza envíos
   dobles o cartas que no están en la mano). En paralelo pueden descartar
   cartas que no quieran conservar (`cahDiscardCards`, ver el doc de
   descarte) mientras no hayan enviado ya.
5. Cuando todos han enviado, `revealSubmissions` baraja los envíos y los
   manda anónimos (`cahRevealSubmissions`) — el mapeo envío→jugador se
   guarda en el servidor, nunca se manda al cliente hasta que hace falta.
6. El Card Czar llama a `cahCzarPick`; se suma el punto, se descartan las
   cartas jugadas, y si se llegó a la puntuación objetivo termina la
   partida; si no, el anfitrión dispara `cahNextRound`, que repone todas
   las manos por debajo de `HAND_SIZE` (10) antes de repartir la siguiente
   ronda.

**Por qué nunca hay dos jugadores con la misma carta:** `deckManager.draw`
reparte sacando (`Array.pop()`) de un único mazo compartido y barajado, sin
reemplazo. Una carta solo puede estar en un sitio a la vez: en el mazo, en
la mano de alguien, o en el descarte — nunca en dos manos simultáneamente.
El descarte solo recicla el mazo (barajando de nuevo la pila de descarte)
cuando el mazo principal se queda vacío.

La partida termina (`endGame`) por: alguien llega a la puntuación objetivo
(`scoreReached`), se agota el mazo de cartas negras sin poder repartir más
(`deckExhausted`), quedan menos de 2 jugadores tras una desconexión
(`insufficientPlayers`), o el anfitrión la termina a mano.

### Eventos de socket

Cliente → servidor: `createRoom`/`joinRoom` (con `game: "cah"`),
`startGameSetup`, `submitGameSettings`, `cahSubmitCards`, `cahDiscardCards`,
`cahCzarPick`, `cahNextRound`, `endGame`, `restartGame`, `backToRoom`,
`leaveRoom`.

Servidor → cliente (propios de CAH): `cahRoundStart`, `cahSubmissionsProgress`,
`cahRevealSubmissions`, `cahRoundResult`, `cahDiscardConfirmed`, `cahError`
— más los genéricos que ya compartía con Impostor (`gameStarted`,
`startCountdown`, `gameEnded`, etc.), ya que la navegación entre pantallas
es la misma para ambos juegos.

### Cliente (`client/src/games/cah/`)

Todo el estado de la partida vive en un único objeto `cahState` dentro de
`Lobby.jsx` (agruparlo evita sumar más de una docena de `useState` sueltos,
que es como está hecho "El Impostor").

- `CAHGameSettings` — pantalla del anfitrión para fijar los puntos para
  ganar.
- `CAHWaitingForSettings` / `CAHCountdown` — pantallas de espera para el
  resto mientras el anfitrión configura / cuenta atrás para empezar.
- `CAHGamePlay` — orquesta la ronda según la fase: `CAHBlackCard` (la carta
  negra activa), `CAHHand` (elegir/enviar/descartar cartas), o
  `CAHSubmissionsReveal` (el Card Czar elige entre los envíos anónimos), o
  `CAHRoundResult` (quién ganó la ronda); `CAHScoreboard` siempre visible al
  lado.
- `CAHGameEnd` — marcador final y opciones del anfitrión para reiniciar o
  volver a la sala.

### Estado del despliegue

Todo este trabajo llevaba desde el 2026-07-05 sin commitear. El 2026-07-07
se subió entero a producción en un commit (`8fd4b79`, "Add Cards Against
Humanity as a second minigame") con push a `origin/main`, que dispara el
auto-deploy ya configurado en Render (servidor) y Vercel (cliente).
