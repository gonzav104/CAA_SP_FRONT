import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { createMemoryRouter, Link, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesGuard } from './useUnsavedChangesGuard'

function Editor() {
  const [isDirty, setIsDirty] = useState(false)
  useUnsavedChangesGuard(isDirty)
  return (
    <div>
      <p>Editor page</p>
      <button type="button" onClick={() => setIsDirty(true)}>
        Make dirty
      </button>
      <button type="button" onClick={() => setIsDirty(false)}>
        Make clean
      </button>
      <Link to="/other">Go other</Link>
      <Link to="/editor?tab=2">Same path</Link>
    </div>
  )
}

function setup(initialEntries = ['/editor']) {
  const router = createMemoryRouter(
    [
      { path: '/editor', element: <Editor /> },
      { path: '/other', element: <p>Other page</p> },
    ],
    { initialEntries, initialIndex: initialEntries.length - 1 },
  )
  render(<RouterProvider router={router} />)
  return router
}

const dispatchBeforeUnload = () => {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event
}

describe('useUnsavedChangesGuard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lets a clean page navigate without asking', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    setup()

    await userEvent.click(screen.getByRole('link', { name: 'Go other' }))

    expect(await screen.findByText('Other page')).toBeInTheDocument()
    expect(confirm).not.toHaveBeenCalled()
  })

  it('asks with the shared message when dirty and stays on the page if declined', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const router = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Make dirty' }))

    await userEvent.click(screen.getByRole('link', { name: 'Go other' }))

    expect(confirm).toHaveBeenCalledExactlyOnceWith(UNSAVED_CHANGES_MESSAGE)
    expect(screen.getByText('Editor page')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/editor')
    expect(router.state.blockers.size).toBe(1)
  })

  it('navigates when the user accepts', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const router = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Make dirty' }))

    await userEvent.click(screen.getByRole('link', { name: 'Go other' }))

    expect(await screen.findByText('Other page')).toBeInTheDocument()
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(router.state.location.pathname).toBe('/other')
  })

  it('does not block a navigation that keeps the same pathname', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    const router = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Make dirty' }))

    await userEvent.click(screen.getByRole('link', { name: 'Same path' }))

    expect(router.state.location.search).toBe('?tab=2')
    expect(confirm).not.toHaveBeenCalled()
  })

  it('also guards the browser Back button', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    const router = setup(['/other', '/editor'])
    await userEvent.click(screen.getByRole('button', { name: 'Make dirty' }))

    await act(() => router.navigate(-1))
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(router.state.location.pathname).toBe('/editor')

    await act(() => router.navigate(-1))
    expect(confirm).toHaveBeenCalledTimes(2)
    expect(await screen.findByText('Other page')).toBeInTheDocument()
  })

  it('stops asking once the page is clean again', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'Make dirty' }))
    await userEvent.click(screen.getByRole('button', { name: 'Make clean' }))

    await userEvent.click(screen.getByRole('link', { name: 'Go other' }))

    expect(await screen.findByText('Other page')).toBeInTheDocument()
    expect(confirm).not.toHaveBeenCalled()
  })

  it('prevents beforeunload only while dirty', async () => {
    setup()
    expect(dispatchBeforeUnload().defaultPrevented).toBe(false)

    await userEvent.click(screen.getByRole('button', { name: 'Make dirty' }))
    expect(dispatchBeforeUnload().defaultPrevented).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: 'Make clean' }))
    expect(dispatchBeforeUnload().defaultPrevented).toBe(false)
  })

  it('removes the beforeunload listener on unmount', async () => {
    const router = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Make dirty' }))
    expect(dispatchBeforeUnload().defaultPrevented).toBe(true)

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await userEvent.click(screen.getByRole('link', { name: 'Go other' }))
    await screen.findByText('Other page')

    expect(router.state.location.pathname).toBe('/other')
    expect(dispatchBeforeUnload().defaultPrevented).toBe(false)
  })
})
