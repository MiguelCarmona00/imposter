import '../../styles/CAHWaitingForNextRound.css'

// Pantalla de quien se une con la partida ya empezada: está dentro de la sala,
// pero todavía no juega. Entra automáticamente cuando el anfitrión pase de
// ronda (el servidor lo absorbe entonces — ver absorbPendingJoins).
export default function CAHWaitingForNextRound({ roomName, roomCode }) {
    return (
        <div className="cah-latejoin-container">
            <h1 className="cah-latejoin-title">🃏 Ya casi</h1>

            <p className="cah-latejoin-message">
                La partida está en marcha. Entrarás automáticamente
                en cuanto el anfitrión pase a la siguiente ronda.
            </p>

            {(roomName || roomCode) && (
                <div className="cah-latejoin-room">
                    {roomName && <span className="cah-latejoin-room-name">{roomName}</span>}
                    {roomCode && <span className="cah-latejoin-room-code">{roomCode}</span>}
                </div>
            )}

            <div className="cah-latejoin-dots" aria-hidden="true">
                <span />
                <span />
                <span />
            </div>

            <p className="cah-latejoin-hint">
                No cierres esta pantalla — se te repartirá una mano nueva al entrar.
            </p>
        </div>
    )
}
