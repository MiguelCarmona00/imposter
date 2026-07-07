import '../../styles/CAHWaitingForSettings.css'

export default function CAHWaitingForSettings() {
    return (
        <div className="cah-waiting-container">
            <h1 className="cah-waiting-title">⏳ Por favor, espera</h1>
            <p className="cah-waiting-message">
                El anfitrión está estableciendo las normas del juego...
            </p>
            <div className="cah-waiting-icon">
                🃏
            </div>
        </div>
    )
}
