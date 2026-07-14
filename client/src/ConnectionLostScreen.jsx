import './styles/ConnectionLostScreen.css'

const MESSAGES = {
    roomNotFound: "La sala ya no existe.",
    removedFromRoom: "Estuviste desconectado demasiado tiempo y la partida continuó sin ti.",
    connectionLost: "No se pudo restablecer la conexión con el servidor."
}

export default function ConnectionLostScreen({ reason, onReload }) {
    const message = MESSAGES[reason] || MESSAGES.connectionLost

    return (
        <div className="connection-lost-container">
            <div className="connection-lost-card">
                <h1 className="connection-lost-title">Se perdió la conexión</h1>
                <p className="connection-lost-message">{message}</p>
                <button className="connection-lost-button" onClick={onReload}>
                    Recargar página
                </button>
            </div>
        </div>
    )
}
