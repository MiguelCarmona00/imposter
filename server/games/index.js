// Registro de minijuegos disponibles. Cada módulo expone la misma interfaz:
//   MIN_PLAYERS, createInitialState(), getSettingsPayload(room),
//   applySettings(room, settings), startGame(io, room), endGame(io, room, reason),
//   onPlayerDisconnect(io, room, socketId, reason)?, registerSocketHandlers(io, socket, getRoom)?,
//   rebindPlayer(room, oldSocketId, newSocketId)?, getResyncPayload(room, socketId)?,
//   supportsLateJoin?
//
// onPlayerDisconnect recibe `reason`: "disconnect" (se fue y agotó su gracia) o
// "kicked" (lo expulsó el anfitrión). Las dos rutas comparten limpieza, pero el
// juego puede querer tratarlas distinto — en CAH, al expulsado se le borra del
// marcador y a quien perdió la conexión se le conserva para el marcador final.
//
// supportsLateJoin (opcional, por defecto false) declara que el juego admite que
// alguien se una con la partida ya en marcha. El servidor se limita a aparcar a
// ese jugador en `room.pendingJoins`; es el propio juego quien decide cuándo
// absorberlo, en un punto donde no rompa la partida (en CAH, el cambio de ronda).
// Un juego sin rondas internas, como El Impostor, no lo declara y sigue
// rechazando la entrada tardía.
//
// rebindPlayer/getResyncPayload son para la reconexión automática (ver
// server.js: rebindConnection/requestResync): cuando un jugador reconecta
// dentro de RECONNECT_GRACE_MS con un socket.id nuevo, rebindPlayer debe
// renombrar cualquier estado propio del juego que esté indexado por el id
// viejo; getResyncPayload debe devolver el equivalente a lo último que ese
// jugador habría recibido, para que el cliente reconstruya su pantalla sin
// tener que recargar.
module.exports = {
  impostor: require("./impostor"),
  cah: require("./cah")
}
