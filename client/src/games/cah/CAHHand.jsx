import { useState } from 'react'
import '../../styles/CAHHand.css'

export default function CAHHand({ hand, pick, hasSubmitted, hasDiscarded, onSubmit, onDiscard }) {
    const [selected, setSelected] = useState([])
    const [discardMode, setDiscardMode] = useState(false)
    const [discardSelected, setDiscardSelected] = useState([])

    if (hasSubmitted) {
        return (
            <div className="cah-hand-waiting">
                <p>✅ Ya enviaste tus cartas. Esperando a los demás...</p>
            </div>
        )
    }

    const maxDiscardable = Math.max(0, (hand || []).length - pick)

    const toggleCard = (cardId) => {
        setSelected(prev => {
            if (prev.includes(cardId)) {
                return prev.filter(id => id !== cardId)
            }
            if (prev.length >= pick) {
                // Ya hay tantas cartas elegidas como pide la ronda: sustituye la más antigua
                return [...prev.slice(1), cardId]
            }
            return [...prev, cardId]
        })
    }

    const toggleDiscard = (cardId) => {
        setDiscardSelected(prev => {
            if (prev.includes(cardId)) {
                return prev.filter(id => id !== cardId)
            }
            if (prev.length >= maxDiscardable) {
                return prev
            }
            return [...prev, cardId]
        })
    }

    const handleSubmit = () => {
        if (selected.length === pick) {
            onSubmit(selected)
        }
    }

    const startDiscardMode = () => {
        setDiscardSelected([])
        setDiscardMode(true)
    }

    const cancelDiscardMode = () => {
        setDiscardSelected([])
        setDiscardMode(false)
    }

    const confirmDiscard = () => {
        if (discardSelected.length === 0) return
        onDiscard(discardSelected)
        setDiscardSelected([])
        setDiscardMode(false)
    }

    return (
        <div className="cah-hand-container">
            {discardMode ? (
                <p className="cah-hand-instructions cah-discard-instructions">
                    🗑️ Toca las cartas que quieras descartar ({discardSelected.length}/{maxDiscardable}) — te llegarán otras nuevas la próxima ronda
                </p>
            ) : (
                <p className="cah-hand-instructions">
                    Elige {pick} carta{pick > 1 ? 's' : ''} ({selected.length}/{pick})
                </p>
            )}

            <div className="cah-hand-grid">
                {(hand || []).map(card => {
                    if (discardMode) {
                        const isMarked = discardSelected.includes(card.id)
                        const isDisabled = !isMarked && discardSelected.length >= maxDiscardable
                        return (
                            <button
                                key={card.id}
                                type="button"
                                disabled={isDisabled}
                                className={`cah-white-card is-discard-mode ${isMarked ? 'is-discarding' : ''} ${isDisabled ? 'is-disabled' : ''}`}
                                onClick={() => toggleDiscard(card.id)}
                            >
                                {card.text}
                            </button>
                        )
                    }
                    return (
                        <button
                            key={card.id}
                            type="button"
                            className={`cah-white-card ${selected.includes(card.id) ? 'is-selected' : ''}`}
                            onClick={() => toggleCard(card.id)}
                        >
                            {card.text}
                        </button>
                    )
                })}
            </div>

            {discardMode ? (
                <div className="cah-discard-actions">
                    <button className="cah-hand-cancel-button" onClick={cancelDiscardMode}>
                        Cancelar
                    </button>
                    <button
                        className="cah-hand-discard-confirm-button"
                        disabled={discardSelected.length === 0}
                        onClick={confirmDiscard}
                    >
                        Confirmar descarte ({discardSelected.length})
                    </button>
                </div>
            ) : (
                <div className="cah-hand-actions">
                    <button
                        className="cah-hand-submit-button"
                        disabled={selected.length !== pick}
                        onClick={handleSubmit}
                    >
                        Enviar
                    </button>
                    {!hasDiscarded && maxDiscardable > 0 && (
                        <button className="cah-hand-discard-button" onClick={startDiscardMode}>
                            🗑️ Descartar cartas
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
