// Enlaces de invitación: ?sala=<código>&nombre=<nombre de sala>&juego=<id>
// Quien abre el enlace solo tiene que escribir su nombre para entrar.

const CODE_RE = /^[A-Z0-9]{4}$/

export function buildInviteUrl({ code, name, game }) {
    const url = new URL(window.location.origin + window.location.pathname)
    url.searchParams.set("sala", code)
    url.searchParams.set("nombre", name)
    url.searchParams.set("juego", game)
    return url.toString()
}

// Lee la invitación de la URL (si la hay) y la quita de la barra de
// direcciones, para que recargar la página no vuelva a intentar entrar.
export function readInviteFromUrl() {
    const params = new URLSearchParams(window.location.search)
    const code = (params.get("sala") || "").trim().toUpperCase()
    const name = (params.get("nombre") || "").trim()
    const game = (params.get("juego") || "").trim()
    if (!params.has("sala")) return null

    params.delete("sala")
    params.delete("nombre")
    params.delete("juego")
    const rest = params.toString()
    window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : "") + window.location.hash)

    if (!CODE_RE.test(code) || !name || !game) return null
    return { code, name, game }
}

// Comparte el enlace con el menú nativo en móvil; en escritorio (o si no hay
// menú de compartir) lo copia. Devuelve "shared" | "copied" | "cancelled" | "failed".
export async function shareInvite({ url, roomName, gameName }) {
    const isTouch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches
    if (isTouch && navigator.share) {
        try {
            await navigator.share({
                title: "Lounge",
                text: `Únete a «${roomName}» en Lounge (${gameName})`,
                url
            })
            return "shared"
        } catch (err) {
            if (err && err.name === "AbortError") return "cancelled"
            // Si el menú falla por otro motivo, se intenta copiar
        }
    }
    try {
        await navigator.clipboard.writeText(url)
        return "copied"
    } catch {
        // Navegadores sin API de portapapeles (o sin HTTPS)
        const ta = document.createElement("textarea")
        ta.value = url
        ta.setAttribute("readonly", "")
        ta.style.position = "fixed"
        ta.style.opacity = "0"
        document.body.appendChild(ta)
        ta.select()
        const ok = document.execCommand && document.execCommand("copy")
        document.body.removeChild(ta)
        return ok ? "copied" : "failed"
    }
}
