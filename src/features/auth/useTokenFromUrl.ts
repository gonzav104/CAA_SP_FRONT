import { useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'

/**
 * Reads a one-time `?token=` from an e-mail link and immediately moves it out of the address bar (so out
 * of history entries, referrers and screenshots) into the history state under `stateKey`. It is never
 * stored anywhere else. Returns the token, or null when there is none (or it was lost on the way).
 * `isMovingFromUrl` is true during the render before the URL is cleaned.
 */
export function useTokenFromUrl(pathname: string, stateKey: string) {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlToken = searchParams.get('token')

  useEffect(() => {
    if (urlToken) navigate(pathname, { replace: true, state: { [stateKey]: urlToken } })
  }, [urlToken, navigate, pathname, stateKey])

  return { token: urlToken || tokenFromState(location.state, stateKey), isMovingFromUrl: !!urlToken }
}

function tokenFromState(state: unknown, key: string): string | null {
  if (typeof state !== 'object' || state === null || !(key in state)) return null
  const token = (state as Record<string, unknown>)[key]
  return typeof token === 'string' && token !== '' ? token : null
}
