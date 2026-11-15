import { useState } from 'react'
import CAHBlackCard from './CAHBlackCard'
import CAHHand from './CAHHand'
import CAHSubmissionsReveal from './CAHSubmissionsReveal'
import CAHRoundResult from './CAHRoundResult'
import GameExitSheet from '../../GameExitSheet'
import { Table, TopBar, ExitButton, CodePill, Sheet, CheckIcon, CrownIcon, Spade } from '../../ui'

export default function CAHGamePlay({
    cahState, roomCode, isHost, hostName, nextHostName, myId,
    onSubmitCards, onDiscardCards, onCzarPick, onNextRound, onEndGame, onKickPlayer, onTransferHost, onLeave
}) {
    const [exitOpen, setExitOpen] = useState(false)
    const [kickTarget, setKickTarget] = useState(null)

    if (!cahState) return null

    const {
        phase, round, isCzar, czarName, czarId, blackCard, hand, scores, pointsToWin,
        notice, submittedCount, submittedIds, totalNeeded, revealSubmissions, roundResult,
        hasSubmitted, hasDiscarded, cahError
    } = cahState

    const done = submittedCount ?? 0
    const needed = totalNeeded ?? 0
    const playedSet = new Set(submittedIds || [])
    const pick = blackCard?.pick || 1

    const seatStatus = (s) => {
        const judge = czarId ? s.userId === czarId : s.name === czarName
        if (judge) return { judge: true, label: "Juez" }
        if (phase !== "submitting") return { label: "En la mesa" }
        if (playedSet.has(s.userId) || (s.userId === myId && hasSubmitted)) return { played: true, label: "Jugó" }
        return { label: s.userId === myId ? "Eligiendo" : "Pensando" }
    }

    const progress = (
        <div className="progress">
            <div className="progress__bar"><div className="progress__fill" style={{ width: needed ? `${Math.round((done / needed) * 100)}%` : "0%" }} /></div>
            <span className="muted tiny">
                Han jugado {done} de {needed}{!isCzar && !hasSubmitted ? " · faltas tú" : ""}
            </span>
        </div>
    )

    const kick = (ban) => {
        if (kickTarget) onKickPlayer(kickTarget.userId, ban)
        setKickTarget(null)
    }

    return (
        <Table variant="tight wide">
            <TopBar
                left={<ExitButton onClick={() => setExitOpen(true)} label="Salir de la partida" />}
                center={<CodePill code={roomCode} />}
                right={<span className="topbar-note">Ronda {round}</span>}
            />

            {scores && scores.length > 0 && (
                <div className="seats" aria-label="Jugadores">
                    {scores.map(s => {
                        const st = seatStatus(s)
                        const me = s.userId === myId
                        const cls = `seat ${st.judge ? "seat--judge" : ""} ${me ? "seat--me" : ""} ${st.played ? "seat--played" : ""}`
                        const body = (
                            <>
                                <span className="seat__name">{me ? "Tú" : s.name}</span>
                                <span className="seat__status" key={st.label}>
                                    {st.judge && <CrownIcon size={11} />}
                                    {st.played && <CheckIcon />}
                                    {st.label} · <span className="seat__score" key={s.score}>{s.score}</span>
                                </span>
                            </>
                        )
                        // El anfitrión puede tocar a un jugador para expulsarlo
                        // (p.ej. alguien que se ha caído y bloquea la ronda).
                        return isHost && !me ? (
                            <button key={s.userId} type="button" className={cls} onClick={() => setKickTarget(s)} aria-label={`${s.name}: ${st.label}, ${s.score} puntos. Opciones`}>
                                {body}
                            </button>
                        ) : (
                            <div key={s.userId} className={cls}>{body}</div>
                        )
                    })}
                </div>
            )}

            {notice && <p className="notice notice--brass small">{notice}</p>}
            {cahError && <p className="notice notice--error small" role="alert">{cahError}</p>}

            {phase === "submitting" && (
                <div className="play-layout">
                    <div className="play-board">
                        <CAHBlackCard
                            key={round}
                            card={blackCard}
                            footerLeft={isCzar ? "Eres el juez de esta ronda" : `${czarName} es el juez`}
                        />
                        {progress}
                    </div>

                    <div className="play-hand">
                    {isCzar ? (
                        <p className="notice notice--brass" style={{ textAlign: "center" }}>
                            Cuando todos jueguen, elegirás la respuesta que más te guste.
                        </p>
                    ) : hasSubmitted ? (
                        <div className="played-zone" role="status">
                            <div className="played-card" aria-hidden="true"><Spade className="logo" alt="" /></div>
                            <p className="soft" style={{ textAlign: "center" }}>
                                {pick > 1 ? "Cartas en la mesa" : "Carta en la mesa"}. Esperando a los demás…
                            </p>
                        </div>
                    ) : (
                        <CAHHand
                            key={round}
                            hand={hand}
                            pick={pick}
                            hasDiscarded={hasDiscarded}
                            onSubmit={onSubmitCards}
                            onDiscard={onDiscardCards}
                        />
                    )}
                    </div>
                </div>
            )}

            {phase === "revealing" && (
                <div className="play-layout">
                    <div className="play-board">
                        {isCzar && (
                            <p className="chip chip--brass" style={{ alignSelf: "center" }}>
                                <CrownIcon /> Eres el juez de esta ronda
                            </p>
                        )}
                        <CAHBlackCard card={blackCard} showPick={false} />
                    </div>
                    <div className="play-hand">
                        <CAHSubmissionsReveal
                            submissions={revealSubmissions || []}
                            isCzar={isCzar}
                            czarName={czarName}
                            onCzarPick={onCzarPick}
                        />
                    </div>
                </div>
            )}

            {phase === "result" && (
                <CAHRoundResult
                    result={roundResult}
                    myId={myId}
                    isHost={isHost}
                    hostName={hostName}
                    pointsToWin={pointsToWin}
                    onNextRound={onNextRound}
                    onKickPlayer={onKickPlayer}
                    onTransferHost={onTransferHost}
                />
            )}

            {exitOpen && (
                <GameExitSheet
                    roomCode={roomCode}
                    isHost={isHost}
                    nextHostName={nextHostName}
                    supportsLateJoin
                    onLeave={onLeave}
                    onEndGame={onEndGame}
                    onClose={() => setExitOpen(false)}
                />
            )}

            {kickTarget && (
                <Sheet title={kickTarget.name} onClose={() => setKickTarget(null)}>
                    <p className="sheet__text">
                        Si lo expulsas puede volver con el código y entrará en la siguiente ronda.
                        Si lo vetas, no podrá volver a esta sala.
                    </p>
                    {phase === "result" && onTransferHost && (
                        <button type="button" className="btn btn--brass-outline" onClick={() => { onTransferHost(kickTarget.userId); setKickTarget(null) }}>
                            <CrownIcon /> Hacer anfitrión
                        </button>
                    )}
                    <button type="button" className="btn" onClick={() => kick(false)}>Expulsar</button>
                    <button type="button" className="btn btn--danger" onClick={() => kick(true)}>Expulsar y vetar</button>
                    <button type="button" className="btn btn--primary" onClick={() => setKickTarget(null)}>Cancelar</button>
                </Sheet>
            )}
        </Table>
    )
}
