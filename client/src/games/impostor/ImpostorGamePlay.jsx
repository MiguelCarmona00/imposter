import { useState } from 'react'
import GameExitSheet from '../../GameExitSheet'
import { Table, TopBar, ExitButton, CodePill, Spade, HatIcon } from '../../ui'

export default function ImpostorGamePlay({ role, word, hint, category, starterName, roomCode, playerCount, isHost, nextHostName, onEndGame, onLeave }) {
    const [shown, setShown] = useState(true)
    const [exitOpen, setExitOpen] = useState(false)
    const isImpostor = role === "impostor"

    // Tocar la carta la gira: así el de al lado no ve tu palabra en el móvil.
    const card = !shown ? (
        <button type="button" className="role-card role-card--back" onClick={() => setShown(true)}>
            <Spade className="logo logo--md" alt="" />
            <span style={{ fontSize: 15, fontWeight: 700 }}>Toca para ver tu papel</span>
        </button>
    ) : isImpostor ? (
        // Misma carta crema que la de los jugadores normales: con poca luz, una
        // carta de otro color delataría al impostor desde el otro lado de la mesa.
        <button type="button" className="role-card role-card--word" onClick={() => setShown(false)}>
            <span className="role-card__impostor">
                <HatIcon size={36} />
                <span>Eres el impostor</span>
            </span>
            <span className="role-card__info">
                {category && (
                    <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span className="role-card__label">Categoría</span>
                        <span style={{ fontSize: 20, fontWeight: 800 }}>{category}</span>
                    </span>
                )}
                {category && hint && <hr />}
                {hint && (
                    <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span className="role-card__label">Tu pista</span>
                        <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>{hint}</span>
                    </span>
                )}
                {!category && !hint && (
                    <span className="soft" style={{ textAlign: "center" }}>No tienes pista ni categoría. ¡A improvisar!</span>
                )}
            </span>
            <span className="role-card__hint">Toca para ocultar</span>
        </button>
    ) : (
        <button type="button" className="role-card role-card--word" onClick={() => setShown(false)}>
            <span className="tiny" style={{ fontWeight: 700, letterSpacing: "0.12em", color: "var(--card-ink-soft)" }}>NO ERES EL IMPOSTOR</span>
            <span style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
                <span className="small" style={{ color: "var(--card-ink-soft)" }}>Tu palabra</span>
                <span className="role-card__word">{word}</span>
            </span>
            <span className="role-card__hint">Toca para ocultar</span>
        </button>
    )

    return (
        <Table>
            <TopBar
                left={<ExitButton onClick={() => setExitOpen(true)} label="Salir de la partida" />}
                center={<CodePill code={roomCode} />}
                right={playerCount ? <span className="muted small">{playerCount} jugadores</span> : null}
            />

            {starterName && (
                <p className="chip" style={{ alignSelf: "center" }}>
                    <span className="muted">Empieza a hablar</span> <strong>{starterName}</strong>
                </p>
            )}

            <div className="grow center">{card}</div>

            <p className="soft" style={{ fontSize: 14, lineHeight: 1.5, textAlign: "center" }}>
                {isImpostor
                    ? "No sabes la palabra. Escucha a los demás e intenta que no te descubran."
                    : "Debatid por turnos. Intenta descubrir quién es el impostor sin decir la palabra."}
            </p>

            {isHost && (
                <button type="button" className="btn" onClick={onEndGame}>Terminar partida</button>
            )}

            {exitOpen && (
                <GameExitSheet
                    roomCode={roomCode}
                    isHost={isHost}
                    nextHostName={nextHostName}
                    supportsLateJoin={false}
                    onLeave={onLeave}
                    onEndGame={onEndGame}
                    onClose={() => setExitOpen(false)}
                />
            )}
        </Table>
    )
}
