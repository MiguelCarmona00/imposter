import { useState } from 'react'

export default function Room({ roomName, roomCode, users, mySocketId, isHost, onLeaveRoom, onStartGame }) {
    const [copied, setCopied] = useState(false)
    
    const canStartGame = isHost && users.length >= 4

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
        <div>
            <h1>{roomName}</h1>
            <div style={{ 
                backgroundColor: '#752828', 
                padding: '1rem', 
                borderRadius: '8px', 
                marginBottom: '2rem',
                textAlign: 'center'
            }}>
                <h2>Código de Sala</h2>
                <p style={{ 
                    fontSize: '2rem', 
                    fontWeight: 'bold', 
                    letterSpacing: '0.5rem',
                    margin: '0.5rem 0'
                }}>
                    {roomCode}
                </p>
                <button onClick={handleCopyCode}>
                    {copied ? '¡Copiado!' : 'Copiar Código'}
                </button>
            </div>

            <h2>Jugadores en la sala ({users.length})</h2>
            <div>
                {users.map(user => (
                    <p key={user.id} style={{ 
                        padding: '0.5rem', 
                        backgroundColor: user.id === mySocketId ? '#16a038' : 'transparent',
                        borderRadius: '4px'
                    }}>
                        {user.name || "Anónimo"}
                        {user.id === mySocketId && " (Tú)"}
                        {isHost && user.id === mySocketId && " 👑"}
                    </p>
                ))}
            </div>

            {canStartGame && (
                <button 
                    onClick={onStartGame}
                    style={{ 
                        marginTop: '2rem',
                        padding: '1rem 2rem',
                        fontSize: '1.2rem',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        width: '100%',
                        marginBottom: '1rem'
                    }}
                >
                    🎮 Empezar Juego
                </button>
            )}

            {!canStartGame && isHost && (
                <p style={{ 
                    marginTop: '2rem',
                    padding: '1rem',
                    backgroundColor: '#fff3cd',
                    borderRadius: '4px',
                    color: '#856404'
                }}>
                    ℹ️ Se necesitan al menos 4 jugadores para comenzar
                </p>
            )}

            <button 
                onClick={onLeaveRoom} 
                style={{ 
                    marginTop: '1rem',
                    backgroundColor: '#f44336',
                    color: 'white'
                }}
            >
                Salir de la Sala
            </button>
        </div>
    )
}
