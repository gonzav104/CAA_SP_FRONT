import { api } from '@/api/client'
import { isUnauthorized } from '@/api/errors'
import type { AuthResponse, CurrentUser, LoginRequest } from './types'

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
