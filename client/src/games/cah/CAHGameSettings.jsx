import { useState } from 'react'
import '../../styles/CAHGameSettings.css'

export default function CAHGameSettings({ minPointsToWin, maxPointsToWin, suggestedPointsToWin, error, onSubmit }) {
    const [pointsToWin, setPointsToWin] = useState(suggestedPointsToWin || minPointsToWin || 7)

    const handleSubmit = (e) => {
        e.preventDefault()
        onSubmit({ pointsToWin })
    }

    return (
        <div className="cah-settings-container">
            <h1 className="cah-settings-title">Configuración de Cartas Contra la Humanidad</h1>
            <form className="cah-settings-form" onSubmit={handleSubmit}>
                <div className="cah-form-field">
                    <label htmlFor="pointsToWin" className="cah-form-label">
                        Puntos para ganar:
                    </label>
                    <input
                        type="number"
                        id="pointsToWin"
                        className="cah-form-input"
                        min={minPointsToWin}
                        max={maxPointsToWin}
                        value={pointsToWin}
                        onChange={(e) => setPointsToWin(parseInt(e.target.value, 10))}
                        required
                    />
                    <small className="cah-form-help-text">
                        Entre {minPointsToWin} y {maxPointsToWin} (sugerido: {suggestedPointsToWin})
                    </small>
                </div>

                {error && (
                    <p className="cah-form-error">{error}</p>
                )}

                <button type="submit" className="cah-start-button">
                    Comenzar Partida
                </button>
            </form>
        </div>
    )
}
