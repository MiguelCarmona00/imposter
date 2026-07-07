import { useState } from 'react'
import { getGameConfig } from './gameConfig'
import './styles/Room.css'

export default function Room({ roomName, roomCode, users, mySocketId, isHost, selectedGame, onLeaveRoom, onStartGame, settingsError }) {
    const [copied, setCopied] = useState(false)

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
                            <p 
                                key={user.id} 
                                className={`player-item ${user.id === mySocketId ? 'is-current-user' : ''}`}
                            >
                                {user.name || "Anónimo"}
                                {user.id === mySocketId && " (Tú)"}
                                {isHost && user.id === mySocketId && " 👑"}
                            </p>
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

            <button
                onClick={onLeaveRoom} 
                className="leave-button"
            >
                Salir de la Sala
            </button>
        </div>
    )
}
