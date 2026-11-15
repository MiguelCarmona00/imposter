import games from './gameConfig'
import { Table, TopBar, BackButton, GameIcon } from './ui'

export default function GameSelector({ userName, onGameSelect, onBack }) {
    return (
        <Table variant="wide">
            <TopBar left={<BackButton onClick={onBack} label="Cambiar nombre" />} />

            <div className="screen-center">
            <div className="center stack" style={{ gap: 6, display: "flex" }}>
                <p className="muted" style={{ fontSize: 15 }}>Hola, {userName}</p>
                <h1 className="title">¿A qué jugamos?</h1>
            </div>

            <div className="game-grid">
                {games.filter(g => g.available).map(game => (
                    <button
                        key={game.id}
                        type="button"
                        className="game-card"
                        onClick={() => onGameSelect(game.id)}
                    >
                        <span className="game-card__icon"><GameIcon gameId={game.id} /></span>
                        <span className="game-card__name">{game.name}</span>
                        <span className="game-card__desc">{game.description}</span>
                        <span className="game-card__players">{game.minPlayers}–{game.maxPlayers} jugadores</span>
                    </button>
                ))}
            </div>
            </div>
        </Table>
    )
}
