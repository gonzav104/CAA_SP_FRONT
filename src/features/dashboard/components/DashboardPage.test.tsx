import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentUser } from '@/features/auth/authApi'
import type { CurrentUser } from '@/features/auth/types'
import { fetchPatients } from '@/features/patients/patientsApi'
import { familyMember, familyPatientsResponse, therapist, therapistPatientsResponse } from '@/features/patients/testing/fixtures'
import { renderApp } from '@/test/renderApp'

vi.mock('@/features/auth/authApi')
vi.mock('@/features/patients/patientsApi')

function setup(user: CurrentUser) {
  vi.mocked(fetchCurrentUser).mockResolvedValue(user)
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(fetchPatients).mockReset()
    vi.mocked(fetchCurrentUser).mockReset()
  })

  it('greets the current user by name', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue(therapistPatientsResponse)
    renderApp('/')
    expect(await screen.findByRole('heading', { level: 1, name: /Ana/ })).toBeInTheDocument()
  })

  it('shows a loading state for the patients list', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockReturnValue(new Promise(() => {}))
    renderApp('/')
    expect(await screen.findByText('Cargando pacientes…')).toHaveAttribute('role', 'status')
  })

  it('shows an error and retries', async () => {
    setup(therapist)
    vi.mocked(fetchPatients)
      .mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'))
      .mockResolvedValue(therapistPatientsResponse)
    renderApp('/')
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor.')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Bruno Álvarez')).toBeInTheDocument()
    expect(fetchPatients).toHaveBeenCalledTimes(2)
  })

  it('shows the empty state for a therapist with no patients', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue([])
    renderApp('/')
    expect(await screen.findByText('Todavía no tenés pacientes disponibles.')).toBeInTheDocument()
  })

  it('shows the empty state for a family member with no linked patients', async () => {
    setup(familyMember)
    vi.mocked(fetchPatients).mockResolvedValue([])
    renderApp('/')
    expect(await screen.findByText('Todavía no tenés pacientes vinculados.')).toBeInTheDocument()
  })

  it('shows real patients, sorted, as quick-access cards with a working open action', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue(therapistPatientsResponse)
    renderApp('/')
    const cards = await screen.findAllByRole('link', { name: /Abrir espacio de comunicación de/ })
    expect(cards.map((c) => c.getAttribute('href'))).toEqual([
      '/pacientes/p-1/cartillas',
      '/pacientes/p-2/cartillas',
      '/pacientes/p-3/cartillas',
    ])
    expect(cards[0]).toHaveAccessibleName('Abrir espacio de comunicación de Bruno Álvarez')
    expect(cards[0]).toHaveTextContent('Bruno Álvarez')
    // Age is derived locally from the real birth date, not asserted as a fixed number (it moves with the clock).
    expect(cards[0]).toHaveTextContent(/\d+ años?/)
  })

  it('shows the collaborator permission badge when present', async () => {
    setup(familyMember)
    vi.mocked(fetchPatients).mockResolvedValue(familyPatientsResponse)
    renderApp('/')
    expect(await screen.findByText('Solo lectura')).toBeInTheDocument()
    expect(screen.getByText('Edición limitada')).toBeInTheDocument()
  })

  it('links to the full patients directory and never duplicates it inline', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue(therapistPatientsResponse)
    renderApp('/')
    const link = await screen.findByRole('link', { name: 'Ver todos los pacientes' })
    expect(link).toHaveAttribute('href', '/pacientes')
  })

  it('filters patients immediately as you type, case-insensitively', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue(therapistPatientsResponse)
    renderApp('/')
    await screen.findByText('Bruno Álvarez')

    await userEvent.type(screen.getByRole('searchbox', { name: /Buscar paciente/ }), 'ALMA')

    expect(screen.getByText('Alma Pérez')).toBeInTheDocument()
    expect(screen.queryByText('Bruno Álvarez')).not.toBeInTheDocument()
    expect(screen.queryByText('Tomás Pérez')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Resultados' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver todos los pacientes' })).not.toBeInTheDocument()
  })

  it('shows a no-matches state and clears back to the full list', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue(therapistPatientsResponse)
    renderApp('/')
    const search = await screen.findByRole('searchbox', { name: /Buscar paciente/ })
    await userEvent.type(search, 'zzz')

    expect(await screen.findByText('Ningún paciente coincide con «zzz».')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }))
    expect(search).toHaveValue('')
    expect(await screen.findByText('Bruno Álvarez')).toBeInTheDocument()
  })

  it('has primary navigation for Inicio and Pacientes, with Inicio current on the dashboard', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue([])
    renderApp('/')
    const nav = await screen.findByRole('navigation', { name: 'Principal' })
    expect(within(nav).getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Pacientes' })).toHaveAttribute('href', '/pacientes')
    expect(within(nav).getByRole('link', { name: 'Pacientes' })).not.toHaveAttribute('aria-current')
  })

  it('keeps the session identity, role and logout control in the sidebar', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue([])
    renderApp('/')
    expect(await screen.findByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Terapeuta')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument()
  })

  it('groups the planned sections under one "Próximamente" heading, as non-interactive items', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue([])
    renderApp('/')
    await screen.findByRole('navigation', { name: 'Principal' })
    expect(screen.getByText('Próximamente')).toBeInTheDocument()
    for (const label of ['Sesiones', 'Pictogramas', 'Configuración']) {
      expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument()
      expect(screen.getByTitle(`${label}: próximamente`)).toHaveAttribute('aria-disabled', 'true')
    }
  })
})
