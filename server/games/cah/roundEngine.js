const deckManager = require("./deckManager")
const { allBlackIds, allWhiteIds, blackCardsById, whiteCardsById } = require("./cardData")
const {
  HAND_SIZE,
  MIN_PLAYERS,
  DEFAULT_POINTS_TO_WIN,
  MIN_POINTS_TO_WIN,
  MAX_POINTS_TO_WIN
} = require("./constants")

function createInitialState() {
  return {
    settings: null,
    blackDeck: [],
    blackDiscard: [],
    whiteDeck: [],
    whiteDiscard: [],
    hands: {},
    playerNames: {},
    czarOrder: [],
    czarPos: 0,
    czarId: null,
    round: 0,
    currentBlackCard: null,
    phase: null,
    submissions: {},
    submissionOwners: {},
    discards: {},
    scores: {},
    lastRoundResult: null,
    endReason: null
  }
}

function getSettingsPayload(room) {
  return {
    minPointsToWin: MIN_POINTS_TO_WIN,
    maxPointsToWin: MAX_POINTS_TO_WIN,
    suggestedPointsToWin: DEFAULT_POINTS_TO_WIN,
    playerCount: room.users.length
  }
}

function applySettings(room, settings) {
  const pointsToWin = Number(settings && settings.pointsToWin)
  if (!Number.isInteger(pointsToWin) || pointsToWin < MIN_POINTS_TO_WIN || pointsToWin > MAX_POINTS_TO_WIN) {
    return {
      ok: false,
      error: `La puntuación para ganar debe estar entre ${MIN_POINTS_TO_WIN} y ${MAX_POINTS_TO_WIN}`
    }
  }
  room.cah.settings = { pointsToWin }
  return { ok: true }
}

function buildScoresPayload(state) {
  return Object.keys(state.scores)
    .map(userId => ({
      userId,
      name: state.playerNames[userId] || "?",
      score: state.scores[userId]
    }))
    .sort((a, b) => b.score - a.score)
}

function nonCzarCount(room, state) {
  return room.users.filter(u => u.id !== state.czarId).length
}

// Elige el siguiente Card Czar dentro de czarOrder, saltando a quien ya no esté en la sala
function pickNextCzar(state, room) {
  const activeIds = new Set(room.users.map(u => u.id))
  for (let attempts = 0; attempts < state.czarOrder.length; attempts++) {
    const candidate = state.czarOrder[state.czarPos % state.czarOrder.length]
    state.czarPos = (state.czarPos + 1) % state.czarOrder.length
    if (activeIds.has(candidate)) {
      return candidate
    }
  }
  return room.users[0].id
}

function drawBlackCard(state) {
  const { drawn, deck, discard } = deckManager.draw(state.blackDeck, state.blackDiscard, 1)
  state.blackDeck = deck
  state.blackDiscard = discard
  return drawn[0] ? blackCardsById.get(drawn[0]) : null
}

// (Re)inicia la partida entera: mazos, manos, puntuaciones y orden de Card Czar.
// Se usa tanto para el primer arranque como para "Nueva Partida" (mismos ajustes).
function startGame(io, room) {
  const state = room.cah

  state.blackDeck = deckManager.shuffle(allBlackIds)
  state.blackDiscard = []
  state.whiteDeck = deckManager.shuffle(allWhiteIds)
  state.whiteDiscard = []
  state.round = 0
  state.scores = {}
  state.hands = {}
  state.playerNames = {}
  state.submissions = {}
  state.submissionOwners = {}
  state.currentBlackCard = null
  state.czarOrder = deckManager.shuffle(room.users.map(u => u.id))
  state.czarPos = 0

  room.users.forEach(u => {
    state.scores[u.id] = 0
    state.playerNames[u.id] = u.name

    const { drawn, deck, discard } = deckManager.draw(state.whiteDeck, state.whiteDiscard, HAND_SIZE)
    state.whiteDeck = deck
    state.whiteDiscard = discard
    state.hands[u.id] = drawn
  })

  // Señal genérica de navegación, igual que en El Impostor — los datos de la
  // ronda viajan aparte en cahRoundStart, tanto en la 1ª ronda como en las siguientes.
  io.to(room.code).emit("gameStarted", {})

  dealRound(io, room)
}

