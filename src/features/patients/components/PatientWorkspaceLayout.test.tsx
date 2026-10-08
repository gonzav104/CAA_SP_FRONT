import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentUser } from '@/features/auth/authApi'
import { fetchBoards } from '@/features/boards/boardsApi'
import { boardsListResponse } from '@/features/boards/testing/fixtures'
import { renderApp } from '@/test/renderApp'
import { deletePatient, fetchPatient, updatePatient } from '../patientsApi'
import { familyMember, therapist, therapistPatientsResponse } from '../testing/fixtures'

vi.mock('@/features/auth/authApi')
vi.mock('@/features/boards/boardsApi')
vi.mock('../patientsApi')

const PATIENT_ID = therapistPatientsResponse[0].id
const url = `/pacientes/${PATIENT_ID}/cartillas`

describe('PatientWorkspaceLayout', () => {
  beforeEach(() => {
    vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(therapist)
    vi.mocked(fetchPatient).mockReset().mockResolvedValue(therapistPatientsResponse[0])
    vi.mocked(fetchBoards).mockReset().mockResolvedValue(boardsListResponse)
    vi.mocked(updatePatient).mockReset()
    vi.mocked(deletePatient).mockReset()
  })

  it('redirects /pacientes/:id to the Cartillas tab', async () => {
    renderApp(`/pacientes/${PATIENT_ID}`)
    expect(await screen.findByText(`/pacientes/${PATIENT_ID}/cartillas`)).toBeInTheDocument()
  })

  it('shows every contextual section as a plain link: icon, name and active state, nothing else', async () => {
    renderApp(url)
    const nav = await screen.findByRole('navigation', { name: 'Secciones del paciente' })
    expect(within(nav).getByRole('link', { name: 'Cartillas' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Sesiones' })).toHaveAttribute('href', `/pacientes/${PATIENT_ID}/sesiones`)
    expect(within(nav).getByRole('link', { name: 'Familia' })).toHaveAttribute('href', `/pacientes/${PATIENT_ID}/familia`)
    expect(within(nav).getByRole('link', { name: 'Pictogramas' })).toBeInTheDocument()
    // The primary action of each section lives in its own content header now, never inside the nav.
    const actionNames = ['Nueva cartilla', 'Registrar sesión', 'Vincular familiar', 'Subir pictograma']
    for (const name of actionNames) {
      expect(within(nav).queryByRole('link', { name })).not.toBeInTheDocument()
    }
  })

  it('hides Sesiones and Familia from a family collaborator, but keeps Pictogramas', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(familyMember)
    vi.mocked(fetchPatient).mockResolvedValue({ ...therapistPatientsResponse[0], miPermiso: 'LECTURA' })
    renderApp(url)
    const nav = await screen.findByRole('navigation', { name: 'Secciones del paciente' })
    expect(within(nav).queryByRole('link', { name: 'Sesiones' })).not.toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: 'Familia' })).not.toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Pictogramas' })).toBeInTheDocument()
  })

  it('shows "Abrir Modo Uso" only when the patient has a principal board', async () => {
    renderApp(url)
    expect(await screen.findByRole('link', { name: 'Abrir Modo Uso' })).toHaveAttribute(
      'href',
      `/pacientes/${PATIENT_ID}/cartillas/c-1/uso`,
    )
  })

  it('hides edit/delete actions from a family collaborator', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(familyMember)
    vi.mocked(fetchPatient).mockResolvedValue({ ...therapistPatientsResponse[0], miPermiso: 'EDICION_LIMITADA' })
    renderApp(url)
    await screen.findByRole('heading', { name: 'Tomás Pérez' })
    expect(screen.queryByRole('button', { name: 'Editar datos del paciente' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar paciente' })).not.toBeInTheDocument()
  })

  it('edits the patient data with the real fields', async () => {
    vi.mocked(updatePatient).mockResolvedValue({ ...therapistPatientsResponse[0], nombre: 'Tomás Ariel' })
    renderApp(url)
    await screen.findByRole('heading', { name: 'Tomás Pérez' })

    await userEvent.click(screen.getByRole('button', { name: 'Editar datos del paciente' }))
    const nombreInput = screen.getByLabelText('Nombre')
    await userEvent.clear(nombreInput)
    await userEvent.type(nombreInput, 'Tomás Ariel')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(updatePatient).toHaveBeenCalledWith(
      PATIENT_ID,
      expect.objectContaining({ nombre: 'Tomás Ariel', apellido: 'Pérez' }),
    )
  })

  it('deletes the patient after confirmation and returns to the directory', async () => {
    vi.mocked(deletePatient).mockResolvedValue(undefined)
    renderApp(url)
    await screen.findByRole('heading', { name: 'Tomás Pérez' })

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar paciente' }))
    expect(screen.getByText(/sus cartillas, categorías y tarjetas/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sí, eliminar definitivamente' }))

    expect(deletePatient).toHaveBeenCalledWith(PATIENT_ID)
    expect(await screen.findByText('/pacientes')).toBeInTheDocument()
  })
})
