const express = require("express")
const http = require("http")
const crypto = require("crypto")
const { Server } = require("socket.io")
const cors = require("cors")
const games = require("./games")

// Cuánto se espera a que un jugador reconecte (misma pestaña, corte de red)
// antes de tratar su desconexión como definitiva. Ver rebindConnection/finalizeDisconnect.
const RECONNECT_GRACE_MS = 30000
// El Impostor es un juego pausado: tras ver la palabra nadie toca el móvil
// durante minutos de debate y la pantalla se bloquea sola. Nada en ese juego
// espera a un jugador concreto, así que se le guarda el sitio mucho más tiempo
// (30 min, a revisar con el uso). En CAH se mantiene corto porque un jugador
// ausente bloquea la ronda (y el anfitrión ya puede expulsarlo).
const IMPOSTOR_RECONNECT_GRACE_MS = 30 * 60 * 1000

function reconnectGraceFor(roomCode) {
  const room = rooms[roomCode]
  return room && room.game === "impostor" ? IMPOSTOR_RECONNECT_GRACE_MS : RECONNECT_GRACE_MS
}

const app = express()
app.use(cors())

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Lista de orígenes permitidos
      const allowedOrigins = [
        "http://localhost:5173",
        process.env.CLIENT_URL
      ].filter(Boolean) // Eliminar undefined

      // Cualquier IP de red local (192.168.x.x / 10.x.x.x) en el puerto de Vite,
      // para poder probar desde el móvil sin tener que fijar la IP a mano (cambia
      // con el DHCP del router).
      const isLocalNetworkOrigin = /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):5173$/.test(origin || "")

      // Permitir requests sin origin (como aplicaciones móviles), de la lista, o de la red local
      if (!origin || allowedOrigins.includes(origin) || isLocalNetworkOrigin) {
        callback(null, true)
      } else {
        callback(new Error("Not allowed by CORS"))
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  }
})

// Estructura de datos
let connectedUsers = [] // { id, playerId, name, roomCode }
let rooms = {} // { "ABCD": { name, code, host, users: [{id, name}], pendingJoins: [{id, name}], bannedPlayerIds: [], game, gameState, [game]: <estado propio del juego> } }

// Desconexiones a la espera de que el mismo jugador (mismo playerId) reconecte
// dentro de RECONNECT_GRACE_MS. Mientras una entrada está aquí, la sala/estado
// de juego NO se toca — ver el handler de "disconnect" y finalizeDisconnect.
let pendingDisconnects = {} // playerId -> { socketId, roomCode, timer }

// Generar código de sala aleatorio (4 caracteres alfanuméricos)
function generateRoomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let code = ""
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Pasa a `room.users` a quien estuviera esperando entrada tardía, sin tocar el
// estado del juego. Es para los momentos en que ya no hay partida en curso que
// respetar (se vuelve a la sala, o arranca una partida nueva desde cero): ahí
// no hay nada que "absorber con cuidado", simplemente pasan a ser uno más.
// La absorción *durante* una partida es otra cosa y la hace el propio juego
// (en CAH, absorbPendingJoins en el cambio de ronda).
function absorbPendingIntoRoom(room) {
  const pending = room.pendingJoins || []
  room.pendingJoins = []

  pending.forEach(p => {
    if (!room.users.some(u => u.id === p.id)) {
      room.users.push({ id: p.id, name: p.name })
    }
  })

  return pending
}

// Iniciar cuenta atrás y, tras 3s, delegar el arranque de la partida al módulo del juego activo
function startCountdownThenPlay(io, room) {
  // Una partida nueva reparte de cero para todos: quien estuviera esperando
  // entrar a la anterior entra ya como jugador normal desde la primera ronda.
  if (absorbPendingIntoRoom(room).length > 0) {
    io.to(room.code).emit("userJoined", { users: room.users, hostId: room.host })
  }

  room.gameState = "countdown"
  io.to(room.code).emit("startCountdown")

  setTimeout(() => {
    if (rooms[room.code]) { // Verificar que la sala aún existe
      room.gameState = "playing"
      games[room.game].startGame(io, room)
    }
  }, 3000)
}

