import type { CurrentUser } from '@/features/auth/types'

// Mirrors the backend check in PacienteServiceImpl.registrarPaciente: "Solo un terapeuta puede
// registrar un paciente" — a plain role check, no ownership or collaborator concept involved yet.
export function canCreatePatient(user: CurrentUser | null | undefined): boolean {
  return !!user && user.rol === 'TERAPEUTA'
}
