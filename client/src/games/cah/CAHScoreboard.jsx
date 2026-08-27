import '../../styles/CAHScoreboard.css'

// onKick es opcional: solo se pasa en el marcador de la pantalla de recuento,
// que es el punto entre rondas donde expulsar no interrumpe nada a medias.
export default function CAHScoreboard({ scores, myId, czarName, onKick }) {
    if (!scores || scores.length === 0) return null

    const confirmKick = (player, ban) => {
        const message = ban
            ? `¿Expulsar a ${player.name} y bloquear su entrada a esta sala?`
            : `¿Expulsar a ${player.name}? Podrá volver a entrar con el código.`
        if (window.confirm(message)) {
            onKick(player.userId, ban)
        }
    }

    return (
        <div className="cah-scoreboard">
            <h2 className="cah-scoreboard-title">Puntuación</h2>
            <div className="cah-scoreboard-list">
                {scores.map(s => (
                    <p
                        key={s.userId}
                        className={`cah-scoreboard-item ${s.userId === myId ? 'is-me' : ''}`}
                    >
                        <span className="cah-scoreboard-name">
                            {s.name}
                            {s.userId === myId && ' (Tú)'}
                            {czarName === s.name && ' 👑'}
                        </span>

                        <span className="cah-scoreboard-right">
                            <span className="cah-scoreboard-score">{s.score}</span>

                            {onKick && s.userId !== myId && (
                                <>
                                    <button
                                        type="button"
                                        className="cah-kick-button"
                                        title={`Expulsar a ${s.name} (podrá volver)`}
                                        aria-label={`Expulsar a ${s.name}`}
                                        onClick={() => confirmKick(s, false)}
                                    >
                                        ✕
                                    </button>
                                    <button
                                        type="button"
                                        className="cah-kick-button is-ban"
                                        title={`Expulsar a ${s.name} y bloquear su entrada`}
                                        aria-label={`Expulsar y bloquear a ${s.name}`}
                                        onClick={() => confirmKick(s, true)}
                                    >
                                        ⛔
                                    </button>
                                </>
                            )}
                        </span>
                    </p>
                ))}
            </div>
        </div>
    )
}
