const roundEngine = require("./roundEngine")

function registerSocketHandlers(io, socket, getRoom) {
  socket.on("cahSubmitCards", (data) => {
    const room = getRoom()
    if (!room || room.game !== "cah" || room.gameState !== "playing") return
    roundEngine.handleSubmitCards(io, room, socket.id, data && data.cardIds)
  })

  socket.on("cahDiscardCards", (data) => {
    const room = getRoom()
    if (!room || room.game !== "cah" || room.gameState !== "playing") return
    roundEngine.handleDiscardCards(io, room, socket.id, data && data.cardIds)
  })

  socket.on("cahCzarPick", (data) => {
    const room = getRoom()
    if (!room || room.game !== "cah" || room.gameState !== "playing") return
    roundEngine.handleCzarPick(io, room, socket.id, data && data.submissionId)
  })

  socket.on("cahNextRound", () => {
    const room = getRoom()
    if (!room || room.game !== "cah" || room.gameState !== "playing") return
    roundEngine.handleNextRound(io, room, socket.id)
  })
}

module.exports = {
  MIN_PLAYERS: roundEngine.MIN_PLAYERS,
  createInitialState: roundEngine.createInitialState,
  getSettingsPayload: roundEngine.getSettingsPayload,
  applySettings: roundEngine.applySettings,
  startGame: roundEngine.startGame,
  endGame: roundEngine.endGame,
  onPlayerDisconnect: roundEngine.onPlayerDisconnect,
  registerSocketHandlers,
  rebindPlayer: roundEngine.rebindPlayer,
  getResyncPayload: roundEngine.getResyncPayload
}
