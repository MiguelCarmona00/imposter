import CAHScoreboard from './CAHScoreboard'
import '../../styles/CAHGameEnd.css'

const REASON_MESSAGES = {
    hostEnded: 'El anfitrión terminó la partida.',
    insufficientPlayers: 'La partida terminó porque no quedaban suficientes jugadores.',
    deckExhausted: 'Se acabaron las cartas del mazo.'
}

export default function CAHGameEnd({ cahState, isHost, myId, onRestart, onBackToRoom }) {
    const finalScores = cahState?.finalScores || []
    const winnerName = cahState?.winnerName
    const reasonMessage = cahState?.endReason ? REASON_MESSAGES[cahState.endReason] : null

    return (
        <div className="cah-end-container">
            <h1 className="cah-end-title">
                {winnerName ? `🏆 ¡${winnerName} gana la partida!` : '🎮 Partida Terminada'}
            </h1>
            {reasonMessage && <p className="cah-end-reason">{reasonMessage}</p>}

            <CAHScoreboard scores={finalScores} myId={myId} />

            {isHost ? (
                <div className="cah-end-buttons">
                    <button onClick={onRestart} className="cah-end-button cah-restart-button">
                        🔄 Nueva Partida (Mismos Ajustes)
                    </button>
                    <button onClick={onBackToRoom} className="cah-end-button cah-back-button">
                        🏠 Volver a la Sala
                    </button>
                </div>
            ) : (
                <p className="cah-waiting-message">
                    Esperando a que el anfitrión decida qué hacer...
                </p>
            )}
        </div>
    )
}
