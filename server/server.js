const express = require("express")
const http = require("http")
const crypto = require("crypto")
const { Server } = require("socket.io")
const cors = require("cors")
const games = require("./games")

// Cuánto se espera a que un jugador reconecte (misma pestaña, corte de red)
// antes de tratar su desconexión como definitiva. Ver rebindConnection/finalizeDisconnect.
const RECONNECT_GRACE_MS = 30000

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
let rooms = {} // { "ABCD": { name, code, host, users: [{id, name}], game, gameState, [game]: <estado propio del juego> } }

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

// Iniciar cuenta atrás y, tras 3s, delegar el arranque de la partida al módulo del juego activo
function startCountdownThenPlay(io, room) {
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

// Limpieza real de una desconexión que no se recuperó a tiempo — es
// exactamente lo que el handler de "disconnect" hacía al momento antes de
// este cambio, solo que ahora se demora RECONNECT_GRACE_MS por si reconecta.
function finalizeDisconnect(playerId) {
  const pending = pendingDisconnects[playerId]
  if (!pending) return
  delete pendingDisconnects[playerId]

  const { socketId, roomCode } = pending
  connectedUsers = connectedUsers.filter(u => u.id !== socketId)

  const room = rooms[roomCode]
  if (!room) return

  const wasPlaying = room.gameState === "playing"
  room.users = room.users.filter(u => u.id !== socketId)

  if (room.users.length === 0) {
    delete rooms[roomCode]
    return
  }

  reassignHostIfNeeded(room)

  if (wasPlaying && typeof games[room.game].onPlayerDisconnect === "function") {
    games[room.game].onPlayerDisconnect(io, room, socketId)
  }

  io.to(roomCode).emit("userLeft", {
    users: room.users,
    hostId: room.host
  })
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
    const { roomName, game } = data

    if (!games[game]) {
      socket.emit("joinError", "Juego no soportado")
      return
    }

    const code = generateRoomCode()

    // Crear la sala
    rooms[code] = {
      name: roomName,
      code: code,
      host: socket.id, // El creador es el anfitrión
      users: [],
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

    // Validar que el nombre de la sala coincide
    if (rooms[roomCode].name !== roomName) {
      socket.emit("joinError", "El nombre de la sala no coincide")
      return
    }

    // Validar que es el mismo juego
    if (rooms[roomCode].game !== game) {
      socket.emit("joinError", "Esta sala pertenece a otro juego")
      return
    }

    // La partida ya está en marcha — unirse ahora dejaría a este jugador solo
    // viendo la sala de espera mientras bloquea al resto (p.ej. en CAH, cuenta
    // para las cartas que hacen falta para pasar de ronda sin poder jugar
    // ninguna). Hasta que exista un flujo real de "unirse a mitad de partida",
    // se bloquea con un mensaje claro en vez de dejarlo entrar a medias.
    if (rooms[roomCode].gameState !== "waiting") {
      socket.emit("joinError", "La partida ya ha empezado — espera a que termine para unirte")
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
      // Usuario saliendo de sala

      // Remover usuario de la sala
      if (rooms[roomCode]) {
        rooms[roomCode].users = rooms[roomCode].users.filter(u => u.id !== socket.id)
        socket.leave(roomCode)

        // Si la sala quedó vacía, eliminarla
        if (rooms[roomCode].users.length === 0) {
          // Sala eliminada
          delete rooms[roomCode]
        } else {
          reassignHostIfNeeded(rooms[roomCode])
          // Notificar a los demás usuarios
          io.to(roomCode).emit("userLeft", {
            users: rooms[roomCode].users,
            hostId: rooms[roomCode].host
          })
        }
      }

      // Actualizar usuario
      user.roomCode = null

      // Notificar al usuario que salió
      socket.emit("roomLeft")
    }
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

        // Notificar a todos que vuelven a la sala
        io.to(roomCode).emit("backToWaiting")
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
      timer: setTimeout(() => finalizeDisconnect(socket.playerId), RECONNECT_GRACE_MS)
    }
  })
})

const PORT = process.env.PORT || 3000

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
})
