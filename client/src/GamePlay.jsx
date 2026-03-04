export default function GamePlay({ role, word, hint, category, starterName, isHost, onEndGame }) {
    const isImpostor = role === "impostor"

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <h1 style={{ marginBottom: '2rem' }}>Jugando</h1>
            
            {starterName && (
                <div style={{ 
                    backgroundColor: '#2196F3',
                    color: 'white',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    fontSize: '1.1rem'
                }}>
                    🎲 Empieza: <strong>{starterName}</strong>
                </div>
            )}

            <div style={{ 
                color: 'white',
                padding: '2rem',
                borderRadius: '8px',
                marginBottom: '2rem'
            }}>
                <h2 style={{ 
                    marginBottom: '1rem',
                    color: isImpostor ? '#f44336' : '#4CAF50' 
                    }}>
                    {isImpostor ? '🎭 Eres el IMPOSTOR' : '✅ No eres el impostor'}
                </h2>
                
                {isImpostor ? (
                    <div>
                        {category && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                                    Categoría:
                                </p>
                                <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                                    {category}
                                </p>
                            </div>
                        )}
                        {hint ? (
                            <div>
                                <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                                    Tu pista:
                                </p>
                                <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                                    {hint}
                                </p>
                            </div>
                        ) : !category ? (
                            <p style={{ fontSize: '1.2rem' }}>
                                No tienes pista ni categoría. ¡Intenta adivinar!
                            </p>
                        ) : null}
                    </div>
                ) : (
                    <div>
                        <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                            Tu palabra:
                        </p>
                        <p style={{ fontSize: '3rem', fontWeight: 'bold' }}>
                            {word}
                        </p>
                    </div>
                )}
            </div>

            <div style={{ 
                backgroundColor: '#f0f0f0',
                padding: '1.5rem',
                borderRadius: '8px',
                marginBottom: '2rem'
            }}>
                <p style={{ fontSize: '1.1rem', color: '#333' }}>
                    💬 Es hora de debatir con los demás jugadores. 
                    {isImpostor 
                        ? ' Intenta que no descubran que eres el impostor.' 
                        : ' Intenta descubrir quién es el impostor sin revelar la palabra.'}
                </p>
            </div>

            {isHost && (
                <button 
                    onClick={onEndGame}
                    style={{ 
                        padding: '1rem 2rem',
                        fontSize: '1.1rem',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Terminar Partida
                </button>
            )}
        </div>
    )
}
