import { useState } from 'react'
import './styles/UserNameInput.css'

export default function UserNameInput({ onNameSubmit }) {
    const [name, setName] = useState("")

    const handleSubmit = (e) => {
        e.preventDefault()
        if (name.trim()) {
            onNameSubmit(name.trim())
        }
    }

    return (
        <div className="username-container">
            <div className="username-card">
                <h1 className="username-title">Bienvenido</h1>
                <form className="username-form" onSubmit={handleSubmit}>
                    <input 
                        className="username-input"
                        type="text" 
                        placeholder="Ingresa tu nombre" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        maxLength={20}
                        required
                    />
                    <button className="username-button" type="submit">Continuar</button>
                </form>
            </div>
        </div>
    )
}
