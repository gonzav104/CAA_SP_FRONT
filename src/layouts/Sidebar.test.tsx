import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentUser } from '@/features/auth/authApi'
import { fetchOrganizations } from '@/features/organizations/organizationsApi'
import { adminOrganization, ownerOrganization } from '@/features/organizations/testing/fixtures'
import { fetchPatients } from '@/features/patients/patientsApi'
import { familyPatientsResponse, therapist } from '@/features/patients/testing/fixtures'
import { renderApp } from '@/test/renderApp'

vi.mock('@/features/auth/authApi')
vi.mock('@/features/organizations/organizationsApi')
vi.mock('@/features/patients/patientsApi')

const spacesNav = () => screen.findByRole('navigation', { name: 'Espacios' })

beforeEach(() => {
  vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(therapist)
  vi.mocked(fetchPatients).mockReset().mockResolvedValue([])
  vi.mocked(fetchOrganizations).mockReset().mockResolvedValue([ownerOrganization, adminOrganization])
})

describe('Sidebar spaces', () => {
  it('lists every organization and switches space through the URL', async () => {
    renderApp('/')
    const nav = await spacesNav()
    const link = within(nav).getByRole('link', { name: ownerOrganization.nombre })
    expect(link).toHaveAttribute('href', `/pacientes?espacio=${ownerOrganization.id}`)
    expect(link).not.toHaveAttribute('aria-current')

    await userEvent.click(link)
    expect(within(await spacesNav()).getByRole('link', { name: ownerOrganization.nombre })).toHaveAttribute('aria-current', 'true')
    expect(within(await spacesNav()).getByRole('link', { name: adminOrganization.nombre })).not.toHaveAttribute('aria-current')
  })

  it('marks nothing for a space the user no longer belongs to', async () => {
    renderApp('/pacientes?espacio=org-perdida')
    const nav = await spacesNav()
    for (const link of within(nav).getAllByRole('link')) expect(link).not.toHaveAttribute('aria-current')
  })

  it('offers the shared patients to a family user', async () => {
    vi.mocked(fetchOrganizations).mockResolvedValue([])
    vi.mocked(fetchPatients).mockResolvedValue(familyPatientsResponse)
    renderApp('/')
    const nav = await spacesNav()
    expect(within(nav).getByRole('link', { name: 'Pacientes compartidos' })).toHaveAttribute('href', '/pacientes?espacio=compartidos')
  })

  it('shows no space list to a user without spaces nor shared patients', async () => {
    vi.mocked(fetchOrganizations).mockResolvedValue([])
    renderApp('/')
    await screen.findByRole('navigation', { name: 'Principal' })
    await screen.findByRole('heading', { name: 'Creá tu espacio de trabajo' })
    expect(screen.queryByRole('navigation', { name: 'Espacios' })).not.toBeInTheDocument()
  })
})

describe('Sidebar menu (below lg)', () => {
  it('opens and closes from the button, and Escape closes it returning the focus', async () => {
    renderApp('/')
    const toggle = await screen.findByRole('button', { name: 'Abrir menú' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Cerrar menú' })).toHaveAttribute('aria-expanded', 'true')

    await userEvent.tab()
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes after navigating', async () => {
    renderApp('/')
    await userEvent.click(await screen.findByRole('button', { name: 'Abrir menú' }))
    const nav = screen.getByRole('navigation', { name: 'Principal' })
    await userEvent.click(within(nav).getByRole('link', { name: 'Pacientes' }))
    expect(await screen.findByRole('button', { name: 'Abrir menú' })).toHaveAttribute('aria-expanded', 'false')
  })
})
