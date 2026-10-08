import type { Patient } from '@/features/patients/types'

/** Diacritic-insensitive, case-insensitive match against first name, last name or full name. */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/** Patients whose name contains `query`. An empty/blank query matches everyone. Stable order. */
export function filterPatients(patients: Patient[], query: string): Patient[] {
  const needle = normalize(query.trim())
  if (needle === '') return patients
  return patients.filter(
    (patient) => normalize(patient.firstName).includes(needle) || normalize(patient.lastName).includes(needle),
  )
}
