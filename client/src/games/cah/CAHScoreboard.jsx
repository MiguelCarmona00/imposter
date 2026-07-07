import '../../styles/CAHScoreboard.css'

export default function CAHScoreboard({ scores, myId, czarName }) {
    if (!scores || scores.length === 0) return null

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
                        <span className="cah-scoreboard-score">{s.score}</span>
                    </p>
                ))}
            </div>
        </div>
    )
}
