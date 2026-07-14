// Registro de minijuegos disponibles. Cada módulo expone la misma interfaz:
//   MIN_PLAYERS, createInitialState(), getSettingsPayload(room),
//   applySettings(room, settings), startGame(io, room), endGame(io, room, reason),
//   onPlayerDisconnect(io, room, socketId)?, registerSocketHandlers(io, socket, getRoom)?,
//   rebindPlayer(room, oldSocketId, newSocketId)?, getResyncPayload(room, socketId)?
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