// Reparte la siguiente ronda: nuevo Czar, nueva carta negra, y avisa a todos.
function dealRound(io, room, notice) {
  const state = room.cah
  state.round += 1
  state.czarId = pickNextCzar(state, room)
  state.currentBlackCard = drawBlackCard(state)
  state.phase = "submitting"
  state.submissions = {}
  state.submissionOwners = {}
  state.discards = {}

  if (!state.currentBlackCard) {
    // Se agotaron las cartas negras (mazo + descarte) y no hay más que repartir
    room.gameState = "ended"
    endGame(io, room, "deckExhausted")
    return
  }

  const scoresPayload = buildScoresPayload(state)

  room.users.forEach(u => {
    const isCzar = u.id === state.czarId
    io.to(u.id).emit("cahRoundStart", {
      round: state.round,
      isCzar,
      czarName: state.playerNames[state.czarId] || "?",
      blackCard: state.currentBlackCard,
      hand: isCzar ? [] : (state.hands[u.id] || []).map(id => whiteCardsById.get(id)).filter(Boolean),
      scores: scoresPayload,
      pointsToWin: state.settings.pointsToWin,
      notice: notice || null
    })
  })

  io.to(room.code).emit("cahSubmissionsProgress", {
    submittedCount: 0,
    totalNeeded: nonCzarCount(room, state)
  })
}

function handleSubmitCards(io, room, socketId, cardIds) {
  const state = room.cah
  if (!state || state.phase !== "submitting") return

  if (socketId === state.czarId) {
    io.to(socketId).emit("cahError", { message: "El Card Czar no juega cartas esta ronda" })
    return
  }

  if (state.submissions[socketId]) {
    io.to(socketId).emit("cahError", { message: "Ya has enviado tus cartas esta ronda" })
    return
  }

  const hand = state.hands[socketId] || []
  const uniqueIds = Array.isArray(cardIds) ? [...new Set(cardIds)] : []
  const requiredPick = state.currentBlackCard.pick

  if (uniqueIds.length !== requiredPick || !uniqueIds.every(id => hand.includes(id))) {
    io.to(socketId).emit("cahError", { message: `Debes elegir exactamente ${requiredPick} carta(s) de tu mano` })
    return
  }

  state.submissions[socketId] = uniqueIds
  state.hands[socketId] = hand.filter(id => !uniqueIds.includes(id))

  const totalNeeded = nonCzarCount(room, state)
  const submittedCount = Object.keys(state.submissions).length

  io.to(room.code).emit("cahSubmissionsProgress", { submittedCount, totalNeeded })

  if (submittedCount >= totalNeeded) {
    revealSubmissions(io, room)
  }
}

// Descarta cartas que el jugador no quiere conservar esta ronda: se van directas
// al descarte (no se repone hasta el reparto de la siguiente ronda, igual que las
// que se juegan) y siempre debe quedar al menos `pick` cartas en mano para poder
// enviar algo esta misma ronda.
function handleDiscardCards(io, room, socketId, cardIds) {
  const state = room.cah
  if (!state || state.phase !== "submitting") return

  if (socketId === state.czarId) {
    io.to(socketId).emit("cahError", { message: "El Card Czar no tiene mano que descartar esta ronda" })
    return
  }

  if (state.submissions[socketId]) {
    io.to(socketId).emit("cahError", { message: "Ya has enviado tus cartas esta ronda" })
    return
  }

  if (state.discards[socketId]) {
    io.to(socketId).emit("cahError", { message: "Ya has descartado cartas esta ronda" })
    return
  }

  const hand = state.hands[socketId] || []
  const uniqueIds = Array.isArray(cardIds) ? [...new Set(cardIds)] : []

  if (uniqueIds.length === 0 || !uniqueIds.every(id => hand.includes(id))) {
    io.to(socketId).emit("cahError", { message: "Selección de descarte inválida" })
    return
  }

  const requiredPick = state.currentBlackCard.pick
  if (hand.length - uniqueIds.length < requiredPick) {
    io.to(socketId).emit("cahError", {
      message: `Debes quedarte con al menos ${requiredPick} carta(s) para poder jugar esta ronda`
    })
    return
  }

  state.hands[socketId] = hand.filter(id => !uniqueIds.includes(id))
  state.whiteDiscard.push(...uniqueIds)
  state.discards[socketId] = true

  io.to(socketId).emit("cahDiscardConfirmed", {
    hand: state.hands[socketId].map(id => whiteCardsById.get(id)).filter(Boolean)
  })
}

