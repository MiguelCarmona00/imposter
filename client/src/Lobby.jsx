import { useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'
import { getPlayerId, getBreadcrumb, setBreadcrumb, clearBreadcrumb } from './session'
import UserNameInput from './UserNameInput'
import GameSelector from './GameSelector'
import RoomSelection from './RoomSelection'
import Room from './Room'
import ConnectionLostScreen from './ConnectionLostScreen'
import Countdown from './Countdown'
import WaitingForSettings from './WaitingForSettings'
import { WaitingScreen } from './ui'
import ImpostorGameSettings from './games/impostor/ImpostorGameSettings'
import ImpostorGamePlay from './games/impostor/ImpostorGamePlay'
import ImpostorGameEnd from './games/impostor/ImpostorGameEnd'
import CAHGameSettings from './games/cah/CAHGameSettings'
import CAHGamePlay from './games/cah/CAHGamePlay'
import CAHGameEnd from './games/cah/CAHGameEnd'
import CAHWaitingForNextRound from './games/cah/CAHWaitingForNextRound'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000"

// Flag de depuración: abrir la app con ?forcePolling=1 fuerza al cliente a no
// intentar nunca WebSocket, quedándose en long-polling desde el arranque —
// simula de forma fiable un navegador/red que bloquea WebSocket, sin depender
// de que el bloqueo de peticiones de DevTools cubra el handshake ws:// (en la
// práctica, muchas versiones de Chrome no lo cubren). Solo para pruebas.
const FORCE_POLLING = new URLSearchParams(window.location.search).get("forcePolling") === "1"

const socket = io(SOCKET_URL, {
    auth: { playerId: getPlayerId() },
    // Sin tope de intentos: con el móvil bloqueado los intentos no deben
    // agotarse. El límite real lo pone RECONNECT_TIMEOUT_MS (solo con la app visible).
    reconnectionAttempts: Infinity,
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
    const [currentView, setCurrentView] = useState(() => getBreadcrumb() ? "reconnecting" : "name-input") // "name-input" | "game-selection" | "room-selection" | "in-room" | "game-settings" | "waiting-for-settings" | "countdown" | "playing" | "game-end" | "reconnecting" | "waiting-for-next-round"

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
    // Aviso tras ser expulsado: se muestra en la pantalla de selección de sala,
    // que es donde acaba el expulsado, para que sepa qué ha pasado en vez de
    // aparecer ahí de golpe sin explicación.
    const [kickedNotice, setKickedNotice] = useState("")
    // Aviso breve cuando te pasan el papel de anfitrión
    const [hostToast, setHostToast] = useState("")
    useEffect(() => {
        if (!hostToast) return
        const t = setTimeout(() => setHostToast(""), 3500)
        return () => clearTimeout(t)
    }, [hostToast])

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

    // Espejo en ref de "estoy esperando a entrar a una partida en marcha": los
    // handlers de socket se registran una sola vez, así que no pueden leer
    // currentView (capturarían el valor del primer render).
    const isLateJoinPendingRef = useRef(false)
    useEffect(() => {
        isLateJoinPendingRef.current = currentView === "waiting-for-next-round"
    }, [currentView])

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
        const handleConnect = () => {
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
        }

        socket.on("connect", handleConnect)

        // El socket se crea al cargar el módulo, antes del primer render, así que
        // puede haber conectado ya cuando este efecto registra el handler (en
        // local es lo normal) — y StrictMode además monta el efecto, lo limpia
        // con socket.off("connect") y lo vuelve a montar, abriendo otra ventana.
        // Si ese "connect" se perdió, nadie fija mySocketId (adiós al "(Tú)" y,
        // peor, a isHost) ni pide el resync. Al estar ya conectado, el evento no
        // se va a repetir: hay que ejecutar el handler a mano.
        if (socket.connected) {
            handleConnect()
        }

        // Se cayó el transporte — Socket.IO reintenta solo por debajo; mientras
        // tanto no se toca currentView, solo se muestra un aviso no bloqueante.
        // El timeout de respaldo asegura que, si la reconexión nunca llega a
        // completarse (p.ej. el dispositivo saltó a una red desde la que el
        // servidor no es alcanzable), no se quede colgado para siempre.
        // El tope de espera solo cuenta con la app en pantalla. Con el móvil
        // bloqueado el temporizador se congela y, al desbloquear, saltaba al
        // instante mostrando "Se perdió la conexión" aunque el servidor siguiera
        // guardando el sitio (en el Impostor, hasta 30 min).
        const armReconnectTimeout = () => {
            clearReconnectTimeout()
            if (document.visibilityState !== "visible") return
            reconnectTimeoutRef.current = setTimeout(() => {
                setIsReconnecting(false)
                setFatalError("connectionLost")
            }, RECONNECT_TIMEOUT_MS)
        }

        socket.on("disconnect", () => {
            setIsReconnecting(true)
            armReconnectTimeout()
        })

        // Al volver a la app: si la conexión cayó mientras estaba oculta, se
        // fuerza la reconexión y el tope empieza a contar desde ahora.
        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                if (!socket.connected) {
                    if (!socket.active) socket.connect()
                    armReconnectTimeout()
                }
            } else {
                clearReconnectTimeout()
            }
        }
        document.addEventListener("visibilitychange", handleVisibility)

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

            // Reconectó mientras esperaba a entrar a una partida en marcha: no
            // tiene estado de juego que restaurar, vuelve a la pantalla de espera.
            if (payload.lateJoinPending) {
                setCurrentView("waiting-for-next-round")
                return
            }

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
                        czarId: r.czarId,
                        submittedIds: r.submittedIds || [],
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
            // Oculta: se reintentará al volver (handleVisibility)
            if (document.visibilityState !== "visible") return
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
            if (data.game) setSelectedGame(data.game)
            setBreadcrumb({ roomCode: data.code })
            setJoinError("")
            setCurrentView("in-room")
        })

        // Error al unirse a sala
        socket.on("joinError", (errorMessage) => {
            setJoinError(errorMessage)
        })

        // Se unió con la partida ya empezada: está dentro de la sala pero aún no
        // juega. El servidor lo mete en la partida al pasar de ronda, y entonces
        // llegan "gameStarted" + "cahRoundStart" como a cualquier otro jugador.
        socket.on("lateJoinPending", (data) => {
            setRoomCode(data.code)
            setRoomName(data.name)
            setRoomUsers(data.users)
            setHostId(data.hostId)
            setSelectedGame(data.game)
            setBreadcrumb({ roomCode: data.code })
            setJoinError("")
            setCurrentView("waiting-for-next-round")
        })

        // La sala se cerró mientras esperaba a entrar — sin esto se quedaría
        // mirando la pantalla de espera de una partida que ya no existe.
        socket.on("lateJoinCancelled", () => {
            if (!isLateJoinPendingRef.current) return
            clearBreadcrumb()
            setFatalError("roomNotFound")
        })

        // Usuario se unió a la sala
        socket.on("userJoined", (data) => {
            setRoomUsers(data.users)
            setHostId(data.hostId)
        })

        // El anfitrión ha pasado su papel a otro jugador
        socket.on("hostChanged", (data) => {
            setRoomUsers(data.users)
            setHostId(data.hostId)
            if (data.hostId === socket.id) {
                setHostToast("Ahora eres el anfitrión de la sala")
            } else if (data.previousHostId === socket.id) {
                const newHost = (data.users || []).find(u => u.id === data.hostId)
                setHostToast(`${newHost ? newHost.name : "Otro jugador"} es ahora el anfitrión`)
            }
        })

        // Usuario salió de la sala
        socket.on("userLeft", (data) => {
            setRoomUsers(data.users)
            setHostId(data.hostId)
        })

        // El anfitrión te ha expulsado. Sin veto se puede volver a entrar con el
        // mismo código (y si hay partida en marcha, entra por la cola de entrada
        // tardía), así que se devuelve a la selección de sala y no a un error.
        socket.on("kicked", (data) => {
            clearBreadcrumb()
            setRoomCode("")
            setRoomName("")
            setRoomUsers([])
            setHostId(null)
            setCahState(null)
            setMyRole(null)
            setCurrentWord(null)
            setCurrentHint(null)
            setCurrentCategory(null)
            setStarterName("")
            setSettingsError("")
            setJoinError("")
            setKickedNotice(
                data && data.banned
                    ? "El anfitrión te ha expulsado de la sala y no puedes volver a entrar."
                    : "El anfitrión te ha expulsado de la sala. Puedes volver a entrar con el código."
            )
            setCurrentView("room-selection")
        })

        // Sala abandonada (desde la sala de espera o a mitad de partida): se
        // vuelve al menú de juegos con el estado de partida limpio.
        socket.on("roomLeft", () => {
            clearBreadcrumb()
            setRoomCode("")
            setRoomName("")
            setRoomUsers([])
            setHostId(null)
            setCahState(null)
            setMyRole(null)
            setCurrentWord(null)
            setCurrentHint(null)
            setCurrentCategory(null)
            setStarterName("")
            setSettingsError("")
            setJoinError("")
            setKickedNotice("")
            setCurrentView("game-selection")
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
                czarId: data.czarId,
                submittedIds: [],
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
                submittedIds: data.submittedIds || prev?.submittedIds || [],
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

        // El marcador cambió sin que haya empezado ni terminado una ronda
        // (alguien fue expulsado o se fue): sin esto la tabla se quedaría
        // mostrando a quien ya no está hasta el siguiente reparto.
        // Hay dos marcadores en pantalla y no leen del mismo sitio: el lateral
        // usa cahState.scores, y el de la pantalla de recuento (donde está el
        // botón de expulsar) usa roundResult.scores. Hay que refrescar ambos.
        socket.on("cahScoresUpdate", (data) => {
            setCahState(prev => {
                if (!prev) return prev
                return {
                    ...prev,
                    scores: data.scores,
                    roundResult: prev.roundResult
                        ? { ...prev.roundResult, scores: data.scores }
                        : prev.roundResult
                }
            })
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
            document.removeEventListener("visibilitychange", handleVisibility)
            socket.off("connect")
            socket.off("disconnect")
            socket.off("resyncOk")
            socket.off("resyncFailed")
            socket.io.off("reconnect_failed")
            socket.off("roomCreated")
            socket.off("roomJoined")
            socket.off("joinError")
            socket.off("lateJoinPending")
            socket.off("lateJoinCancelled")
            socket.off("kicked")
            socket.off("userJoined")
            socket.off("userLeft")
            socket.off("hostChanged")
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
            socket.off("cahScoresUpdate")
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

    // Para crear hace falta nombre de sala; para unirse, nombre + código.
    const handleCreateRoom = (name) => {
        setKickedNotice("")
        setJoinError("")
        socket.emit("createRoom", { roomName: name, game: selectedGame })
    }

    const handleJoinRoom = (name, code) => {
        setKickedNotice("")
        setJoinError("")
        socket.emit("joinRoom", { roomName: name, roomCode: code, game: selectedGame })
    }

    const handleBackToGameSelection = () => {
        setKickedNotice("")
        setJoinError("")
        setCurrentView("game-selection")
    }

    const handleBackToName = () => {
        setCurrentView("name-input")
    }

    const handleLeaveRoom = () => {
        socket.emit("leaveRoom")
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

    // ban=false saca al jugador pero puede volver a entrar; ban=true además
    // guarda su playerId para que no pueda. Solo el anfitrión puede llamarlo,
    // y el servidor lo vuelve a comprobar por su cuenta.
    const handleKickPlayer = (targetId, ban) => {
        socket.emit("kickPlayer", { targetId, ban })
    }

    const handleTransferHost = (targetId) => {
        socket.emit("transferHost", { targetId })
    }

    const handleReload = () => {
        window.location.reload()
    }

    // La pantalla de error de conexión tiene prioridad sobre cualquier otra vista
    if (fatalError) {
        return <ConnectionLostScreen reason={fatalError} onReload={handleReload} />
    }

    const hostName = roomUsers.find(u => u.id === hostId)?.name || "el anfitrión"
    // Si el anfitrión se va, el servidor da el papel al primero que queda en la sala.
    const nextHostName = roomUsers.find(u => u.id !== mySocketId)?.name || null

    // Renderizado condicional según vista actual
    const renderView = () => {
        if (currentView === "reconnecting") {
            return <WaitingScreen title="Reconectando con la partida…" />
        }

        if (currentView === "name-input") {
            return <UserNameInput initialName={myName} onNameSubmit={handleNameSubmit} />
        }

        if (currentView === "game-selection") {
            return <GameSelector userName={myName} onGameSelect={handleGameSelect} onBack={handleBackToName} />
        }

        if (currentView === "room-selection") {
            return (
                <RoomSelection
                    gameId={selectedGame}
                    notice={kickedNotice}
                    error={joinError}
                    onCreateRoom={handleCreateRoom}
                    onJoinRoom={handleJoinRoom}
                    onBack={handleBackToGameSelection}
                />
            )
        }

        if (currentView === "in-room") {
            return (
                <Room
                    onKickPlayer={handleKickPlayer}
                    onTransferHost={handleTransferHost}
                    roomName={roomName}
                    roomCode={roomCode}
                    users={roomUsers}
                    mySocketId={mySocketId}
                    isHost={isHost}
                    hostId={hostId}
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
                        roomCode={roomCode}
                        playerCount={roomUsers.length}
                        maxImpostors={maxImpostors}
                        error={settingsError}
                        onSubmit={handleSubmitGameSettings}
                        onCancel={handleBackToRoom}
                    />
                )
            }
            if (selectedGame === "cah") {
                return (
                    <CAHGameSettings
                        roomCode={roomCode}
                        playerCount={roomUsers.length}
                        minPointsToWin={cahState?.minPointsToWin}
                        maxPointsToWin={cahState?.maxPointsToWin}
                        suggestedPointsToWin={cahState?.suggestedPointsToWin}
                        error={settingsError}
                        onSubmit={handleSubmitGameSettings}
                        onCancel={handleBackToRoom}
                    />
                )
            }
        }

        if (currentView === "waiting-for-settings") {
            return (
                <WaitingForSettings
                    roomName={roomName}
                    roomCode={roomCode}
                    hostName={hostName}
                    hostId={hostId}
                    users={roomUsers}
                    myId={mySocketId}
                    gameId={selectedGame}
                    onLeave={handleLeaveRoom}
                />
            )
        }

        if (currentView === "waiting-for-next-round") {
            return <CAHWaitingForNextRound roomCode={roomCode} onLeave={handleLeaveRoom} />
        }

        if (currentView === "countdown") {
            return <Countdown gameId={selectedGame} roomCode={roomCode} />
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
                        roomCode={roomCode}
                        playerCount={roomUsers.length}
                        isHost={isHost}
                        nextHostName={nextHostName}
                        onEndGame={handleEndGame}
                        onLeave={handleLeaveRoom}
                    />
                )
            }
            if (selectedGame === "cah") {
                return (
                    <CAHGamePlay
                        cahState={cahState}
                        roomCode={roomCode}
                        isHost={isHost}
                        hostName={hostName}
                        nextHostName={nextHostName}
                        myId={mySocketId}
                        onKickPlayer={handleKickPlayer}
                        onTransferHost={handleTransferHost}
                        onSubmitCards={handleSubmitCahCards}
                        onDiscardCards={handleDiscardCahCards}
                        onCzarPick={handleCzarPick}
                        onNextRound={handleCahNextRound}
                        onEndGame={handleEndGame}
                        onLeave={handleLeaveRoom}
                    />
                )
            }
        }

        if (currentView === "game-end") {
            if (selectedGame === "impostor") {
                return (
                    <ImpostorGameEnd
                        roomCode={roomCode}
                        isHost={isHost}
                        hostName={hostName}
                        onRestart={handleRestartGame}
                        onBackToRoom={handleBackToRoom}
                        onLeave={handleLeaveRoom}
                    />
                )
            }
            if (selectedGame === "cah") {
                return (
                    <CAHGameEnd
                        cahState={cahState}
                        roomCode={roomCode}
                        isHost={isHost}
                        hostName={hostName}
                        myId={mySocketId}
                        onRestart={handleRestartGame}
                        onBackToRoom={handleBackToRoom}
                        onLeave={handleLeaveRoom}
                    />
                )
            }
        }

        return null
    }

    return (
        <>
            {isReconnecting && <div className="reconnect-banner" role="status">Reconectando…</div>}
            {hostToast && !isReconnecting && (
                <div className="reconnect-banner toast" role="status" key={hostToast}>
                    {hostToast}
                </div>
            )}
            {renderView()}
        </>
    )
}
