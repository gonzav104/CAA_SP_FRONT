// Sample data for the design prototypes. Fictional, consistent with the real product model (spaces with a
// management role and a clinical capacity, patients shared with a family member). Not real usage data.
export interface Espacio {
  id: string
  nombre: string
  rolGestion: 'Propietario' | 'Administrador' | 'Miembro'
  terapeuta: boolean
  pacientes: number
}

export const usuario = { nombre: 'Olivia', apellido: 'Rivas', email: 'olivia.rivas@centrosol.example' }

export const espacios: Espacio[] = [
  { id: 'centro-sol', nombre: 'Centro Sol', rolGestion: 'Propietario', terapeuta: true, pacientes: 2 },
  { id: 'consultorio-norte', nombre: 'Consultorio Norte', rolGestion: 'Miembro', terapeuta: true, pacientes: 1 },
]

/** Patients shared with this person as a family member (outside any space). */
export const pacientesCompartidos = 1

export const pacientesACargo = espacios.reduce((total, espacio) => total + espacio.pacientes, 0)

export function rolTexto(espacio: Espacio): string {
  return espacio.terapeuta ? `${espacio.rolGestion} · Terapeuta` : espacio.rolGestion
}

export function saludo(date = new Date()): string {
  const hora = date.getHours()
  if (hora < 12) return 'Buenos días'
  if (hora < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

export function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`
}
