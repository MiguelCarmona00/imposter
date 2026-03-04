import { useState } from 'react'

export default function CreateRoomForm({ onSubmit, onBack }) {
    const [roomName, setRoomName] = useState("")

    const handleSubmit = (e) => {
        e.preventDefault()
        if (roomName.trim()) {
            onSubmit(roomName.trim())
        }
    }

    return (
        <div>
            <h1>Crear Sala</h1>
            <form onSubmit={handleSubmit}>
                <input 
                    type="text" 
                    placeholder="Nombre de la sala" 
                    value={roomName} 
                    onChange={(e) => setRoomName(e.target.value)}
                    maxLength={30}
                    required
                />
                <button type="submit">Crear</button>
            </form>
            <button onClick={onBack} style={{ marginTop: '1rem' }}>
                Volver
            </button>
        </div>
    )
}
