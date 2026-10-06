import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL

if (!baseURL) {
  throw new Error('VITE_API_URL is not set. Copy .env.example to .env')
}

// The JWT lives only in the backend's httpOnly cookie; the browser sends it automatically.
export const api = axios.create({
  baseURL,
  withCredentials: true,
})

type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler
}

// Auth requests handle their own 401 (wrong credentials, no session yet).
function isAuthRequestUrl(url: string | undefined): boolean {
  if (!url) return false
  return url.startsWith('/auth/') || url === '/api/usuarios/me'
}

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && !isAuthRequestUrl(error.config?.url)) {
      unauthorizedHandler?.()
    }
    return Promise.reject(error)
  },
)
