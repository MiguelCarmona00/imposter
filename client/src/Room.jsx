import { useState } from 'react'
import { getGameConfig } from './gameConfig'
import { Table, TopBar, ExitButton, CopyIcon, CrownIcon, DotsIcon, Dots } from './ui'
import { useCopy } from './useCopy'

export default function Room({ roomName, roomCode, users, mySocketId, isHost, hostId, selectedGame, onLeaveRoom, onStartGame, onKickPlayer, onTransferHost, settingsError, usingSlowTransport }) {
    const [openMenu, setOpenMenu] = useState(null)
    const [copied, copy] = useCopy(roomCode)

    const game = getGameConfig(selectedGame)
    const minPlayers = game?.minPlayers ?? 1
    const maxPlayers = game?.maxPlayers ?? 20
    const canStartGame = isHost && users.length >= minPlayers
    const hostName = users.find(u => u.id === hostId)?.name || "el anfitrión"

    const kick = (user, ban) => {
        setOpenMenu(null)
        onKickPlayer(user.id, ban)
    }

    const transfer = (user) => {
        setOpenMenu(null)
        onTransferHost(user.id)
    }

    return (
        <Table variant="wide">
            <TopBar left={<ExitButton onClick={onLeaveRoom} label="Salir" withText />} />

            <div className="room-layout">
            <div className="room-layout__code center stack" style={{ display: "flex", gap: 10 }}>
                {game && <span className="eyebrow">{game.name}</span>}
                {roomName && <h1 className="title-sm" style={{ overflowWrap: "anywhere" }}>{roomName}</h1>}
                <p className="muted" style={{ fontSize: 14 }}>
                    {isHost ? "Comparte el nombre y este código con tus amigos" : "Estás en la sala"}
                </p>
                <p className="big-code" aria-label={`Código de sala ${roomCode.split("").join(" ")}`}>{roomCode}</p>
                {isHost ? (
                    <button type="button" className="btn btn--pill" onClick={copy}>
                        <CopyIcon /> {copied ? "¡Copiado!" : "Copiar código"}
                    </button>
                ) : (
                    <p className="muted small">¿Falta alguien? Pásale el nombre y el código</p>
                )}
            </div>

            <section className="room-layout__players">
            <div className="spread">
                <h2 className="section-title">Jugadores <span>· {users.length} de {maxPlayers}</span></h2>
                {isHost && users.length > 1 && <span className="muted tiny">Toca ⋯ para más opciones</span>}
            </div>

            <ul className="player-list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {users.map(user => {
                    const isMe = user.id === mySocketId
                    const isRoomHost = user.id === hostId
                    const open = openMenu === user.id
                    const name = user.name || "Anónimo"
                    const tag = isMe
                        ? (isRoomHost ? "Tú · anfitrión" : "Tú")
                        : (isRoomHost ? "Anfitrión" : "En la sala")
                    return (
                        <li key={user.id} className={`player-row ${isMe ? "player-row--me" : ""} ${isRoomHost && !isMe ? "player-row--host" : ""}`}>
                            <div className="player-row__main">
                                <span className={`avatar ${isRoomHost ? "avatar--host" : ""}`} aria-hidden="true">{name.charAt(0)}</span>
                                <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                                    <span className="player-row__name">{name}</span>
                                    <span className={`player-row__tag ${isRoomHost ? "player-row__tag--brass" : ""}`}>{tag}</span>
                                </span>
                                {isRoomHost && !isHost && <span className="brass"><CrownIcon size={20} /></span>}
                                {isHost && !isMe && (
                                    <button
                                        type="button"
                                        className="icon-btn"
                                        aria-label={`Opciones para ${name}`}
                                        aria-expanded={open}
                                        onClick={() => setOpenMenu(open ? null : user.id)}
                                    >
                                        <DotsIcon />
                                    </button>
                                )}
                            </div>
                            {open && (
                                <>
                                    {onTransferHost && (
                                        <button type="button" className="btn btn--sm btn--brass-outline" onClick={() => transfer(user)}>
                                            <CrownIcon /> Hacer anfitrión
                                        </button>
                                    )}
                                    <div className="player-row__actions">
                                        <button type="button" className="btn btn--sm" onClick={() => kick(user, false)}>Expulsar</button>
                                        <button type="button" className="btn btn--sm btn--danger" onClick={() => kick(user, true)}>Expulsar y vetar</button>
                                    </div>
                                    <p className="muted tiny" style={{ lineHeight: 1.4 }}>
                                        Si lo haces anfitrión, dejarás de serlo tú. Si lo expulsas puede volver con el código; si lo vetas, no podrá entrar en esta sala.
                                    </p>
                                </>
                            )}
                        </li>
                    )
                })}
            </ul>
            </section>

            <div className="room-layout__actions stack-sm" style={{ gap: 12 }}>
            {usingSlowTransport && (
                <p className="notice small">
                    Tu conexión va por un modo más lento y puede que sufras cortes durante la partida.
                    Si pasa, prueba con otro navegador, desactiva el ahorro de datos o la VPN.
                </p>
            )}
            {settingsError && <p className="notice notice--error" role="alert">{settingsError}</p>}

            <div className="stack-sm">
                {isHost ? (
                    <>
                        <button type="button" className="btn btn--primary" onClick={onStartGame} disabled={!canStartGame}>
                            Empezar partida
                        </button>
                        <p className="muted tiny" style={{ textAlign: "center" }}>
                            {canStartGame
                                ? "Después eliges las reglas de la partida"
                                : `Hacen falta al menos ${minPlayers} jugadores (faltan ${minPlayers - users.length})`}
                        </p>
                    </>
                ) : (
                    <>
                        <div className="notice" role="status" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, borderStyle: "dashed", padding: 16 }}>
                            <Dots />
                            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Esperando a que {hostName} empiece</span>
                        </div>
                        <button type="button" className="btn" onClick={onLeaveRoom}>Salir de la sala</button>
                    </>
                )}
            </div>
            </div>
            </div>
        </Table>
    )
}
