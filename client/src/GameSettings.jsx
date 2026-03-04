import { useState } from 'react'

export default function GameSettings({ maxImpostors, onSubmit }) {
    const [impostorCount, setImpostorCount] = useState(1)
    const [showHint, setShowHint] = useState(true)
    const [showCategory, setShowCategory] = useState(true)

    const handleSubmit = (e) => {
        e.preventDefault()
        onSubmit({ impostorCount, showHint, showCategory })
    }

    return (
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <h1>Configuración del Juego</h1>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <label htmlFor="impostorCount" style={{ display: 'block', marginBottom: '0.5rem' }}>
                        Cantidad de impostores:
                    </label>
                    <input 
                        type="number" 
                        id="impostorCount"
                        min="1"
                        max={maxImpostors}
                        value={impostorCount}
                        onChange={(e) => setImpostorCount(parseInt(e.target.value))}
                        style={{ width: '100%', padding: '0.5rem' }}
                        required
                    />
                    <small style={{ color: '#666' }}>
                        Máximo: {maxImpostors} (debe haber al menos un jugador normal)
                    </small>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input 
                            type="checkbox"
                            checked={showHint}
                            onChange={(e) => setShowHint(e.target.checked)}
                            style={{ marginRight: '0.5rem', width: '20px', height: '20px' }}
                        />
                        <span>Mostrar pista al impostor</span>
                    </label>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input 
                            type="checkbox"
                            checked={showCategory}
                            onChange={(e) => setShowCategory(e.target.checked)}
                            style={{ marginRight: '0.5rem', width: '20px', height: '20px' }}
                        />
                        <span>Mostrar categoría al impostor</span>
                    </label>
                </div>

                <button 
                    type="submit"
                    style={{ 
                        width: '100%', 
                        padding: '1rem', 
                        fontSize: '1.2rem',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Comenzar Partida
                </button>
            </form>
        </div>
    )
}
