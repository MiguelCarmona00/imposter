import { useState } from 'react'
import './styles/RoomCodeBadge.css'

// Recordatorio discreto del nombre y código de sala durante la partida, para
// poder pasárselo a alguien sin tener que salir a la pantalla de la sala.
export default function RoomCodeBadge({ roomName, roomCode }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(roomCode)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Error al copiar:', err)
        }
    }

    return (
        <button className="room-code-badge" onClick={handleCopy} title="Copiar código de sala">
            <span className="room-code-badge-name">{roomName}</span>
            <span className="room-code-badge-code">{copied ? '¡Copiado!' : roomCode}</span>
        </button>
    )
}
