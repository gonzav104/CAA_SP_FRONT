// Route patterns (for <Route path>) and builders (for links/navigation) live together
// so no component hardcodes a URL.
export const routes = {
  login: '/login',
  dashboard: '/',
  patients: '/pacientes',
  patientSpace: '/pacientes/:pacienteId',
  boards: '/pacientes/:pacienteId/cartillas',
  sessions: '/pacientes/:pacienteId/sesiones',
  sessionNew: '/pacientes/:pacienteId/sesiones/nueva',
  sessionDetail: '/pacientes/:pacienteId/sesiones/:sesionId',
  sessionEdit: '/pacientes/:pacienteId/sesiones/:sesionId/editar',
  collaborators: '/pacientes/:pacienteId/familia',
  customPictograms: '/pacientes/:pacienteId/pictogramas',
  boardEditor: '/pacientes/:pacienteId/cartillas/:cartillaId/editor',
  boardUse: '/pacientes/:pacienteId/cartillas/:cartillaId/uso',
} as const

export const paths = {
  dashboard: () => routes.dashboard,
  patients: () => routes.patients,
  patientSpace: (patientId: string) => `/pacientes/${encodeURIComponent(patientId)}`,
  boards: (patientId: string) => `/pacientes/${encodeURIComponent(patientId)}/cartillas`,
  sessions: (patientId: string) => `/pacientes/${encodeURIComponent(patientId)}/sesiones`,
  sessionNew: (patientId: string) => `/pacientes/${encodeURIComponent(patientId)}/sesiones/nueva`,
  sessionDetail: (patientId: string, sessionId: string) =>
    `/pacientes/${encodeURIComponent(patientId)}/sesiones/${encodeURIComponent(sessionId)}`,
  sessionEdit: (patientId: string, sessionId: string) =>
    `/pacientes/${encodeURIComponent(patientId)}/sesiones/${encodeURIComponent(sessionId)}/editar`,
  collaborators: (patientId: string) => `/pacientes/${encodeURIComponent(patientId)}/familia`,
  customPictograms: (patientId: string) => `/pacientes/${encodeURIComponent(patientId)}/pictogramas`,
  boardEditor: (patientId: string, boardId: string) =>
    `/pacientes/${encodeURIComponent(patientId)}/cartillas/${encodeURIComponent(boardId)}/editor`,
  boardUse: (patientId: string, boardId: string) =>
    `/pacientes/${encodeURIComponent(patientId)}/cartillas/${encodeURIComponent(boardId)}/uso`,
}
