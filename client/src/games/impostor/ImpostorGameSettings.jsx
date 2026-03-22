import { useState } from 'react'
import '../../styles/ImpostorGameSettings.css'

export default function ImpostorGameSettings({ maxImpostors, onSubmit }) {
    const [impostorCount, setImpostorCount] = useState(1)
    const [showHint, setShowHint] = useState(true)
    const [showCategory, setShowCategory] = useState(true)

    const handleSubmit = (e) => {
        e.preventDefault()
        onSubmit({ impostorCount, showHint, showCategory })
    }

    return (
        <div className="impostor-settings-container">
            <h1 className="impostor-settings-title">Configuración del Juego</h1>
            <form className="settings-form" onSubmit={handleSubmit}>
                <div className="form-field">
                    <label htmlFor="impostorCount" className="form-label">
                        Cantidad de impostores:
                    </label>
                    <input 
                        type="number" 
                        id="impostorCount"
                        className="form-input"
                        min="1"
                        max={maxImpostors}
                        value={impostorCount}
                        onChange={(e) => setImpostorCount(parseInt(e.target.value))}
                        required
                    />
                    <small className="form-help-text">
                        Máximo: {maxImpostors} (debe haber al menos un jugador normal)
                    </small>
                </div>

                <div className="checkbox-field">
                    <label className="checkbox-label">
                        <input 
                            type="checkbox"
                            className="checkbox-input"
                            checked={showHint}
                            onChange={(e) => setShowHint(e.target.checked)}
                        />
                        <span>Mostrar pista al impostor</span>
                    </label>
                </div>

                <div className="checkbox-field">
                    <label className="checkbox-label">
                        <input 
                            type="checkbox"
                            className="checkbox-input"
                            checked={showCategory}
                            onChange={(e) => setShowCategory(e.target.checked)}
                        />
                        <span>Mostrar categoría al impostor</span>
                    </label>
                </div>

                <button 
                    type="submit"
                    className="start-button"
                >
                    Comenzar Partida
                </button>
            </form>
        </div>
    )
}
