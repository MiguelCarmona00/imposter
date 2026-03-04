import { useEffect, useState } from 'react'

export default function Countdown() {
    const [count, setCount] = useState(3)

    useEffect(() => {
        if (count > 0) {
            const timer = setTimeout(() => setCount(count - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [count])

    return (
        <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            minHeight: '50vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
        }}>
            <h1 style={{ marginBottom: '2rem' }}>El juego está por comenzar</h1>
            <div style={{ 
                fontSize: '10rem',
                fontWeight: 'bold',
                color: count === 3 ? '#f44336' : count === 2 ? '#ff9800' : '#4CAF50',
                animation: 'pulse 1s ease-in-out'
            }}>
                {count > 0 ? count : '¡YA!'}
            </div>
        </div>
    )
}
