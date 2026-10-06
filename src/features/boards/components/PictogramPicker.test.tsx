import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { mockPictograms } from '../data/mockPictograms'
import type { Pictogram } from '../types'
import { PictogramPicker } from './PictogramPicker'
import type { PictogramLibraryStatus } from './PictogramPicker'

const library: Pictogram[] = [
  { id: 'u-agua', label: 'agua', imageUrl: 'https://cdn.example.com/agua.png', kind: 'GLOBAL', arasaacId: 32464 },
  { id: 'u-manzana', label: 'manzana', imageUrl: 'https://cdn.example.com/manzana.png', kind: 'GLOBAL', arasaacId: 2462 },
]
const custom: Pictogram = { id: 'c-1', label: 'mi foto', imageUrl: 'https://cdn.example.com/c.png', kind: 'CUSTOM' }

function renderPicker(libraryStatus: PictogramLibraryStatus, onChange = vi.fn()) {
  render(
    <>
      <span id="label">Pictograma</span>
      <PictogramPicker
        selected={null}
        boardPictograms={[custom]}
        libraryStatus={libraryStatus}
        globalLibrary={libraryStatus === 'success' ? library : []}
        onChange={onChange}
        labelledBy="label"
      />
    </>,
  )
  return onChange
}

describe('PictogramPicker', () => {
  it('shows only a loading status while the library is pending', () => {
    renderPicker('pending')

    expect(screen.getByRole('status')).toHaveTextContent('Cargando pictogramas…')
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })

  it('falls back to board and local pictograms with a note when the library failed', () => {
    renderPicker('error')

    expect(screen.getByRole('status')).toHaveTextContent(
      'No se pudo cargar la biblioteca de pictogramas. Se muestran solo los disponibles en este equipo.',
    )
    expect(screen.getAllByRole('radio')).toHaveLength(1 + mockPictograms.length)
    expect(screen.getByRole('radio', { name: 'mi foto' })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'manzana' })).not.toBeInTheDocument()
  })

  it('lists board, library and the uncovered local complement on success, without duplicates', async () => {
    const onChange = renderPicker('success')

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    // 'agua' (32464) is in both the library and the local list: one tile only.
    expect(screen.getAllByRole('radio', { name: 'agua' })).toHaveLength(1)
    expect(screen.getAllByRole('radio')).toHaveLength(1 + library.length + mockPictograms.length - 1)
    expect(screen.getByRole('radio', { name: 'agua' })).toHaveAttribute('title', 'agua')
    expect(screen.getByRole('radio', { name: 'no quiero' })).toHaveAttribute(
      'title',
      'no quiero (biblioteca ARASAAC: se registra al guardar)',
    )

    await userEvent.click(screen.getByRole('radio', { name: 'manzana' }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith(library[1])
  })

  it('wraps the tiles in a bounded scroll region', () => {
    renderPicker('success')
    const scroller = screen.getByRole('radiogroup').parentElement
    expect(scroller).toHaveClass('max-h-[22rem]', 'overflow-y-auto')
  })
})
