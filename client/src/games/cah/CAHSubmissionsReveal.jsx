import '../../styles/CAHSubmissionsReveal.css'

export default function CAHSubmissionsReveal({ submissions, isCzar, onCzarPick }) {
    return (
        <div className="cah-reveal-container">
            <p className="cah-reveal-instructions">
                {isCzar ? '👑 Elige la combinación ganadora' : 'El Card Czar está eligiendo...'}
            </p>
            <div className="cah-reveal-grid">
                {submissions.map(sub => (
                    <button
                        key={sub.submissionId}
                        type="button"
                        className={`cah-reveal-submission ${isCzar ? 'is-clickable' : ''}`}
                        disabled={!isCzar}
                        onClick={() => isCzar && onCzarPick(sub.submissionId)}
                    >
                        {sub.cards.map((c, i) => (
                            <p key={i} className="cah-reveal-card-text">{c.text}</p>
                        ))}
                    </button>
                ))}
            </div>
        </div>
    )
}
