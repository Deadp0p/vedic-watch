import { useEffect, useMemo, useRef, useState } from 'react'
import VedicWatch from './components/VedicWatch'
import { defaultCity, detectLocation } from './lib/location'
import { calculateMuhurat } from './lib/muhurat'
import { calculatePanchang } from './lib/panchang'
import { getDayPart } from './lib/theme'
import { formatClock } from './lib/time'
import { speakMuhurat } from './lib/voice'

function App() {
  const [now, setNow] = useState(() => new Date())
  const [location, setLocation] = useState(defaultCity)
  const [language, setLanguage] = useState('hi')
  const [voiceMode, setVoiceMode] = useState('silent')
  const [locationStatus, setLocationStatus] = useState({ state: 'idle', message: '' })
  const [panchangSyncing, setPanchangSyncing] = useState(false)
  const lastAnnouncementRef = useRef('')
  const lastLocationKeyRef = useRef(`${defaultCity.latitude},${defaultCity.longitude}`)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const panchang = useMemo(() => calculatePanchang(now, location), [now, location])
  const muhurat = useMemo(
    () => calculateMuhurat(now, location, panchang.sunrise, panchang.sunset),
    [now, location, panchang.sunrise, panchang.sunset],
  )
  const dayPart = getDayPart(now, panchang.sunrise, panchang.sunset)

  useEffect(() => {
    document.documentElement.dataset.dayPart = dayPart
  }, [dayPart])

  useEffect(() => {
    const key = `${location.latitude},${location.longitude}`
    if (lastLocationKeyRef.current === key) return
    lastLocationKeyRef.current = key
    setPanchangSyncing(true)
    const timer = window.setTimeout(() => setPanchangSyncing(false), 650)
    return () => window.clearTimeout(timer)
  }, [location])

  useEffect(() => {
    speakMuhurat({
      mode: voiceMode,
      muhurat: muhurat.current,
      panchang,
      timeText: formatClock(now),
      lastKeyRef: lastAnnouncementRef,
      language,
    })
  }, [voiceMode, muhurat, panchang, now, language])

  async function handleDetectLocation() {
    setLocationStatus({
      state: 'loading',
      message: language === 'hi' ? 'स्थान खोज रहे हैं…' : 'Detecting location…',
    })

    const detected = await detectLocation()
    setLocation(detected)

    if (detected.source === 'default') {
      setLocationStatus({
        state: 'notice',
        message:
          detected.reason === 'denied'
            ? language === 'hi'
              ? 'स्थान अनुमति नहीं मिली, भोपाल का उपयोग किया जा रहा है।'
              : 'Location permission denied, using Bhopal.'
            : language === 'hi'
              ? 'स्थान उपलब्ध नहीं है, भोपाल का उपयोग किया जा रहा है।'
              : 'Location unavailable, using Bhopal.',
      })
      window.setTimeout(() => setLocationStatus({ state: 'idle', message: '' }), 4200)
      return
    }

    setLocationStatus({ state: 'idle', message: '' })
  }

  return (
    <VedicWatch
      now={now}
      location={location}
      panchang={panchang}
      muhurat={muhurat}
      language={language}
      setLanguage={setLanguage}
      voiceMode={voiceMode}
      setVoiceMode={setVoiceMode}
      onSelectLocation={setLocation}
      onDetectLocation={handleDetectLocation}
      locationStatus={locationStatus}
      panchangSyncing={panchangSyncing}
    />
  )
}

export default App
