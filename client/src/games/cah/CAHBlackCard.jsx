export default function CAHBlackCard({ card, footerLeft, showPick = true }) {
    if (!card) return null
    const pick = card.pick || 1

    return (
        <div className="black-card">
            <p className="black-card__text">{card.text}</p>
            {(footerLeft || showPick) && (
                <div className="black-card__meta">
                    <span>{footerLeft}</span>
                    {showPick && <span className="black-card__pick">Elige {pick} carta{pick > 1 ? "s" : ""}</span>}
                </div>
            )}
        </div>
    )
}
