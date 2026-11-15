import { useState } from 'react'
import { getGameConfig } from './gameConfig'
import { Table, TopBar, BackButton } from './ui'

// Crear o unirse. Para crear hace falta nombre de sala; para unirse, el
// nombre y el código de 4 letras (los dos los da quien creó la sala).
export default function RoomSelection({ gameId, notice, error, onCreateRoom, onJoinRoom, onBack }) {
    const [mode, setMode] = useState("create")
    const [name, setName] = useState("")
    const [code, setCode] = useState("")
    const game = getGameConfig(gameId)

    const trimmed = name.trim()
    const canSubmit = mode === "create" ? trimmed.length > 0 : trimmed.length > 0 && code.length === 4

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!canSubmit) return
        if (mode === "create") onCreateRoom(trimmed)
        else onJoinRoom(trimmed, code)
    }

    return (
        <Table>
            <TopBar left={<BackButton onClick={onBack} label="Elegir otro juego" />} />

            <div className="center stack" style={{ display: "flex", gap: 8, marginTop: 16 }}>
                {game && <span className="eyebrow">{game.name}</span>}
                <h1 className="title">¿Montas la mesa<br />o te sientas?</h1>
            </div>

            {notice && <p className="notice notice--error" role="alert">{notice}</p>}

            <div className="segmented segmented--lg" role="group" aria-label="Crear o unirse">
                <button type="button" aria-pressed={mode === "create"} onClick={() => setMode("create")}>Crear sala</button>
                <button type="button" aria-pressed={mode === "join"} onClick={() => setMode("join")}>Unirse</button>
            </div>

            <form className="grow stack" style={{ gap: 14 }} onSubmit={handleSubmit} key={mode}>
                <div className="stack-sm">
                    <label htmlFor="room-name" className="section-title">Nombre de la sala</label>
                    <input
                        id="room-name"
                        className="field"
                        type="text"
                        autoComplete="off"
                        maxLength={30}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                {mode === "join" && (
                    <div className="stack-sm">
                        <label htmlFor="room-code" className="section-title">Código</label>
                        <input
                            id="room-code"
                            className="field field--code"
                            type="text"
                            inputMode="text"
                            autoCapitalize="characters"
                            autoComplete="off"
                            maxLength={4}
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4))}
                        />
                    </div>
                )}

                <p className="muted small">
                    {mode === "create"
                        ? "Después pásales a tus amigos el nombre y el código de la sala."
                        : "No importan las mayúsculas en el nombre."}
                </p>

                {error && <p className="notice notice--error" role="alert">{error}</p>}

                <button type="submit" className="btn btn--primary" style={{ marginTop: "auto" }} disabled={!canSubmit}>
                    {mode === "create" ? "Crear sala" : "Unirse"}
                </button>
            </form>
        </Table>
    )
}
