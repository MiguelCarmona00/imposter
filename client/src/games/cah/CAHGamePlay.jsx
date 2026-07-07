import CAHBlackCard from './CAHBlackCard'
import CAHScoreboard from './CAHScoreboard'
import CAHHand from './CAHHand'
import CAHSubmissionsReveal from './CAHSubmissionsReveal'
import CAHRoundResult from './CAHRoundResult'
import '../../styles/CAHGamePlay.css'

export default function CAHGamePlay({ cahState, isHost, myId, onSubmitCards, onDiscardCards, onCzarPick, onNextRound, onEndGame }) {
    if (!cahState) return null

    const {
        phase, round, isCzar, czarName, blackCard, hand, scores, pointsToWin,
        notice, submittedCount, totalNeeded, revealSubmissions, roundResult,
        hasSubmitted, hasDiscarded, cahError
    } = cahState

    return (
        <div className="cah-gameplay-container">
            <div className="cah-gameplay-header">
                <h1 className="cah-gameplay-title">Ronda {round} · Meta: {pointsToWin} puntos</h1>
                {notice && <p className="cah-notice">ℹ️ {notice}</p>}
                {cahError && <p className="cah-error">⚠️ {cahError}</p>}
            </div>

            <div className="cah-gameplay-body">
                <div className="cah-gameplay-main">
                    <CAHBlackCard card={blackCard} />

                    {phase === "submitting" && (
                        isCzar ? (
                            <p className="cah-czar-badge">
                                👑 Eres el Card Czar de esta ronda. Esperando cartas ({submittedCount ?? 0}/{totalNeeded ?? 0})...
                            </p>
                        ) : (
                            <>
                                <CAHHand
                                    hand={hand}
                                    pick={blackCard?.pick || 1}
                                    hasSubmitted={hasSubmitted}
                                    hasDiscarded={hasDiscarded}
                                    onSubmit={onSubmitCards}
                                    onDiscard={onDiscardCards}
                                />
                                <p className="cah-progress-text">
                                    {submittedCount ?? 0}/{totalNeeded ?? 0} jugadores ya enviaron sus cartas
                                </p>
                            </>
                        )
                    )}

                    {phase === "revealing" && (
                        <CAHSubmissionsReveal
                            submissions={revealSubmissions || []}
                            isCzar={isCzar}
                            onCzarPick={onCzarPick}
                        />
                    )}

                    {phase === "result" && (
                        <CAHRoundResult
                            result={roundResult}
                            myId={myId}
                            isHost={isHost}
                            onNextRound={onNextRound}
                        />
                    )}
                </div>

                <CAHScoreboard scores={scores} myId={myId} czarName={czarName} />
            </div>

            {isHost && (
                <button onClick={onEndGame} className="end-game-button">
                    Terminar Partida
                </button>
            )}
        </div>
    )
}
