import { Table, TopBar, ExitButton, CodePill, Spade } from '../../ui'

const REASON_MESSAGES = {
    hostEnded: 'El anfitrión terminó la partida.',
    insufficientPlayers: 'La partida terminó porque no quedaban suficientes jugadores.',
    deckExhausted: 'Se acabaron las cartas del mazo.'
}

export default function CAHGameEnd({ cahState, roomCode, isHost, hostName, myId, onRestart, onBackToRoom, onLeave }) {
    const finalScores = [...(cahState?.finalScores || [])].sort((a, b) => b.score - a.score)
    const winnerName = cahState?.winnerName
    const iWon = cahState?.winnerUserId && cahState.winnerUserId === myId
    const reasonMessage = cahState?.endReason ? REASON_MESSAGES[cahState.endReason] : null
    const topScore = finalScores[0]?.score

    return (
        <Table variant="glow">
            <TopBar left={<ExitButton onClick={onLeave} label="Salir al menú" />} center={<CodePill code={roomCode} />} />

            <div className="center stack" style={{ display: "flex", gap: 8 }}>
                <Spade />
                <span className="eyebrow">Fin de la partida</span>
                <h1 className="title" style={{ fontSize: 32 }}>
                    {iWon ? "¡Has ganado!" : winnerName ? `¡${winnerName} gana!` : "Partida terminada"}
                </h1>
                {topScore != null && winnerName && <p className="muted" style={{ fontSize: 14 }}>{topScore} puntos</p>}
                {reasonMessage && <p className="muted small">{reasonMessage}</p>}
            </div>

            {finalScores.length > 0 && (
                <ol className="ranking">
                    {finalScores.map((s, i) => (
                        <li key={s.userId} className={`${i === 0 && s.score > 0 ? "is-first" : ""} ${s.userId === myId ? "is-me" : ""}`}>
                            <span className="ranking__pos">{i + 1}</span>
                            <span className="ranking__name">{s.userId === myId ? "Tú" : s.name}</span>
                            <span className="ranking__pts">{s.score}</span>
                        </li>
                    ))}
                </ol>
            )}

            <div className="stack-sm" style={{ marginTop: "auto", gap: 10 }}>
                {isHost ? (
                    <>
                        <button type="button" className="btn btn--primary" onClick={onRestart}>Otra partida</button>
                        <button type="button" className="btn" onClick={onBackToRoom}>Volver a la sala</button>
                    </>
                ) : (
                    <p className="notice" role="status" style={{ textAlign: "center" }}>
                        Esperando a que {hostName} decida qué hacer…
                    </p>
                )}
            </div>
        </Table>
    )
}
