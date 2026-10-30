import { screen, within } from '@testing-library/react'
import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentUser } from '@/features/auth/authApi'
import type { CurrentUser } from '@/features/auth/types'
import { fetchOrganizations } from '@/features/organizations/organizationsApi'
import type { OrganizacionResponse } from '@/features/organizations/apiTypes'
import { therapistMemberOrganization } from '@/features/organizations/testing/fixtures'
import { fetchPatients } from '@/features/patients/patientsApi'
import { familyMember, therapist, therapistPatientsResponse } from '@/features/patients/testing/fixtures'
import { renderApp } from '@/test/renderApp'

vi.mock('@/features/auth/authApi')
vi.mock('@/features/organizations/organizationsApi')
vi.mock('@/features/patients/patientsApi')

function setup(user: CurrentUser, organizations: OrganizacionResponse[] = [therapistMemberOrganization]) {
  vi.mocked(fetchCurrentUser).mockResolvedValue(user)
  vi.mocked(fetchOrganizations).mockResolvedValue(organizations)
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(fetchPatients).mockReset()
    vi.mocked(fetchCurrentUser).mockReset()
    vi.mocked(fetchOrganizations).mockReset()
  })

  it('greets the current user by name', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue(therapistPatientsResponse)
    renderApp('/')
    expect(await screen.findByRole('heading', { level: 1, name: /Ana/ })).toBeInTheDocument()
  })

  it('never duplicates the patients directory: no search box, no patient list', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue(therapistPatientsResponse)
    renderApp('/')
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.queryByText('Bruno Álvarez')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver todos los pacientes' })).not.toBeInTheDocument()
  })

  it('shows the real patient count while it loads, on success and on error', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockReturnValue(new Promise(() => {}))
    renderApp('/')
    expect(await screen.findByText('Cargando pacientes…')).toBeInTheDocument()
  })

  it('shows the real patient count and the right noun for a therapist', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue(therapistPatientsResponse)
    renderApp('/')
    expect(await screen.findByText('3')).toBeInTheDocument()
    expect(screen.getByText('pacientes a tu cargo')).toBeInTheDocument()
  })

  it('shows the right noun for a family collaborator', async () => {
    setup(familyMember, [])
    vi.mocked(fetchPatients).mockResolvedValue([therapistPatientsResponse[0]])
    renderApp('/')
    expect(await screen.findByText('1')).toBeInTheDocument()
    expect(screen.getByText('paciente vinculado')).toBeInTheDocument()
  })

  it('shows a plain fallback for the count on error, without a blocking alert', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
    renderApp('/')
    expect(await screen.findByText('No se pudo cargar el total.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('offers a real "Nuevo paciente" shortcut to a therapist, that lands on Pacientes with the form open', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue([])
    renderApp('/')
    const shortcut = await screen.findByRole('link', { name: /Nuevo paciente/ })
    expect(shortcut).toHaveAttribute('href', '/pacientes?crear=1')
  })

  it('does not offer "Nuevo paciente" to a family collaborator', async () => {
    setup(familyMember, [])
    vi.mocked(fetchPatients).mockResolvedValue([therapistPatientsResponse[0]])
    renderApp('/')
    await screen.findByRole('link', { name: 'Ver pacientes' })
    expect(screen.queryByRole('link', { name: /Nuevo paciente/ })).not.toBeInTheDocument()
  })

  it('a family member sees the patients, nothing to manage', async () => {
    setup(familyMember, [])
    vi.mocked(fetchPatients).mockResolvedValue([therapistPatientsResponse[0]])
    renderApp('/')
    expect(await screen.findByRole('link', { name: 'Ver pacientes' })).toHaveAttribute('href', '/pacientes')
    expect(screen.queryByRole('link', { name: 'Gestionar pacientes' })).not.toBeInTheDocument()
  })

  it('leaves only the onboarding to a user with no spaces and no patients', async () => {
    setup(familyMember, [])
    vi.mocked(fetchPatients).mockResolvedValue([])
    renderApp('/')
    expect(await screen.findByText('Todavía no tenés pacientes.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Gestionar pacientes/ })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Creá tu espacio de trabajo' })).toBeInTheDocument()
  })

  it('always offers "Gestionar pacientes" to the real directory', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue([])
    renderApp('/')
    const link = await screen.findByRole('link', { name: /Gestionar pacientes/ })
    expect(link).toHaveAttribute('href', '/pacientes')
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

  it('keeps the session identity, email and logout control in the sidebar', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue([])
    renderApp('/')
    expect(await screen.findByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument()
  })

  it('shows Configuración as a planned, non-interactive section', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue([])
    renderApp('/')
    await screen.findByRole('navigation', { name: 'Principal' })
    expect(screen.getByText('Próximamente')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Configuración' })).not.toBeInTheDocument()
    expect(screen.getByTitle('Configuración: próximamente')).toHaveAttribute('aria-disabled', 'true')
  })

  it('does not list Sesiones or Pictogramas globally: they are contextual to one patient', async () => {
    setup(therapist)
    vi.mocked(fetchPatients).mockResolvedValue([])
    renderApp('/')
    await screen.findByRole('navigation', { name: 'Principal' })
    expect(screen.queryByText('Sesiones')).not.toBeInTheDocument()
    expect(screen.queryByText('Pictogramas')).not.toBeInTheDocument()
  })
})
