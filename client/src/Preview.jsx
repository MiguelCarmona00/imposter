// SOLO DESARROLLO: pinta cada pantalla con datos de ejemplo, sin servidor,
// para revisar el diseño en distintos tamaños. Se abre con ?preview=<pantalla>.
// main.jsx solo lo carga con import.meta.env.DEV, así que no llega a producción.
import UserNameInput from './UserNameInput'
import GameSelector from './GameSelector'
import RoomSelection from './RoomSelection'
import Room from './Room'
import WaitingForSettings from './WaitingForSettings'
import Countdown from './Countdown'
import CAHGameSettings from './games/cah/CAHGameSettings'
import CAHGamePlay from './games/cah/CAHGamePlay'
import CAHGameEnd from './games/cah/CAHGameEnd'
import ImpostorGameSettings from './games/impostor/ImpostorGameSettings'
import ImpostorGamePlay from './games/impostor/ImpostorGamePlay'
import ImpostorGameEnd from './games/impostor/ImpostorGameEnd'

const noop = () => {}
const users = [
    { id: "me", name: "Miguel" }, { id: "a", name: "Ana" }, { id: "l", name: "Leo" },
    { id: "s", name: "Sara" }, { id: "p", name: "Pablo" }, { id: "m", name: "Marta" }
]
const scores = [
    { userId: "m", name: "Marta", score: 4 }, { userId: "a", name: "Ana", score: 5 },
    { userId: "me", name: "Miguel", score: 3 }, { userId: "l", name: "Leo", score: 2 },
    { userId: "s", name: "Sara", score: 1 }, { userId: "p", name: "Pablo", score: 0 }
]
const hand = [
    "Solos de saxofón.", "Un burrito de desayuno bien sabroso.", "Perder el tiempo sin hacer nada.",
    "Gentrificación inversa.", "El milagro del parto.", "Natalie Portman.",
    "Despertar en los brazos de Idris Elba.", "Un sofá que dice: “Tengo estilo, pero me gusta sentirme cómodo.”",
    "El sabor fresco y delicioso de Pepsi®.", "Un sonido de succión grave."
].map((text, i) => ({ id: "w" + i, text }))
const blackCard = { text: "Solo una vez, me gustaría escucharte decir: “Gracias, mamá. Gracias por _____.”", pick: 1 }
const baseCah = {
    phase: "submitting", round: 4, isCzar: false, czarName: "Marta", czarId: "m", blackCard, hand, scores,
    pointsToWin: 7, submittedCount: 4, submittedIds: ["a", "l", "s", "p"], totalNeeded: 5,
    hasSubmitted: false, hasDiscarded: false
}
const cahProps = { roomCode: "K7QF", isHost: true, hostName: "Miguel", nextHostName: "Ana", myId: "me",
    onSubmitCards: noop, onDiscardCards: noop, onCzarPick: noop, onNextRound: noop, onEndGame: noop, onKickPlayer: noop, onLeave: noop }

const screens = {
    name: () => <UserNameInput onNameSubmit={noop} />,
    games: () => <GameSelector userName="Miguel" onGameSelect={noop} onBack={noop} />,
    join: () => <RoomSelection gameId="cah" onCreateRoom={noop} onJoinRoom={noop} onBack={noop} />,
    "room-host": () => <Room roomName="Viernes en casa de Ana" roomCode="K7QF" users={users.slice(0, 4)} mySocketId="me" isHost hostId="me" selectedGame="cah" onLeaveRoom={noop} onStartGame={noop} onKickPlayer={noop} />,
    "room-guest": () => <Room roomName="Viernes en casa de Ana" roomCode="K7QF" users={users.slice(0, 4)} mySocketId="me" isHost={false} hostId="a" selectedGame="cah" onLeaveRoom={noop} onStartGame={noop} onKickPlayer={noop} />,
    wait: () => <WaitingForSettings roomCode="K7QF" hostName="Marta" hostId="m" users={users} myId="me" gameId="cah" onLeave={noop} />,
    countdown: () => <Countdown gameId="cah" roomCode="K7QF" />,
    "cah-settings": () => <CAHGameSettings roomCode="K7QF" playerCount={4} onSubmit={noop} onCancel={noop} />,
    "cah-play": () => <CAHGamePlay {...cahProps} cahState={baseCah} />,
    "cah-fan": () => {
        try { localStorage.setItem("lounge_handView", "fan") } catch { /* vista previa */ }
        return <CAHGamePlay {...cahProps} cahState={{ ...baseCah, submittedCount: 0, submittedIds: [],
            blackCard: { text: "Esta temporada en el Princess of Wales Theatre, la clásica obra existencialista de Samuel Beckett: Esperando a _____. Una producción que ha dejado al público sin palabras durante tres horas.", pick: 1 } }} />
    },
    "cah-czar": () => <CAHGamePlay {...cahProps} cahState={{ ...baseCah, isCzar: true, czarId: "me", czarName: "Miguel", hand: [] }} />,
    "cah-reveal": () => <CAHGamePlay {...cahProps} cahState={{ ...baseCah, phase: "revealing", isCzar: true, czarId: "me", czarName: "Miguel",
        revealSubmissions: hand.slice(0, 5).map((c, i) => ({ submissionId: "s" + i, cards: [c] })) }} />,
    "cah-result": () => <CAHGamePlay {...cahProps} cahState={{ ...baseCah, phase: "result",
        roundResult: { winnerUserId: "a", winnerName: "Ana", winningCards: [hand[1]], blackCard, scores } }} />,
    "cah-end": () => <CAHGameEnd roomCode="K7QF" isHost hostName="Miguel" myId="me" onRestart={noop} onBackToRoom={noop} onLeave={noop}
        cahState={{ finalScores: scores, winnerUserId: "a", winnerName: "Ana" }} />,
    "imp-settings": () => <ImpostorGameSettings roomCode="P3ZN" playerCount={6} maxImpostors={5} onSubmit={noop} onCancel={noop} />,
    "imp-play": () => <ImpostorGamePlay role="player" word="Delfín" starterName="Ana" roomCode="P3ZN" playerCount={6} isHost nextHostName="Ana" onEndGame={noop} onLeave={noop} />,
    "imp-impostor": () => <ImpostorGamePlay role="impostor" hint="Le gusta saltar fuera del agua" category="Animal" starterName="Ana" roomCode="P3ZN" playerCount={6} isHost={false} onEndGame={noop} onLeave={noop} />,
    "imp-end": () => <ImpostorGameEnd roomCode="P3ZN" isHost hostName="Miguel" onRestart={noop} onBackToRoom={noop} onLeave={noop} />
}

export default function Preview({ name }) {
    const Screen = screens[name]
    if (!Screen) {
        return <pre style={{ color: "#EDE6D4" }}>Pantallas: {Object.keys(screens).join(", ")}</pre>
    }
    return <Screen />
}
