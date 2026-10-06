import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { UNSAVED_CHANGES_MESSAGE } from '@/lib/useUnsavedChangesGuard'
import { therapist, therapistPatientsResponse } from '@/features/patients/testing/fixtures'
import { renderApp } from '@/test/renderApp'
import type {
  CartillaDetalleResponse,
  ItemCartillaActualizacionRequest,
  ItemCartillaRegistroRequest,
  MaterializarPictogramaRequest,
  PictogramaGlobalResponse,
} from '../apiTypes'
import { boardDetailResponse, BOARD_ID, PATIENT_ID } from '../testing/fixtures'

const url = `/pacientes/${PATIENT_ID}/cartillas/${BOARD_ID}/editor`
const boardPath = `/api/pacientes/${PATIENT_ID}/cartillas/${BOARD_ID}`
const itemsPath = (categoryId: string) => `${boardPath}/categorias/${categoryId}/items`
const itemPath = (categoryId: string, itemId: string) => `${itemsPath(categoryId)}/${itemId}`
const MATERIALIZE_PATH = '/api/pictogramas-globales/materializar'
const LIBRARY_PATH = '/api/pictogramas-globales'
const arasaacImageUrl = (arasaacId: number) => `https://static.arasaac.org/pictograms/${arasaacId}/${arasaacId}_300.png`

const libraryRow = (id: string, etiqueta: string, arasaacId: number): PictogramaGlobalResponse => ({
  id,
  etiqueta,
  imagenUrl: arasaacImageUrl(arasaacId),
  arasaacId,
  creadoEn: '2026-01-01T09:00:00',
})

function networkError() {
  return new AxiosError('Network Error', 'ERR_NETWORK')
}

interface Controls {
  failItemPost: boolean
  failMaterialize: boolean
  failBoardGet: boolean
  failDelete: boolean
  /** When set, the item POST waits for it before answering. */
  itemPostGate: Promise<void> | null
}

/**
 * Fake backend: items POST appends at `max(ordenVisual)+1` of the category (0 when empty), DELETE removes
 * the item without renumbering, PUT updates it, and the board GET returns the current state.
 */