function revealSubmissions(io, room) {
  const state = room.cah
  state.phase = "revealing"

  const shuffledOwnerIds = deckManager.shuffle(Object.keys(state.submissions))
  state.submissionOwners = {}

  const submissions = shuffledOwnerIds.map((ownerId, index) => {
    const submissionId = `sub-${index}`
    state.submissionOwners[submissionId] = ownerId
    return {
      submissionId,
      cards: state.submissions[ownerId].map(id => whiteCardsById.get(id)).filter(Boolean)
    }
  })

  io.to(room.code).emit("cahRevealSubmissions", {
    blackCard: state.currentBlackCard,
    submissions
  })
}

function handleCzarPick(io, room, socketId, submissionId) {
  const state = room.cah
  if (!state || state.phase !== "revealing") return

  if (socketId !== state.czarId) {
    io.to(socketId).emit("cahError", { message: "Solo el Card Czar puede elegir la ronda" })
    return
  }

  const winnerId = state.submissionOwners[submissionId]
  if (!winnerId) {
    io.to(socketId).emit("cahError", { message: "Selección inválida" })
    return
  }

  state.scores[winnerId] = (state.scores[winnerId] || 0) + 1

  if (state.currentBlackCard) {
    state.blackDiscard.push(state.currentBlackCard.id)
  }
  Object.values(state.submissions).forEach(cardIds => {
    state.whiteDiscard.push(...cardIds)
  })

  const winningCards = (state.submissions[winnerId] || []).map(id => whiteCardsById.get(id)).filter(Boolean)
  const reachedGoal = state.scores[winnerId] >= state.settings.pointsToWin
  state.phase = "result"

  const roundResult = {
    round: state.round,
    winnerUserId: winnerId,
    winnerName: state.playerNames[winnerId] || "?",
    winningCards,
    blackCard: state.currentBlackCard,
    scores: buildScoresPayload(state)
  }
  state.lastRoundResult = roundResult
  io.to(room.code).emit("cahRoundResult", roundResult)

  if (reachedGoal) {
    room.gameState = "ended"
    endGame(io, room, "scoreReached")
  }
}

function handleNextRound(io, room, socketId) {
  const state = room.cah
  if (!state || state.phase !== "result") return
  if (socketId !== room.host) return

  // Reponer manos hasta HAND_SIZE de cualquiera por debajo (jugaron cartas,
  // descartaron, o ambas) — el Card Czar ya tiene la mano completa porque no
  // ha tocado la suya esta ronda, así que aquí no le hace falta reponer nada.
  room.users.forEach(u => {
    const current = state.hands[u.id] || []
    const need = HAND_SIZE - current.length
    if (need > 0) {
      const { drawn, deck, discard } = deckManager.draw(state.whiteDeck, state.whiteDiscard, need)
      state.whiteDeck = deck
      state.whiteDiscard = discard
      state.hands[u.id] = [...current, ...drawn]
    }
  })

  dealRound(io, room)
}

function endGame(io, room, reason) {
  const state = room.cah
  state.endReason = reason
  const finalScores = buildScoresPayload(state)
  io.to(room.code).emit("gameEnded", {
    reason,
    finalScores,
    winnerUserId: finalScores.length ? finalScores[0].userId : null
  })
}

