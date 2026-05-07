import { Volume2, VolumeX } from 'lucide-react'
import { voiceModes } from '../lib/voice'

export default function VoiceControls({ mode, onChange, language }) {
  const current = voiceModes.find((item) => item.id === mode) || voiceModes[0]
  const nextMode = voiceModes[(voiceModes.findIndex((item) => item.id === mode) + 1) % voiceModes.length]
  const isVoiceActive = mode !== 'silent'

  return (
    <button
      type="button"
      className={`watch-button ${isVoiceActive ? 'is-speaking' : ''}`}
      title={language === 'hi' ? current.hi : current.en}
      onClick={() => onChange(nextMode.id)}
    >
      {mode === 'silent' ? <VolumeX size={16} /> : <Volume2 size={16} />}
      {isVoiceActive ? <span className="speaking-indicator" aria-hidden="true" /> : null}
      <span>{language === 'hi' ? current.hi : current.en}</span>
    </button>
  )
}
