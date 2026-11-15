import { useEffect, useRef, useState } from 'react'
import { BackIcon, NextIcon, CheckIcon } from '../../ui'

const VIEW_KEY = "lounge_handView"

function readView() {
    try { return localStorage.getItem(VIEW_KEY) === "fan" ? "fan" : "list" } catch { return "list" }
}
function saveView(v) {
    try { localStorage.setItem(VIEW_KEY, v) } catch { /* sin almacenamiento: solo dura esta sesión */ }
}

// Mano del jugador con dos vistas:
//  - Lista: todas las cartas en columna, para verlas de un vistazo.
//  - Abanico: carrusel recto, una carta grande en el centro y las vecinas a los lados.
// Se recuerda la vista elegida en el navegador.
export default function CAHHand({ hand, pick, hasDiscarded, onSubmit, onDiscard }) {
    const cards = hand || []
    const [view, setView] = useState(readView)
    const [selected, setSelected] = useState([])
    const [discardMode, setDiscardMode] = useState(false)
    const [discardSelected, setDiscardSelected] = useState([])
    const [index, setIndex] = useState(0)
    const [direction, setDirection] = useState("")
    // "play" | "discard" mientras dura la animación de salida de las cartas
    const [leaving, setLeaving] = useState(null)
    const leaveTimer = useRef(null)
    useEffect(() => () => clearTimeout(leaveTimer.current), [])
    const touchX = useRef(null)

    const maxDiscardable = Math.max(0, cards.length - pick)
    const safeIndex = cards.length ? Math.min(index, cards.length - 1) : 0

    const changeView = (v) => { setView(v); saveView(v) }

    const toggleCard = (cardId) => {
        if (discardMode) {
            setDiscardSelected(prev => {
                if (prev.includes(cardId)) return prev.filter(id => id !== cardId)
                if (prev.length >= maxDiscardable) return prev
                return [...prev, cardId]
            })
            return
        }
        setSelected(prev => {
            if (prev.includes(cardId)) return prev.filter(id => id !== cardId)
            // Si ya hay tantas como pide la ronda, sustituye la más antigua
            if (prev.length >= pick) return [...prev.slice(1), cardId]
            return [...prev, cardId]
        })
    }

    const go = (delta) => {
        if (!cards.length) return
        setDirection(delta > 0 ? "from-right" : "from-left")
        setIndex((safeIndex + delta + cards.length) % cards.length)
    }

    const startDiscard = () => { setSelected([]); setDiscardSelected([]); setDiscardMode(true) }
    const cancelDiscard = () => { setDiscardSelected([]); setDiscardMode(false) }
    // Las cartas salen animadas y, al terminar la animación, se avisa al servidor.
    const confirmDiscard = () => {
        if (discardSelected.length === 0 || leaving) return
        const ids = discardSelected
        setLeaving("discard")
        leaveTimer.current = setTimeout(() => {
            onDiscard(ids)
            setDiscardSelected([])
            setDiscardMode(false)
            setIndex(0)
            setLeaving(null)
        }, 380)
    }

    const playCards = () => {
        if (selected.length !== pick || leaving) return
        const ids = selected
        setLeaving("play")
        leaveTimer.current = setTimeout(() => onSubmit(ids), 420)
    }

    const isMarked = (id) => discardMode ? discardSelected.includes(id) : selected.includes(id)
    const order = (id) => (!discardMode && pick > 1) ? selected.indexOf(id) + 1 : 0
    const cardClass = (id) => {
        if (!isMarked(id)) return ""
        if (leaving === "play") return "is-selected is-flying"
        if (leaving === "discard") return "is-discarding is-tossing"
        return discardMode ? "is-discarding" : "is-selected"
    }

    const renderMark = (id) => {
        if (!isMarked(id)) return null
        if (discardMode) return <span className="card-check card-check--danger" aria-hidden="true">✕</span>
        return <span className="card-check" aria-hidden="true">{order(id) || <CheckIcon size={14} />}</span>
    }

    const center = cards[safeIndex]
    const left = cards.length > 1 ? cards[(safeIndex - 1 + cards.length) % cards.length] : null
    const right = cards.length > 2 ? cards[(safeIndex + 1) % cards.length] : null

    return (
        <>
            <div className="spread" style={{ alignItems: "center" }}>
                <h2 className="section-title">
                    {discardMode
                        ? <>Descartar <span>· {discardSelected.length} de {maxDiscardable}</span></>
                        : <>Tu mano <span>· {cards.length}{pick > 1 ? ` · elige ${pick} (${selected.length}/${pick})` : ""}</span></>}
                </h2>
                <div className="segmented" role="group" aria-label="Vista de la mano">
                    <button type="button" aria-pressed={view === "list"} onClick={() => changeView("list")}>Lista</button>
                    <button type="button" aria-pressed={view === "fan"} onClick={() => changeView("fan")}>Abanico</button>
                </div>
            </div>

            {discardMode && (
                <p className="muted small">Toca las cartas que no quieras. Te llegarán otras nuevas en la próxima ronda.</p>
            )}

            {view === "list" ? (
                <div className={`hand-list hand-list--grid ${leaving ? "is-leaving" : ""}`}>
                    {cards.map(card => (
                        <button
                            key={card.id}
                            type="button"
                            className={`white-card ${cardClass(card.id)}`}
                            aria-pressed={isMarked(card.id)}
                            onClick={() => toggleCard(card.id)}
                        >
                            <span>{card.text}</span>
                            {renderMark(card.id)}
                        </button>
                    ))}
                </div>
            ) : (
                <>
                    <div
                        className="carousel"
                        onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
                        onTouchEnd={(e) => {
                            if (touchX.current === null) return
                            const dx = e.changedTouches[0].clientX - touchX.current
                            touchX.current = null
                            if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
                        }}
                    >
                        {left && (
                            <button type="button" className="carousel__side carousel__side--left" onClick={() => go(-1)} aria-label="Carta anterior">
                                {left.text}
                            </button>
                        )}
                        {right && (
                            <button type="button" className="carousel__side carousel__side--right" onClick={() => go(1)} aria-label="Carta siguiente">
                                {right.text}
                            </button>
                        )}
                        {center && (
                            <button
                                key={center.id}
                                type="button"
                                className={`carousel__center ${direction} ${cardClass(center.id)}`}
                                aria-pressed={isMarked(center.id)}
                                onClick={() => toggleCard(center.id)}
                            >
                                <span>{center.text}</span>
                                <span className="carousel__hint" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                                    {isMarked(center.id)
                                        ? (discardMode ? "Para descartar" : pick > 1 ? `Elegida (${order(center.id)}ª)` : "Elegida")
                                        : (discardMode ? "Toca para descartar" : "Toca para elegir")}
                                    {renderMark(center.id)}
                                </span>
                            </button>
                        )}
                    </div>
                    <div className="carousel__nav">
                        <button type="button" className="round-btn" onClick={() => go(-1)} aria-label="Carta anterior"><BackIcon /></button>
                        <span style={{ fontSize: 14, fontWeight: 700, minWidth: 56, textAlign: "center" }} aria-live="polite">
                            {cards.length ? safeIndex + 1 : 0} / {cards.length}
                        </span>
                        <button type="button" className="round-btn" onClick={() => go(1)} aria-label="Carta siguiente"><NextIcon /></button>
                    </div>
                </>
            )}

            <div className="sticky-actions">
                {discardMode ? (
                    <div className="row">
                        <button type="button" className="btn btn--auto" onClick={cancelDiscard}>Cancelar</button>
                        <button type="button" className="btn btn--danger" disabled={discardSelected.length === 0 || !!leaving} onClick={confirmDiscard}>
                            Descartar {discardSelected.length > 0 ? `(${discardSelected.length})` : ""}
                        </button>
                    </div>
                ) : (
                    <div className="row">
                        {!hasDiscarded && maxDiscardable > 0 && (
                            <button type="button" className="btn btn--auto" onClick={startDiscard}>Descartar</button>
                        )}
                        <button
                            type="button"
                            className="btn btn--primary"
                            disabled={selected.length !== pick || !!leaving}
                            onClick={playCards}
                        >
                            {pick > 1 ? `Jugar cartas (${selected.length}/${pick})` : "Jugar carta"}
                        </button>
                    </div>
                )}
            </div>
        </>
    )
}