// Si el host se fue definitivamente (expiró la gracia), la sala no puede
// quedarse sin nadie que cumpla `room.host === socket.id` para siempre.
function reassignHostIfNeeded(room) {
  if (room.users.length > 0 && !room.users.some(u => u.id === room.host)) {
    room.host = room.users[0].id
  }
}

// Saca a un jugador de la sala y deja el estado consistente: reasigna
// anfitrión si hacía falta y avisa al juego, que es quien sabe qué hacer si el
// que se va era el Card Czar, si la ronda ya puede revelarse sin él, o si
// quedan pocos jugadores para seguir.
//
// Lo usan dos caminos que son la misma cosa vista de dos maneras: una
// desconexión que agotó su gracia, y una expulsión por parte del anfitrión.
// Deliberadamente compartido: duplicar esto significaría mantener dos versiones
// de la lógica del Czar y que una se quedara atrás.
// `reason` distingue los dos llamadores ("disconnect" | "kicked"): al juego le
// importa, porque a un expulsado se le borra del marcador y a quien solo perdió
// la conexión se le conserva para el marcador final.
function removePlayerFromRoom(socketId, roomCode, reason = "disconnect") {
  connectedUsers = connectedUsers.filter(u => u.id !== socketId)

  const room = rooms[roomCode]
  if (!room) return

  const wasPlaying = room.gameState === "playing"
  // Si solo estaba esperando entrada tardía, nunca llegó a existir para el
  // juego: se le quita de la cola y no hay que avisar al módulo de nada.
  const wasPendingJoin = (room.pendingJoins || []).some(p => p.id === socketId)
  const wasRoomUser = room.users.some(u => u.id === socketId)

  room.users = room.users.filter(u => u.id !== socketId)
  room.pendingJoins = (room.pendingJoins || []).filter(p => p.id !== socketId)

  if (room.users.length === 0) {
    // Sin jugadores reales la sala se cierra; quien siguiera esperando entrar
    // se quedaría mirando una pantalla que ya no lleva a ninguna parte.
    if (room.pendingJoins.length > 0) {
      io.to(roomCode).emit("lateJoinCancelled", { reason: "roomClosed" })
    }
    delete rooms[roomCode]
    return
  }

  reassignHostIfNeeded(room)

  if (wasRoomUser && !wasPendingJoin && wasPlaying &&
      typeof games[room.game].onPlayerDisconnect === "function") {
    games[room.game].onPlayerDisconnect(io, room, socketId, reason)
  }

  io.to(roomCode).emit("userLeft", {
    users: room.users,
    hostId: room.host
  })
}

// Limpieza real de una desconexión que no se recuperó a tiempo — es
// exactamente lo que el handler de "disconnect" hacía al momento antes de la
// gracia de reconexión, solo que ahora se demora RECONNECT_GRACE_MS.
function finalizeDisconnect(playerId) {
  const pending = pendingDisconnects[playerId]
  if (!pending) return
  delete pendingDisconnects[playerId]

  removePlayerFromRoom(pending.socketId, pending.roomCode)
}