function setupApi(mutate?: (detail: CartillaDetalleResponse) => void) {
  const server: CartillaDetalleResponse = structuredClone(boardDetailResponse)
  mutate?.(server)
  const library: PictogramaGlobalResponse[] = [libraryRow('lib-agua', 'agua', 32464), libraryRow('lib-manzana', 'manzana', 2462)]
  const controls: Controls = { failItemPost: false, failMaterialize: false, failBoardGet: false, failDelete: false, itemPostGate: null }
  let counter = 0

  const post = vi.spyOn(api, 'post').mockImplementation(async (requestUrl: string, body?: unknown) => {
    if (requestUrl === MATERIALIZE_PATH) {
      if (controls.failMaterialize) throw networkError()
      const { arasaacId, etiqueta } = body as MaterializarPictogramaRequest
      const data = libraryRow(`uuid-${arasaacId}`, etiqueta, arasaacId)
      library.push(data)
      return { data }
    }
    const category = server.categorias.find((candidate) => requestUrl === itemsPath(candidate.id))
    if (category) {
      if (controls.itemPostGate) await controls.itemPostGate
      if (controls.failItemPost) throw networkError()
      const request = body as ItemCartillaRegistroRequest
      const real = library.find((row) => row.id === request.recursoGlobalId)
      counter += 1
      const id = `new-${counter}`
      category.items.push({
        id,
        textoHablado: request.textoHablado,
        ordenVisual: Math.max(-1, ...category.items.map((item) => item.ordenVisual)) + 1,
        pictograma: real
          ? { id: real.id, etiqueta: real.etiqueta, imagenUrl: real.imagenUrl, tipo: 'GLOBAL' }
          : { id: request.recursoGlobalId ?? 'x', etiqueta: 'x', imagenUrl: 'https://cdn.example.com/x.png', tipo: 'GLOBAL' },
        esCore: request.esCore ?? false,
        textoVisible: request.textoVisible ?? '',
        visibleEnModoUso: request.visibleEnModoUso ?? true,
      })
      return { data: { id } }
    }
    throw new Error(`Unexpected POST ${requestUrl}`)
  })
  const put = vi.spyOn(api, 'put').mockImplementation(async (requestUrl: string, body?: unknown) => {
    const request = body as ItemCartillaActualizacionRequest
    const item = server.categorias.flatMap((c) => c.items).find((i) => requestUrl.endsWith(`/items/${i.id}`))
    if (!item) throw new Error(`Unexpected PUT ${requestUrl}`)
    item.textoVisible = request.textoVisible ?? item.textoVisible
    item.textoHablado = request.textoHablado
    return { data: { id: item.id } }
  })
  const del = vi.spyOn(api, 'delete').mockImplementation(async (requestUrl: string) => {
    if (controls.failDelete) throw networkError()
    const category = server.categorias.find((candidate) => candidate.items.some((i) => requestUrl === itemPath(candidate.id, i.id)))
    if (!category) throw new Error(`Unexpected DELETE ${requestUrl}`)
    category.items = category.items.filter((i) => requestUrl !== itemPath(category.id, i.id))
    return { data: undefined }
  })
  const patch = vi.spyOn(api, 'patch')
  const get = vi.spyOn(api, 'get').mockImplementation(async (requestUrl: string) => {
    if (requestUrl === '/api/usuarios/me') return { data: therapist }
    if (requestUrl === `/api/pacientes/${PATIENT_ID}`) return { data: therapistPatientsResponse[0] }
    if (requestUrl === LIBRARY_PATH) return { data: structuredClone(library) }
    if (requestUrl === boardPath) {
      if (controls.failBoardGet) throw networkError()
      return { data: structuredClone(server) }
    }
    throw new Error(`Unexpected GET ${requestUrl}`)
  })
  const boardGets = () => get.mock.calls.filter(([requestUrl]) => requestUrl === boardPath).length
  const itemPosts = () => post.mock.calls.filter(([requestUrl]) => requestUrl !== MATERIALIZE_PATH)
  return { server, controls, post, put, del, patch, get, boardGets, itemPosts }
}

async function openEditor() {
  renderApp(url)
  await screen.findByRole('heading', { name: 'Tomás Pérez' })
  await waitFor(() => expect(screen.queryByText('Cargando pictogramas…')).not.toBeInTheDocument())
}

const saveButton = () => screen.getByRole('button', { name: /Guardar cambios|Guardando…/ })
const labelInput = () => screen.getByLabelText('Texto visible')
const spokenInput = () => screen.getByLabelText('Texto hablado')
const addButton = () => screen.getByRole('button', { name: 'Agregar tarjeta' })
const createButton = () => screen.getByRole('button', { name: /Crear tarjeta|Creando…/ })
const rows = () => screen.getAllByTestId('board-item')
const rowButton = (index: number) => within(rows()[index]).getAllByRole('button')[0]
const selectedRowIndex = () => rows().findIndex((row) => within(row).getAllByRole('button')[0].getAttribute('aria-current') === 'true')

async function selectRow(index: number) {
  await userEvent.click(rowButton(index))
}

async function openForm() {
  await userEvent.click(addButton())
  await screen.findByRole('heading', { name: 'Nueva tarjeta' })
}

async function fillAndCreate(pictogram = 'manzana') {
  await userEvent.click(screen.getByRole('radio', { name: pictogram }))
  await userEvent.click(createButton())
}

