const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const cors = require("cors")
const games = require("./games")

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
      const isLocalNetworkOrigin = /^http:\/\/(192\.168|10)\.\d{1,3}\.\d{1,3}\.\d{1,3}:5173$/.test(origin || "")

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
let connectedUsers = [] // { id, name, roomCode }
let rooms = {} // { "ABCD": { name, code, host, users: [{id, name}], game, gameState, [game]: <estado propio del juego> } }

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

io.on("connection", (socket) => {
  // Usuario conectado

  // Agregar usuario a la lista de conectados
  connectedUsers.push({id: socket.id, name: null, roomCode: null})

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
        game: rooms[roomCode].game
      })

      // Notificar a todos en la sala
      io.to(roomCode).emit("userJoined", {
        users: rooms[roomCode].users
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
          // Notificar a los demás usuarios
          io.to(roomCode).emit("userLeft", {
            users: rooms[roomCode].users
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

  // Desconexión
  socket.on("disconnect", () => {
    // Usuario desconectado
    const user = connectedUsers.find(u => u.id === socket.id)

    // Si estaba en una sala, removerlo
    if (user && user.roomCode) {
      const roomCode = user.roomCode
      const room = rooms[roomCode]

      if (room) {
        const wasPlaying = room.gameState === "playing"

        room.users = room.users.filter(u => u.id !== socket.id)

        // Si la sala quedó vacía, eliminarla
        if (room.users.length === 0) {
          // Sala eliminada
          delete rooms[roomCode]
        } else {
          if (wasPlaying && typeof games[room.game].onPlayerDisconnect === "function") {
            games[room.game].onPlayerDisconnect(io, room, socket.id)
          }

          // Notificar a los demás usuarios
          io.to(roomCode).emit("userLeft", {
            users: room.users
          })
        }
      }
    }

    // Remover usuario de la lista de conectados
    connectedUsers = connectedUsers.filter(u => u.id !== socket.id)
  })
})

const PORT = process.env.PORT || 3000

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
})
