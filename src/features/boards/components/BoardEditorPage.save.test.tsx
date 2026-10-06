import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { therapist, therapistPatientsResponse } from '@/features/patients/testing/fixtures'
import { renderApp } from '@/test/renderApp'
import type {
  CartillaDetalleResponse,
  ItemCartillaActualizacionRequest,
  MaterializarPictogramaRequest,
  PictogramaGlobalResponse,
} from '../apiTypes'
import { boardDetailResponse, BOARD_ID, PATIENT_ID } from '../testing/fixtures'

const url = `/pacientes/${PATIENT_ID}/cartillas/${BOARD_ID}/editor`
const boardPath = `/api/pacientes/${PATIENT_ID}/cartillas/${BOARD_ID}`
const itemPath = (categoryId: string, itemId: string) => `${boardPath}/categorias/${categoryId}/items/${itemId}`

type PutImpl = (requestUrl: string, body: ItemCartillaActualizacionRequest) => Promise<unknown>
type PostImpl = (requestUrl: string, body: MaterializarPictogramaRequest) => Promise<unknown>

const MATERIALIZE_PATH = '/api/pictogramas-globales/materializar'
const arasaacImageUrl = (arasaacId: number) => `https://static.arasaac.org/pictograms/${arasaacId}/${arasaacId}_300.png`

/** Fake server: `put` applies the update to `server`, so the refetch returns what was saved. */
function setupApi(putImpl?: PutImpl, postImpl?: PostImpl) {
  const server: CartillaDetalleResponse = structuredClone(boardDetailResponse)
  const materialized = new Map<string, PictogramaGlobalResponse>()
  const defaultPost: PostImpl = async (requestUrl, body) => {
    if (requestUrl !== MATERIALIZE_PATH) throw new Error(`Unexpected POST ${requestUrl}`)
    const data: PictogramaGlobalResponse = {
      id: `uuid-${body.arasaacId}`,
      etiqueta: body.etiqueta,
      imagenUrl: arasaacImageUrl(body.arasaacId),
      arasaacId: body.arasaacId,
      creadoEn: '2026-02-01T09:00:00',
    }
    materialized.set(data.id, data)
    return { data }
  }
  const defaultPut: PutImpl = async (requestUrl, body) => {
    const item = server.categorias.flatMap((c) => c.items).find((i) => requestUrl.endsWith(`/items/${i.id}`))
    if (!item) throw new Error(`Unexpected PUT ${requestUrl}`)
    item.textoVisible = body.textoVisible ?? item.textoVisible
    item.textoHablado = body.textoHablado
    item.ordenVisual = body.ordenVisual ?? item.ordenVisual
    item.visibleEnModoUso = body.visibleEnModoUso ?? item.visibleEnModoUso
    const real = body.recursoGlobalId ? materialized.get(body.recursoGlobalId) : undefined
    if (real) item.pictograma = { id: real.id, etiqueta: real.etiqueta, imagenUrl: real.imagenUrl, tipo: 'GLOBAL' }
    return { data: { id: item.id } }
  }
  const impl = putImpl ?? defaultPut
  const put = vi.spyOn(api, 'put').mockImplementation(async (requestUrl: string, body?: unknown) =>
    impl(requestUrl, body as ItemCartillaActualizacionRequest),
  )
  const postFn = postImpl ?? defaultPost
  const post = vi.spyOn(api, 'post').mockImplementation(async (requestUrl: string, body?: unknown) =>
    postFn(requestUrl, body as MaterializarPictogramaRequest),
  )
  const patch = vi.spyOn(api, 'patch')
  const del = vi.spyOn(api, 'delete')
  const get = vi.spyOn(api, 'get').mockImplementation(async (requestUrl: string) => {
    if (requestUrl === '/api/usuarios/me') return { data: therapist }
    if (requestUrl === `/api/pacientes/${PATIENT_ID}`) return { data: therapistPatientsResponse[0] }
    if (requestUrl === boardPath) return { data: structuredClone(server) }
    throw new Error(`Unexpected GET ${requestUrl}`)
  })
  const boardGets = () => get.mock.calls.filter(([requestUrl]) => requestUrl === boardPath).length
  return { server, put, post, patch, del, boardGets, defaultPut }
}

