import { useState } from 'react'

export default function JoinRoomForm({ onSubmit, onBack, error }) {
    const [roomName, setRoomName] = useState("")
    const [roomCode, setRoomCode] = useState("")

    const handleSubmit = (e) => {
        e.preventDefault()
        if (roomName.trim() && roomCode.trim()) {
            onSubmit(roomName.trim(), roomCode.trim().toUpperCase())
        }
    }

    const handleCodeChange = (e) => {
        // Convertir a mayúsculas y limitar a 4 caracteres
        const value = e.target.value.toUpperCase().slice(0, 4)
        setRoomCode(value)
    }

    return (
        <div>
            <h1>Unirse a Sala</h1>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                    <input 
                        type="text" 
                        placeholder="Nombre de la sala" 
                        value={roomName} 
                        onChange={(e) => setRoomName(e.target.value)}
                        maxLength={30}
                        required
                    />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <input 
                        type="text" 
                        placeholder="Código (4 caracteres)" 
                        value={roomCode} 
                        onChange={handleCodeChange}
                        maxLength={4}
                        required
                    />
                </div>
                {error && (
                    <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>
                )}
                <button type="submit">Unirse</button>
            </form>
            <button onClick={onBack} style={{ marginTop: '1rem' }}>
                Volver
            </button>
        </div>
    )
}
