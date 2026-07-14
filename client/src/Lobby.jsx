import { useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'
import { getPlayerId, getBreadcrumb, setBreadcrumb, clearBreadcrumb } from './session'
import UserNameInput from './UserNameInput'
import GameSelector from './GameSelector'
import RoomSelection from './RoomSelection'
import CreateRoomForm from './CreateRoomForm'
import JoinRoomForm from './JoinRoomForm'
import Room from './Room'
import ConnectionLostScreen from './ConnectionLostScreen'
import RoomCodeBadge from './RoomCodeBadge'
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

// Flag de depuración: abrir la app con ?forcePolling=1 fuerza al cliente a no
// intentar nunca WebSocket, quedándose en long-polling desde el arranque —
// simula de forma fiable un navegador/red que bloquea WebSocket, sin depender
// de que el bloqueo de peticiones de DevTools cubra el handshake ws:// (en la
// práctica, muchas versiones de Chrome no lo cubren). Solo para pruebas.
const FORCE_POLLING = new URLSearchParams(window.location.search).get("forcePolling") === "1"

const socket = io(SOCKET_URL, {
    auth: { playerId: getPlayerId() },
    reconnectionAttempts: 20,
    reconnectionDelayMax: 5000,
    ...(FORCE_POLLING ? { transports: ["polling"] } : {})
})

// Cota máxima de espera en el cliente antes de rendirse y mostrar el error de
// conexión, aunque Socket.IO siga reintentando por debajo. Hace falta como
// respaldo porque si la red a la que se pasó el dispositivo no tiene forma de
// llegar al servidor (p.ej. datos móviles intentando alcanzar una IP de LAN),
// cada intento fallido puede tardar mucho en darse por vencido a nivel de
// transporte, y sin este tope el aviso "Reconectando…" se queda colgado
// indefinidamente en vez de acabar mostrando un error claro.
const RECONNECT_TIMEOUT_MS = 45000

// Cuánto se espera tras conectar a que Socket.IO suba de long-polling a
// WebSocket antes de asumir que algo lo está bloqueando y avisar al jugador.
const TRANSPORT_CHECK_DELAY_MS = 4000

export default function Lobby() {
    // Estados de navegación
    const [currentView, setCurrentView] = useState(() => getBreadcrumb() ? "reconnecting" : "name-input") // "name-input" | "game-selection" | "room-selection" | "create-room" | "join-room" | "in-room" | "game-settings" | "waiting-for-settings" | "countdown" | "playing" | "game-end" | "reconnecting"

    // Estados de usuario
    const [myName, setMyName] = useState("")
    const [selectedGame, setSelectedGame] = useState("")

    // Estados de sala
    const [roomCode, setRoomCode] = useState("")
    const [roomName, setRoomName] = useState("")
    const [roomUsers, setRoomUsers] = useState([])
    const [hostId, setHostId] = useState(null)
    const [mySocketId, setMySocketId] = useState(socket.id)
    const isHost = hostId !== null && hostId === mySocketId

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

    // Estados de conexión: la sala/partida sobreviven a un corte de red breve
    // (ver server.js RECONNECT_GRACE_MS) — isReconnecting es un aviso no
    // bloqueante mientras se reconecta, fatalError solo aparece si el servidor
    // confirma que ya no hay nada que recuperar.
    const [isReconnecting, setIsReconnecting] = useState(false)
    const [fatalError, setFatalError] = useState(null)
    const reconnectTimeoutRef = useRef(null)

    // Si unos segundos después de conectar el transporte sigue en "polling" (no
    // subió a WebSocket), es la señal real de que algo lo está bloqueando —
    // avisamos al jugador antes de que empiece la partida, no es un error, solo
    // un heads-up de que puede sufrir cortes con más frecuencia.
    const [usingSlowTransport, setUsingSlowTransport] = useState(false)
    const transportCheckTimeoutRef = useRef(null)

    useEffect(() => {
        const clearReconnectTimeout = () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
                reconnectTimeoutRef.current = null
            }
        }

        const clearTransportCheck = () => {
            if (transportCheckTimeoutRef.current) {
                clearTimeout(transportCheckTimeoutRef.current)
                transportCheckTimeoutRef.current = null
            }
        }

        // Aplica el marcador final de una partida de CAH — comparten forma
        // exacta el evento "gameEnded" y el bloque "ended" de un resync.
        const applyCahGameEnded = (data) => {
            if (!data) return
            const winner = (data.finalScores || []).find(s => s.userId === data.winnerUserId)
            setCahState(prev => ({
                ...(prev || {}),
                finalScores: data.finalScores,
                winnerUserId: data.winnerUserId,
                winnerName: winner ? winner.name : null,
                endReason: data.reason
            }))
        }

        // Conexión establecida (primera vez o tras reconectar)
        socket.on("connect", () => {
            clearReconnectTimeout()
            setMySocketId(socket.id)

            const breadcrumb = getBreadcrumb()
            if (breadcrumb && breadcrumb.roomCode) {
                socket.emit("requestResync", { roomCode: breadcrumb.roomCode })
            }

            // Da tiempo a que Socket.IO intente subir de polling a WebSocket y
            // luego comprueba en qué se quedó — engine.transport.name es el
            // transporte real en uso ahora mismo, no lo que se pidió al conectar.
            clearTransportCheck()
            transportCheckTimeoutRef.current = setTimeout(() => {
                const transportName = socket.io.engine && socket.io.engine.transport && socket.io.engine.transport.name
                setUsingSlowTransport(transportName === "polling")
            }, TRANSPORT_CHECK_DELAY_MS)
        })

        // Se cayó el transporte — Socket.IO reintenta solo por debajo; mientras
        // tanto no se toca currentView, solo se muestra un aviso no bloqueante.
        // El timeout de respaldo asegura que, si la reconexión nunca llega a
        // completarse (p.ej. el dispositivo saltó a una red desde la que el
        // servidor no es alcanzable), no se quede colgado para siempre.
        socket.on("disconnect", () => {
            setIsReconnecting(true)
            clearReconnectTimeout()
            reconnectTimeoutRef.current = setTimeout(() => {
                setIsReconnecting(false)
                setFatalError("connectionLost")
            }, RECONNECT_TIMEOUT_MS)
        })

        // Reconectó y el servidor confirma que hay una sala/partida que recuperar:
        // se reconstruye toda la pantalla de una sola vez, sin recargar.
        socket.on("resyncOk", (payload) => {
            clearReconnectTimeout()
            setIsReconnecting(false)
            setBreadcrumb({ roomCode: payload.roomCode })

            setRoomCode(payload.roomCode)
            setRoomName(payload.roomName)
            setRoomUsers(payload.users)
            setHostId(payload.hostId)
            setMyName(payload.name)
            setSelectedGame(payload.game)
            setJoinError("")
            setSettingsError("")

            const amHost = payload.hostId === socket.id

            if (payload.gameState === "waiting") {
                setCurrentView("in-room")
                return
            }

            if (payload.gameState === "settings") {
                if (amHost) {
                    if (payload.settingsPayload && "maxImpostors" in payload.settingsPayload) {
                        setMaxImpostors(payload.settingsPayload.maxImpostors)
                    } else if (payload.settingsPayload) {
                        setCahState(prev => ({ ...(prev || {}), ...payload.settingsPayload }))
                    }
                    setCurrentView("game-settings")
                } else {
                    setCurrentView("waiting-for-settings")
                }
                return
            }

            if (payload.gameState === "countdown") {
                setCurrentView("countdown")
                return
            }

            if (payload.gameState === "playing") {
                if (payload.game === "impostor" && payload.resync) {
                    setMyRole(payload.resync.role)
                    setCurrentWord(payload.resync.word)
                    setCurrentHint(payload.resync.hint)
                    setCurrentCategory(payload.resync.category)
                    setStarterName(payload.resync.starterName)
                }
                if (payload.game === "cah" && payload.resync) {
                    const r = payload.resync
                    setCahState(prev => ({
                        ...(prev || {}),
                        phase: r.phase,
                        round: r.round,
                        isCzar: r.isCzar,
                        czarName: r.czarName,
                        blackCard: r.blackCard,
                        hand: r.hand,
                        scores: r.scores,
                        pointsToWin: r.pointsToWin,
                        submittedCount: r.submittedCount,
                        totalNeeded: r.totalNeeded,
                        hasSubmitted: r.hasSubmitted,
                        hasDiscarded: r.hasDiscarded,
                        revealSubmissions: r.revealSubmissions || null,
                        roundResult: r.roundResult || null,
                        notice: null,
                        cahError: ""
                    }))
                }
                setCurrentView("playing")
                return
            }

            if (payload.gameState === "ended") {
                if (payload.game === "cah") {
                    applyCahGameEnded(payload.resync)
                }
                setCurrentView("game-end")
            }
        })

        // Reconectó pero el servidor ya no tiene nada que recuperar (la gracia
        // expiró, la sala se cerró, o el playerId no coincide con nada) — aquí sí
        // hace falta un mensaje de error claro en vez de una pantalla congelada.
        socket.on("resyncFailed", ({ reason }) => {
            clearReconnectTimeout()
            clearBreadcrumb()
            setIsReconnecting(false)
            setFatalError(reason)
        })

        // Se agotaron los intentos de reconexión de Socket.IO (p.ej. servidor caído)
        socket.io.on("reconnect_failed", () => {
            clearReconnectTimeout()
            setFatalError("connectionLost")
        })

        // Sala creada exitosamente
        socket.on("roomCreated", (data) => {
            setRoomCode(data.code)
            setRoomName(data.name)
            setRoomUsers(data.users)
            setHostId(data.hostId)
            setBreadcrumb({ roomCode: data.code })
            setCurrentView("in-room")
        })

        // Unido a sala exitosamente
        socket.on("roomJoined", (data) => {
            setRoomCode(data.code)
            setRoomName(data.name)
            setRoomUsers(data.users)
            setHostId(data.hostId)
            setBreadcrumb({ roomCode: data.code })
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
            setHostId(data.hostId)
        })

        // Usuario salió de la sala
        socket.on("userLeft", (data) => {
            setRoomUsers(data.users)
            setHostId(data.hostId)
        })

        // Sala abandonada exitosamente
        socket.on("roomLeft", () => {
            clearBreadcrumb()
            setRoomCode("")
            setRoomName("")
            setRoomUsers([])
            setHostId(null)
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
            applyCahGameEnded(data)
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
            clearReconnectTimeout()
            clearTransportCheck()
            socket.off("connect")
            socket.off("disconnect")
            socket.off("resyncOk")
            socket.off("resyncFailed")
            socket.io.off("reconnect_failed")
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

    const handleReload = () => {
        window.location.reload()
    }

    // La pantalla de error de conexión tiene prioridad sobre cualquier otra vista
    if (fatalError) {
        return <ConnectionLostScreen reason={fatalError} onReload={handleReload} />
    }

    // Renderizado condicional según vista actual
    const renderView = () => {
        if (currentView === "reconnecting") {
            return (
                <div style={{ textAlign: "center", padding: "3rem 1.5rem", color: "#ffd700" }}>
                    <p>Reconectando con la partida…</p>
                </div>
            )
        }

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
                    mySocketId={mySocketId}
                    isHost={isHost}
                    selectedGame={selectedGame}
                    onLeaveRoom={handleLeaveRoom}
                    onStartGame={handleStartGame}
                    settingsError={settingsError}
                    usingSlowTransport={usingSlowTransport}
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
                    <>
                        <RoomCodeBadge roomName={roomName} roomCode={roomCode} />
                        <ImpostorGamePlay
                            role={myRole}
                            word={currentWord}
                            hint={currentHint}
                            category={currentCategory}
                            starterName={starterName}
                            isHost={isHost}
                            onEndGame={handleEndGame}
                        />
                    </>
                )
            }
            if (selectedGame === "cah") {
                return (
                    <>
                        <RoomCodeBadge roomName={roomName} roomCode={roomCode} />
                        <CAHGamePlay
                            cahState={cahState}
                            isHost={isHost}
                            myId={mySocketId}
                            onSubmitCards={handleSubmitCahCards}
                            onDiscardCards={handleDiscardCahCards}
                            onCzarPick={handleCzarPick}
                            onNextRound={handleCahNextRound}
                            onEndGame={handleEndGame}
                        />
                    </>
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
                        myId={mySocketId}
                        onRestart={handleRestartGame}
                        onBackToRoom={handleBackToRoom}
                    />
                )
            }
        }

        return null
    }

    return (
        <>
            {isReconnecting && <div className="reconnect-banner">Reconectando…</div>}
            {renderView()}
        </>
    )
}
