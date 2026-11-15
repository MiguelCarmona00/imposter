import { useState } from 'react'
import { Table, TopBar, CodePill, Stepper, Switch, BackButton } from '../../ui'

export default function ImpostorGameSettings({ roomCode, playerCount, maxImpostors, error, onSubmit, onCancel }) {
    const max = Math.max(1, maxImpostors || 1)
    const [impostorCount, setImpostorCount] = useState(1)
    const [showHint, setShowHint] = useState(true)
    const [showCategory, setShowCategory] = useState(true)

    return (
        <Table>
            <TopBar left={<BackButton onClick={onCancel} label="Volver a la sala" />} center={<CodePill code={roomCode} />} />

            <div className="center stack" style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <span className="eyebrow">El Impostor</span>
                <h1 className="title">Prepara la partida</h1>
                {playerCount ? <p className="muted" style={{ fontSize: 14 }}>{playerCount} jugadores en la mesa</p> : null}
            </div>

            <div className="grow stack" style={{ justifyContent: "center", gap: 14 }}>
                <div className="panel center stack" style={{ display: "flex", gap: 14 }}>
                    <span id="impostor-count-label" style={{ fontSize: 16, fontWeight: 700 }}>Impostores</span>
                    <Stepper
                        value={Math.min(impostorCount, max)}
                        min={1}
                        max={max}
                        onChange={setImpostorCount}
                        labelId="impostor-count-label"
                        decLabel="Menos impostores"
                        incLabel="Más impostores"
                    />
                    <span className="muted small">Máximo {max} · siempre queda al menos un jugador normal</span>
                </div>

                <div className="panel" style={{ padding: "6px 18px" }}>
                    <div className="switch-row">
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                            <span id="hint-label" style={{ fontSize: 15, fontWeight: 700 }}>Dar una pista al impostor</span>
                            <span className="muted tiny">Una frase que se acerca a la palabra</span>
                        </div>
                        <Switch checked={showHint} onChange={setShowHint} labelId="hint-label" />
                    </div>
                    <div className="switch-row">
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                            <span id="category-label" style={{ fontSize: 15, fontWeight: 700 }}>Decirle la categoría</span>
                            <span className="muted tiny">Por ejemplo “Animal” o “Comida”</span>
                        </div>
                        <Switch checked={showCategory} onChange={setShowCategory} labelId="category-label" />
                    </div>
                </div>
                {error && <p className="notice notice--error" role="alert">{error}</p>}
            </div>

            <button
                type="button"
                className="btn btn--primary"
                onClick={() => onSubmit({ impostorCount: Math.min(impostorCount, max), showHint, showCategory })}
            >
                Repartir papeles
            </button>
        </Table>
    )
}
