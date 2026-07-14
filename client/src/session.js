// Identidad de jugador persistente entre reconexiones (y recargas accidentales)
// dentro de la misma pestaña. sessionStorage (no localStorage) es a propósito:
// es por pestaña, así que dos pestañas del mismo navegador/móvil nunca chocan.

const PLAYER_ID_KEY = "imposter_playerId"
const BREADCRUMB_KEY = "imposter_session"

function generateId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID()
    }
    // Fallback para navegadores sin crypto.randomUUID (p.ej. Safari < 15.4)
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0
        return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16)
    })
}

export function getPlayerId() {
    let id = sessionStorage.getItem(PLAYER_ID_KEY)
    if (!id) {
        id = generateId()
        sessionStorage.setItem(PLAYER_ID_KEY, id)
    }
    return id
}

export function getBreadcrumb() {
    const raw = sessionStorage.getItem(BREADCRUMB_KEY)
    if (!raw) return null
    try {
        return JSON.parse(raw)
    } catch {
        return null
    }
}

export function setBreadcrumb(data) {
    sessionStorage.setItem(BREADCRUMB_KEY, JSON.stringify(data))
}

export function clearBreadcrumb() {
    sessionStorage.removeItem(BREADCRUMB_KEY)
}
