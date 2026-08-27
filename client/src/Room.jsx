import { useState } from 'react'
import { getGameConfig } from './gameConfig'
import './styles/Room.css'

export default function Room({ roomName, roomCode, users, mySocketId, isHost, selectedGame, onLeaveRoom, onStartGame, onKickPlayer, settingsError, usingSlowTransport }) {
    const [copied, setCopied] = useState(false)

    // Se confirma porque en móvil los botones quedan pequeños y juntos, y
    // expulsar por error a alguien a mitad de partida es molesto de deshacer.
    const confirmKick = (user, ban) => {
        const who = user.name || "Anónimo"
        const message = ban
            ? `¿Expulsar a ${who} y bloquear su entrada a esta sala?`
            : `¿Expulsar a ${who}? Podrá volver a entrar con el código.`
        if (window.confirm(message)) {
            onKickPlayer(user.id, ban)
        }
    }

    const minPlayers = getGameConfig(selectedGame)?.minPlayers ?? 1
    const canStartGame = isHost && users.length >= minPlayers

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(roomCode)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Error al copiar:', err)
        }
    }

    return (
        <div className="room-container">
            <h1 className="room-title">{roomName}</h1>
            
            <div className="room-main-grid">
                <div className="room-code-section">
                    <div className="room-code-card">
                        <h2 className="room-code-label">Código de Sala</h2>
                        <p className="room-code-value">
                            {roomCode}
                        </p>
                        <button className="copy-button" onClick={handleCopyCode}>
                            {copied ? '¡Copiado!' : 'Copiar Código'}
                        </button>
                    </div>
                </div>

                <div className="players-section">
                    <h2 className="players-section-title">Jugadores en la sala ({users.length})</h2>
                    <div className="players-list">
                        {users.map(user => (
                            <div
                                key={user.id}
                                className={`player-item ${user.id === mySocketId ? 'is-current-user' : ''}`}
                            >
                                <span className="player-name">
                                    {user.name || "Anónimo"}
                                    {user.id === mySocketId && " (Tú)"}
                                    {isHost && user.id === mySocketId && " 👑"}
                                </span>

                                {isHost && user.id !== mySocketId && (
                                    <span className="player-actions">
                                        <button
                                            type="button"
                                            className="kick-button"
                                            title={`Expulsar a ${user.name || "Anónimo"} (podrá volver)`}
                                            aria-label={`Expulsar a ${user.name || "Anónimo"}`}
                                            onClick={() => confirmKick(user, false)}
                                        >
                                            ✕
                                        </button>
                                        <button
                                            type="button"
                                            className="kick-button is-ban"
                                            title={`Expulsar a ${user.name || "Anónimo"} y bloquear su entrada`}
                                            aria-label={`Expulsar y bloquear a ${user.name || "Anónimo"}`}
                                            onClick={() => confirmKick(user, true)}
                                        >
                                            ⛔
                                        </button>
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {canStartGame && (
                <button 
                    onClick={onStartGame}
                    className="start-game-button"
                >
                    🎮 Empezar Juego
                </button>
            )}

            {!canStartGame && isHost && (
                <p className="warning-message">
                    ℹ️ Se necesitan al menos {minPlayers} jugadores para comenzar
                </p>
            )}

            {settingsError && (
                <p className="warning-message" style={{ color: 'red' }}>
                    {settingsError}
                </p>
            )}

            {usingSlowTransport && (
                <p className="warning-message">
                    ⚠️ Tu conexión parece estar usando un modo más lento (sin WebSocket activo).
                    Puede que sufras cortes con más frecuencia durante la partida — si te pasa,
                    prueba con otro navegador, revisa el modo "Ahorro de datos" o desactiva
                    extensiones/VPN.
                </p>
            )}

            <button
                onClick={onLeaveRoom} 
                className="leave-button"
            >
                Salir de la Sala
            </button>
        </div>
    )
}
