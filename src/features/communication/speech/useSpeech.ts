import { useCallback, useEffect, useRef, useState } from 'react'
import { cancelSpeech, isSpeechSupported, speak } from './speechService'

/** Visual feedback duration when speech synthesis is unavailable. */
const FALLBACK_FEEDBACK_MS = 700

/**
 * Speaks a phrase for a given item and exposes which item is currently active,
 * so the UI can show feedback. Only one phrase plays at a time.
 */
export function useSpeech() {
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  // Identifies the latest request so callbacks from cancelled utterances are ignored.
  const requestRef = useRef(0)
  const timeoutRef = useRef<number | undefined>(undefined)

  const say = useCallback((id: string, text: string) => {
    const request = ++requestRef.current
    window.clearTimeout(timeoutRef.current)
    setSpeakingId(id)

    const finish = () => {
      if (requestRef.current === request) setSpeakingId(null)
    }

    const started = speak(text, { onEnd: finish })
    if (!started) timeoutRef.current = window.setTimeout(finish, FALLBACK_FEEDBACK_MS)
  }, [])

  useEffect(() => {
    return () => {
      window.clearTimeout(timeoutRef.current)
      cancelSpeech()
    }
  }, [])

  return { say, speakingId, isSupported: isSpeechSupported() }
}
