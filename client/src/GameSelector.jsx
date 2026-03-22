import './styles/GameSelector.css'

export default function GameSelector({ onGameSelect }) {
    const games = [
        {
            id: 'impostor',
            name: 'El Impostor',
            description: 'Adivina quién es el impostor entre los jugadores',
            icon: '🎭',
            minPlayers: 3,
            maxPlayers: 20,
            available: true
        },
        // Aquí se pueden añadir más minijuegos en el futuro
        // {
        //     id: 'another-game',
        //     name: 'Otro Juego',
        //     description: 'Descripción del juego',
        //     icon: '🎮',
        //     minPlayers: 2,
        //     maxPlayers: 10,
        //     available: false
        // }
    ]

    return (
        <div className="game-selector-container">
            <h1 className="game-selector-title">
                Selecciona un Minijuego
            </h1>
            
            <div className="games-grid">
                {games.map(game => (
                    <div
                        key={game.id}
                        className={`game-card ${!game.available ? 'unavailable' : ''}`}
                        onClick={() => game.available && onGameSelect(game.id)}
                    >
                        <div className="game-icon">
                            {game.icon}
                        </div>
                        <h2 className="game-name">
                            {game.name}
                        </h2>
                        <p className="game-description">
                            {game.description}
                        </p>
                        <p className="game-players">
                            {game.minPlayers}-{game.maxPlayers} jugadores
                        </p>
                        {!game.available && (
                            <p className="game-unavailable-badge">
                                Próximamente
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
