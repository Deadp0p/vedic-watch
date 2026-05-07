export const voiceModes = [
  { id: 'silent', hi: 'मौन', en: 'Silent' },
  { id: 'all', hi: 'हर मुहूर्त', en: 'Every muhurat' },
  { id: 'good', hi: 'केवल शुभ', en: 'Good only' },
]

function selectHindiVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || []

  return (
    voices.find((voice) => voice.name.includes('Google Hindi')) ||
    voices.find((voice) => voice.name.includes('Google हिन्दी')) ||
    voices.find((voice) => voice.lang === 'hi-IN') ||
    voices.find((voice) => voice.lang.startsWith('hi')) ||
    voices[0] ||
    null
  )
}

export function speakMuhurat({ mode, muhurat, panchang, timeText, lastKeyRef, language = 'hi' }) {
  if (mode === 'silent' || !muhurat?.name || muhurat.name === '—' || !window.speechSynthesis) return
  if (mode === 'good' && muhurat.type !== 'good') return

  const key = `${language}-${muhurat.name}-${muhurat.start?.getTime()}`
  if (!key || lastKeyRef.current === key) return
  lastKeyRef.current = key

  const text =
    language === 'en'
      ? `The ${muhurat.name} muhurat has started. Today is ${panchang.lunarMonth}, ${panchang.paksha}, ${panchang.tithi}. The time is ${timeText}.`
      : `अभी ${muhurat.name} मुहूर्त प्रारंभ हुआ है। आज ${panchang.lunarMonth} ${panchang.paksha} ${panchang.tithi} है। समय ${timeText} है।`

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = language === 'en' ? 'en-IN' : 'hi-IN'
  utterance.voice = language === 'hi' ? selectHindiVoice() : null
  utterance.rate = language === 'hi' ? 0.9 : 0.9
  utterance.pitch = language === 'hi' ? 0.9 : 0.9
  utterance.volume = 1

  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}