// Reconexión dentro de la gracia: el socket es nuevo pero el jugador es el
// mismo (mismo playerId) — se reescribe su id viejo por el nuevo en todos los
// sitios donde vive, y se avisa al módulo del juego activo por si tiene
// estado propio indexado por id (manos, puntuaciones, turno del Czar, etc).
function rebindConnection(socket, playerId, oldSocketId, roomCode) {
  const newId = socket.id

  const cu = connectedUsers.find(u => u.id === oldSocketId)
  if (cu) {
    cu.id = newId
  } else {
    connectedUsers.push({ id: newId, playerId, name: null, roomCode: null })
  }

  const room = rooms[roomCode]
  if (!room) return // la sala desapareció por otra razón durante la gracia

  const userEntry = room.users.find(u => u.id === oldSocketId)
  if (userEntry) userEntry.id = newId
  if (room.host === oldSocketId) room.host = newId

  // El que reconecta puede ser alguien que todavía estaba en la cola de entrada
  // tardía — sigue sin ser jugador, pero su sitio en la cola es suyo.
  const pendingEntry = (room.pendingJoins || []).find(p => p.id === oldSocketId)
  if (pendingEntry) pendingEntry.id = newId

  socket.join(roomCode)

  if (typeof games[room.game].rebindPlayer === "function") {
    games[room.game].rebindPlayer(room, oldSocketId, newId)
  }

  io.to(roomCode).emit("userJoined", {
    users: room.users,
    hostId: room.host
  })
}

