export default function RoomSelection({ onCreateRoom, onJoinRoom, onBack, userName, notice }) {
    return (
        <div>
            <h2>¿Qué deseas hacer?</h2>

            {notice && (
                <p style={{
                    maxWidth: '340px',
                    margin: '0 auto 1.25rem',
                    padding: '0.75rem 1rem',
                    border: '2px solid rgba(255, 99, 71, 0.6)',
                    borderRadius: '10px',
                    background: 'rgba(0, 0, 0, 0.45)',
                    color: '#ffb3a7',
                    lineHeight: 1.5
                }}>
                    {notice}
                </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '300px', margin: '0 auto' }}>
                <button onClick={onCreateRoom} style={{ padding: '1rem', fontSize: '1.2rem' }}>
                    Crear Sala
                </button>
                <button onClick={onJoinRoom} style={{ padding: '1rem', fontSize: '1.2rem' }}>
                    Unirse a Sala
                </button>
            </div>
            <button onClick={onBack} style={{ marginTop: '1rem' }}>
                Volver al menú
            </button>
        </div>
    )
}
