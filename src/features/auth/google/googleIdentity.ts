// Google Identity Services (the official "Sign in with Google" library). Only the ID token flow is used:
// the credential (a JWT) is handed to the backend, which verifies it; nothing is stored in the browser.
const GIS_SRC = 'https://accounts.google.com/gsi/client'

interface CredentialResponse {
  credential?: string
}

export interface GoogleAccountsId {
  initialize(config: {
    client_id: string
    callback: (response: CredentialResponse) => void
    auto_select?: boolean
    cancel_on_tap_outside?: boolean
    use_fedcm_for_button?: boolean
  }): void
  renderButton(
    parent: HTMLElement,
    options: { type?: 'standard'; theme?: 'outline'; size?: 'large'; text?: GoogleButtonText; width?: number; locale?: string },
  ): void
  disableAutoSelect(): void
}

export type GoogleButtonText = 'signin_with' | 'signup_with' | 'continue_with'

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } }
  }
}

export function getGoogleClientId(): string | null {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()
  return clientId ? clientId : null
}

let loading: Promise<GoogleAccountsId> | null = null

/** Loads the GIS script once; rejects when it cannot be loaded (offline, blocked by an extension…). */
export function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  const ready = window.google?.accounts?.id
  if (ready) return Promise.resolve(ready)
  loading ??= new Promise<GoogleAccountsId>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.defer = true
    script.onload = () => {
      const id = window.google?.accounts?.id
      if (id) resolve(id)
      else reject(new Error('Google Identity Services unavailable'))
    }
    script.onerror = () => reject(new Error('Google Identity Services unavailable'))
    document.head.appendChild(script)
  }).catch((error: unknown) => {
    loading = null
    throw error
  })
  return loading
}
