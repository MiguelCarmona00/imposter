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
import CAHGameSettings from './games/cah/CAHGameSettings'
import CAHWaitingForSettings from './games/cah/CAHWaitingForSettings'
import CAHCountdown from './games/cah/CAHCountdown'
import CAHGamePlay from './games/cah/CAHGamePlay'
import CAHGameEnd from './games/cah/CAHGameEnd'

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

    // Estados de juego - Impostor
    const [myRole, setMyRole] = useState(null)
    const [currentWord, setCurrentWord] = useState(null)
    const [currentHint, setCurrentHint] = useState(null)
    const [currentCategory, setCurrentCategory] = useState(null)
    const [starterName, setStarterName] = useState("")
    const [maxImpostors, setMaxImpostors] = useState(1)

    // Estado de juego - Cartas Contra la Humanidad (un único objeto: CAH tiene mucho
    // más estado por ronda que el Impostor, así que agruparlo evita sumar 15 useState sueltos)
    const [cahState, setCahState] = useState(null)

    // Estados de error
    const [joinError, setJoinError] = useState("")
    const [settingsError, setSettingsError] = useState("")

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

        // Error al configurar el juego (p.ej. faltan jugadores, ajustes inválidos)
        socket.on("gameSettingsError", (message) => {
            setSettingsError(message)
        })

        // Mostrar ajustes de juego (solo anfitrión) - el payload distingue el juego
        socket.on("showGameSettings", (data) => {
            if ("maxImpostors" in data) {
                setMaxImpostors(data.maxImpostors)
            } else {
                setCahState(prev => ({ ...(prev || {}), ...data }))
            }
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

        // Juego iniciado (señal genérica de navegación; los datos de CAH llegan por cahRoundStart)
        socket.on("gameStarted", (data) => {
            if (data && data.role) {
                setMyRole(data.role)
                setCurrentWord(data.word)
                setCurrentHint(data.hint)
                setCurrentCategory(data.category)
                setStarterName(data.starterName)
            }
            setCurrentView("playing")
        })

        // Juego terminado
        socket.on("gameEnded", (data) => {
            if (data) {
                const winner = (data.finalScores || []).find(s => s.userId === data.winnerUserId)
                setCahState(prev => ({
                    ...(prev || {}),
                    finalScores: data.finalScores,
                    winnerUserId: data.winnerUserId,
                    winnerName: winner ? winner.name : null,
                    endReason: data.reason
                }))
            }
            setCurrentView("game-end")
        })

        // Volver a sala
        socket.on("backToWaiting", () => {
            setMyRole(null)
            setCurrentWord(null)
            setCurrentHint(null)
            setCurrentCategory(null)
            setStarterName("")
            setCahState(null)
            setSettingsError("")
            setCurrentView("in-room")
        })

        // --- Eventos propios de Cartas Contra la Humanidad ---

        socket.on("cahRoundStart", (data) => {
            setCahState(prev => ({
                ...(prev || {}),
                phase: "submitting",
                round: data.round,
                isCzar: data.isCzar,
                czarName: data.czarName,
                blackCard: data.blackCard,
                hand: data.hand,
                scores: data.scores,
                pointsToWin: data.pointsToWin,
                notice: data.notice,
                submittedCount: 0,
                totalNeeded: data.isCzar ? 0 : undefined,
                revealSubmissions: null,
                roundResult: null,
                hasSubmitted: false,
                hasDiscarded: false,
                cahError: ""
            }))
        })

        socket.on("cahSubmissionsProgress", (data) => {
            setCahState(prev => ({
                ...(prev || {}),
                submittedCount: data.submittedCount,
                totalNeeded: data.totalNeeded
            }))
        })

        socket.on("cahRevealSubmissions", (data) => {
            setCahState(prev => ({
                ...(prev || {}),
                phase: "revealing",
                revealSubmissions: data.submissions
            }))
        })

        socket.on("cahRoundResult", (data) => {
            setCahState(prev => ({
                ...(prev || {}),
                phase: "result",
                roundResult: data,
                scores: data.scores
            }))
        })

        socket.on("cahDiscardConfirmed", (data) => {
            setCahState(prev => ({ ...(prev || {}), hand: data.hand, hasDiscarded: true }))
        })

        socket.on("cahError", (data) => {
            setCahState(prev => ({ ...(prev || {}), cahError: data.message }))
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
            socket.off("gameSettingsError")
            socket.off("showGameSettings")
            socket.off("waitingForSettings")
            socket.off("startCountdown")
            socket.off("gameStarted")
            socket.off("gameEnded")
            socket.off("backToWaiting")
            socket.off("cahRoundStart")
            socket.off("cahSubmissionsProgress")
            socket.off("cahRevealSubmissions")
            socket.off("cahRoundResult")
            socket.off("cahDiscardConfirmed")
            socket.off("cahError")
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

    const handleBackToGameSelection = () => {
        setCurrentView("game-selection")
    }

    const handleCreateRoomSubmit = (name) => {
        socket.emit("createRoom", { roomName: name, game: selectedGame })
    }

    const handleJoinRoomSubmit = (name, code) => {
        socket.emit("joinRoom", { roomName: name, roomCode: code, game: selectedGame })
    }

    const handleLeaveRoom = () => {
        socket.emit("leaveRoom")
    }

    const handleBack = () => {
        setJoinError("")
        setCurrentView("room-selection")
    }

    const handleStartGame = () => {
        setSettingsError("")
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

    // Handlers - Cartas Contra la Humanidad
    const handleSubmitCahCards = (cardIds) => {
        setCahState(prev => ({ ...(prev || {}), hasSubmitted: true }))
        socket.emit("cahSubmitCards", { cardIds })
    }

    const handleDiscardCahCards = (cardIds) => {
        socket.emit("cahDiscardCards", { cardIds })
    }

    const handleCzarPick = (submissionId) => {
        socket.emit("cahCzarPick", { submissionId })
    }

    const handleCahNextRound = () => {
        socket.emit("cahNextRound")
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
                onBack={handleBackToGameSelection}
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
                selectedGame={selectedGame}
                onLeaveRoom={handleLeaveRoom}
                onStartGame={handleStartGame}
                settingsError={settingsError}
            />
        )
    }

    if (currentView === "game-settings") {
        if (selectedGame === "impostor") {
            return (
                <ImpostorGameSettings
                    maxImpostors={maxImpostors}
                    onSubmit={handleSubmitGameSettings}
                />
            )
        }
        if (selectedGame === "cah") {
            return (
                <CAHGameSettings
                    minPointsToWin={cahState?.minPointsToWin}
                    maxPointsToWin={cahState?.maxPointsToWin}
                    suggestedPointsToWin={cahState?.suggestedPointsToWin}
                    error={settingsError}
                    onSubmit={handleSubmitGameSettings}
                />
            )
        }
    }

    if (currentView === "waiting-for-settings") {
        if (selectedGame === "impostor") {
            return <ImpostorWaitingForSettings />
        }
        if (selectedGame === "cah") {
            return <CAHWaitingForSettings />
        }
    }

    if (currentView === "countdown") {
        if (selectedGame === "impostor") {
            return <ImpostorCountdown />
        }
        if (selectedGame === "cah") {
            return <CAHCountdown />
        }
    }

    if (currentView === "playing") {
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
        if (selectedGame === "cah") {
            return (
                <CAHGamePlay
                    cahState={cahState}
                    isHost={isHost}
                    myId={socket.id}
                    onSubmitCards={handleSubmitCahCards}
                    onDiscardCards={handleDiscardCahCards}
                    onCzarPick={handleCzarPick}
                    onNextRound={handleCahNextRound}
                    onEndGame={handleEndGame}
                />
            )
        }
    }

    if (currentView === "game-end") {
        if (selectedGame === "impostor") {
            return (
                <ImpostorGameEnd
                    isHost={isHost}
                    onRestart={handleRestartGame}
                    onBackToRoom={handleBackToRoom}
                />
            )
        }
        if (selectedGame === "cah") {
            return (
                <CAHGameEnd
                    cahState={cahState}
                    isHost={isHost}
                    myId={socket.id}
                    onRestart={handleRestartGame}
                    onBackToRoom={handleBackToRoom}
                />
            )
        }
    }

    return null
}
