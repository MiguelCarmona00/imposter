// Piezas de interfaz compartidas por todas las pantallas del tema "fieltro negro".
import { useEffect } from 'react'
import { useCopy } from './useCopy'
import spade from './assets/pica.png'

/* ---------- Iconos (trazo, heredan el color del texto) ---------- */

const iconProps = {
    width: 22, height: 22, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round",
    "aria-hidden": true
}

export const BackIcon = () => <svg {...iconProps}><path d="M15 5l-7 7 7 7" /></svg>
export const NextIcon = () => <svg {...iconProps}><path d="M9 5l7 7-7 7" /></svg>
export const ExitIcon = () => <svg {...iconProps}><path d="M14 4h5v16h-5" /><path d="M10 8l-4 4 4 4" /><path d="M6 12h10" /></svg>
export const DotsIcon = () => <svg {...iconProps} fill="currentColor" stroke="none"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
export const CopyIcon = () => <svg {...iconProps} width={16} height={16}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></svg>
export const CheckIcon = ({ size = 11 }) => <svg {...iconProps} width={size} height={size} strokeWidth={3}><path d="M5 12l5 5 9-10" /></svg>
export const CrownIcon = ({ size = 16 }) => <svg {...iconProps} width={size} height={size}><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" /></svg>
export const HatIcon = ({ size = 28 }) => (
    <svg {...iconProps} width={size} height={size} strokeWidth={1.5}>
        <path d="M4 10c0-3 3.6-5 8-5s8 2 8 5" /><path d="M2 11h20" />
        <circle cx="8" cy="15.5" r="2.5" /><circle cx="16" cy="15.5" r="2.5" /><path d="M10.5 15.5h3" />
    </svg>
)
export const CardsIcon = ({ size = 28 }) => (
    <svg {...iconProps} width={size} height={size} strokeWidth={1.5}>
        <rect x="3" y="5" width="11" height="15" rx="1.5" transform="rotate(-8 8.5 12.5)" />
        <rect x="10" y="4" width="11" height="15" rx="1.5" fill="#0B0B0B" transform="rotate(8 15.5 11.5)" />
    </svg>
)

export function GameIcon({ gameId, size }) {
    return gameId === "cah" ? <CardsIcon size={size} /> : <HatIcon size={size} />
}

/* ---------- Logo ---------- */

export function Spade({ className = "logo logo--md", alt = "" }) {
    return <img src={spade} alt={alt} className={className} />
}

/* ---------- Estructura ---------- */

// La mesa de fieltro que envuelve cada pantalla.
export function Table({ children, variant = "", className = "" }) {
    const mods = variant.split(" ").filter(Boolean).map(v => `table--${v}`).join(" ")
    return <main className={`table ${mods} ${className}`}>{children}</main>
}

// Barra superior de tres huecos: izquierda (volver/salir), centro, derecha.
export function TopBar({ left = null, center = null, right = null }) {
    return (
        <header className="topbar">
            <div>{left}</div>
            <div>{center ?? (
                <span className="topbar-brand">
                    <Spade className="topbar-logo" alt="" />
                    <span className="topbar-wordmark">Lounge</span>
                </span>
            )}</div>
            <div>{right}</div>
        </header>
    )
}

// En móvil es solo la flecha; en escritorio se convierte en botón con texto.
export function BackButton({ onClick, label = "Volver" }) {
    return (
        <button type="button" className="nav-btn" onClick={onClick} aria-label={label}>
            <BackIcon />
            <span className="nav-btn__text" aria-hidden="true">{label}</span>
        </button>
    )
}

export function ExitButton({ onClick, label = "Salir", withText = false }) {
    if (withText) {
        return (
            <button type="button" className="nav-btn nav-btn--text" onClick={onClick}>
                <ExitIcon /> <span>{label}</span>
            </button>
        )
    }
    return (
        <button type="button" className="nav-btn" onClick={onClick} aria-label={label}>
            <ExitIcon />
            <span className="nav-btn__text" aria-hidden="true">{label}</span>
        </button>
    )
}

// Código de sala en la barra superior; al tocarlo se copia.
export function CodePill({ code }) {
    const [copied, copy] = useCopy(code)
    if (!code) return null
    return (
        <button type="button" className="code-pill" onClick={copy} title="Copiar código de sala">
            {copied ? "COPIADO" : code}
        </button>
    )
}

/* ---------- Hoja inferior de confirmación ---------- */

export function Sheet({ title, children, onClose }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape") onClose() }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [onClose])

    return (
        <div className="sheet-backdrop" onClick={onClose}>
            <div
                className="sheet"
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sheet__grip" />
                <h2 className="sheet__title">{title}</h2>
                {children}
            </div>
        </div>
    )
}

/* ---------- Controles ---------- */

export function Stepper({ value, min, max, onChange, labelId, decLabel = "Menos", incLabel = "Más" }) {
    return (
        <div className="stepper" role="group" aria-labelledby={labelId}>
            <button type="button" className="stepper__btn" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={decLabel}>−</button>
            <span className="stepper__value" aria-live="polite">{value}</span>
            <button type="button" className="stepper__btn" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={incLabel}>+</button>
        </div>
    )
}

export function Switch({ checked, onChange, labelId }) {
    return (
        <button
            type="button"
            role="switch"
            className="switch"
            aria-checked={checked ? "true" : "false"}
            aria-labelledby={labelId}
            onClick={() => onChange(!checked)}
        />
    )
}

export function Dots() {
    return <span className="dots" aria-hidden="true"><span /><span /><span /></span>
}

// Pantalla genérica de "espera" (ajustes, entrada tardía, reconexión).
export function WaitingScreen({ topLeft, code, title, text, footer }) {
    return (
        <Table>
            <TopBar left={topLeft} center={code ? <CodePill code={code} /> : undefined} />
            <div className="grow center stack" role="status" style={{ gap: 18 }}>
                <Spade />
                <h1 className="title-sm" style={{ fontSize: 26, lineHeight: 1.25 }}>{title}</h1>
                <Dots />
                {text && <p className="soft" style={{ fontSize: 14, maxWidth: 300 }}>{text}</p>}
            </div>
            {footer}
        </Table>
    )
}
