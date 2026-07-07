import { useEffect, useState } from 'react'
import '../../styles/CAHCountdown.css'

export default function CAHCountdown() {
    const [count, setCount] = useState(3)

    useEffect(() => {
        if (count > 0) {
            const timer = setTimeout(() => setCount(count - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [count])

    const getCountClass = () => {
        if (count === 3) return 'three'
        if (count === 2) return 'two'
        if (count === 1) return 'one'
        return 'go'
    }

    return (
        <div className="cah-countdown-container">
            <h1 className="cah-countdown-title">La partida está por comenzar</h1>
            <div className={`cah-countdown-number ${getCountClass()}`}>
                {count > 0 ? count : '¡YA!'}
            </div>
        </div>
    )
}
