import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentUser } from '@/features/auth/authApi'
import type { CurrentUser } from '@/features/auth/types'
import { renderApp } from '@/test/renderApp'
import { fetchPatients } from '../patientsApi'
import { familyMember, familyPatientsResponse, therapist, therapistPatientsResponse } from '../testing/fixtures'

vi.mock('@/features/auth/authApi')
vi.mock('../patientsApi')

function setup(user: CurrentUser) {
  vi.mocked(fetchCurrentUser).mockResolvedValue(user)
}

describe('PatientsPage', () => {
  beforeEach(() => {
    vi.mocked(fetchPatients).mockReset()
    vi.mocked(fetchCurrentUser).mockReset()
  })

  it('shows a loading state', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockReturnValue(new Promise(() => {}))
    renderApp('/pacientes')
    expect(await screen.findByText('Cargando pacientes…')).toHaveAttribute('role', 'status')
  })

  it('shows the therapist empty copy', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue([])
    renderApp('/pacientes')
    expect(await screen.findByText('Todavía no tienes pacientes registrados.')).toBeInTheDocument()
  })

  it('shows the family empty copy', async () => {
    setup(familyMember)
    vi.mocked(fetchPatients).mockResolvedValue([])
    renderApp('/pacientes')
    expect(await screen.findByText('Todavía no tienes pacientes vinculados.')).toBeInTheDocument()
  })

  it('shows an error and retries', async () => {
    setup(therapist)
    vi.mocked(fetchPatients)
      .mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'))
      .mockResolvedValue(therapistPatientsResponse)
    renderApp('/pacientes')
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor.')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Bruno Álvarez')).toBeInTheDocument()
    expect(fetchPatients).toHaveBeenCalledTimes(2)
  })

  it('lists sorted patients as links to their boards, without badges for therapists', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue(therapistPatientsResponse)
    renderApp('/pacientes')
    const links = await screen.findAllByRole('link', { name: /Ver cartillas/ })
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/pacientes/p-1/cartillas',
      '/pacientes/p-2/cartillas',
      '/pacientes/p-3/cartillas',
    ])
    expect(links[0]).toHaveTextContent('Bruno Álvarez')
    expect(links[0]).toHaveTextContent('Nacimiento: 03/11/2019')
    expect(screen.queryByText('Solo lectura')).not.toBeInTheDocument()
    expect(screen.queryByText('Edición limitada')).not.toBeInTheDocument()
  })

  it('shows collaborator badges', async () => {
    setup(familyMember)
    vi.mocked(fetchPatients).mockResolvedValue(familyPatientsResponse)
    renderApp('/pacientes')
    expect(await screen.findByText('Solo lectura')).toBeInTheDocument()
    expect(screen.getByText('Edición limitada')).toBeInTheDocument()
  })

  it('shows the user name in the top bar', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue([])
    renderApp('/pacientes')
    expect(await screen.findByText('Ana')).toBeInTheDocument()
  })
})
