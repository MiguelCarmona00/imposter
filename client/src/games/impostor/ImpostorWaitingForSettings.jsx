import '../../styles/ImpostorWaitingForSettings.css'

export default function ImpostorWaitingForSettings() {
    return (
        <div className="impostor-waiting-container">
            <h1 className="waiting-title">⏳ Por favor, espera</h1>
            <p className="waiting-message">
                El anfitrión está estableciendo las normas del juego...
            </p>
            <div className="waiting-icon">
                ⏰
            </div>
        </div>
    )
}
