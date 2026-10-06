import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { familyMember, therapist, therapistPatientsResponse } from '@/features/patients/testing/fixtures'
import type { CurrentUser } from '@/features/auth/types'
import { renderApp } from '@/test/renderApp'
import { boardDetailResponse, BOARD_ID, PATIENT_ID } from '../testing/fixtures'

const url = `/pacientes/${PATIENT_ID}/cartillas/${BOARD_ID}/editor`

// Only `get` is implemented; the editor tests here never click Save, so every mutating verb must stay uncalled.
function mockApi(user: CurrentUser, detail: () => Promise<unknown> = () => Promise.resolve(boardDetailResponse)) {
  const mutations = {
    post: vi.spyOn(api, 'post'),
    put: vi.spyOn(api, 'put'),
    patch: vi.spyOn(api, 'patch'),
    delete: vi.spyOn(api, 'delete'),
  }
  vi.spyOn(api, 'get').mockImplementation(async (requestUrl: string) => {
    if (requestUrl === '/api/usuarios/me') return { data: user }
    if (requestUrl === `/api/pacientes/${PATIENT_ID}`) return { data: therapistPatientsResponse[0] }
    if (requestUrl === '/api/pictogramas-globales') return { data: [] }
    if (requestUrl === `/api/pacientes/${PATIENT_ID}/cartillas/${BOARD_ID}`) return { data: await detail() }
    throw new Error(`Unexpected GET ${requestUrl}`)
  })
  return mutations
}

describe('BoardEditorRoute', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a loading status first', async () => {
    mockApi(therapist, () => new Promise(() => {}))
    renderApp(url)
    expect(await screen.findByText('Cargando cartilla…')).toBeInTheDocument()
  })

  it('shows real data: hidden item in the list, excluded from the preview', async () => {
    mockApi(therapist)
    renderApp(url)
    expect(await screen.findByRole('heading', { name: 'Tomás Pérez' })).toBeInTheDocument()
    const rows = screen.getAllByTestId('board-item')
    expect(rows).toHaveLength(5)
    expect(rows.map((r) => r.querySelector('.font-medium')?.textContent)).toEqual(['Hambre', 'Baño', 'Sed', 'Ayuda', 'Jugar'])
    expect(within(rows[2]).getByText('Oculta')).toBeInTheDocument()
    expect(screen.getByText('5 de 12')).toBeInTheDocument()
    const preview = screen.getByTestId('board-preview')
    expect(within(preview).queryByRole('button', { name: 'Sed' })).not.toBeInTheDocument()
    expect(within(preview).getAllByRole('button')).toHaveLength(4)
    expect(screen.getByRole('link', { name: 'Volver a las cartillas de Tomás' })).toHaveAttribute(
      'href',
      `/pacientes/${PATIENT_ID}/cartillas`,
    )
    expect(screen.getByRole('link', { name: /Abrir Modo Uso/ })).toHaveAttribute(
      'href',
      `/pacientes/${PATIENT_ID}/cartillas/${BOARD_ID}/uso`,
    )
  })

  it('shows the dirty notice on edit and restores on discard, sending nothing until Save', async () => {
    const mutations = mockApi(therapist)
    renderApp(url)
    await screen.findByRole('heading', { name: 'Tomás Pérez' })
    expect(screen.queryByText('Cambios sin guardar')).not.toBeInTheDocument()

    const label = screen.getByLabelText('Texto visible')
    fireEvent.change(label, { target: { value: 'Comida' } })
    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument()
    expect(screen.getByText(/Se guardan al presionar «Guardar cambios»/)).toBeInTheDocument()
    expect(screen.getAllByTestId('board-item')[0]).toHaveTextContent('Comida')

    await userEvent.click(screen.getByRole('button', { name: 'Descartar cambios' }))
    expect(screen.queryByText('Cambios sin guardar')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('board-item')[0]).toHaveTextContent('Hambre')

    expect(screen.getByRole('button', { name: 'Agregar tarjeta' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Eliminar tarjeta' })).toBeEnabled()
    // No write until Save is clicked or a create/delete is confirmed; patch is never issued.
    Object.values(mutations).forEach((spy) => expect(spy).not.toHaveBeenCalled())
  })

  it('keeps the real pictogram selected in the picker even if it is not in the local library', async () => {
    mockApi(therapist)
    renderApp(url)
    await screen.findByRole('heading', { name: 'Tomás Pérez' })
    expect(await screen.findByRole('radio', { name: 'hambre', checked: true })).toBeInTheDocument()
  })

  it('shows the no-permission page for a non-creator', async () => {
    mockApi(familyMember)
    renderApp(url)
    expect(await screen.findByText('No tienes permiso para editar esta cartilla.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir en Modo Uso' })).toHaveAttribute(
      'href',
      `/pacientes/${PATIENT_ID}/cartillas/${BOARD_ID}/uso`,
    )
    expect(screen.getByRole('link', { name: 'Volver a las cartillas' })).toHaveAttribute(
      'href',
      `/pacientes/${PATIENT_ID}/cartillas`,
    )
    expect(screen.queryByTestId('board-item')).not.toBeInTheDocument()
  })

  it('shows an error with retry and a way back', async () => {
    mockApi(therapist, () => Promise.reject(new AxiosError('Network Error', 'ERR_NETWORK')))
    renderApp(url)
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor.')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a las cartillas' })).toBeInTheDocument()
  })
})
