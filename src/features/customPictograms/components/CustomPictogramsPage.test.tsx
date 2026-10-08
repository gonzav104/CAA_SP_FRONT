import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentUser } from '@/features/auth/authApi'
import { fetchBoards } from '@/features/boards/boardsApi'
import { boardsListResponse } from '@/features/boards/testing/fixtures'
import { fetchPatient } from '@/features/patients/patientsApi'
import { familyMember, therapist, therapistPatientsResponse } from '@/features/patients/testing/fixtures'
import { renderApp } from '@/test/renderApp'
import { createCustomPictogram, deleteCustomPictogram, fetchCustomPictograms } from '../customPictogramsApi'
import { customPictogramsListResponse, PATIENT_ID } from '../testing/fixtures'

vi.mock('@/features/auth/authApi')
vi.mock('@/features/patients/patientsApi')
vi.mock('@/features/boards/boardsApi')
vi.mock('../customPictogramsApi')

const url = `/pacientes/${PATIENT_ID}/pictogramas`

function pngFile(name = 'foto.png'): File {
  return new File(['contenido'], name, { type: 'image/png' })
}

describe('CustomPictogramsPage', () => {
  beforeEach(() => {
    vi.mocked(fetchCurrentUser).mockReset().mockResolvedValue(therapist)
    vi.mocked(fetchPatient).mockReset().mockResolvedValue(therapistPatientsResponse[0])
    vi.mocked(fetchBoards).mockReset().mockResolvedValue(boardsListResponse)
    vi.mocked(fetchCustomPictograms).mockReset().mockResolvedValue(customPictogramsListResponse)
    vi.mocked(createCustomPictogram).mockReset()
    vi.mocked(deleteCustomPictogram).mockReset()
  })

  it('shows the section title and the primary action together in the content header', async () => {
    renderApp(url)
    await screen.findByRole('heading', { name: 'Pictogramas' })
    expect(screen.getByRole('button', { name: 'Subir pictograma' })).toBeInTheDocument()
  })

  it('lists pictograms with their label and preview image', async () => {
    renderApp(url)
    expect(await screen.findByText('Abrigo')).toBeInTheDocument()
    expect(screen.getByText('Mochila')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Abrigo' })).toHaveAttribute('src', 'https://cdn.example.com/abrigo.png')
  })

  it('shows an empty state when there are none', async () => {
    vi.mocked(fetchCustomPictograms).mockResolvedValue([])
    renderApp(url)
    expect(await screen.findByText('Este paciente todavía no tiene pictogramas propios.')).toBeInTheDocument()
  })

  it('uploads a pictogram with the real multipart fields', async () => {
    vi.mocked(fetchCustomPictograms).mockResolvedValueOnce([]).mockResolvedValue(customPictogramsListResponse)
    vi.mocked(createCustomPictogram).mockResolvedValue(customPictogramsListResponse[0])
    renderApp(url)
    await screen.findByText('Este paciente todavía no tiene pictogramas propios.')

    await userEvent.click(screen.getByRole('button', { name: 'Subir pictograma' }))
    await userEvent.type(screen.getByLabelText('Etiqueta'), 'Pelota')
    await userEvent.upload(screen.getByLabelText(/Imagen \(JPEG/), pngFile())
    await userEvent.click(screen.getByRole('button', { name: 'Subir pictograma' }))

    expect(createCustomPictogram).toHaveBeenCalledWith(PATIENT_ID, 'Pelota', expect.any(File))
    expect(await screen.findByText('Mochila')).toBeInTheDocument()
  })

  it('rejects a file over 5MB before calling the server', async () => {
    renderApp(url)
    await screen.findByText('Mochila')
    await userEvent.click(screen.getByRole('button', { name: 'Subir pictograma' }))
    await userEvent.type(screen.getByLabelText('Etiqueta'), 'Pelota')
    const oversized = new File([new Uint8Array(6 * 1024 * 1024)], 'foto.png', { type: 'image/png' })
    await userEvent.upload(screen.getByLabelText(/Imagen \(JPEG/), oversized)
    await userEvent.click(screen.getByRole('button', { name: 'Subir pictograma' }))
    expect(await screen.findByText('La imagen supera el tamaño máximo de 5MB.')).toBeInTheDocument()
    expect(createCustomPictogram).not.toHaveBeenCalled()
  })

  it('deletes a pictogram after confirmation', async () => {
    vi.mocked(deleteCustomPictogram).mockResolvedValue(undefined)
    renderApp(url)
    const card = (await screen.findByText('Mochila')).closest('li')
    if (!card) throw new Error('card not found')
    await userEvent.click(within(card).getByRole('button', { name: 'Eliminar pictograma' }))
    await userEvent.click(within(card).getByRole('button', { name: 'Sí, eliminar' }))
    expect(deleteCustomPictogram).toHaveBeenCalledWith(PATIENT_ID, 'pic-1')
  })

  it('hides the delete action for a family collaborator with limited edition', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(familyMember)
    vi.mocked(fetchPatient).mockResolvedValue({ ...therapistPatientsResponse[0], miPermiso: 'EDICION_LIMITADA' })
    renderApp(url)
    const card = (await screen.findByText('Mochila')).closest('li')
    if (!card) throw new Error('card not found')
    expect(within(card).queryByRole('button', { name: 'Eliminar pictograma' })).not.toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Editar pictograma' })).toBeInTheDocument()
  })

  it('hides every edit action for a read-only family collaborator', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(familyMember)
    vi.mocked(fetchPatient).mockResolvedValue({ ...therapistPatientsResponse[0], miPermiso: 'LECTURA' })
    renderApp(url)
    await screen.findByText('Mochila')
    expect(screen.queryByRole('button', { name: 'Subir pictograma' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar pictograma' })).not.toBeInTheDocument()
  })

  it('opens the upload form directly when the workspace nav shortcut is used', async () => {
    renderApp(`${url}?crear=1`)
    expect(await screen.findByLabelText('Etiqueta', { exact: true })).toBeInTheDocument()
  })
})
