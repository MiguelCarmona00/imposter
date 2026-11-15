import { WaitingScreen, ExitButton } from '../../ui'

// Pantalla de quien se une con la partida ya empezada: está dentro de la sala,
// pero todavía no juega. Entra automáticamente cuando el anfitrión pase de
// ronda (el servidor lo absorbe entonces — ver absorbPendingJoins).
export default function CAHWaitingForNextRound({ roomCode, onLeave }) {
    return (
        <WaitingScreen
            topLeft={<ExitButton onClick={onLeave} label="Salir" withText />}
            code={roomCode}
            title={<>La partida está<br />en marcha</>}
            text="Entrarás automáticamente en cuanto empiece la siguiente ronda. No cierres esta pantalla."
        />
    )
}