describe('BoardEditorPage creating cards', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a read-only category row when the board has exactly one category', async () => {
    setupApi((detail) => {
      detail.categorias = detail.categorias.filter((category) => category.id === 'cat-a')
    })
    await openEditor()
    await openForm()

    expect(screen.getByText('Necesidades')).toBeInTheDocument()
    expect(screen.getByText('Categoría:')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('offers a category select defaulting to the selected card category and posts to the chosen one', async () => {
    const fake = setupApi()
    await openEditor()
    await selectRow(4)
    await openForm()

    const select = screen.getByLabelText('Categoría')
    expect(select).toHaveValue('cat-b')
    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual(['Necesidades', 'Acciones'])
    expect(screen.getByText('La tarjeta se agrega al final de la categoría.')).toBeInTheDocument()

    await userEvent.selectOptions(select, 'cat-a')
    await fillAndCreate()

    expect(await screen.findByText('Tarjeta creada.')).toBeInTheDocument()
    expect(fake.itemPosts()).toHaveLength(1)
    expect(fake.itemPosts()[0][0]).toBe(itemsPath('cat-a'))
  })

  it('defaults to the first category by order when nothing else decides it', async () => {
    setupApi()
    await openEditor()
    await openForm()

    expect(screen.getByLabelText('Categoría')).toHaveValue('cat-a')
  })

  it('disables adding, with an explanation, when the board has no categories', async () => {
    const fake = setupApi((detail) => {
      detail.categorias = []
    })
    await openEditor()

    expect(addButton()).toBeDisabled()
    expect(addButton()).not.toHaveAttribute('title')
    expect(screen.getByText('Esta cartilla no tiene categorías. Crear categorías todavía no está disponible.')).toBeInTheDocument()
    expect(fake.post).not.toHaveBeenCalled()
  })

  it('disables adding at the 12 cards limit and says so', async () => {
    setupApi((detail) => {
      const category = detail.categorias.find((candidate) => candidate.id === 'cat-a')
      for (let index = 0; index < 7; index++) {
        category?.items.push({
          id: `extra-${index}`,
          textoHablado: `Extra ${index}`,
          ordenVisual: 10 + index,
          pictograma: null,
          esCore: false,
          textoVisible: `Extra ${index}`,
          visibleEnModoUso: true,
        })
      }
    })
    await openEditor()

    expect(rows()).toHaveLength(12)
    expect(addButton()).toBeDisabled()
    expect(screen.getByText('Se alcanzó el máximo de 12 tarjetas.')).toBeInTheDocument()
  })

  it('starts empty, prefills both texts from the first pictogram only, and keeps them editable', async () => {
    setupApi()
    await openEditor()
    await openForm()

    expect(labelInput()).toHaveValue('')
    expect(spokenInput()).toHaveValue('')
    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0)

    await userEvent.click(screen.getByRole('radio', { name: 'manzana' }))
    expect(labelInput()).toHaveValue('Manzana')
    expect(spokenInput()).toHaveValue('Manzana')

    fireEvent.change(labelInput(), { target: { value: 'Fruta' } })
    await userEvent.click(screen.getByRole('radio', { name: 'agua' }))
    expect(labelInput()).toHaveValue('Fruta')
    expect(spokenInput()).toHaveValue('Manzana')
  })

  it('does not prefill when the user already typed something', async () => {
    setupApi()
    await openEditor()
    await openForm()

    fireEvent.change(labelInput(), { target: { value: 'Mi texto' } })
    await userEvent.click(screen.getByRole('radio', { name: 'manzana' }))

    expect(labelInput()).toHaveValue('Mi texto')
    expect(spokenInput()).toHaveValue('')
    expect(createButton()).toBeDisabled()
  })

  it('keeps Create disabled until the form is valid and shows the field errors', async () => {
    const fake = setupApi()
    await openEditor()
    await openForm()

    expect(createButton()).toBeDisabled()
    // Pristine: no complaints before the user touches anything.
    expect(screen.queryByText(/obligatorio/)).not.toBeInTheDocument()
    expect(labelInput()).not.toHaveAttribute('aria-invalid')
    expect(spokenInput()).not.toHaveAttribute('aria-invalid')
    expect(labelInput()).toHaveAttribute('maxlength', '30')
    expect(spokenInput()).toHaveAttribute('maxlength', '255')

    await userEvent.click(screen.getByRole('radio', { name: 'manzana' }))
    expect(createButton()).toBeEnabled()

    fireEvent.change(labelInput(), { target: { value: '   ' } })
    expect(createButton()).toBeDisabled()
    fireEvent.change(labelInput(), { target: { value: 'Fruta' } })
    fireEvent.change(spokenInput(), { target: { value: '  ' } })
    expect(createButton()).toBeDisabled()

    expect(fake.post).not.toHaveBeenCalled()
  })

  it('shows a field error only after blur or after typing and clearing, and none for valid values', async () => {
    setupApi()
    await openEditor()
    await openForm()

    fireEvent.blur(labelInput())
    expect(screen.getByText('El texto visible es obligatorio.')).toBeInTheDocument()
    expect(labelInput()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByText('El texto hablado es obligatorio.')).not.toBeInTheDocument()
    expect(spokenInput()).not.toHaveAttribute('aria-invalid')

    fireEvent.change(spokenInput(), { target: { value: 'Hola' } })
    fireEvent.change(spokenInput(), { target: { value: '' } })
    expect(screen.getByText('El texto hablado es obligatorio.')).toBeInTheDocument()
    expect(spokenInput()).toHaveAttribute('aria-invalid', 'true')
    expect(createButton()).toBeDisabled()

    fireEvent.change(labelInput(), { target: { value: 'Fruta' } })
    fireEvent.change(spokenInput(), { target: { value: 'Quiero fruta' } })
    expect(screen.queryByText(/obligatorio/)).not.toBeInTheDocument()
    expect(labelInput()).not.toHaveAttribute('aria-invalid')
    expect(spokenInput()).not.toHaveAttribute('aria-invalid')
  })

  it('shows no errors after picking a pictogram that prefills both fields', async () => {
    setupApi()
    await openEditor()
    await openForm()

    await userEvent.click(screen.getByRole('radio', { name: 'manzana' }))

    expect(screen.queryByText(/obligatorio/)).not.toBeInTheDocument()
    expect(labelInput()).not.toHaveAttribute('aria-invalid')
    expect(createButton()).toBeEnabled()
  })

  it('creates a visible card with the real contract and shows it last in its category, selected', async () => {
    const fake = setupApi()
    await openEditor()
    expect(fake.boardGets()).toBe(1)
    await openForm()

    await userEvent.click(screen.getByRole('radio', { name: 'manzana' }))
    fireEvent.change(labelInput(), { target: { value: '  Fruta ' } })
    fireEvent.change(spokenInput(), { target: { value: ' Quiero una manzana ' } })
    await userEvent.click(createButton())

    expect(await screen.findByText('Tarjeta creada.')).toBeInTheDocument()
    expect(fake.post).toHaveBeenCalledExactlyOnceWith(itemsPath('cat-a'), {
      textoVisible: 'Fruta',
      textoHablado: 'Quiero una manzana',
      recursoGlobalId: 'lib-manzana',
      recursoCustomId: null,
      esCore: false,
      visibleEnModoUso: true,
    })
    expect(fake.post.mock.calls[0][1]).not.toHaveProperty('ordenVisual')
    expect(fake.boardGets()).toBe(2)
    expect(rows()).toHaveLength(6)
    expect(rows()[3]).toHaveTextContent('Fruta')
    expect(rows()[4]).toHaveTextContent('Ayuda')
    expect(selectedRowIndex()).toBe(3)
    expect(screen.queryByRole('heading', { name: 'Nueva tarjeta' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Editar tarjeta' })).toBeInTheDocument()
    expect(labelInput()).toHaveValue('Fruta')
    expect(screen.getByText('6 de 12')).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
    expect(fake.put).not.toHaveBeenCalled()
    expect(fake.del).not.toHaveBeenCalled()
    expect(fake.patch).not.toHaveBeenCalled()
  })

  it('creates a hidden card when the Modo Uso switch is turned off', async () => {
    const fake = setupApi()
    await openEditor()
    await openForm()

    const toggle = screen.getByRole('switch', { name: 'Mostrar en el Modo Uso' })
    expect(toggle).toBeChecked()
    await userEvent.click(toggle)
    expect(toggle).not.toBeChecked()
    await fillAndCreate()

    expect(await screen.findByText('Tarjeta creada.')).toBeInTheDocument()
    expect(fake.post).toHaveBeenCalledExactlyOnceWith(
      itemsPath('cat-a'),
      expect.objectContaining({ visibleEnModoUso: false, esCore: false }),
    )
    expect(rows()[3]).toHaveTextContent('Oculta')
  })

  it('registers a local ARASAAC pictogram first, then posts the item with the returned UUID', async () => {
    const fake = setupApi()
    await openEditor()
    await openForm()

    await userEvent.click(screen.getByRole('radio', { name: 'no quiero' }))
    expect(fake.post).not.toHaveBeenCalled()
    await userEvent.click(createButton())

    expect(await screen.findByText('Tarjeta creada.')).toBeInTheDocument()
    expect(fake.post).toHaveBeenCalledTimes(2)
    expect(fake.post.mock.calls[0]).toEqual([MATERIALIZE_PATH, { arasaacId: 6156, etiqueta: 'no quiero' }])
    expect(fake.post.mock.calls[1][0]).toBe(itemsPath('cat-a'))
    expect(fake.post.mock.calls[1][1]).toMatchObject({ recursoGlobalId: 'uuid-6156', recursoCustomId: null, esCore: false })
    expect(fake.post.mock.calls[1][1]).not.toHaveProperty('ordenVisual')
  })

  it('makes the list and the preview inert while the form is open, and closes it with Cancel', async () => {
    const fake = setupApi()
    await openEditor()
    expect(document.querySelectorAll('main > div[inert]')).toHaveLength(0)

    await openForm()
    expect(document.querySelectorAll('main > div[inert]')).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'Tarjetas' }).closest('[inert]')).not.toBeNull()
    expect(document.querySelector('main')).not.toHaveAttribute('inert')
    expect(addButton()).toBeDisabled()
    expect(screen.getByRole('link', { name: /Abrir Modo Uso/ })).toBeEnabled()

    await userEvent.click(screen.getByRole('radio', { name: 'manzana' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(document.querySelectorAll('main > div[inert]')).toHaveLength(0)
    expect(screen.queryByRole('heading', { name: 'Nueva tarjeta' })).not.toBeInTheDocument()
    expect(rows()).toHaveLength(5)
    expect(fake.post).not.toHaveBeenCalled()

    await openForm()
    expect(labelInput()).toHaveValue('')
    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0)
  })

  it('locks the editor and shows progress while the card is being created', async () => {
    let release: () => void = () => {}
    const fake = setupApi()
    fake.controls.itemPostGate = new Promise<void>((resolve) => {
      release = resolve
    })
    await openEditor()
    await openForm()

    await fillAndCreate()

    expect(await screen.findByRole('button', { name: 'Creando…' })).toBeDisabled()
    expect(document.querySelector('main')).toHaveAttribute('inert')
    expect(saveButton()).toBeDisabled()

    release()
    expect(await screen.findByText('Tarjeta creada.')).toBeInTheDocument()
    expect(document.querySelector('main')).not.toHaveAttribute('inert')
  })

  it('keeps every typed value and shows an alert when the creation fails, then allows retrying', async () => {
    const fake = setupApi()
    fake.controls.failItemPost = true
    await openEditor()
    await selectRow(4)
    await openForm()

    await userEvent.click(screen.getByRole('radio', { name: 'manzana' }))
    fireEvent.change(labelInput(), { target: { value: 'Fruta' } })
    fireEvent.change(spokenInput(), { target: { value: 'Quiero una manzana' } })
    await userEvent.click(screen.getByRole('switch', { name: 'Mostrar en el Modo Uso' }))
    await userEvent.click(createButton())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No se pudo conectar con el servidor.')
    expect(screen.getByRole('heading', { name: 'Nueva tarjeta' })).toBeInTheDocument()
    expect(screen.getByLabelText('Categoría')).toHaveValue('cat-b')
    expect(screen.getByRole('radio', { name: 'manzana' })).toHaveAttribute('aria-checked', 'true')
    expect(labelInput()).toHaveValue('Fruta')
    expect(spokenInput()).toHaveValue('Quiero una manzana')
    expect(screen.getByRole('switch', { name: 'Mostrar en el Modo Uso' })).not.toBeChecked()
    expect(createButton()).toBeEnabled()
    expect(screen.queryByText('Tarjeta creada.')).not.toBeInTheDocument()
    expect(fake.server.categorias.flatMap((category) => category.items)).toHaveLength(5)

    fake.controls.failItemPost = false
    await userEvent.click(createButton())
    expect(await screen.findByText('Tarjeta creada.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(rows()).toHaveLength(6)
  })

  it('does not POST the item when the pictogram registration fails', async () => {
    const fake = setupApi()
    fake.controls.failMaterialize = true
    await openEditor()
    await openForm()

    await fillAndCreate('no quiero')

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo registrar el pictograma elegido.')
    expect(fake.post).toHaveBeenCalledExactlyOnceWith(MATERIALIZE_PATH, expect.anything())
    expect(fake.itemPosts()).toHaveLength(0)
    expect(labelInput()).toHaveValue('No quiero')
    expect(rows()).toHaveLength(5)
  })
})

describe('BoardEditorPage creating cards after a failed reload', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('explains that the card exists, keeps the form and blocks creating it twice', async () => {
    const fake = setupApi()
    await openEditor()
    await openForm()
    await userEvent.click(screen.getByRole('radio', { name: 'manzana' }))
    fake.controls.failBoardGet = true

    await userEvent.click(createButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La tarjeta se creó, pero no se pudo recargar la cartilla. Recarga la página.',
    )
    expect(fake.itemPosts()).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Nueva tarjeta' })).toBeInTheDocument()
    expect(createButton()).toBeDisabled()
    expect(labelInput()).toHaveValue('Manzana')
  })
})

describe('BoardEditorPage pending edits and creating', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps unsaved edits when another card is created and then saves only the edited card', async () => {
    const fake = setupApi()
    await openEditor()

    fireEvent.change(labelInput(), { target: { value: 'Comida' } })
    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument()
    await openForm()
    await fillAndCreate()
    expect(await screen.findByText('Tarjeta creada.')).toBeInTheDocument()

    expect(rows()[0]).toHaveTextContent('Comida')
    expect(rows()).toHaveLength(6)
    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument()
    expect(saveButton()).toBeEnabled()
    expect(fake.put).not.toHaveBeenCalled()

    await userEvent.click(saveButton())

    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument()
    expect(fake.put).toHaveBeenCalledExactlyOnceWith(
      itemPath('cat-a', 'item-a2'),
      expect.objectContaining({ textoVisible: 'Comida', ordenVisual: 0 }),
    )
    expect(screen.queryByText('Tarjeta creada.')).not.toBeInTheDocument()
  })

  it('clears the success notice on the next edit', async () => {
    setupApi()
    await openEditor()
    await openForm()
    await fillAndCreate()
    expect(await screen.findByText('Tarjeta creada.')).toBeInTheDocument()

    fireEvent.change(labelInput(), { target: { value: 'Otra' } })

    expect(screen.queryByText('Tarjeta creada.')).not.toBeInTheDocument()
  })
})

