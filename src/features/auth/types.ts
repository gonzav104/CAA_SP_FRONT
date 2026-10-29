// Field names mirror the backend DTOs: UsuarioResponseDTO, LoginRequestDTO, AuthResponseDTO.
export interface CurrentUser {
  id: string
  email: string
  nombre: string
  creadoEn: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  token: string | null
  tipo: string
}

// Mirrors UsuarioRegistroDTO: identity only, never a role. Registering does not start a session.
export interface RegistroRequest {
  nombre: string
  email: string
  password: string
}

// Mirrors RestablecerPasswordDTO.
export interface RestablecerPasswordRequest {
  token: string
  password: string
}

// Mirrors GoogleAuthResponseDTO. `requiereRegistro`: a verified Google identity with no account (email
// and nombre come from Google, to confirm); otherwise the session cookie is already set.
export interface GoogleAuthResponse {
  requiereRegistro: boolean
  tipo: string | null
  email: string | null
  nombre: string | null
}

// Mirrors GoogleRecuperacionCompletarDTO: both proofs (e-mail token + Google ID token) and a new password.
export interface GoogleRecuperacionCompletarRequest {
  idToken: string
  token: string
  password: string
}
