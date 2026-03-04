import { useState } from 'react'

export default function UserNameInput({ onNameSubmit }) {
    const [name, setName] = useState("")

    const handleSubmit = (e) => {
        e.preventDefault()
        if (name.trim()) {
            onNameSubmit(name.trim())
        }
    }

    return (
        <div>
            <h1>Bienvenido</h1>
            <form onSubmit={handleSubmit}>
                <input 
                    type="text" 
                    placeholder="Ingresa tu nombre" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    maxLength={20}
                    required
                />
                <button type="submit">Continuar</button>
            </form>
        </div>
    )
}