function onPlayerDisconnect(io, room, socketId) {
  const state = room.cah
  if (!state || !state.phase) return

  // Sin Czar + al menos 1 competidor no hay partida posible
  if (room.users.length < 2) {
    room.gameState = "ended"
    endGame(io, room, "insufficientPlayers")
    return
  }

  const wasCzar = socketId === state.czarId
  delete state.hands[socketId]
  delete state.submissions[socketId]
  delete state.discards[socketId]
  // playerNames y scores se conservan: el scoreboard final debe seguir mostrando su nombre

  if (wasCzar && (state.phase === "submitting" || state.phase === "revealing")) {
    // Se anula la ronda en curso (sin puntos) y se reparte una nueva con el siguiente Czar
    if (state.currentBlackCard) state.blackDiscard.push(state.currentBlackCard.id)
    Object.values(state.submissions).forEach(cardIds => state.whiteDiscard.push(...cardIds))
    dealRound(io, room, "El Card Czar se desconectó. Empieza una ronda nueva.")
    return
  }

  if (!wasCzar && state.phase === "submitting") {
    const totalNeeded = nonCzarCount(room, state)
    const submittedCount = Object.keys(state.submissions).length
    io.to(room.code).emit("cahSubmissionsProgress", { submittedCount, totalNeeded })
    if (totalNeeded > 0 && submittedCount >= totalNeeded) {
      revealSubmissions(io, room)
    }
  }
}

// Renombra la clave `oldId` -> `newId` dentro de un mapa indexado por id de
// jugador, si existe. Usado por rebindPlayer para varios mapas del mismo tipo.
function renameKey(obj, oldId, newId) {
  if (oldId in obj) {
    obj[newId] = obj[oldId]
    delete obj[oldId]
  }
}

// Reconexión: el jugador es el mismo, solo cambió su socket.id — hay que
// renombrarlo en cada sitio del estado de la ronda donde aparece como clave
// (o, en el caso de submissionOwners, como valor).
function rebindPlayer(room, oldId, newId) {
  const state = room.cah
  if (!state) return

  renameKey(state.hands, oldId, newId);
  renameKey(state.scores, oldId, newId);
  renameKey(state.playerNames, oldId, newId);
  renameKey(state.submissions, oldId, newId);
  renameKey(state.discards, oldId, newId);

  if (state.czarId === oldId) state.czarId = newId
  state.czarOrder = state.czarOrder.map(id => id === oldId ? newId : id)

  Object.keys(state.submissionOwners).forEach(submissionId => {
    if (state.submissionOwners[submissionId] === oldId) {
      state.submissionOwners[submissionId] = newId
    }
  })

  if (state.lastRoundResult && state.lastRoundResult.winnerUserId === oldId) {
    state.lastRoundResult.winnerUserId = newId
  }
}

// Reconstruye para `socketId` el equivalente a lo último que habría recibido
// (cahRoundStart / cahRevealSubmissions / cahRoundResult según la fase en
// curso, o el marcador final si la partida ya terminó) para restaurarlo tras
// una reconexión sin tener que recargar la página.
function getResyncPayload(room, socketId) {
  const state = room.cah
  if (!state) return null

  if (room.gameState === "ended") {
    const finalScores = buildScoresPayload(state)
    return {
      finalScores,
      winnerUserId: finalScores.length ? finalScores[0].userId : null,
      reason: state.endReason
    }
  }

  if (!state.phase) return null

  const isCzar = socketId === state.czarId
  const payload = {
    phase: state.phase,
    round: state.round,
    isCzar,
    czarName: state.playerNames[state.czarId] || "?",
    blackCard: state.currentBlackCard,
    hand: isCzar ? [] : (state.hands[socketId] || []).map(id => whiteCardsById.get(id)).filter(Boolean),
    scores: buildScoresPayload(state),
    pointsToWin: state.settings.pointsToWin,
    submittedCount: Object.keys(state.submissions).length,
    totalNeeded: nonCzarCount(room, state),
    hasSubmitted: !!state.submissions[socketId],
    hasDiscarded: !!state.discards[socketId]
  }

  if (state.phase === "revealing") {
    payload.revealSubmissions = Object.entries(state.submissionOwners).map(([submissionId, ownerId]) => ({
      submissionId,
      cards: (state.submissions[ownerId] || []).map(id => whiteCardsById.get(id)).filter(Boolean)
    }))
  }

  if (state.phase === "result") {
    payload.roundResult = state.lastRoundResult
  }

  return payload
}

module.exports = {
  MIN_PLAYERS,
  createInitialState,
  getSettingsPayload,
  applySettings,
  startGame,
  endGame,
  onPlayerDisconnect,
  handleSubmitCards,
  handleDiscardCards,
  handleCzarPick,
  handleNextRound,
  rebindPlayer,
  getResyncPayload
}
