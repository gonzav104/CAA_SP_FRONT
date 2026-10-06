import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { X } from 'lucide-react'

/** Hold duration required to exit, so an accidental tap never leaves Use Mode. */
const HOLD_MS = 1500
const RING_RADIUS = 22
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

interface ExitButtonProps {
  onExit: () => void
}

/** Discreet exit for the adult: must be held; a ring fills while holding. */
export function ExitButton({ onExit }: ExitButtonProps) {
  const [isHolding, setIsHolding] = useState(false)
  const timeoutRef = useRef<number | undefined>(undefined)

  const startHold = () => {
    setIsHolding(true)
    timeoutRef.current = window.setTimeout(() => {
      setIsHolding(false)
      onExit()
    }, HOLD_MS)
  }

  const cancelHold = () => {
    window.clearTimeout(timeoutRef.current)
    setIsHolding(false)
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
      event.preventDefault()
      startHold()
    }
  }

  useEffect(() => () => window.clearTimeout(timeoutRef.current), [])

  return (
    <button
      type="button"
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      onKeyDown={handleKeyDown}
      onKeyUp={cancelHold}
      onBlur={cancelHold}
      onContextMenu={(event) => event.preventDefault()}
      aria-label="Salir (mantener presionado)"
      className="relative flex size-12 shrink-0 select-none items-center justify-center rounded-full text-caa-muted touch-manipulation outline-none focus-visible:ring-4 focus-visible:ring-caa-ink/35"
    >
      <svg aria-hidden="true" viewBox="0 0 48 48" className="absolute inset-0 -rotate-90">
        <circle cx="24" cy="24" r={RING_RADIUS} fill="none" strokeWidth="2" className="stroke-caa-line" />
        <circle
          cx="24"
          cy="24"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={isHolding ? 0 : RING_LENGTH}
          style={{ transition: isHolding ? `stroke-dashoffset ${HOLD_MS}ms linear` : 'none' }}
          className="stroke-caa-ink"
        />
      </svg>
      <X aria-hidden="true" strokeWidth={2} className="relative size-5" />
    </button>
  )
}
