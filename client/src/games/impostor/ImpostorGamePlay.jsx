import '../../styles/ImpostorGamePlay.css'

export default function ImpostorGamePlay({ role, word, hint, category, starterName, isHost, onEndGame }) {
    const isImpostor = role === "impostor"

    return (
        <div className="impostor-gameplay-container">
            <h1 className="impostor-gameplay-title">Jugando</h1>
            
            {starterName && (
                <div className="starter-badge">
                    🎲 Empieza: <strong>{starterName}</strong>
                </div>
            )}

            <div className="role-card">
                <h2 className={`role-title ${isImpostor ? 'impostor' : 'not-impostor'}`}>
                    {isImpostor ? '🎭 Eres el IMPOSTOR' : '✅ No eres el impostor'}
                </h2>
                
                {isImpostor ? (
                    <div className="role-content">
                        {category && (
                            <div className="role-section">
                                <p className="role-label">
                                    Categoría:
                                </p>
                                <p className="role-value">
                                    {category}
                                </p>
                            </div>
                        )}
                        {hint ? (
                            <div className="role-section">
                                <p className="role-label">
                                    Tu pista:
                                </p>
                                <p className="role-value">
                                    {hint}
                                </p>
                            </div>
                        ) : !category ? (
                            <p className="role-hint">
                                No tienes pista ni categoría. ¡Intenta adivinar!
                            </p>
                        ) : null}
                    </div>
                ) : (
                    <div className="role-content">
                        <p className="role-label">
                            Tu palabra:
                        </p>
                        <p className="role-word">
                            {word}
                        </p>
                    </div>
                )}
            </div>

            <div className="instructions-box">
                <p className="instructions-text">
                    💬 Es hora de debatir con los demás jugadores. 
                    {isImpostor 
                        ? ' Intenta que no descubran que eres el impostor.' 
                        : ' Intenta descubrir quién es el impostor sin revelar la palabra.'}
                </p>
            </div>

            {isHost && (
                <button 
                    onClick={onEndGame}
                    className="end-game-button"
                >
                    Terminar Partida
                </button>
            )}
        </div>
    )
}
