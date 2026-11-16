import { useState } from 'react'
import { Table, Spade } from './ui'
import { getGameConfig } from './gameConfig'

export default function UserNameInput({ initialName = "", invite = null, onNameSubmit }) {
    const [name, setName] = useState(initialName)

    const handleSubmit = (e) => {
        e.preventDefault()
        if (name.trim()) {
            onNameSubmit(name.trim())
        }
    }

    return (
        <Table>
            <form className="grow" onSubmit={handleSubmit} style={{ gap: 24 }}>
                <div className="grow center stack">
                    <Spade className="logo logo--lg" />
                    <h1 className="title-xl">Lounge</h1>
                    {invite && (
                        <p className="notice notice--brass invite-banner">
                            Te han invitado a <strong>«{invite.name}»</strong>
                            <span className="muted small">{getGameConfig(invite.game)?.name || ""}</span>
                        </p>
                    )}
                </div>

                <div className="grow stack" style={{ justifyContent: "center", gap: 14 }}>
                    <label htmlFor="player-name" className="title-sm" style={{ textAlign: "center" }}>
                        ¿Cómo te llamas?
                    </label>
                    <input
                        id="player-name"
                        className="field field--center"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={20}
                        autoComplete="nickname"
                        autoFocus
                        required
                    />
                    <p className="muted small" style={{ textAlign: "center" }}>Así te verán los demás en la sala</p>
                </div>

                <div className="grow" style={{ justifyContent: "flex-end" }}>
                    <button className="btn btn--primary" type="submit" disabled={!name.trim()}>
                        {invite ? "Entrar en la sala" : "Continuar"}
                    </button>
                </div>
            </form>
        </Table>
    )
}
