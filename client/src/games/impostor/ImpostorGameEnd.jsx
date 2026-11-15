import { Table, TopBar, ExitButton, CodePill, Spade } from '../../ui'

export default function ImpostorGameEnd({ roomCode, isHost, hostName, onRestart, onBackToRoom, onLeave }) {
    return (
        <Table>
            <TopBar left={<ExitButton onClick={onLeave} label="Salir al menú" />} center={<CodePill code={roomCode} />} />

            <div className="grow center stack" style={{ gap: 12 }}>
                <Spade className="logo logo--md" alt="" />
                <span className="eyebrow">El Impostor</span>
                <h1 className="title" style={{ fontSize: 32 }}>Partida terminada</h1>
                {isHost && <p className="muted" style={{ fontSize: 15 }}>¿Otra ronda con los mismos ajustes?</p>}
            </div>

            <div className="stack-sm" style={{ gap: 10 }}>
                {isHost ? (
                    <>
                        <button type="button" className="btn btn--primary" onClick={onRestart}>Otra partida</button>
                        <button type="button" className="btn" onClick={onBackToRoom}>Volver a la sala</button>
                    </>
                ) : (
                    <p className="notice" role="status" style={{ textAlign: "center" }}>
                        Esperando a que {hostName} decida qué hacer…
                    </p>
                )}
            </div>
        </Table>
    )
}
