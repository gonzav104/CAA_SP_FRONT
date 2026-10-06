// Field names mirror the backend DTOs: UsuarioResponseDTO, LoginRequestDTO, AuthResponseDTO.
export type UserRole = 'TERAPEUTA' | 'FAMILIAR'

export interface CurrentUser {
  id: string
  email: string
  nombre: string
  rol: UserRole
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
