# Descartar cartas en Cartas Contra la Humanidad

## Explicación superficial

Antes, la mano de 10 cartas blancas que te tocaba al empezar la partida era la
que tenías durante toda la ronda: si no te gustaba ninguna, no había nada que
hacer salvo esperar a jugar una y que te repusieran una nueva la siguiente
ronda.

Ahora, mientras eliges qué jugar, tienes un botón de **"🗑️ Descartar
cartas"**. Al pulsarlo, la mano entra en modo descarte: tocas las cartas que
no quieras conservar (pueden ser varias a la vez) y confirmas con **"Confirmar
descarte"**, o cancelas si te arrepientes. Las cartas descartadas desaparecen
de tu mano en el momento; las nuevas para reemplazarlas te llegan en el
reparto de la ronda siguiente, no al instante — así que si descartas, esta
ronda juegas con menos cartas de las que tenías.

Reglas:
- Solo se puede descartar **una vez por ronda**.
- Siempre te tienes que quedar con **al menos las cartas que pida la carta
  negra de esa ronda** (normalmente 1, a veces 2) — si no, no podrías enviar
  nada esa ronda, así que el juego no te deja descartar de más.
- El Card Czar de la ronda no descarta (no le toca elegir carta esa ronda).
- Nunca vas a recibir una carta que ya tenga otro jugador en la mano en ese
  momento — eso ya estaba garantizado antes de esta función y se sigue
  cumpliendo igual.

## Explicación detallada

### Servidor (`server/games/cah/roundEngine.js`)

**Nuevo evento de socket:** `cahDiscardCards`, con payload `{ cardIds: [...] }`
(registrado en `server/games/cah/index.js`, mismo patrón de guardas que el
resto de eventos de CAH: la sala tiene que existir, ser de tipo `"cah"` y
estar en `gameState: "playing"`).

**Manejador:** `handleDiscardCards(io, room, socketId, cardIds)` valida, en
este orden:
1. La ronda está en fase `"submitting"`.
2. Quien pide el descarte no es el Card Czar de la ronda (`state.czarId`).
3. No ha enviado ya sus cartas esta ronda (`state.submissions[socketId]`).
4. No ha descartado ya esta ronda (`state.discards[socketId]`, nuevo campo de
   estado que se resetea en cada `dealRound`, igual que `submissions`).
5. Todos los ids a descartar están realmente en su mano.
6. Tras descartar quedarían al menos `state.currentBlackCard.pick` cartas en
   mano — si no, se rechaza con un mensaje explicando cuántas hacen falta.

Si todo pasa: las cartas salen de `state.hands[socketId]` y se añaden a
`state.whiteDiscard` (la misma pila de descarte que ya se usaba al puntuar
una ronda — no es una pila nueva), se marca `state.discards[socketId] = true`,
y se emite `cahDiscardConfirmed` solo a ese jugador con su mano ya actualizada
(mapeada a `{id, text}` igual que en el resto de eventos de mano).

**Reposición generalizada:** antes, `handleNextRound` solo reponía manos
hasta `HAND_SIZE` para quienes aparecían en `state.submissions` (quienes
jugaron esa ronda). Para que el descarte también se reponga la ronda
siguiente, ese bucle ahora recorre **todos los jugadores de la sala**
(`room.users`) y repone a quien esté por debajo de `HAND_SIZE`, sin importar
si fue por jugar, por descartar, o ambas cosas. El Card Czar no se ve
afectado porque su mano no se toca mientras es Czar, así que ya está completa
y el bucle no hace nada por él.

**Por qué la unicidad de cartas entre manos sigue garantizada:**
`deckManager.draw` reparte sacando (`pop()`) de un único mazo compartido sin
reemplazo — dos jugadores nunca pueden tener el mismo id de carta en mano a
la vez. Una carta descartada sale de la mano hacia `whiteDiscard` y no vuelve
a estar disponible para nadie hasta que el mazo se recicle y se barajee de
nuevo; en ningún momento queda "flotando" en dos sitios a la vez. El descarte
no necesitó ningún cambio para mantener esta propiedad.

### Cliente (`client/src/games/cah/CAHHand.jsx`)

Se descartó la idea inicial de un checkbox por carta (mala ergonomía táctil:
objetivo pequeño y dos significados de "tocar la carta" a la vez en pantalla)
a favor de un **modo descarte**: el mismo gesto de tocar una carta cambia de
significado según el modo activo, comunicado con un estilo visual claramente
distinto (borde y tachado en rojo, en vez del dorado de "carta elegida para
jugar").

Estado local nuevo: `discardMode` (bool) y `discardSelected` (array de ids).
Mientras `discardMode` está activo:
- Tocar una carta la marca/desmarca en `discardSelected`.
- El límite `hand.length - pick` se aplica en vivo — las cartas que no se
  pueden marcar más allá del límite quedan deshabilitadas (`is-disabled`).
- Se ocultan las instrucciones y el botón "Enviar" del modo normal, para que
  no convivan dos acciones a la vez.
- Dos botones: "Cancelar" (descarta la selección local, sin llamar al
  servidor) y "Confirmar descarte (N)" (llama a `onDiscard(discardSelected)`
  y sale del modo).

El botón de entrada "🗑️ Descartar cartas" solo se muestra si `!hasDiscarded`
(prop nueva que viene del estado global de la ronda) y si queda margen para
descartar (`maxDiscardable > 0`); una vez el servidor confirma un descarte
con `cahDiscardConfirmed`, `hasDiscarded` pasa a `true` y el botón desaparece
el resto de la ronda — coherente con la regla de "una vez por ronda" del
servidor (que es quien de verdad la hace cumplir; el cliente solo evita el
intento obvio).

### Cableado en `Lobby.jsx`

- `handleDiscardCahCards(cardIds)` emite `cahDiscardCards`.
- Listener de `cahDiscardConfirmed` actualiza `cahState.hand` con la mano ya
  reducida y pone `hasDiscarded: true`.
- `hasDiscarded` se resetea a `false` en cada `cahRoundStart`, igual que
  `hasSubmitted`.

### Verificación

Antes de darlo por terminado se ejecutó un script (fuera del repo, en el
scratchpad de la sesión) que simula una partida de 4 jugadores llamando
directamente a las funciones de `roundEngine.js` — sin pasar por sockets ni
navegador — cubriendo: descarte válido, doble descarte en la misma ronda,
descarte que bajaría de `pick` cartas, el Card Czar intentando descartar,
reposición correcta en la ronda siguiente, y unicidad de cartas entre manos
tras varias rondas.
