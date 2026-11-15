# Estructura del cliente y de los minijuegos

## Flujo de la aplicación

1. **Nombre** (`UserNameInput`)
2. **Elegir juego** (`GameSelector`, lee `gameConfig.js`)
3. **Crear o unirse** (`RoomSelection`): crear pide nombre de sala; unirse pide nombre + código
4. **Sala de espera** (`Room`): vista de anfitrión (copiar código, ⋯ por jugador: hacer anfitrión / expulsar / vetar, empezar) e invitado
5. **Ajustes** (solo anfitrión, componente del juego) · los invitados ven `WaitingForSettings`
6. **Cuenta atrás** (`Countdown`, común a todos los juegos)
7. **Partida** y **fin de partida** (componentes del juego)

`Lobby.jsx` decide qué pantalla se ve según el estado del socket.

## Piezas compartidas

- `index.css` — todos los estilos (tema "fieltro negro"), variables en `:root`. Los estilos de escritorio y las animaciones están al final del archivo a propósito, para que prevalezcan.
- `ui.jsx` — `Table` (la mesa), `TopBar`, botones de volver/salir, `CodePill`, `Sheet` (hoja inferior), `Stepper`, `Switch`, iconos, `WaitingScreen`.
- `GameExitSheet.jsx` — hoja de "salir de la partida" (avisa de quién hereda el anfitrión).
- `Preview.jsx` — **solo desarrollo**: `?preview=<pantalla>` pinta cada pantalla con datos de ejemplo sin servidor. No entra en el build de producción.

## Minijuegos

```
games/
├── impostor/   ImpostorGameSettings, ImpostorGamePlay, ImpostorGameEnd
└── cah/        CAHGameSettings, CAHGamePlay (+ CAHHand, CAHBlackCard,
                CAHSubmissionsReveal, CAHRoundResult, CAHScoreboard),
                CAHGameEnd, CAHWaitingForNextRound
```

## Añadir un minijuego nuevo

1. Entrada en `gameConfig.js` (id, nombre, descripción, mín./máx. jugadores) y su icono en `GameIcon` (`ui.jsx`).
2. Carpeta `games/<id>/` con al menos ajustes, partida y fin de partida, construidos con las piezas de `ui.jsx`.
3. Casos en `Lobby.jsx` para `game-settings`, `playing` y `game-end`.
4. Módulo de servidor en `server/games/<id>` siguiendo el registro de `server/games/index.js`.
