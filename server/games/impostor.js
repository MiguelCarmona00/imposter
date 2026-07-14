const wordLibrary = require("../wordLibrary")

// Seleccionar palabra aleatoria
function getRandomWord() {
  return wordLibrary[Math.floor(Math.random() * wordLibrary.length)]
}

// Asignar roles aleatoriamente
function assignRoles(users, impostorCount) {
  const roles = {}
  const userIds = users.map(u => u.id)

  // Mezclar array de IDs
  const shuffled = [...userIds].sort(() => Math.random() - 0.5)

  // Asignar impostores
  for (let i = 0; i < impostorCount && i < shuffled.length; i++) {
    roles[shuffled[i]] = "impostor"
  }

  // Asignar normales al resto
  for (let id of userIds) {
    if (!roles[id]) {
      roles[id] = "normal"
    }
  }

  return roles
}

function createInitialState() {
  return {
    gameSettings: null,
    currentWord: null,
    roles: {},
    starterName: null
  }
}

function getSettingsPayload(room) {
  return {
    maxImpostors: room.users.length - 1
  }
}

function applySettings(room, settings) {
  room.impostor.gameSettings = settings
  return { ok: true }
}

// Arma lo que un jugador concreto ve de la ronda activa — se usa tanto al
// repartir (startGame) como al reconstruir su pantalla en un resync.
function buildPlayerPayload(room, userId) {
  const state = room.impostor
  const role = state.roles[userId]
  if (!role || !state.currentWord) return null

  const settings = state.gameSettings
  return {
    role: role,
    word: role === "normal" ? state.currentWord.word : null,
    hint: role === "impostor" && settings.showHint ? state.currentWord.hint : null,
    category: role === "impostor" && settings.showCategory ? state.currentWord.category : null,
    starterName: state.starterName
  }
}

// Repartir palabra/roles y notificar a cada jugador (usado tanto al empezar como al reiniciar)
function startGame(io, room) {
  const settings = room.impostor.gameSettings
  room.impostor.currentWord = getRandomWord()
  room.impostor.roles = assignRoles(room.users, settings.impostorCount)

  // Seleccionar jugador que empieza aleatoriamente
  const starterUser = room.users[Math.floor(Math.random() * room.users.length)]
  room.impostor.starterName = starterUser.name

  // Enviar rol y palabra/pista/categoría a cada usuario
  room.users.forEach(u => {
    io.to(u.id).emit("gameStarted", buildPlayerPayload(room, u.id))
  })
}

function endGame(io, room) {
  io.to(room.code).emit("gameEnded")
}

// Reconexión: el jugador conserva su rol, solo cambia su socket.id
function rebindPlayer(room, oldId, newId) {
  if (oldId in room.impostor.roles) {
    room.impostor.roles[newId] = room.impostor.roles[oldId]
    delete room.impostor.roles[oldId]
  }
}

// Equivalente al último "gameStarted" que ese jugador habría recibido — null
// si no hay ronda activa (aún en "waiting"/"settings"/"countdown").
function getResyncPayload(room, socketId) {
  return buildPlayerPayload(room, socketId)
}

module.exports = {
  MIN_PLAYERS: 4,
  createInitialState,
  getSettingsPayload,
  applySettings,
  startGame,
  endGame,
  rebindPlayer,
  getResyncPayload
}
