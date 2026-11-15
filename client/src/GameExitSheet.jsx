import { Sheet } from './ui'

// Hoja de "salir" durante la partida. Siempre hay una salida (antes, entrar en
// partida era un punto sin retorno). Al anfitrión se le avisa de quién hereda
// el papel (el servidor lo pasa al primer jugador que queda: reassignHostIfNeeded)
// y se le ofrece además terminar la partida para todos.
export default function GameExitSheet({ roomCode, isHost, nextHostName, supportsLateJoin, onLeave, onEndGame, onClose }) {
    return (
        <Sheet title="¿Salir de la partida?" onClose={onClose}>
            <p className="sheet__text">
                Tu sitio en la mesa queda libre.{" "}
                {supportsLateJoin
                    ? <>Si vuelves con el código <strong>{roomCode}</strong>, entrarás en la siguiente ronda.</>
                    : <>Podrás volver con el código <strong>{roomCode}</strong> cuando acabe esta partida.</>}
                {isHost && nextHostName && <> {nextHostName} pasará a ser el anfitrión.</>}
            </p>
            <button type="button" className="btn btn--primary" onClick={onClose} autoFocus>Seguir jugando</button>
            {isHost && onEndGame && (
                <button type="button" className="btn" onClick={() => { onClose(); onEndGame() }}>
                    Terminar la partida para todos
                </button>
            )}
            <button type="button" className="btn" onClick={onLeave}>Salir al menú</button>
        </Sheet>
    )
}
