// Registro de minijuegos disponibles. Cada módulo expone la misma interfaz:
//   MIN_PLAYERS, createInitialState(), getSettingsPayload(room),
//   applySettings(room, settings), startGame(io, room), endGame(io, room, reason),
//   onPlayerDisconnect(io, room, socketId)?, registerSocketHandlers(io, socket, getRoom)?
module.exports = {
  impostor: require("./impostor"),
  cah: require("./cah")
}
