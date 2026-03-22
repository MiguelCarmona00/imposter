import '../../styles/ImpostorGameEnd.css'

export default function ImpostorGameEnd({ isHost, onRestart, onBackToRoom }) {
    return (
        <div className="impostor-end-container">
            <h1 className="impostor-end-title">🎮 Partida Terminada</h1>

            {isHost ? (
                <div>
                    <p className="end-message">
                        ¿Qué deseas hacer?
                    </p>
                    <div className="end-buttons">
                        <button 
                            onClick={onRestart}
                            className="end-button restart-button"
                        >
                            🔄 Nueva Partida (Mismos Ajustes)
                        </button>
                        <button 
                            onClick={onBackToRoom}
                            className="end-button back-button"
                        >
                            🏠 Volver a la Sala
                        </button>
                    </div>
                </div>
            ) : (
                <p className="waiting-message">
                    Esperando a que el anfitrión decida qué hacer...
                </p>
            )}
        </div>
    )
}
