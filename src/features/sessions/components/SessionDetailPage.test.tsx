import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentUser } from '@/features/auth/authApi'
import { fetchBoards } from '@/features/boards/boardsApi'
import { boardsListResponse } from '@/features/boards/testing/fixtures'
import { fetchPatient } from '@/features/patients/patientsApi'
import { therapist, therapistPatientsResponse } from '@/features/patients/testing/fixtures'
import { renderApp } from '@/test/renderApp'
import { deleteSession, fetchSessions } from '../sessionsApi'
import { PATIENT_ID, sessionsListResponse } from '../testing/fixtures'

vi.mock('@/features/auth/authApi')
vi.mock('@/features/patients/patientsApi')
vi.mock('@/features/boards/boardsApi')
vi.mock('../sessionsApi')

const url = `/pacientes/${PATIENT_ID}/sesiones/s-1`

describe('SessionDetailPage', () => {
  beforeEach(() => {
    vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(therapist)
    vi.mocked(fetchPatient).mockReset().mockResolvedValue(therapistPatientsResponse[0])
    vi.mocked(fetchBoards).mockReset().mockResolvedValue(boardsListResponse)
    vi.mocked(fetchSessions).mockReset().mockResolvedValue(sessionsListResponse)
    vi.mocked(deleteSession).mockReset()
  })

  it('shows every real field, including long text', async () => {
    renderApp(url)
    expect(await screen.findByRole('heading', { name: '10/01/2026 · 10:00' })).toBeInTheDocument()
    expect(screen.getByText('Colaborador')).toBeInTheDocument()
    expect(screen.getByText('Pedir ayuda con pictogramas')).toBeInTheDocument()
    expect(screen.getByText('Buena respuesta inicial')).toBeInTheDocument()
    expect(screen.getByText('Reforzar la próxima semana')).toBeInTheDocument()
  })

  it('links to the dedicated edit page', async () => {
    renderApp(url)
    expect(await screen.findByRole('link', { name: 'Editar' })).toHaveAttribute(
      'href',
      `/pacientes/${PATIENT_ID}/sesiones/s-1/editar`,
    )
  })

  it('deletes the session after confirmation and returns to the list', async () => {
    vi.mocked(deleteSession).mockResolvedValue(undefined)
    renderApp(url)
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }))
    expect(deleteSession).toHaveBeenCalledWith(PATIENT_ID, 's-1')
    expect(await screen.findByText(`/pacientes/${PATIENT_ID}/sesiones`)).toBeInTheDocument()
  })

  it('shows a not-found message for an unknown session id', async () => {
    renderApp(`/pacientes/${PATIENT_ID}/sesiones/s-missing`)
    expect(await screen.findByRole('alert')).toHaveTextContent('Esta sesión ya no existe o no tienes acceso.')
  })
})
