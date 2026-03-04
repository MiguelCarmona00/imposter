const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const cors = require("cors")
const wordLibrary = require("./wordLibrary")

const app = express()
app.use(cors())

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Lista de orígenes permitidos
      const allowedOrigins = [
        "http://localhost:5173",
        "http://192.168.1.133:5173",
        process.env.CLIENT_URL
      ].filter(Boolean) // Eliminar undefined
      
      // Permitir requests sin origin (como aplicaciones móviles) o si está en la lista
      if (!origin || allowedOrigins.includes(origin)) {
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
let rooms = {} // { "ABCD": { name, code, host, users: [{id, name}], gameState, gameSettings, currentWord, roles } }

// Generar código de sala aleatorio (4 caracteres alfanuméricos)
function generateRoomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let code = ""
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

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
    const { roomName } = data
    const code = generateRoomCode()
    
    // Creando sala
    
    // Crear la sala
    rooms[code] = {
      name: roomName,
      code: code,
      host: socket.id, // El creador es el anfitrión
      users: [],
      gameState: "waiting", // waiting | settings | countdown | playing | ended
      gameSettings: null,
      currentWord: null,
      roles: {}
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
        isHost: true
      })
      
      // Sala creada
    }
  })

  // Unirse a sala
  socket.on("joinRoom", (data) => {
    const { roomName, roomCode } = data
    
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
        isHost: false
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
        // Iniciando configuración de juego
        
        room.gameState = "settings"
        
        // Notificar al anfitrión que puede configurar
        socket.emit("showGameSettings", {
          maxImpostors: room.users.length - 1
        })
        
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
        
        room.gameState = "countdown"
        room.gameSettings = settings
        
        // Iniciar cuenta atrás para todos
        io.to(roomCode).emit("startCountdown")
        
        // Después de 3 segundos, asignar roles y empezar juego
        setTimeout(() => {
          if (rooms[roomCode]) { // Verificar que la sala aún existe
            const word = getRandomWord()
            room.currentWord = word
            room.roles = assignRoles(room.users, settings.impostorCount)
            room.gameState = "playing"
            
            // Seleccionar jugador que empieza aleatoriamente
            const starterUser = room.users[Math.floor(Math.random() * room.users.length)]
            
            // Juego iniciado
            
            // Enviar rol y palabra/pista/categoría a cada usuario
            room.users.forEach(u => {
              const role = room.roles[u.id]
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
        }, 3000)
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
        
        // Notificar a todos que el juego terminó
        io.to(roomCode).emit("gameEnded")
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
        
        const settings = room.gameSettings
        room.gameState = "countdown"
        
        // Iniciar cuenta atrás para todos
        io.to(roomCode).emit("startCountdown")
        
        // Después de 3 segundos, asignar roles y empezar juego
        setTimeout(() => {
          if (rooms[roomCode]) {
            const word = getRandomWord()
            room.currentWord = word
            room.roles = assignRoles(room.users, settings.impostorCount)
            room.gameState = "playing"
            
            // Seleccionar jugador que empieza aleatoriamente
            const starterUser = room.users[Math.floor(Math.random() * room.users.length)]
            
            // Juego reiniciado
            
            // Enviar rol y palabra/pista/categoría a cada usuario
            room.users.forEach(u => {
              const role = room.roles[u.id]
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
        }, 3000)
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
        room.currentWord = null
        room.roles = {}
        
        // Notificar a todos que vuelven a la sala
        io.to(roomCode).emit("backToWaiting")
      }
    }
  })

  // Desconexión
  socket.on("disconnect", () => {
    // Usuario desconectado
    
    const user = connectedUsers.find(u => u.id === socket.id)
    
    // Si estaba en una sala, removerlo
    if (user && user.roomCode) {
      const roomCode = user.roomCode
      
      if (rooms[roomCode]) {
        rooms[roomCode].users = rooms[roomCode].users.filter(u => u.id !== socket.id)
        
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
    }
    
    // Remover usuario de la lista de conectados
    connectedUsers = connectedUsers.filter(u => u.id !== socket.id)
  })
})

const PORT = process.env.PORT || 3000

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
})