async function openEditor() {
  renderApp(url)
  await screen.findByRole('heading', { name: 'Tomás Pérez' })
}

const saveButton = () => screen.getByRole('button', { name: /Guardar cambios|Guardando…/ })
const labelInput = () => screen.getByLabelText('Texto visible')

async function selectRow(index: number) {
  await userEvent.click(within(screen.getAllByTestId('board-item')[index]).getAllByRole('button')[0])
}

function networkError() {
  return new AxiosError('Network Error', 'ERR_NETWORK')
}

describe('BoardEditorPage saving', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps Save disabled until something changes and never calls PUT while editing', async () => {
    const fake = setupApi()
    await openEditor()
    expect(saveButton()).toBeDisabled()

    fireEvent.change(labelInput(), { target: { value: 'Comida' } })
    expect(saveButton()).toBeEnabled()
    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument()
    expect(screen.getByText(/Se guardan al presionar «Guardar cambios»/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Descartar cambios' }))
    expect(saveButton()).toBeDisabled()
    expect(fake.put).not.toHaveBeenCalled()
    expect(fake.post).not.toHaveBeenCalled()
    expect(fake.patch).not.toHaveBeenCalled()
    expect(fake.del).not.toHaveBeenCalled()
  })

  it('sends only the modified item with the full DTO, then reloads and confirms', async () => {
    const fake = setupApi()
    await openEditor()
    expect(fake.boardGets()).toBe(1)

    fireEvent.change(labelInput(), { target: { value: '  Comida ' } })
    await userEvent.click(saveButton())

    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument()
    expect(fake.put).toHaveBeenCalledExactlyOnceWith(itemPath('cat-a', 'item-a2'), {
      textoVisible: 'Comida',
      textoHablado: 'Tengo hambre',
      ordenVisual: 0,
      recursoGlobalId: 'pic-hambre',
      recursoCustomId: null,
      esCore: true,
      visibleEnModoUso: true,
    })
    expect(fake.boardGets()).toBe(2)
    expect(saveButton()).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Descartar cambios' })).not.toBeInTheDocument()
    expect(screen.getAllByTestId('board-item')[0]).toHaveTextContent('Comida')
    expect(fake.post).not.toHaveBeenCalled()
    expect(fake.patch).not.toHaveBeenCalled()
    expect(fake.del).not.toHaveBeenCalled()

    fireEvent.change(labelInput(), { target: { value: 'Otra' } })
    expect(screen.queryByText('Cambios guardados.')).not.toBeInTheDocument()
  })

  it('sends the new orders when a card is moved inside its category', async () => {
    const fake = setupApi()
    await openEditor()

    await userEvent.click(screen.getByRole('button', { name: 'Mover Baño después' }))
    await userEvent.click(saveButton())

    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument()
    // Draft order a2, a3, a1 reuses the server values [0, 0, 3].
    expect(fake.put.mock.calls.map(([requestUrl, body]) => [requestUrl, (body as ItemCartillaActualizacionRequest).ordenVisual])).toEqual([
      [itemPath('cat-a', 'item-a3'), 0],
      [itemPath('cat-a', 'item-a1'), 3],
    ])
  })

  it('shows progress and makes the editor inert while a PUT is pending', async () => {
    let release: () => void = () => {}
    const fake = setupApi()
    const gated = fake.defaultPut
    fake.put.mockImplementation(
      (requestUrl: string, body?: unknown) =>
        new Promise((resolve) => {
          release = () => resolve(gated(requestUrl, body as ItemCartillaActualizacionRequest))
        }),
    )
    await openEditor()

    fireEvent.change(labelInput(), { target: { value: 'Comida' } })
    await userEvent.click(saveButton())

    expect(await screen.findByRole('button', { name: 'Guardando…' })).toHaveAttribute('aria-busy', 'true')
    expect(saveButton()).toBeDisabled()
    expect(screen.getAllByRole('status').some((node) => node.textContent === 'Guardando…')).toBe(true)
    expect(document.querySelector('main')).toHaveAttribute('inert')
    expect(screen.getByRole('button', { name: 'Descartar cambios' })).toBeDisabled()

    await waitFor(() => expect(fake.put).toHaveBeenCalledTimes(1))
    release()
    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument()
    expect(document.querySelector('main')).not.toHaveAttribute('inert')
  })

  it('reports a failing PUT with counts, keeps the draft and retries only the failed item', async () => {
    const fake = setupApi()
    let failB2 = true
    const base = fake.defaultPut
    fake.put.mockImplementation(async (requestUrl: string, body?: unknown) => {
      if (failB2 && requestUrl.endsWith('/items/item-b2')) throw networkError()
      return base(requestUrl, body as ItemCartillaActualizacionRequest)
    })
    await openEditor()

    fireEvent.change(labelInput(), { target: { value: 'Comida' } })
    await selectRow(4)
    fireEvent.change(labelInput(), { target: { value: 'Juego' } })
    await userEvent.click(saveButton())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(
      'No se pudieron guardar 1 de 2 tarjetas. No se pudo conectar con el servidor. Tus cambios siguen en pantalla.',
    )
    expect(screen.getAllByTestId('board-item')[4]).toHaveTextContent('Juego')
    expect(screen.getAllByTestId('board-item')[0]).toHaveTextContent('Comida')
    expect(saveButton()).toBeEnabled()
    expect(screen.queryByText('Cambios guardados.')).not.toBeInTheDocument()
    expect(fake.put).toHaveBeenCalledTimes(2)

    failB2 = false
    await userEvent.click(saveButton())
    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument()
    expect(fake.put).toHaveBeenCalledTimes(3)
    expect(fake.put.mock.calls[2][0]).toBe(itemPath('cat-b', 'item-b2'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps the draft when the network is down', async () => {
    const fake = setupApi(() => Promise.reject(networkError()))
    await openEditor()

    fireEvent.change(labelInput(), { target: { value: 'Comida' } })
    await userEvent.click(saveButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudieron guardar 1 de 1 tarjetas. No se pudo conectar con el servidor.',
    )
    expect(labelInput()).toHaveValue('Comida')
    expect(saveButton()).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Descartar cambios' })).toBeEnabled()
    expect(fake.put).toHaveBeenCalledTimes(1)
  })

  it('warns when the changes were saved but the reload failed', async () => {
    const fake = setupApi()
    await openEditor()
    fireEvent.change(labelInput(), { target: { value: 'Comida' } })
    vi.mocked(api.get).mockRejectedValue(networkError())

    await userEvent.click(saveButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Los cambios se guardaron, pero no se pudo recargar la cartilla. Recarga la página.',
    )
    expect(fake.put).toHaveBeenCalledTimes(1)
  })

  it('does not call materialize when opening the picker or selecting a library tile, and enables Save', async () => {
    const fake = setupApi()
    await openEditor()
    expect(fake.post).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('radio', { name: 'no quiero' }))

    expect(screen.getByRole('radio', { name: 'no quiero' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'no quiero' })).toHaveAttribute(
      'title',
      'no quiero (biblioteca ARASAAC: se registra al guardar)',
    )
    expect(saveButton()).toBeEnabled()
    expect(screen.queryByText('No se puede guardar todavía:')).not.toBeInTheDocument()
    expect(fake.post).not.toHaveBeenCalled()
    expect(fake.put).not.toHaveBeenCalled()
  })

  it('materializes the chosen library pictogram on save, then sends the PUT and shows the real one', async () => {
    const fake = setupApi()
    await openEditor()

    await userEvent.click(screen.getByRole('radio', { name: 'no quiero' }))
    await userEvent.click(saveButton())

    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument()
    expect(fake.post).toHaveBeenCalledExactlyOnceWith(MATERIALIZE_PATH, { arasaacId: 6156, etiqueta: 'no quiero' })
    expect(fake.put).toHaveBeenCalledExactlyOnceWith(itemPath('cat-a', 'item-a2'), {
      textoVisible: 'Hambre',
      textoHablado: 'Tengo hambre',
      ordenVisual: 0,
      recursoGlobalId: 'uuid-6156',
      recursoCustomId: null,
      esCore: true,
      visibleEnModoUso: true,
    })
    expect(fake.post.mock.invocationCallOrder[0]).toBeLessThan(fake.put.mock.invocationCallOrder[0])
    expect(screen.getByRole('radio', { name: 'no quiero' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getAllByRole('radio', { name: 'no quiero' })).toHaveLength(1)
    expect(saveButton()).toBeDisabled()
    expect(fake.patch).not.toHaveBeenCalled()
    expect(fake.del).not.toHaveBeenCalled()
  })

  it('keeps the draft and sends no PUT when materialization fails', async () => {
    const fake = setupApi(undefined, () => Promise.reject(new Error('boom')))
    await openEditor()

    fireEvent.change(labelInput(), { target: { value: 'Comida' } })
    await userEvent.click(screen.getByRole('radio', { name: 'no quiero' }))
    await userEvent.click(saveButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudieron guardar 1 de 1 tarjetas. No se pudo registrar el pictograma elegido. Tus cambios siguen en pantalla.',
    )
    expect(fake.post).toHaveBeenCalledTimes(1)
    expect(fake.put).not.toHaveBeenCalled()
    expect(labelInput()).toHaveValue('Comida')
    expect(screen.getByRole('radio', { name: 'no quiero' })).toHaveAttribute('aria-checked', 'true')
    expect(saveButton()).toBeEnabled()
    expect(screen.queryByText('Cambios guardados.')).not.toBeInTheDocument()
  })

  it('blocks saving a blank visible text', async () => {
    const fake = setupApi()
    await openEditor()

    fireEvent.change(labelInput(), { target: { value: '   ' } })

    expect(saveButton()).toBeDisabled()
    expect(screen.getByText('El texto visible es obligatorio.')).toBeInTheDocument()
    expect(labelInput()).toBeInvalid()
    expect(screen.getByText('Hambre: el texto visible es obligatorio.')).toBeInTheDocument()
    expect(fake.put).not.toHaveBeenCalled()
  })

  it('limits the visible text to 30 characters and the spoken text to 255', async () => {
    setupApi()
    await openEditor()
    expect(labelInput()).toHaveAttribute('maxlength', '30')
    expect(screen.getByLabelText('Texto hablado')).toHaveAttribute('maxlength', '255')
  })

  it('disables adding and removing cards until the backend supports them', async () => {
    const fake = setupApi()
    await openEditor()

    for (const name of ['Agregar tarjeta', 'Eliminar tarjeta']) {
      const button = screen.getByRole('button', { name })
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('title', 'Próximamente')
    }
    expect(screen.queryByText(/Se alcanzó el máximo/)).not.toBeInTheDocument()
    expect(fake.put).not.toHaveBeenCalled()
  })

  it('disables the arrows across a category boundary', async () => {
    setupApi()
    await openEditor()

    const down = screen.getByRole('button', { name: 'Mover Sed después' })
    expect(down).toBeDisabled()
    expect(down).toHaveAttribute('title', 'No se puede mover entre categorías')
    const up = screen.getByRole('button', { name: 'Mover Ayuda antes' })
    expect(up).toBeDisabled()
    expect(up).toHaveAttribute('title', 'No se puede mover entre categorías')
    expect(screen.getByRole('button', { name: 'Mover Baño después' })).toBeEnabled()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mover Hambre antes' })).toBeDisabled())
  })
})
