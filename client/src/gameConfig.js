// Fuente única de metadatos de cada minijuego (id, nombre, jugadores mínimos/máximos, etc.)
// Usada tanto por GameSelector.jsx (elegir juego) como por Room.jsx (gate de "Empezar Juego").
const games = [
    {
        id: 'impostor',
        name: 'El Impostor',
        description: 'Adivina quién es el impostor entre los jugadores',
        icon: '🎭',
        minPlayers: 4,
        maxPlayers: 20,
        available: true
    },
    {
        id: 'cah',
        name: 'Cartas Contra la Humanidad',
        description: 'Completa la frase con la carta más graciosa (o más incómoda)',
        icon: '🃏',
        minPlayers: 3,
        maxPlayers: 20,
        available: true
    }
    // Aquí se pueden añadir más minijuegos en el futuro
]

export function getGameConfig(gameId) {
    return games.find(g => g.id === gameId)
}

export default games
