import { useEffect, useRef, useState } from 'react'
import { getGoogleClientId, loadGoogleIdentity } from './googleIdentity'
import type { GoogleButtonText } from './googleIdentity'

interface GoogleSignInButtonProps {
  /** Receives the Google ID token. It must only be sent to the backend, never stored. */
  onCredential: (idToken: string) => void
  text?: GoogleButtonText
}

/**
 * The official Google button. Closing its popup is not an error (no callback fires, nothing happens);
 * when GIS cannot be loaded a short notice replaces it. Without a configured client ID it renders nothing.
 */
export function GoogleSignInButton({ onCredential, text = 'continue_with' }: GoogleSignInButtonProps) {
  const clientId = getGoogleClientId()
  const container = useRef<HTMLDivElement>(null)
  const latestOnCredential = useRef(onCredential)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    latestOnCredential.current = onCredential
  }, [onCredential])

  useEffect(() => {
    if (!clientId) return
    let active = true
    loadGoogleIdentity()
      .then((googleId) => {
        if (!active || !container.current) return
        googleId.initialize({
          client_id: clientId,
          // GIS keeps this callback after the button is gone (e.g. its popup outlives a navigation):
          // a credential arriving after unmount must not act on a screen the user already left.
          callback: ({ credential }) => {
            if (active && credential) latestOnCredential.current(credential)
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_button: true,
        })
        // GIS draws a fixed-width iframe: match the form column (GIS accepts 200–400px).
        const width = Math.min(400, container.current.offsetWidth)
        googleId.renderButton(container.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          locale: 'es',
          ...(width >= 200 ? { width } : {}),
        })
      })
      .catch(() => {
        if (active) setUnavailable(true)
      })
    return () => {
      active = false
    }
  }, [clientId, text])

  if (!clientId) return null
  if (unavailable) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        El acceso con Google no está disponible en este momento.
      </p>
    )
  }
  return <div ref={container} className="flex min-h-10 justify-center" />
}