describe('BoardEditorPage deleting cards', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const confirmation = () => screen.getByRole('group', { name: 'Confirmar eliminación' })

  it('asks for confirmation naming the card and sends nothing when cancelled', async () => {
    const fake = setupApi()
    await openEditor()

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar tarjeta' }))

    expect(confirmation()).toHaveTextContent('¿Eliminar la tarjeta «Hambre»?')
    expect(confirmation()).toHaveTextContent('Se elimina de la cartilla y no se puede deshacer.')
    expect(screen.queryByRole('button', { name: 'Eliminar tarjeta' })).not.toBeInTheDocument()
    expect(fake.del).not.toHaveBeenCalled()

    await userEvent.click(within(confirmation()).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('group', { name: 'Confirmar eliminación' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Eliminar tarjeta' })).toBeEnabled()
    expect(fake.del).not.toHaveBeenCalled()
    expect(rows()).toHaveLength(5)
  })

  it('resets the confirmation when another card is selected', async () => {
    setupApi()
    await openEditor()
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar tarjeta' }))
    expect(confirmation()).toBeInTheDocument()

    await selectRow(1)

    expect(screen.queryByRole('group', { name: 'Confirmar eliminación' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Eliminar tarjeta' })).toBeInTheDocument()
  })

  it('deletes after confirming, selects the neighbour and keeps the other server orders untouched', async () => {
    const fake = setupApi()
    await openEditor()
    expect(fake.boardGets()).toBe(1)

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar tarjeta' }))
    await userEvent.click(within(confirmation()).getByRole('button', { name: 'Sí, eliminar' }))

    expect(await screen.findByText('Tarjeta eliminada.')).toBeInTheDocument()
    expect(fake.del).toHaveBeenCalledExactlyOnceWith(itemPath('cat-a', 'item-a2'))
    expect(fake.boardGets()).toBe(2)
    expect(rows()).toHaveLength(4)
    expect(rows()[0]).toHaveTextContent('Baño')
    expect(selectedRowIndex()).toBe(0)
    expect(labelInput()).toHaveValue('Baño')
    expect(screen.queryByRole('group', { name: 'Confirmar eliminación' })).not.toBeInTheDocument()
    expect(screen.getByText('4 de 12')).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()

    // The gaps of the server orders stay: editing one card sends only that card.
    await selectRow(3)
    fireEvent.change(labelInput(), { target: { value: 'Juego' } })
    await userEvent.click(saveButton())
    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument()
    expect(fake.put).toHaveBeenCalledExactlyOnceWith(itemPath('cat-b', 'item-b2'), expect.objectContaining({ ordenVisual: 5 }))
    expect(fake.post).not.toHaveBeenCalled()
    expect(fake.patch).not.toHaveBeenCalled()
  })

  it('selects the last card when the last one is deleted', async () => {
    const fake = setupApi()
    await openEditor()
    await selectRow(4)

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar tarjeta' }))
    await userEvent.click(within(confirmation()).getByRole('button', { name: 'Sí, eliminar' }))

    expect(await screen.findByText('Tarjeta eliminada.')).toBeInTheDocument()
    expect(fake.del).toHaveBeenCalledExactlyOnceWith(itemPath('cat-b', 'item-b2'))
    expect(rows()).toHaveLength(4)
    expect(selectedRowIndex()).toBe(3)
    expect(labelInput()).toHaveValue('Ayuda')
  })

  it('shows the empty state after deleting the only card', async () => {
    setupApi((detail) => {
      detail.categorias = detail.categorias.filter((category) => category.id === 'cat-b')
      detail.categorias[0].items = detail.categorias[0].items.slice(0, 1)
    })
    await openEditor()
    expect(rows()).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar tarjeta' }))
    await userEvent.click(within(confirmation()).getByRole('button', { name: 'Sí, eliminar' }))

    expect(await screen.findByText('Tarjeta eliminada.')).toBeInTheDocument()
    expect(screen.queryAllByTestId('board-item')).toHaveLength(0)
    expect(screen.getByText('Elegir una tarjeta de la lista o de la vista previa para editarla.')).toBeInTheDocument()
    expect(addButton()).toBeEnabled()
  })

  it('keeps the card and shows the error inside the confirmation, then allows retrying', async () => {
    const fake = setupApi()
    fake.controls.failDelete = true
    await openEditor()

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar tarjeta' }))
    await userEvent.click(within(confirmation()).getByRole('button', { name: 'Sí, eliminar' }))

    const alert = await within(confirmation()).findByRole('alert')
    expect(alert).toHaveTextContent('No se pudo conectar con el servidor.')
    expect(rows()).toHaveLength(5)
    expect(rows()[0]).toHaveTextContent('Hambre')
    expect(screen.queryByText('Tarjeta eliminada.')).not.toBeInTheDocument()
    expect(within(confirmation()).getByRole('button', { name: 'Sí, eliminar' })).toBeEnabled()

    fake.controls.failDelete = false
    await userEvent.click(within(confirmation()).getByRole('button', { name: 'Sí, eliminar' }))

    expect(await screen.findByText('Tarjeta eliminada.')).toBeInTheDocument()
    expect(rows()).toHaveLength(4)
    expect(fake.del).toHaveBeenCalledTimes(2)
  })

  it('keeps unsaved edits of other cards when a card is deleted', async () => {
    const fake = setupApi()
    await openEditor()
    await selectRow(4)
    fireEvent.change(labelInput(), { target: { value: 'Juego' } })
    await selectRow(0)

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar tarjeta' }))
    await userEvent.click(within(confirmation()).getByRole('button', { name: 'Sí, eliminar' }))

    expect(await screen.findByText('Tarjeta eliminada.')).toBeInTheDocument()
    expect(rows()).toHaveLength(4)
    expect(rows()[3]).toHaveTextContent('Juego')
    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument()

    await userEvent.click(saveButton())
    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument()
    expect(fake.put).toHaveBeenCalledExactlyOnceWith(itemPath('cat-b', 'item-b2'), expect.objectContaining({ textoVisible: 'Juego' }))
  })
})

describe('BoardEditorPage new-card navigation guard', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const backLink = () => screen.getByRole('link', { name: 'Volver a las cartillas de Tomás' })
  const beforeUnload = () => {
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    return event.defaultPrevented
  }

  it('asks before leaving when the new-card form has typed data', async () => {
    setupApi()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await openEditor()
    await openForm()
    fireEvent.change(labelInput(), { target: { value: 'Fruta' } })

    expect(beforeUnload()).toBe(true)
    await userEvent.click(backLink())

    expect(confirm).toHaveBeenCalledExactlyOnceWith(UNSAVED_CHANGES_MESSAGE)
    expect(screen.getByTestId('location')).toHaveTextContent(url)
    expect(labelInput()).toHaveValue('Fruta')
  })

  it('does not ask when the form is open but untouched', async () => {
    setupApi()
    const confirm = vi.spyOn(window, 'confirm')
    await openEditor()
    await openForm()

    expect(beforeUnload()).toBe(false)
    await userEvent.click(backLink())

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(`/pacientes/${PATIENT_ID}/cartillas`))
    expect(confirm).not.toHaveBeenCalled()
  })

  it('asks before logging out with typed form data', async () => {
    const fake = setupApi()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await openEditor()
    await openForm()
    await userEvent.click(screen.getByRole('radio', { name: 'manzana' }))
    fake.post.mockClear()

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(confirm).toHaveBeenCalledExactlyOnceWith(UNSAVED_CHANGES_MESSAGE)
    expect(fake.post).not.toHaveBeenCalled()
  })

  it('stops warning once the form is cancelled', async () => {
    setupApi()
    await openEditor()
    await openForm()
    fireEvent.change(labelInput(), { target: { value: 'Fruta' } })
    expect(beforeUnload()).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(beforeUnload()).toBe(false)
  })
})
