import { api } from '@/api/client'
import { isUnauthorized } from '@/api/errors'
import type { AuthResponse, CurrentUser, LoginRequest, RegistroRequest, RestablecerPasswordRequest } from './types'

// The session is the httpOnly cookie set by the backend; callers must ignore the response body.
export async function login(request: LoginRequest): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login', request)
  return response.data
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}

// Resolves null when there is no valid session; any other failure is rethrown.
export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  try {
    const response = await api.get<CurrentUser>('/api/usuarios/me')
    return response.data
  } catch (error) {
    if (isUnauthorized(error)) return null
    throw error
  }
}

/** 201 with the new user (UsuarioResponseDTO). It does not log in: the caller goes to /login next. */
export async function register(request: RegistroRequest): Promise<CurrentUser> {
  const response = await api.post<CurrentUser>('/api/usuarios/registro', request)
  return response.data
}

// The backend answers the same whether the e-mail has an account or not; the body is not needed.
export async function requestPasswordReset(email: string): Promise<void> {
  await api.post('/auth/olvide-password', { email })
}

// The token travels only in the body, never in the request URL.
export async function resetPassword(request: RestablecerPasswordRequest): Promise<void> {
  await api.post('/auth/restablecer-password', request)
}
