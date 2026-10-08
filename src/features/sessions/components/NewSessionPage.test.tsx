import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentUser } from '@/features/auth/authApi'
import { fetchBoards } from '@/features/boards/boardsApi'
import { boardsListResponse } from '@/features/boards/testing/fixtures'
import { fetchPatient } from '@/features/patients/patientsApi'
import { therapist, therapistPatientsResponse } from '@/features/patients/testing/fixtures'
import { renderApp } from '@/test/renderApp'
import type { SesionResponse } from '../apiTypes'
import { createSession, fetchSessions } from '../sessionsApi'
import { PATIENT_ID, sessionsListResponse } from '../testing/fixtures'

vi.mock('@/features/auth/authApi')
vi.mock('@/features/patients/patientsApi')
vi.mock('@/features/boards/boardsApi')
vi.mock('../sessionsApi')

const url = `/pacientes/${PATIENT_ID}/sesiones/nueva`

const newSessionResponse: SesionResponse = {
  id: 's-new',
  fechaHora: '2026-03-01T10:00:00',
  disposicion: null,
  objetivosTrabajados: 'Pedir ayuda',
  observaciones: null,
  estrategiasYProximosPasos: null,
  creadoEn: '2026-03-01T10:05:00',
  pacienteId: PATIENT_ID,
}

describe('NewSessionPage', () => {
  beforeEach(() => {
    vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(therapist)
    vi.mocked(fetchPatient).mockReset().mockResolvedValue(therapistPatientsResponse[0])
    vi.mocked(fetchBoards).mockReset().mockResolvedValue(boardsListResponse)
    vi.mocked(fetchSessions).mockReset().mockResolvedValue(sessionsListResponse)
    vi.mocked(createSession).mockReset()
  })

  it('links back to the sessions list', async () => {
    renderApp(url)
    expect(await screen.findByRole('link', { name: 'Volver a sesiones' })).toHaveAttribute(
      'href',
      `/pacientes/${PATIENT_ID}/sesiones`,
    )
  })

  it('registers a session and opens its detail page', async () => {
    // Nothing reads the sessions list before the creation navigates away; the first real fetch
    // happens on the detail page, by which point the server already has the new session.
    vi.mocked(fetchSessions).mockResolvedValue([...sessionsListResponse, newSessionResponse])
    vi.mocked(createSession).mockResolvedValue(newSessionResponse)
    renderApp(url)

    await userEvent.type(await screen.findByLabelText('Objetivos trabajados'), 'Pedir ayuda')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar sesión' }))

    expect(createSession).toHaveBeenCalledWith(PATIENT_ID, expect.objectContaining({ objetivosTrabajados: 'Pedir ayuda' }))
    expect(await screen.findByRole('heading', { name: '01/03/2026 · 10:00' })).toBeInTheDocument()
  })

  it('requires objetivos trabajados before submitting', async () => {
    renderApp(url)
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar sesión' }))
    expect(await screen.findByText('Los objetivos trabajados son obligatorios.')).toBeInTheDocument()
    expect(createSession).not.toHaveBeenCalled()
  })

  it('shows a server error and keeps the typed values', async () => {
    vi.mocked(createSession).mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
    renderApp(url)
    await userEvent.type(await screen.findByLabelText('Objetivos trabajados'), 'Pedir ayuda')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar sesión' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor.')
    expect(screen.getByLabelText('Objetivos trabajados')).toHaveValue('Pedir ayuda')
  })
})
