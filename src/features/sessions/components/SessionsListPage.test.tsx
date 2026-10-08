import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentUser } from '@/features/auth/authApi'
import { fetchBoards } from '@/features/boards/boardsApi'
import { boardsListResponse } from '@/features/boards/testing/fixtures'
import { fetchPatient } from '@/features/patients/patientsApi'
import { therapist, therapistPatientsResponse } from '@/features/patients/testing/fixtures'
import { renderApp } from '@/test/renderApp'
import { fetchSessions } from '../sessionsApi'
import { PATIENT_ID, sessionsListResponse } from '../testing/fixtures'

vi.mock('@/features/auth/authApi')
vi.mock('@/features/patients/patientsApi')
vi.mock('@/features/boards/boardsApi')
vi.mock('../sessionsApi')

const url = `/pacientes/${PATIENT_ID}/sesiones`

describe('SessionsListPage', () => {
  beforeEach(() => {
    vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(therapist)
    vi.mocked(fetchPatient).mockReset().mockResolvedValue(therapistPatientsResponse[0])
    vi.mocked(fetchBoards).mockReset().mockResolvedValue(boardsListResponse)
    vi.mocked(fetchSessions).mockReset().mockResolvedValue(sessionsListResponse)
  })

  it('shows the section title and the primary action together in the content header', async () => {
    renderApp(url)
    await screen.findByRole('heading', { name: 'Sesiones' })
    expect(screen.getByRole('link', { name: 'Registrar sesión' })).toHaveAttribute(
      'href',
      `/pacientes/${PATIENT_ID}/sesiones/nueva`,
    )
  })

  it('lists sessions most recent first, with a compact excerpt and no expanded notes', async () => {
    renderApp(url)
    const items = await screen.findAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('05/02/2026 · 15:30')
    expect(items[1]).toHaveTextContent('10/01/2026 · 10:00')
    expect(items[0]).toHaveTextContent('Reconocer emociones básicas')
    expect(screen.queryByText('Buena respuesta inicial')).not.toBeInTheDocument()
    expect(screen.queryByText('Reforzar la próxima semana')).not.toBeInTheDocument()
  })

  it('shows an empty state', async () => {
    vi.mocked(fetchSessions).mockResolvedValue([])
    renderApp(url)
    expect(await screen.findByText('Todavía no hay sesiones registradas.')).toBeInTheDocument()
  })

  it('links each row to its detail page', async () => {
    renderApp(url)
    const items = await screen.findAllByRole('listitem')
    const link = items[1].querySelector('a')
    expect(link).toHaveAttribute('href', `/pacientes/${PATIENT_ID}/sesiones/s-1`)
  })

  it('navigates to the dedicated form to register a session', async () => {
    renderApp(url)
    const link = await screen.findByRole('link', { name: 'Registrar sesión' })
    expect(link).toHaveAttribute('href', `/pacientes/${PATIENT_ID}/sesiones/nueva`)
  })

  it('shows a read error with retry', async () => {
    vi.mocked(fetchSessions).mockRejectedValueOnce(new Error('500')).mockResolvedValue(sessionsListResponse)
    renderApp(url)
    expect(await screen.findByRole('alert')).toHaveTextContent('Ocurrió un error inesperado.')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findAllByRole('listitem')).toHaveLength(2)
  })
})
