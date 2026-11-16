import { useEffect, useState } from 'react'
import { getGameConfig } from './gameConfig'
import { buildInviteUrl, shareInvite } from './invite'
import { ShareIcon } from './ui'

// Botón "Invitar" de la barra superior, disponible para cualquier jugador.
export default function InviteButton({ roomCode, roomName, gameId, variant = "compact" }) {
    const [feedback, setFeedback] = useState("")

    useEffect(() => {
        if (!feedback) return
        const t = setTimeout(() => setFeedback(""), 2200)
        return () => clearTimeout(t)
    }, [feedback])

    if (!roomCode || !roomName) return null

    const handleClick = async () => {
        const url = buildInviteUrl({ code: roomCode, name: roomName, game: gameId })
        const result = await shareInvite({ url, roomName, gameName: getGameConfig(gameId)?.name || "Lounge" })
        if (result === "copied") setFeedback("¡Enlace copiado!")
        else if (result === "failed") setFeedback("No se pudo copiar")
    }

    if (variant === "pill") {
        return (
            <button type="button" className="btn btn--pill btn--invite" onClick={handleClick}>
                <ShareIcon /> <span role="status">{feedback || "Invitar con enlace"}</span>
            </button>
        )
    }

    return (
        <span className="invite">
            <button type="button" className="invite-btn" onClick={handleClick} aria-label="Invitar con un enlace">
                <ShareIcon />
                <span className="invite-btn__text">Invitar</span>
            </button>
            {feedback && <span className="invite__feedback" role="status">{feedback}</span>}
        </span>
    )
}