io.on("connection", (socket) => {
  // Identidad persistente del jugador entre reconexiones (la manda el
  // cliente en el "auth" de Socket.IO, generada y guardada en su sessionStorage).
  // Si falta o es inválida, se genera una nueva — se comporta como hoy: un
  // socket anónimo no recuperable.
  const rawPlayerId = socket.handshake.auth && socket.handshake.auth.playerId
  const playerId = (typeof rawPlayerId === "string" && rawPlayerId.length > 0 && rawPlayerId.length <= 100)
    ? rawPlayerId
    : crypto.randomUUID()

  socket.playerId = playerId

  const pending = pendingDisconnects[playerId]
  if (pending) {
    // Caso normal: el socket viejo ya se desconectó y está esperando gracia.
    clearTimeout(pending.timer)
    delete pendingDisconnects[playerId]
    rebindConnection(socket, playerId, pending.socketId, pending.roomCode)
  } else {
    // El mismo playerId puede tener todavía una conexión VIVA (sin pasar por
    // "disconnect" aún) — típico de recargar la página: el navegador no
    // siempre avisa del cierre de la conexión vieja antes de que la nueva
    // termine de conectar. Sin este caso, esa conexión nueva se trataría como
    // un desconocido anónimo y se perdería la sala aunque no hubiera habido
    // ningún corte real — es la condición de carrera que causaba el bug.
    const existing = connectedUsers.find(u => u.playerId === playerId && u.id !== socket.id)
    if (existing) {
      const oldSocketId = existing.id
      if (existing.roomCode) {
        rebindConnection(socket, playerId, oldSocketId, existing.roomCode)
      } else {
        connectedUsers = connectedUsers.filter(u => u.id !== oldSocketId)
        connectedUsers.push({ id: socket.id, playerId, name: null, roomCode: null })
      }
      const oldSocket = io.sockets.sockets.get(oldSocketId)
      if (oldSocket) oldSocket.disconnect(true)
    } else {
      // Agregar usuario a la lista de conectados
      connectedUsers.push({ id: socket.id, playerId, name: null, roomCode: null })
    }
  }

  // Establecer nombre del usuario
  socket.on("setName", (name) => {
    // Nombre establecido
    const user = connectedUsers.find(u => u.id === socket.id)
    if (user) {
      user.name = name
    }
  })

  // Crear sala
  socket.on("createRoom", (data) => {
    const { game } = data

    if (!games[game]) {
      socket.emit("joinError", "Juego no soportado")
      return
    }

    const roomName = typeof data.roomName === "string" ? data.roomName.trim() : ""
    if (!roomName) {
      socket.emit("joinError", "Ponle un nombre a la sala")
      return
    }

    const code = generateRoomCode()

    // Crear la sala
    rooms[code] = {
      name: roomName,
      code: code,
      host: socket.id, // El creador es el anfitrión
      users: [],
      pendingJoins: [], // Esperando a entrar con la partida ya empezada (ver joinRoom)
      bannedPlayerIds: [], // playerId de los expulsados con veto (ver kickPlayer)
      game: game,
      gameState: "waiting", // waiting | settings | countdown | playing | ended
      [game]: games[game].createInitialState()
    }

    // Agregar usuario a la sala
    const user = connectedUsers.find(u => u.id === socket.id)
    if (user) {
      user.roomCode = code
      rooms[code].users.push({ id: user.id, name: user.name })
      socket.join(code)

      // Notificar al creador
      socket.emit("roomCreated", {
        code: code,
        name: roomName,
        users: rooms[code].users,
        isHost: true,
        hostId: rooms[code].host,
        game: game
      })

      // Sala creada
    }
  })

  // Unirse a sala
  socket.on("joinRoom", (data) => {
    const { roomName, roomCode, game } = data

    // Usuario uniéndose a sala

    // Validar que la sala existe
    if (!rooms[roomCode]) {
      socket.emit("joinError", "La sala no existe o el código es incorrecto")
      return
    }

    // Hace falta nombre + código. El nombre se compara sin distinguir
    // mayúsculas ni espacios de los extremos: era el error más común al unirse.
    const typedName = typeof roomName === "string" ? roomName.trim().toLowerCase() : ""
    if (!typedName || rooms[roomCode].name.trim().toLowerCase() !== typedName) {
      socket.emit("joinError", "El nombre de la sala no coincide")
      return
    }

    // Validar que es el mismo juego
    if (rooms[roomCode].game !== game) {
      socket.emit("joinError", "Esta sala pertenece a otro juego")
      return
    }

    // Expulsado con veto por el anfitrión: se corta aquí, antes de mirar el
    // estado de la partida, para que el veto valga igual con la sala en espera
    // que con la partida en marcha (por la cola de entrada tardía).
    if ((rooms[roomCode].bannedPlayerIds || []).includes(socket.playerId)) {
      socket.emit("joinError", "El anfitrión te ha expulsado de esta sala")
      return
    }

    // La partida ya está en marcha. Meter a alguien en room.users ahora mismo
    // lo dejaría a medias dentro de una ronda viva (en CAH contaría para las
    // cartas que hacen falta para avanzar sin tener mano que jugar), así que
    // los juegos que admiten entrada tardía lo aparcan en una cola aparte y lo
    // absorben ellos en un punto seguro. Los que no, siguen rechazando.
    const targetRoom = rooms[roomCode]
    if (targetRoom.gameState !== "waiting") {
      const canLateJoin = games[targetRoom.game].supportsLateJoin === true &&
        targetRoom.gameState === "playing"

      if (!canLateJoin) {
        socket.emit("joinError", "La partida ya ha empezado — espera a que termine para unirte")
        return
      }

      const pendingUser = connectedUsers.find(u => u.id === socket.id)
      if (!pendingUser) return

      if (!targetRoom.pendingJoins) targetRoom.pendingJoins = []
      if (!targetRoom.pendingJoins.some(p => p.id === socket.id)) {
        targetRoom.pendingJoins.push({ id: socket.id, name: pendingUser.name })
      }

      pendingUser.roomCode = roomCode
      // Entra ya en el room de Socket.IO para recibir los eventos generales
      // (fin de partida, vuelta a la sala) mientras espera su turno de entrar.
      socket.join(roomCode)

      socket.emit("lateJoinPending", {
        code: roomCode,
        name: targetRoom.name,
        game: targetRoom.game,
        hostId: targetRoom.host,
        users: targetRoom.users
      })
      return
    }

    // Agregar usuario a la sala
    const user = connectedUsers.find(u => u.id === socket.id)
    if (user) {
      user.roomCode = roomCode
      rooms[roomCode].users.push({ id: user.id, name: user.name })
      socket.join(roomCode)

      // Notificar al usuario que se unió
      socket.emit("roomJoined", {
        code: roomCode,
        name: rooms[roomCode].name,
        users: rooms[roomCode].users,
        isHost: false,
        hostId: rooms[roomCode].host,
        game: rooms[roomCode].game
      })

      // Notificar a todos en la sala
      io.to(roomCode).emit("userJoined", {
        users: rooms[roomCode].users,
        hostId: rooms[roomCode].host
      })

      // Usuario unido correctamente
    }
  })

  // Salir de sala
  socket.on("leaveRoom", () => {
    const user = connectedUsers.find(u => u.id === socket.id)

    if (user && user.roomCode) {
      const roomCode = user.roomCode
      socket.leave(roomCode)

      // Misma ruta que una desconexión definitiva: así, si se sale a mitad de
      // partida, el juego se entera (en CAH la ronda deja de esperar su carta
      // y, si era el Card Czar, se reparte ronda nueva). Antes solo se le
      // quitaba de room.users y la ronda podía quedarse bloqueada.
      removePlayerFromRoom(socket.id, roomCode, "disconnect")

      // removePlayerFromRoom lo saca de connectedUsers; el socket sigue vivo,
      // así que vuelve a la lista sin sala para poder crear o unirse a otra.
      connectedUsers.push({
        id: user.id,
        playerId: user.playerId,
        name: user.name,
        roomCode: null
      })

      socket.emit("roomLeft")
    }
  })

  // Expulsar a un jugador (solo anfitrión). Dos usos distintos:
  //   - sin veto: sacar ya a quien se ha quedado tirado por conexión, en vez de
  //     esperar los RECONNECT_GRACE_MS en que sigue contando para la ronda.
  //     Puede volver a entrar, y si hay partida en marcha lo recoge la cola de
  //     entrada tardía.
  //   - con veto: además se guarda su playerId para que no pueda volver.
  socket.on("kickPlayer", (data) => {
    const user = connectedUsers.find(u => u.id === socket.id)
    if (!user || !user.roomCode) return

    const room = rooms[user.roomCode]
    if (!room || room.host !== socket.id) return

    const targetId = data && data.targetId
    const ban = !!(data && data.ban)

    if (!targetId || targetId === socket.id) return // el anfitrión no se expulsa a sí mismo

    const inRoom = room.users.some(u => u.id === targetId)
    const inQueue = (room.pendingJoins || []).some(p => p.id === targetId)
    if (!inRoom && !inQueue) return

    // El playerId es la identidad estable entre reconexiones; el socket.id no
    // sirve para vetar porque cambia en cuanto vuelve a conectar.
    const targetUser = connectedUsers.find(u => u.id === targetId)
    const targetPlayerId = targetUser && targetUser.playerId

    if (ban && targetPlayerId) {
      if (!room.bannedPlayerIds) room.bannedPlayerIds = []
      if (!room.bannedPlayerIds.includes(targetPlayerId)) {
        room.bannedPlayerIds.push(targetPlayerId)
      }
    }

    // Puede estar justo en su ventana de gracia (es el caso típico: se le
    // expulsa precisamente porque se ha caído). Si no se cancela el temporizador,
    // finalizeDisconnect correría después sobre un jugador ya retirado.
    if (targetPlayerId && pendingDisconnects[targetPlayerId]) {
      clearTimeout(pendingDisconnects[targetPlayerId].timer)
      delete pendingDisconnects[targetPlayerId]
    }

    const targetSocket = io.sockets.sockets.get(targetId)
    if (targetSocket) {
      targetSocket.emit("kicked", { banned: ban })
      targetSocket.leave(room.code)
    }

    const targetName = targetUser && targetUser.name
    removePlayerFromRoom(targetId, room.code, "kicked")

    // removePlayerFromRoom lo saca de connectedUsers, que es lo correcto cuando
    // el socket se ha ido de verdad. En una expulsión sigue conectado, así que
    // hay que devolverlo a la lista sin sala: si no, joinRoom no lo encontraría
    // y no podría volver a entrar a ninguna parte, ni siquiera sin veto.
    if (targetSocket && targetSocket.connected) {
      connectedUsers.push({
        id: targetId,
        playerId: targetPlayerId,
        name: targetName,
        roomCode: null
      })
    }
  })

  // Pasar el papel de anfitrión a otro jugador (solo el anfitrión). Se limita a
  // los momentos sin nada a medias: la sala de espera y, en CAH, la pantalla de
  // resultado entre rondas. En ajustes, cuenta atrás o a mitad de ronda el
  // anfitrión tiene acciones pendientes (configurar, pasar ronda) que se
  // quedarían colgadas en manos de alguien que no las esperaba.
  socket.on("transferHost", (data) => {
    const user = connectedUsers.find(u => u.id === socket.id)
    if (!user || !user.roomCode) return

    const room = rooms[user.roomCode]
    if (!room || room.host !== socket.id) return

    const targetId = data && data.targetId
    if (!targetId || targetId === socket.id) return
    if (!room.users.some(u => u.id === targetId)) return

    const betweenRounds = room.gameState === "playing" &&
      room.game === "cah" && room.cah && room.cah.phase === "result"
    if (room.gameState !== "waiting" && !betweenRounds) {
      socket.emit("gameSettingsError", "Solo se puede pasar el anfitrión en la sala de espera o entre rondas")
      return
    }

    room.host = targetId
    io.to(room.code).emit("hostChanged", {
      users: room.users,
      hostId: room.host,
      previousHostId: socket.id
    })
  })

  // Iniciar configuración del juego (solo anfitrión)
  socket.on("startGameSetup", () => {
    const user = connectedUsers.find(u => u.id === socket.id)

    if (user && user.roomCode) {
      const roomCode = user.roomCode
      const room = rooms[roomCode]

      // Verificar que es el anfitrión
      if (room && room.host === socket.id) {
        const gameModule = games[room.game]
        const minPlayers = gameModule.MIN_PLAYERS || 1

        if (room.users.length < minPlayers) {
          socket.emit("gameSettingsError", `Se necesitan al menos ${minPlayers} jugadores para empezar`)
          return
        }

        // Iniciando configuración de juego
        room.gameState = "settings"

        // Notificar al anfitrión que puede configurar
        socket.emit("showGameSettings", gameModule.getSettingsPayload(room))

        // Notificar a los demás que esperen
        socket.to(roomCode).emit("waitingForSettings")
      }
    }
  })

  // Recibir ajustes y empezar cuenta atrás
  socket.on("submitGameSettings", (settings) => {
    const user = connectedUsers.find(u => u.id === socket.id)

    if (user && user.roomCode) {
      const roomCode = user.roomCode
      const room = rooms[roomCode]

      // Verificar que es el anfitrión
      if (room && room.host === socket.id) {
        // Juego configurado
        const result = games[room.game].applySettings(room, settings)

        if (!result.ok) {
          socket.emit("gameSettingsError", result.error || "Ajustes inválidos")
          return
        }

        startCountdownThenPlay(io, room)
      }
    }
  })

  // Terminar partida (solo anfitrión)
  socket.on("endGame", () => {
    const user = connectedUsers.find(u => u.id === socket.id)

    if (user && user.roomCode) {
      const roomCode = user.roomCode
      const room = rooms[roomCode]

      // Verificar que es el anfitrión
      if (room && room.host === socket.id && room.gameState === "playing") {
        // Juego terminado
        room.gameState = "ended"
        games[room.game].endGame(io, room, "hostEnded")
      }
    }
  })

  // Reiniciar partida con mismos ajustes (solo anfitrión)
  socket.on("restartGame", () => {
    const user = connectedUsers.find(u => u.id === socket.id)

    if (user && user.roomCode) {
      const roomCode = user.roomCode
      const room = rooms[roomCode]

      // Verificar que es el anfitrión
      if (room && room.host === socket.id) {
        // Reiniciando juego
        startCountdownThenPlay(io, room)
      }
    }
  })

  // Volver a sala (solo anfitrión)
  socket.on("backToRoom", () => {
    const user = connectedUsers.find(u => u.id === socket.id)

    if (user && user.roomCode) {
      const roomCode = user.roomCode
      const room = rooms[roomCode]

      // Verificar que es el anfitrión
      if (room && room.host === socket.id) {
        // Volviendo a sala
        room.gameState = "waiting"
        room[room.game] = games[room.game].createInitialState()

        // Ya no hay partida en curso que proteger: quien quedara esperando
        // entrar pasa a ser un jugador normal de la sala de espera.
        absorbPendingIntoRoom(room)

        // Notificar a todos que vuelven a la sala
        io.to(roomCode).emit("backToWaiting")
        io.to(roomCode).emit("userJoined", { users: room.users, hostId: room.host })
      }
    }
  })

  // El cliente pide esto justo después de reconectar si recordaba estar en una
  // sala (breadcrumb en su sessionStorage). Si el rebind ya ocurrió (mismo
  // playerId, dentro de la gracia), acá simplemente se reconstruye para el
  // cliente todo lo que necesita para restaurar la pantalla donde la dejó.
  socket.on("requestResync", (data) => {
    const user = connectedUsers.find(u => u.id === socket.id)
    const room = user && user.roomCode ? rooms[user.roomCode] : null

    if (!room) {
      const roomCode = data && data.roomCode
      const reason = roomCode && rooms[roomCode] ? "removedFromRoom" : "roomNotFound"
      socket.emit("resyncFailed", { reason })
      return
    }

    const gameModule = games[room.game]
    const payload = {
      roomCode: room.code,
      roomName: room.name,
      users: room.users,
      hostId: room.host,
      name: user.name,
      game: room.game,
      gameState: room.gameState
    }

    if (room.gameState === "settings" && socket.id === room.host) {
      payload.settingsPayload = gameModule.getSettingsPayload(room)
    }

    // Quien está esperando entrada tardía no tiene estado de juego que
    // reconstruir (no ha entrado todavía) — su pantalla es la de espera, y
    // pedirle su payload al juego devolvería una mano vacía como si fuera un
    // jugador de verdad al que le falta todo.
    const isPendingJoin = (room.pendingJoins || []).some(p => p.id === socket.id)

    if (isPendingJoin) {
      payload.lateJoinPending = true
      socket.emit("resyncOk", payload)
      return
    }

    if ((room.gameState === "playing" || room.gameState === "ended") &&
        typeof gameModule.getResyncPayload === "function") {
      payload.resync = gameModule.getResyncPayload(room, socket.id)
    }

    socket.emit("resyncOk", payload)
  })

  // Registrar los eventos de socket propios de cada juego (p.ej. jugadas de CAH)
  Object.values(games).forEach(gameModule => {
    if (typeof gameModule.registerSocketHandlers === "function") {
      gameModule.registerSocketHandlers(io, socket, () => {
        const user = connectedUsers.find(u => u.id === socket.id)
        if (!user || !user.roomCode) return null
        return rooms[user.roomCode] || null
      })
    }
  })

  // Desconexión: no se destruye nada al momento — se guarda en espera por si
  // el mismo jugador (mismo playerId) reconecta dentro de RECONNECT_GRACE_MS.
  // La limpieza real (idéntica a la que había acá antes) vive en
  // finalizeDisconnect, y solo corre si esa gracia expira sin reconexión.
  socket.on("disconnect", () => {
    const user = connectedUsers.find(u => u.id === socket.id)

    if (!user || !user.roomCode) {
      connectedUsers = connectedUsers.filter(u => u.id !== socket.id)
      return
    }

    pendingDisconnects[socket.playerId] = {
      socketId: socket.id,
      roomCode: user.roomCode,
      timer: setTimeout(() => finalizeDisconnect(socket.playerId), reconnectGraceFor(user.roomCode))
    }
  })
})

const PORT = process.env.PORT || 3000

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
})
