/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  /** Public OAuth client ID; must equal the backend GOOGLE_CLIENT_ID (the ID token audience). Optional: without it Google sign-in is hidden. */
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
