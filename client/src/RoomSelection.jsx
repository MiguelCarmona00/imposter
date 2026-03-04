export default function RoomSelection({ onCreateRoom, onJoinRoom, userName }) {
    return (
        <div>
            <h1>Hola, {userName}</h1>
            <h2>¿Qué deseas hacer?</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '300px', margin: '0 auto' }}>
                <button onClick={onCreateRoom} style={{ padding: '1rem', fontSize: '1.2rem' }}>
                    Crear Sala
                </button>
                <button onClick={onJoinRoom} style={{ padding: '1rem', fontSize: '1.2rem' }}>
                    Unirse a Sala
                </button>
            </div>
        </div>
    )
}
