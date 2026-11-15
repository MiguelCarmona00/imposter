import { Table, Spade } from './ui'

const MESSAGES = {
    roomNotFound: "La sala ya no existe.",
    removedFromRoom: "Estuviste desconectado demasiado tiempo y la partida continuó sin ti.",
    connectionLost: "No se pudo restablecer la conexión con el servidor."
}

export default function ConnectionLostScreen({ reason, onReload }) {
    const message = MESSAGES[reason] || MESSAGES.connectionLost

    return (
        <Table>
            <div className="grow center stack" style={{ gap: 16 }} role="alert">
                <Spade />
                <h1 className="title-sm" style={{ fontSize: 26 }}>Se perdió la conexión</h1>
                <p className="soft" style={{ maxWidth: 300 }}>{message}</p>
            </div>
            <button className="btn btn--primary" onClick={onReload}>Volver a empezar</button>
        </Table>
    )
}
