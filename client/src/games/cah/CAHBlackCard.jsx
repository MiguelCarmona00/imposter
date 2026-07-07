import '../../styles/CAHBlackCard.css'

export default function CAHBlackCard({ card }) {
    if (!card) return null

    return (
        <div className="cah-black-card">
            <p className="cah-black-card-text">{card.text}</p>
            {card.pick === 2 && (
                <span className="cah-black-card-badge">Elige 2 cartas</span>
            )}
        </div>
    )
}
