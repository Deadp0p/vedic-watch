import { useEffect, useMemo, useRef, useState } from 'react'
import VedicWatch from './components/VedicWatch'
import { defaultCity, detectLocation } from './lib/location'
import { calculateMuhurat } from './lib/muhurat'
import { calculatePanchang } from './lib/panchang'
import { getDayPart } from './lib/theme'
import { formatClock } from './lib/time'
import { speakMuhurat } from './lib/voice'

const locationStorageKey = 'vedic_location'

const locationMessages = {
  detecting: {
    hi: '\u0938\u094d\u0925\u093e\u0928 \u0916\u094b\u091c \u0930\u0939\u0947 \u0939\u0948\u0902...',
    en: 'Detecting location...',
  },
  denied: {
    hi: '\u0938\u094d\u0925\u093e\u0928 \u0905\u0928\u0941\u092e\u0924\u093f \u0928\u0939\u0940\u0902 \u092e\u093f\u0932\u0940, \u092d\u094b\u092a\u093e\u0932 \u0915\u093e \u0909\u092a\u092f\u094b\u0917 \u0915\u093f\u092f\u093e \u091c\u093e \u0930\u0939\u093e \u0939\u0948\u0964',
    en: 'Location permission denied, using Bhopal.',
  },
  unavailable: {
    hi: '\u0938\u094d\u0925\u093e\u0928 \u0909\u092a\u0932\u092c\u094d\u0927 \u0928\u0939\u0940\u0902 \u0939\u0948, \u092d\u094b\u092a\u093e\u0932 \u0915\u093e \u0909\u092a\u092f\u094b\u0917 \u0915\u093f\u092f\u093e \u091c\u093e \u0930\u0939\u093e \u0939\u0948\u0964',
    en: 'Location unavailable, using Bhopal.',
  },
}

function getDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getSavedLocation() {
  try {
    const saved = window.localStorage.getItem(locationStorageKey)
    if (!saved) return null

    const parsed = JSON.parse(saved)
    if (!parsed || typeof parsed.latitude !== 'number' || typeof parsed.longitude !== 'number' || !parsed.nameEn) {
      return null
    }

    return {
      nameHi: parsed.nameHi || parsed.city || parsed.nameEn,
      nameEn: parsed.nameEn || parsed.city || parsed.nameHi,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      source: parsed.source || 'saved',
    }
  } catch {
    return null
  }
}

function saveLocation(location, source = location?.source || 'manual') {
  try {
    window.localStorage.setItem(
      locationStorageKey,
      JSON.stringify({
        nameHi: location.nameHi,
        nameEn: location.nameEn,
        city: location.nameEn,
        latitude: location.latitude,
        longitude: location.longitude,
        source,
      }),
    )
  } catch {
    // The watch can keep running even when browser storage is unavailable.
  }
}

function App() {
  const [now, setNow] = useState(() => new Date())
  const [, setCurrentDateKey] = useState(() => getDateKey(new Date()))
  const [panchangDate, setPanchangDate] = useState(() => new Date())
  const [location, setLocation] = useState(() => getSavedLocation() || defaultCity)
  const [language, setLanguage] = useState('hi')
  const [voiceMode, setVoiceMode] = useState('silent')
  const [locationStatus, setLocationStatus] = useState({ state: 'idle', message: '' })
  const [panchangSyncing, setPanchangSyncing] = useState(false)
  const lastAnnouncementRef = useRef('')
  const lastLocationKeyRef = useRef(`${location.latitude},${location.longitude}`)

  function clearLocationStatusSoon() {
    window.setTimeout(() => setLocationStatus({ state: 'idle', message: '' }), 4200)
  }

  function syncTime(forcePanchangRefresh = false) {
    const nextNow = new Date()
    setNow(nextNow)

    const nextDateKey = getDateKey(nextNow)
    setCurrentDateKey((previousDateKey) => {
      if (forcePanchangRefresh || previousDateKey !== nextDateKey) {
        setPanchangDate(nextNow)
        return nextDateKey
      }

      return previousDateKey
    })
  }

  useEffect(() => {
    const timer = window.setInterval(() => syncTime(), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    function handleResume() {
      syncTime(true)
    }

    function handleVisibilityChange() {
      if (!document.hidden) handleResume()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleResume)
    window.addEventListener('online', handleResume)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleResume)
      window.removeEventListener('online', handleResume)
    }
  }, [])

  useEffect(() => {
    if (getSavedLocation()) return

    let cancelled = false

    async function detectInitialLocation() {
      const detected = await detectLocation()
      if (cancelled) return

      if (detected.source === 'gps') {
        setLocation(detected)
        saveLocation(detected, 'gps')
        setLocationStatus({ state: 'idle', message: '' })
        syncTime(true)
        return
      }

      setLocation(defaultCity)
      setLocationStatus({
        state: 'notice',
        message: detected.reason === 'denied' ? locationMessages.denied[language] : locationMessages.unavailable[language],
      })
      clearLocationStatusSoon()
    }

    detectInitialLocation()

    return () => {
      cancelled = true
    }
  }, [language])

  const panchang = useMemo(() => calculatePanchang(panchangDate, location), [panchangDate, location])
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
    setPanchangDate(new Date())
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

  function handleSelectLocation(nextLocation) {
    setLocation(nextLocation)
    saveLocation(nextLocation, 'manual')
    syncTime(true)
  }

  async function handleDetectLocation() {
    setLocationStatus({
      state: 'loading',
      message: locationMessages.detecting[language],
    })

    const detected = await detectLocation()

    if (detected.source === 'default') {
      setLocation(defaultCity)
      setLocationStatus({
        state: 'notice',
        message: detected.reason === 'denied' ? locationMessages.denied[language] : locationMessages.unavailable[language],
      })
      clearLocationStatusSoon()
      return
    }

    setLocation(detected)
    saveLocation(detected, 'gps')
    syncTime(true)
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
      onSelectLocation={handleSelectLocation}
      onDetectLocation={handleDetectLocation}
      locationStatus={locationStatus}
      panchangSyncing={panchangSyncing}
    />
  )
}

export default App
