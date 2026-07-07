import CAHScoreboard from './CAHScoreboard'
import '../../styles/CAHRoundResult.css'

export default function CAHRoundResult({ result, myId, isHost, onNextRound }) {
    if (!result) return null

    return (
        <div className="cah-result-container">
            <h2 className="cah-result-title">🏆 Ganó {result.winnerName}</h2>
            <div className="cah-result-combo">
                <p className="cah-result-black-text">{result.blackCard?.text}</p>
                {result.winningCards.map((c, i) => (
                    <p key={i} className="cah-result-white-text">{c.text}</p>
                ))}
            </div>

            <CAHScoreboard scores={result.scores} myId={myId} />

            {isHost ? (
                <button className="cah-next-round-button" onClick={onNextRound}>
                    Siguiente Ronda ▶
                </button>
            ) : (
                <p className="cah-waiting-message">
                    Esperando a que el anfitrión pase a la siguiente ronda...
                </p>
            )}
        </div>
    )
}
