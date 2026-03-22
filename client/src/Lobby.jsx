import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import UserNameInput from './UserNameInput'
import GameSelector from './GameSelector'
import RoomSelection from './RoomSelection'
import CreateRoomForm from './CreateRoomForm'
import JoinRoomForm from './JoinRoomForm'
import Room from './Room'
import ImpostorGameSettings from './games/impostor/ImpostorGameSettings'
import ImpostorWaitingForSettings from './games/impostor/ImpostorWaitingForSettings'
import ImpostorCountdown from './games/impostor/ImpostorCountdown'
import ImpostorGamePlay from './games/impostor/ImpostorGamePlay'
import ImpostorGameEnd from './games/impostor/ImpostorGameEnd'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000"
const socket = io(SOCKET_URL)

export default function Lobby() {
    // Estados de navegación
    const [currentView, setCurrentView] = useState("name-input") // "name-input" | "game-selection" | "room-selection" | "create-room" | "join-room" | "in-room" | "game-settings" | "waiting-for-settings" | "countdown" | "playing" | "game-end"
    
    // Estados de usuario
    const [myName, setMyName] = useState("")
    const [isHost, setIsHost] = useState(false)
    const [selectedGame, setSelectedGame] = useState("")
    
    // Estados de sala
    const [roomCode, setRoomCode] = useState("")
    const [roomName, setRoomName] = useState("")
    const [roomUsers, setRoomUsers] = useState([])
    
    // Estados de juego
    const [myRole, setMyRole] = useState(null)
    const [currentWord, setCurrentWord] = useState(null)
    const [currentHint, setCurrentHint] = useState(null)
    const [currentCategory, setCurrentCategory] = useState(null)
    const [starterName, setStarterName] = useState("")
    const [maxImpostors, setMaxImpostors] = useState(1)
    
    // Estado de error
    const [joinError, setJoinError] = useState("")

    useEffect(() => {
        // Conexión establecida
        socket.on("connect", () => {
            // Conexión exitosa
        })

        // Sala creada exitosamente
        socket.on("roomCreated", (data) => {
            setRoomCode(data.code)
            setRoomName(data.name)
            setRoomUsers(data.users)
            setIsHost(data.isHost)
            setCurrentView("in-room")
        })

        // Unido a sala exitosamente
        socket.on("roomJoined", (data) => {
            setRoomCode(data.code)
            setRoomName(data.name)
            setRoomUsers(data.users)
            setIsHost(data.isHost)
            setJoinError("")
            setCurrentView("in-room")
        })

        // Error al unirse a sala
        socket.on("joinError", (errorMessage) => {
            setJoinError(errorMessage)
        })

        // Usuario se unió a la sala
        socket.on("userJoined", (data) => {
            setRoomUsers(data.users)
        })

        // Usuario salió de la sala
        socket.on("userLeft", (data) => {
            setRoomUsers(data.users)
        })

        // Sala abandonada exitosamente
        socket.on("roomLeft", () => {
            setRoomCode("")
            setRoomName("")
            setRoomUsers([])
            setIsHost(false)
            setCurrentView("room-selection")
        })

        // Mostrar ajustes de juego (solo anfitrión)
        socket.on("showGameSettings", (data) => {
            setMaxImpostors(data.maxImpostors)
            setCurrentView("game-settings")
        })

        // Esperar ajustes (invitados)
        socket.on("waitingForSettings", () => {
            setCurrentView("waiting-for-settings")
        })

        // Iniciar cuenta atrás
        socket.on("startCountdown", () => {
            setCurrentView("countdown")
        })

        // Juego iniciado
        socket.on("gameStarted", (data) => {
            setMyRole(data.role)
            setCurrentWord(data.word)
            setCurrentHint(data.hint)
            setCurrentCategory(data.category)
            setStarterName(data.starterName)
            setCurrentView("playing")
        })

        // Juego terminado
        socket.on("gameEnded", () => {
            setCurrentView("game-end")
        })

        // Volver a sala
        socket.on("backToWaiting", () => {
            setMyRole(null)
            setCurrentWord(null)
            setCurrentHint(null)
            setCurrentCategory(null)
            setStarterName("")
            setCurrentView("in-room")
        })

        // Limpieza
        return () => {
            socket.off("connect")
            socket.off("roomCreated")
            socket.off("roomJoined")
            socket.off("joinError")
            socket.off("userJoined")
            socket.off("userLeft")
            socket.off("roomLeft")
            socket.off("showGameSettings")
            socket.off("waitingForSettings")
            socket.off("startCountdown")
            socket.off("gameStarted")
            socket.off("gameEnded")
            socket.off("backToWaiting")
        }
    }, [])

    // Handlers
    const handleNameSubmit = (name) => {
        setMyName(name)
        socket.emit("setName", name)
        setCurrentView("game-selection")
    }

    const handleGameSelect = (gameId) => {
        setSelectedGame(gameId)
        setCurrentView("room-selection")
    }

    const handleCreateRoom = () => {
        setCurrentView("create-room")
    }

    const handleJoinRoom = () => {
        setJoinError("")
        setCurrentView("join-room")
    }

    const handleCreateRoomSubmit = (name) => {
        socket.emit("createRoom", { roomName: name })
    }

    const handleJoinRoomSubmit = (name, code) => {
        socket.emit("joinRoom", { roomName: name, roomCode: code })
    }

    const handleLeaveRoom = () => {
        socket.emit("leaveRoom")
    }

    const handleBack = () => {
        setJoinError("")
        setCurrentView("room-selection")
    }

    const handleStartGame = () => {
        socket.emit("startGameSetup")
    }

    const handleSubmitGameSettings = (settings) => {
        socket.emit("submitGameSettings", settings)
    }

    const handleEndGame = () => {
        socket.emit("endGame")
    }

    const handleRestartGame = () => {
        socket.emit("restartGame")
    }

    const handleBackToRoom = () => {
        socket.emit("backToRoom")
    }

    // Renderizado condicional según vista actual
    if (currentView === "name-input") {
        return <UserNameInput onNameSubmit={handleNameSubmit} />
    }

    if (currentView === "game-selection") {
        return <GameSelector onGameSelect={handleGameSelect} />
    }

    if (currentView === "room-selection") {
        return (
            <RoomSelection 
                userName={myName}
                onCreateRoom={handleCreateRoom}
                onJoinRoom={handleJoinRoom}
            />
        )
    }

    if (currentView === "create-room") {
        return (
            <CreateRoomForm 
                onSubmit={handleCreateRoomSubmit}
                onBack={handleBack}
            />
        )
    }

    if (currentView === "join-room") {
        return (
            <JoinRoomForm 
                onSubmit={handleJoinRoomSubmit}
                onBack={handleBack}
                error={joinError}
            />
        )
    }

    if (currentView === "in-room") {
        return (
            <Room 
                roomName={roomName}
                roomCode={roomCode}
                users={roomUsers}
                mySocketId={socket.id}
                isHost={isHost}
                onLeaveRoom={handleLeaveRoom}
                onStartGame={handleStartGame}
            />
        )
    }

    if (currentView === "game-settings") {
        // Renderizar componente de configuración según el juego seleccionado
        if (selectedGame === "impostor") {
            return (
                <ImpostorGameSettings 
                    maxImpostors={maxImpostors}
                    onSubmit={handleSubmitGameSettings}
                />
            )
        }
    }

    if (currentView === "waiting-for-settings") {
        // Renderizar componente de espera según el juego seleccionado
        if (selectedGame === "impostor") {
            return <ImpostorWaitingForSettings />
        }
    }

    if (currentView === "countdown") {
        // Renderizar countdown según el juego seleccionado
        if (selectedGame === "impostor") {
            return <ImpostorCountdown />
        }
    }

    if (currentView === "playing") {
        // Renderizar gameplay según el juego seleccionado
        if (selectedGame === "impostor") {
            return (
                <ImpostorGamePlay 
                    role={myRole}
                    word={currentWord}
                    hint={currentHint}
                    category={currentCategory}
                    starterName={starterName}
                    isHost={isHost}
                    onEndGame={handleEndGame}
                />
            )
        }
    }

    if (currentView === "game-end") {
        // Renderizar fin de juego según el juego seleccionado
        if (selectedGame === "impostor") {
            return (
                <ImpostorGameEnd 
                    isHost={isHost}
                    onRestart={handleRestartGame}
                    onBackToRoom={handleBackToRoom}
                />
            )
        }
    }

    return null
}