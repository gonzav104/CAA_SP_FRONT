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
