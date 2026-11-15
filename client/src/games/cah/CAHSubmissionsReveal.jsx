import { useEffect, useRef, useState } from 'react'
import { CheckIcon } from '../../ui'

// Fase de elegir ganadora. El juez selecciona una respuesta y confirma con
// "Dar el punto" (antes un solo toque ya daba el punto, fácil de fallar en móvil).
export default function CAHSubmissionsReveal({ submissions, isCzar, czarName, onCzarPick }) {
    const [picked, setPicked] = useState(null)
    const [confirming, setConfirming] = useState(false)
    const timer = useRef(null)
    useEffect(() => () => clearTimeout(timer.current), [])

    const givePoint = () => {
        if (!picked || confirming) return
        setConfirming(true)
        timer.current = setTimeout(() => onCzarPick(picked), 550)
    }

    return (
        <>
            <div className="spread">
                <h2 className="section-title">{isCzar ? "Elige la que más te guste" : `${czarName} está eligiendo…`}</h2>
                <span className="muted tiny">{submissions.length} respuestas · anónimas</span>
            </div>

            <div className="hand-list hand-list--grid reveal-list">
                {submissions.map(sub => {
                    const selected = picked === sub.submissionId
                    const content = sub.cards.map(c => c.text).join("  ·  ")
                    if (!isCzar) {
                        return (
                            <div key={sub.submissionId} className="white-card white-card--static">
                                <span>{content}</span>
                            </div>
                        )
                    }
                    return (
                        <button
                            key={sub.submissionId}
                            type="button"
                            className={`white-card ${selected ? "is-selected" : ""} ${selected && confirming ? "is-winning" : ""}`}
                            aria-pressed={selected}
                            onClick={() => setPicked(sub.submissionId)}
                        >
                            <span>{content}</span>
                            {selected && <span className="card-check" aria-hidden="true"><CheckIcon size={14} /></span>}
                        </button>
                    )
                })}
            </div>

            {isCzar && (
                <div className="sticky-actions">
                    <button
                        type="button"
                        className="btn btn--primary"
                        style={{ width: "100%" }}
                        disabled={!picked || confirming}
                        onClick={givePoint}
                    >
                        {picked ? "Dar el punto" : "Elige una carta"}
                    </button>
                </div>
            )}
        </>
    )
}
