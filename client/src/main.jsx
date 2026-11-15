import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const root = createRoot(document.getElementById('root'))
const preview = new URLSearchParams(window.location.search).get('preview')

if (import.meta.env.DEV && preview) {
  // Vista previa de diseño solo en desarrollo (ver Preview.jsx). No abre socket.
  import('./Preview.jsx').then((mod) => {
    const Preview = mod.default
    root.render(<StrictMode><Preview name={preview} /></StrictMode>)
  })
} else {
  import('./Lobby.jsx').then((mod) => {
    const Lobby = mod.default
    root.render(<StrictMode><Lobby /></StrictMode>)
  })
}
