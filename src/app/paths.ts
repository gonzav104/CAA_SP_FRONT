// Route patterns (for <Route path>) and builders (for links/navigation) live together
// so no component hardcodes a URL.
export const routes = {
  login: '/login',
  dashboard: '/',
  patients: '/pacientes',
  boards: '/pacientes/:pacienteId/cartillas',
  boardEditor: '/pacientes/:pacienteId/cartillas/:cartillaId/editor',
  boardUse: '/pacientes/:pacienteId/cartillas/:cartillaId/uso',
} as const

export const paths = {
  dashboard: () => routes.dashboard,
  patients: () => routes.patients,
  boards: (patientId: string) => `/pacientes/${encodeURIComponent(patientId)}/cartillas`,
  boardEditor: (patientId: string, boardId: string) =>
    `/pacientes/${encodeURIComponent(patientId)}/cartillas/${encodeURIComponent(boardId)}/editor`,
  boardUse: (patientId: string, boardId: string) =>
    `/pacientes/${encodeURIComponent(patientId)}/cartillas/${encodeURIComponent(boardId)}/uso`,
}
