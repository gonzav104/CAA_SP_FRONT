import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentUser } from '@/features/auth/authApi'
import { fetchBoards } from '@/features/boards/boardsApi'
import { boardsListResponse } from '@/features/boards/testing/fixtures'
import { fetchPatient } from '@/features/patients/patientsApi'
import { therapist, therapistPatientsResponse } from '@/features/patients/testing/fixtures'
import { renderApp } from '@/test/renderApp'
import { fetchSessions, updateSession } from '../sessionsApi'
import { PATIENT_ID, sessionsListResponse } from '../testing/fixtures'

vi.mock('@/features/auth/authApi')
vi.mock('@/features/patients/patientsApi')
vi.mock('@/features/boards/boardsApi')
vi.mock('../sessionsApi')

const url = `/pacientes/${PATIENT_ID}/sesiones/s-1/editar`

describe('EditSessionPage', () => {
  beforeEach(() => {
    vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(therapist)
    vi.mocked(fetchPatient).mockReset().mockResolvedValue(therapistPatientsResponse[0])
    vi.mocked(fetchBoards).mockReset().mockResolvedValue(boardsListResponse)
    vi.mocked(fetchSessions).mockReset().mockResolvedValue(sessionsListResponse)
    vi.mocked(updateSession).mockReset()
  })

  it('preloads the real session data', async () => {
    renderApp(url)
    expect(await screen.findByLabelText('Objetivos trabajados')).toHaveValue('Pedir ayuda con pictogramas')
    expect(screen.getByLabelText('Observaciones')).toHaveValue('Buena respuesta inicial')
    expect(screen.getByLabelText('Fecha y hora')).toHaveValue('2026-01-10T10:00')
  })

  it('saves the changes and returns to the detail page', async () => {
    vi.mocked(updateSession).mockResolvedValue({ ...sessionsListResponse[0], objetivosTrabajados: 'Pedir ayuda, mejorado' })
    renderApp(url)
    const objetivos = await screen.findByLabelText('Objetivos trabajados')
    await userEvent.clear(objetivos)
    await userEvent.type(objetivos, 'Pedir ayuda, mejorado')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(updateSession).toHaveBeenCalledWith(
      PATIENT_ID,
      's-1',
      expect.objectContaining({ objetivosTrabajados: 'Pedir ayuda, mejorado' }),
    )
    expect(await screen.findByText(`/pacientes/${PATIENT_ID}/sesiones/s-1`)).toBeInTheDocument()
  })
})
