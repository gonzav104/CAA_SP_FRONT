export interface Session {
  id: string
  /** ISO local datetime, `YYYY-MM-DDTHH:mm[:ss]`. */
  dateTime: string
  disposition: string | null
  objectives: string
  notes: string | null
  nextSteps: string | null
  patientId: string
}
