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
    roles: {}
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

// Repartir palabra/roles y notificar a cada jugador (usado tanto al empezar como al reiniciar)
function startGame(io, room) {
  const settings = room.impostor.gameSettings
  const word = getRandomWord()
  room.impostor.currentWord = word
  room.impostor.roles = assignRoles(room.users, settings.impostorCount)

  // Seleccionar jugador que empieza aleatoriamente
  const starterUser = room.users[Math.floor(Math.random() * room.users.length)]

  // Enviar rol y palabra/pista/categoría a cada usuario
  room.users.forEach(u => {
    const role = room.impostor.roles[u.id]
    const data = {
      role: role,
      word: role === "normal" ? word.word : null,
      hint: role === "impostor" && settings.showHint ? word.hint : null,
      category: role === "impostor" && settings.showCategory ? word.category : null,
      starterName: starterUser.name
    }

    io.to(u.id).emit("gameStarted", data)
  })
}

function endGame(io, room) {
  io.to(room.code).emit("gameEnded")
}

module.exports = {
  MIN_PLAYERS: 4,
  createInitialState,
  getSettingsPayload,
  applySettings,
  startGame,
  endGame
}
