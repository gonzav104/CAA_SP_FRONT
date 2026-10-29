import { paths, routes } from '@/app/paths'

export interface ReturnTo {
  pathname: string
  /** History state of the original location (e.g. a pending invitation token), handed back as is. */
  state?: unknown
}

const DEFAULT_RETURN_TO: ReturnTo = { pathname: paths.dashboard() }

/**
 * Where to go after logging in, read from `location.state.from`. Only same-app paths are accepted, so
 * the redirect can never leave the site (absolute or protocol-relative URLs) nor loop on an auth page.
 */
export function getReturnTo(locationState: unknown): ReturnTo {
  if (typeof locationState !== 'object' || locationState === null || !('from' in locationState)) {
    return DEFAULT_RETURN_TO
  }
  const from = locationState.from
  if (typeof from !== 'object' || from === null || !('pathname' in from)) return DEFAULT_RETURN_TO
  const pathname = from.pathname
  if (
    typeof pathname !== 'string' ||
    !pathname.startsWith('/') ||
    pathname.startsWith('//') ||
    pathname.includes('\\') ||
    AUTH_PATHS.has(pathname)
  ) {
    return DEFAULT_RETURN_TO
  }
  return { pathname, state: 'state' in from ? from.state : undefined }
}

const AUTH_PATHS = new Set<string>([
  routes.login,
  routes.register,
  routes.forgotPassword,
  routes.resetPassword,
  routes.recoverGoogle,
])

/**
 * The `from` to hand over between auth screens (login ⇄ register ⇄ forgot password) so a pending
 * destination, like an invitation, is not lost on the way. Undefined when there is none.
 */
export function pendingFrom(locationState: unknown): unknown {
  if (typeof locationState !== 'object' || locationState === null || !('from' in locationState)) return undefined
  return locationState.from
}
