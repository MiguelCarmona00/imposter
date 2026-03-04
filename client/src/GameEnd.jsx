export default function GameEnd({ isHost, onRestart, onBackToRoom }) {
    return (
        <div style={{ 
            textAlign: 'center', 
            maxWidth: '500px',
            margin: '0 auto'
        }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '2rem' }}>🎮 Partida Terminada</h1>

            {isHost ? (
                <div>
                    <p style={{ fontSize: '1.2rem', marginBottom: '2rem', color: '#666' }}>
                        ¿Qué deseas hacer?
                    </p>
                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '1rem' 
                    }}>
                        <button 
                            onClick={onRestart}
                            style={{ 
                                padding: '1.5rem',
                                fontSize: '1.2rem',
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            🔄 Nueva Partida (Mismos Ajustes)
                        </button>
                        <button 
                            onClick={onBackToRoom}
                            style={{ 
                                padding: '1.5rem',
                                fontSize: '1.2rem',
                                backgroundColor: '#2196F3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            🏠 Volver a la Sala
                        </button>
                    </div>
                </div>
            ) : (
                <p style={{ fontSize: '1.2rem', color: '#666' }}>
                    Esperando a que el anfitrión decida qué hacer...
                </p>
            )}
        </div>
    )
}
