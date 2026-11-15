import { WaitingScreen, ExitButton } from './ui'

// Lo que ven los invitados mientras el anfitrión elige las reglas (común a
// todos los juegos; antes había una copia por juego).
export default function WaitingForSettings({ roomName, roomCode, hostName, users, myId, hostId, gameId, onLeave }) {
    return (
        <WaitingScreen
            topLeft={<ExitButton onClick={onLeave} label="Salir" withText />}
            code={roomCode}
            title={<>{hostName} está preparando<br />la partida</>}
            text={gameId === "cah"
                ? "En cuanto elija los puntos para ganar, se reparten las cartas."
                : "En cuanto elija las reglas, se reparten los papeles."}
            footer={
                <div className="stack-sm" style={{ gap: 10 }}>
                    <span className="eyebrow" style={{ textAlign: "center", color: "var(--muted)" }}>{roomName ? `En la mesa · ${roomName}` : "En la mesa"}</span>
                    <div className="chips">
                        {users.map(u => (
                            <span
                                key={u.id}
                                className={`chip ${u.id === myId ? "chip--me" : u.id === hostId ? "chip--brass" : ""}`}
                            >
                                {u.id === myId ? "Tú" : (u.name || "Anónimo")}
                            </span>
                        ))}
                    </div>
                </div>
            }
        />
    )
}
