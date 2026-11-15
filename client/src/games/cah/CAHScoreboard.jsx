import { useState } from 'react'
import { DotsIcon, CrownIcon } from '../../ui'

// Marcador con barras de progreso hacia los puntos para ganar.
// onKick es opcional: si se pasa (anfitrión, entre rondas), cada jugador tiene
// un botón ⋯ con "Expulsar" / "Expulsar y vetar", igual que en la sala de espera.
export default function CAHScoreboard({ scores, myId, pointsToWin, onKick, onTransferHost }) {
    const [openMenu, setOpenMenu] = useState(null)
    if (!scores || scores.length === 0) return null

    const sorted = [...scores].sort((a, b) => b.score - a.score)
    const top = sorted[0]?.score ?? 0
    const goal = Math.max(pointsToWin || top || 1, 1)

    const kick = (userId, ban) => {
        setOpenMenu(null)
        onKick(userId, ban)
    }

    return (
        <div className="stack-sm" style={{ gap: 10 }}>
            <div className="spread">
                <h2 className="section-title">Marcador</h2>
                {pointsToWin && <span className="muted tiny">Gana quien llegue a {pointsToWin}</span>}
            </div>
            {sorted.map(s => {
                const lead = top > 0 && s.score === top
                const me = s.userId === myId
                const canKick = onKick && !me
                const open = openMenu === s.userId
                return (
                    <div key={s.userId} className="score-entry">
                        <div className={`score-row ${onKick ? "score-row--kickable" : ""} ${lead ? "score-row--lead" : ""} ${me && !lead ? "score-row--me" : ""}`}>
                            <span className="score-row__name">{me ? "Tú" : s.name}</span>
                            <span className="score-row__bar">
                                <span className="score-row__fill" style={{ width: `${Math.min(100, Math.round((s.score / goal) * 100))}%`, display: "block" }} />
                            </span>
                            <span className="score-row__pts">{s.score}</span>
                            {canKick && (
                                <button
                                    type="button"
                                    className="icon-btn score-row__menu"
                                    aria-label={`Opciones para ${s.name}`}
                                    aria-expanded={open}
                                    onClick={() => setOpenMenu(open ? null : s.userId)}
                                >
                                    <DotsIcon />
                                </button>
                            )}
                            {onKick && me && <span aria-hidden="true" />}
                        </div>
                        {open && (
                            <div className="score-entry__actions">
                                {onTransferHost && (
                                    <button type="button" className="btn btn--sm btn--brass-outline" onClick={() => { setOpenMenu(null); onTransferHost(s.userId) }}>
                                        <CrownIcon /> Hacer anfitrión
                                    </button>
                                )}
                                <div className="player-row__actions">
                                    <button type="button" className="btn btn--sm" onClick={() => kick(s.userId, false)}>Expulsar</button>
                                    <button type="button" className="btn btn--sm btn--danger" onClick={() => kick(s.userId, true)}>Expulsar y vetar</button>
                                </div>
                                <p className="muted tiny" style={{ lineHeight: 1.4 }}>
                                    Si lo haces anfitrión, dejarás de serlo tú. Si lo expulsas puede volver con el código y entrará en la siguiente ronda; si lo vetas, no podrá volver a esta sala.
                                </p>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
