import { useEffect, useState } from 'react'
import { getGameConfig } from './gameConfig'
import { Table, TopBar, CodePill } from './ui'

// Cuenta atrás común a todos los juegos (antes había una copia por juego).
export default function Countdown({ gameId, roomCode }) {
    const [count, setCount] = useState(3)
    const game = getGameConfig(gameId)

    useEffect(() => {
        if (count > 0) {
            const timer = setTimeout(() => setCount(count - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [count])

    return (
        <Table variant="glow">
            <TopBar center={<CodePill code={roomCode} />} />
            <div className="grow center stack" style={{ gap: 20 }}>
                {game && <span className="eyebrow">{game.name}</span>}
                <p className="title-sm">{gameId === "impostor" ? "Se reparten los papeles…" : "Se reparten las cartas…"}</p>
                <p key={count} className="countdown" aria-live="assertive">{count > 0 ? count : "¡Ya!"}</p>
            </div>
        </Table>
    )
}
