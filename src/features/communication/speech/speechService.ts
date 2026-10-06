const PREFERRED_LANG = 'es-AR'

export interface SpeakHandlers {
  onEnd: () => void
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function pickSpanishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((voice) => voice.lang === PREFERRED_LANG) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith('es'))
  )
}

/**
 * Speaks `text`, cancelling anything currently playing so phrases never overlap.
 * Returns false when speech synthesis is unavailable.
 */
export function speak(text: string, { onEnd }: SpeakHandlers): boolean {
  if (!isSpeechSupported()) return false

  const synth = window.speechSynthesis
  synth.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = PREFERRED_LANG
  const voice = pickSpanishVoice()
  if (voice) utterance.voice = voice
  utterance.onend = onEnd
  utterance.onerror = onEnd

  synth.speak(utterance)
  return true
}

export function cancelSpeech(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel()
}
