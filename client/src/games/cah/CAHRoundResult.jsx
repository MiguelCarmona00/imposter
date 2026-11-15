import CAHScoreboard from './CAHScoreboard'

export default function CAHRoundResult({ result, myId, isHost, hostName, pointsToWin, onNextRound, onKickPlayer, onTransferHost }) {
    if (!result) return null
    const iWon = result.winnerUserId ? result.winnerUserId === myId : false

    return (
        <div className="play-layout">
            <div className="play-board">
            <div className="center stack" style={{ display: "flex", gap: 4 }}>
                <span className="eyebrow">+1 punto</span>
                <h1 className="title">{iWon ? "¡Ganas la ronda!" : `${result.winnerName} gana la ronda`}</h1>
            </div>

            <div className="combo">
                <div className="black-card">
                    <p className="black-card__text" style={{ fontSize: 16 }}>{result.blackCard?.text}</p>
                </div>
                {(result.winningCards || []).map((c, i) => (
                    <div key={i} className="combo__white">{c.text}</div>
                ))}
            </div>
            </div>

            <div className="play-hand">
            <CAHScoreboard scores={result.scores} myId={myId} pointsToWin={pointsToWin} onKick={isHost ? onKickPlayer : undefined} onTransferHost={isHost ? onTransferHost : undefined} />

            <div className="sticky-actions">
                {isHost ? (
                    <button type="button" className="btn btn--primary" style={{ width: "100%" }} onClick={onNextRound}>
                        Siguiente ronda
                    </button>
                ) : (
                    <p className="notice" role="status" style={{ textAlign: "center" }}>
                        Esperando a que {hostName} pase a la siguiente ronda…
                    </p>
                )}
            </div>
            </div>
        </div>
    )
}
