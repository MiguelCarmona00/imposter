import { useState } from 'react'
import { Table, TopBar, CodePill, Stepper, BackButton } from '../../ui'

export default function CAHGameSettings({ roomCode, playerCount, minPointsToWin = 3, maxPointsToWin = 15, suggestedPointsToWin = 7, error, onSubmit, onCancel }) {
    const [pointsToWin, setPointsToWin] = useState(suggestedPointsToWin || minPointsToWin)

    return (
        <Table>
            <TopBar left={<BackButton onClick={onCancel} label="Volver a la sala" />} center={<CodePill code={roomCode} />} />

            <div className="center stack" style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <span className="eyebrow">Cartas Contra la Humanidad</span>
                <h1 className="title">Prepara la partida</h1>
                {playerCount ? <p className="muted" style={{ fontSize: 14 }}>{playerCount} jugadores en la mesa</p> : null}
            </div>

            <div className="grow stack" style={{ justifyContent: "center", gap: 16 }}>
                <div className="panel center stack" style={{ display: "flex", gap: 16 }}>
                    <span id="points-label" style={{ fontSize: 16, fontWeight: 700 }}>Puntos para ganar</span>
                    <Stepper
                        value={pointsToWin}
                        min={minPointsToWin}
                        max={maxPointsToWin}
                        onChange={setPointsToWin}
                        labelId="points-label"
                        decLabel="Menos puntos"
                        incLabel="Más puntos"
                    />
                    <span className="muted small">Entre {minPointsToWin} y {maxPointsToWin} · recomendado {suggestedPointsToWin}</span>
                </div>
                <p className="muted small" style={{ textAlign: "center", lineHeight: 1.5 }}>
                    Gana quien consiga antes esos puntos. Cada ronda, el juez da 1 punto a la respuesta que más le guste.
                </p>
                {error && <p className="notice notice--error" role="alert">{error}</p>}
            </div>

            <button type="button" className="btn btn--primary" onClick={() => onSubmit({ pointsToWin })}>
                Repartir cartas
            </button>
        </Table>
    )
}
