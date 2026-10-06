import { useEffect } from 'react'
import { useBlocker } from 'react-router'

export const UNSAVED_CHANGES_MESSAGE =
  'Tienes cambios sin guardar. Si sales ahora, se perderán. ¿Quieres salir de todos modos?'

/**
 * Warns before unsaved changes are lost. In-app navigation to another pathname (links and the
 * browser Back/Forward buttons) asks through `window.confirm`; closing or reloading the tab uses the
 * browser's own `beforeunload` prompt. Needs a data router. Nothing warns while `isDirty` is false.
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => isDirty && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm(UNSAVED_CHANGES_MESSAGE)) blocker.proceed()
    else blocker.reset()
  }, [blocker])

  useEffect(() => {
    if (!isDirty) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])
}
