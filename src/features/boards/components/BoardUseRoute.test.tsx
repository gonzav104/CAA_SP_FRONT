import { fireEvent, screen, waitFor } from '@testing-library/react'
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

  it('renders only visible cards in visual order with label and spoken text mapped', async () => {
    renderApp(url)
    await screen.findByRole('heading', { name: 'Comunicación de Tomás', hidden: true })
    const cards = screen.getAllByRole('button').filter((b) => b.hasAttribute('aria-description'))
    expect(cards.map((c) => c.getAttribute('aria-label'))).toEqual(['Hambre', 'Baño', 'Ayuda', 'Jugar'])
    expect(screen.queryByRole('button', { name: 'Sed' })).not.toBeInTheDocument()
    const jugar = screen.getByRole('button', { name: 'Jugar' })
    expect(jugar).toHaveAttribute('aria-description', 'Quiero jugar un rato')
    expect(screen.getByText('Tomás', { selector: 'span' })).toBeInTheDocument()
  })

  it('shows the empty state when no card is visible', async () => {
    vi.mocked(fetchBoardDetail).mockResolvedValue({ ...boardDetailResponse, categorias: [] })
    renderApp(url)
    expect(await screen.findByText('No hay tarjetas visibles en esta cartilla.')).toBeInTheDocument()
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
