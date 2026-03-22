# Estructura de Minijuegos

Este proyecto ahora soporta múltiples minijuegos. La estructura está organizada para facilitar la adición de nuevos juegos en el futuro.

## Estructura de Carpetas

```
client/src/
├── games/               # Carpeta para todos los minijuegos
│   └── impostor/       # Componentes específicos del juego El Impostor
│       ├── ImpostorGamePlay.jsx
│       ├── ImpostorGameSettings.jsx
│       ├── ImpostorGameEnd.jsx
│       ├── ImpostorCountdown.jsx
│       └── ImpostorWaitingForSettings.jsx
│
├── Componentes Generales (raíz de src/)
│   ├── Lobby.jsx                    # Gestiona el flujo general
│   ├── UserNameInput.jsx            # Entrada de nombre de usuario
│   ├── GameSelector.jsx             # Selector de minijuegos
│   ├── RoomSelection.jsx            # Selección crear/unirse a sala
│   ├── CreateRoomForm.jsx           # Formulario para crear sala
│   ├── JoinRoomForm.jsx             # Formulario para unirse a sala
│   └── Room.jsx                     # Sala de espera
```

## Flujo de la Aplicación

1. **Entrada de Nombre** (`UserNameInput`) - El usuario ingresa su nombre
2. **Selección de Juego** (`GameSelector`) - El usuario elige un minijuego
3. **Selección de Sala** (`RoomSelection`) - Crear o unirse a una sala
4. **Sala de Espera** (`Room`) - Esperar a que se unan jugadores
5. **Componentes del Juego** - Depende del minijuego seleccionado

## Cómo Añadir un Nuevo Minijuego

### 1. Crear la carpeta del juego

Crea una nueva carpeta en `src/games/` con el nombre de tu juego:

```
src/games/mi-nuevo-juego/
```

### 2. Crear los componentes necesarios

Cada juego debe tener al menos:

- **GameSettings** - Configuración del juego (host)
- **WaitingForSettings** - Pantalla de espera (invitados)
- **Countdown** - Cuenta regresiva antes de empezar
- **GamePlay** - El juego en sí
- **GameEnd** - Pantalla de fin de juego

Ejemplo:
```
src/games/mi-nuevo-juego/
├── MiNuevoJuegoSettings.jsx
├── MiNuevoJuegoWaitingForSettings.jsx
├── MiNuevoJuegoCountdown.jsx
├── MiNuevoJuegoPlay.jsx
└── MiNuevoJuegoEnd.jsx
```

### 3. Añadir el juego al GameSelector

Edita `src/GameSelector.jsx` y añade tu juego al array `games`:

```jsx
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
    {
        id: 'mi-nuevo-juego',
        name: 'Mi Nuevo Juego',
        description: 'Descripción de tu juego',
        icon: '🎮',
        minPlayers: 2,
        maxPlayers: 10,
        available: true  // Cambiar a true cuando esté listo
    }
]
```

### 4. Actualizar Lobby.jsx

Importa tus componentes:

```jsx
import MiNuevoJuegoSettings from './games/mi-nuevo-juego/MiNuevoJuegoSettings'
import MiNuevoJuegoPlay from './games/mi-nuevo-juego/MiNuevoJuegoPlay'
// ... otros componentes
```

Añade los casos en las vistas correspondientes:

```jsx
if (currentView === "game-settings") {
    if (selectedGame === "impostor") {
        return <ImpostorGameSettings ... />
    }
    if (selectedGame === "mi-nuevo-juego") {
        return <MiNuevoJuegoSettings ... />
    }
}

// Repetir para waiting-for-settings, countdown, playing, game-end
```

### 5. Configurar el servidor (si es necesario)

Si tu juego requiere lógica específica del servidor, añádela en `server/server.js`.

## Minijuegos Disponibles

### ✅ El Impostor
- **Estado**: Disponible
- **Jugadores**: 3-20
- **Descripción**: Adivina quién es el impostor entre los jugadores

### 🔜 Próximamente
- Añade aquí tus nuevos minijuegos

## Notas Importantes

- Los componentes generales (Lobby, Room, RoomSelection, etc.) se mantienen en la raíz de `src/`
- Cada juego debe estar completamente contenido en su carpeta `games/nombre-del-juego/`
- Los componentes del juego deben seguir el patrón de nomenclatura: `NombreDelJuegoComponente.jsx`
- Mantener la propiedad `available: false` en GameSelector hasta que el juego esté completamente implementado
