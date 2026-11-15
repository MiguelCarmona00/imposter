import { useEffect, useState } from 'react'

// Copia un texto al portapapeles y marca "copiado" durante 2 segundos.
export function useCopy(text) {
    const [copied, setCopied] = useState(false)
    useEffect(() => {
        if (!copied) return
        const t = setTimeout(() => setCopied(false), 2000)
        return () => clearTimeout(t)
    }, [copied])
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
        } catch (err) {
            console.error('Error al copiar:', err)
        }
    }
    return [copied, copy]
}
