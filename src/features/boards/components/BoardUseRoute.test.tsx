import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentUser } from '@/features/auth/authApi'
import { fetchPatient } from '@/features/patients/patientsApi'
import { familyMember, therapist, therapistPatientsResponse } from '@/features/patients/testing/fixtures'
import { renderApp } from '@/test/renderApp'
import { fetchBoardDetail } from '../boardsApi'
import { boardDetailResponse, BOARD_ID, PATIENT_ID } from '../testing/fixtures'

vi.mock('@/features/auth/authApi')
vi.mock('@/features/patients/patientsApi')
vi.mock('../boardsApi')

const url = `/pacientes/${PATIENT_ID}/cartillas/${BOARD_ID}/uso`

describe('BoardUseRoute', () => {
  beforeEach(() => {
    vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(therapist)
    vi.mocked(fetchPatient).mockReset().mockResolvedValue(therapistPatientsResponse[0])
    vi.mocked(fetchBoardDetail).mockReset().mockResolvedValue(boardDetailResponse)
  })

  it('shows a loading status first', async () => {
    vi.mocked(fetchBoardDetail).mockReturnValue(new Promise(() => {}))
    renderApp(url)
    expect(await screen.findByText('Cargando cartilla…')).toBeInTheDocument()
  })

  const cardsIn = () => screen.getAllByRole('button').filter((b) => b.hasAttribute('aria-description'))

  it('opens on the first category (therapist order) showing only its visible cards, in visual order', async () => {
    renderApp(url)
    await screen.findByRole('heading', { name: 'Comunicación de Tomás', hidden: true })
    expect(cardsIn().map((c) => c.getAttribute('aria-label'))).toEqual(['Hambre', 'Baño'])
    expect(screen.queryByRole('button', { name: 'Sed' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ayuda' })).not.toBeInTheDocument()
    expect(screen.getByText('Tomás', { selector: 'span' })).toBeInTheDocument()
  })

  it('lists the real categories as navigation, in therapist order', async () => {
    renderApp(url)
    const nav = await screen.findByRole('navigation', { name: 'Categorías' })
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual(['Necesidades', 'Acciones'])
  })

  it('switching category replaces the grid without speaking and without touching the other category', async () => {
    renderApp(url)
    await screen.findByRole('heading', { name: 'Comunicación de Tomás', hidden: true })
    const nav = screen.getByRole('navigation', { name: 'Categorías' })

    fireEvent.click(within(nav).getByRole('button', { name: 'Acciones' }))

    expect(cardsIn().map((c) => c.getAttribute('aria-label'))).toEqual(['Ayuda', 'Jugar'])
    expect(screen.queryByRole('button', { name: 'Hambre' })).not.toBeInTheDocument()
    const jugar = screen.getByRole('button', { name: 'Jugar' })
    expect(jugar).toHaveAttribute('aria-description', 'Quiero jugar un rato')
    // Selecting a category is navigation, not communication: nothing is marked as speaking.
    expect(jugar).not.toHaveAttribute('data-speaking')

    fireEvent.click(within(nav).getByRole('button', { name: 'Necesidades' }))
    expect(cardsIn().map((c) => c.getAttribute('aria-label'))).toEqual(['Hambre', 'Baño'])
  })

  it('repeated switching between categories is stable and never reorders either one', async () => {
    renderApp(url)
    const nav = await screen.findByRole('navigation', { name: 'Categorías' })
    for (let i = 0; i < 3; i++) {
      fireEvent.click(within(nav).getByRole('button', { name: 'Acciones' }))
      expect(cardsIn().map((c) => c.getAttribute('aria-label'))).toEqual(['Ayuda', 'Jugar'])
      fireEvent.click(within(nav).getByRole('button', { name: 'Necesidades' }))
      expect(cardsIn().map((c) => c.getAttribute('aria-label'))).toEqual(['Hambre', 'Baño'])
    }
  })

  it('omits a category from navigation when every one of its items is hidden', async () => {
    vi.mocked(fetchBoardDetail).mockResolvedValue({
      ...boardDetailResponse,
      categorias: boardDetailResponse.categorias.map((category) =>
        category.id === 'cat-b'
          ? { ...category, items: category.items.map((item) => ({ ...item, visibleEnModoUso: false })) }
          : category,
      ),
    })
    renderApp(url)
    const nav = await screen.findByRole('navigation', { name: 'Categorías' })
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual(['Necesidades'])
  })

  it('shows the empty state when no board category has a visible card', async () => {
    vi.mocked(fetchBoardDetail).mockResolvedValue({ ...boardDetailResponse, categorias: [] })
    renderApp(url)
    expect(await screen.findByText('No hay tarjetas visibles en esta cartilla.')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Categorías' })).not.toBeInTheDocument()
  })

  it('shows an error with retry and a link back to the boards', async () => {
    vi.mocked(fetchBoardDetail).mockRejectedValue(new Error('500'))
    renderApp(url)
    expect(await screen.findByRole('alert')).toHaveTextContent('Ocurrió un error inesperado.')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a las cartillas' })).toHaveAttribute(
      'href',
      `/pacientes/${PATIENT_ID}/cartillas`,
    )
  })

  // The exit button must be held (1.5 s); pointerDown without release triggers it.
  async function holdExit(expectedPath: string) {
    const exit = await screen.findByRole('button', { name: 'Salir (mantener presionado)' })
    fireEvent.pointerDown(exit)
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(new RegExp(`^${expectedPath}$`)), {
      timeout: 3000,
    })
  }

  it('exits to the editor for the creator', async () => {
    renderApp(url)
    await holdExit(`/pacientes/${PATIENT_ID}/cartillas/${BOARD_ID}/editor`)
  })

  it('exits to the boards list for a user who cannot edit', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(familyMember)
    renderApp(url)
    await holdExit(`/pacientes/${PATIENT_ID}/cartillas`)
  })
})
