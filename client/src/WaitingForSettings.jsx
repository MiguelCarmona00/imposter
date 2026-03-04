export default function WaitingForSettings() {
    return (
        <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            maxWidth: '500px',
            margin: '0 auto'
        }}>
            <h1>⏳ Por favor, espera</h1>
            <p style={{ fontSize: '1.2rem', color: '#666' }}>
                El anfitrión está estableciendo las normas del juego...
            </p>
            <div style={{ 
                marginTop: '2rem',
                fontSize: '3rem'
            }}>
                ⏰
            </div>
        </div>
    )
}
