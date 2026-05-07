import { useEffect, useMemo, useRef, useState } from 'react'
import VedicWatch from './components/VedicWatch'
import { defaultCity, detectLocation } from './lib/location'
import { calculateMuhurat } from './lib/muhurat'
import { resolveNetworkTimeOffset } from './lib/networkTime'
import { calculatePanchang } from './lib/panchang'
import { getCachedSolarTimes, resolveSolarTimes } from './lib/solar'
import { getDayPart } from './lib/theme'
import { formatClock } from './lib/time'
import { speakMuhurat } from './lib/voice'

const locationStorageKey = 'vedic_location'
const networkSyncIntervalMs = 30 * 60 * 1000

const locationMessages = {
  detecting: {
    hi: '\u0938\u094d\u0925\u093e\u0928 \u0916\u094b\u091c \u0930\u0939\u0947 \u0939\u0948\u0902...',
    en: 'Detecting location...',
  },
  denied: {
    hi: '\u0938\u094d\u0925\u093e\u0928 \u0905\u0928\u0941\u092e\u0924\u093f \u0928\u0939\u0940\u0902 \u092e\u093f\u0932\u0940, \u091c\u092f\u092a\u0941\u0930 \u0915\u093e \u0909\u092a\u092f\u094b\u0917 \u0915\u093f\u092f\u093e \u091c\u093e \u0930\u0939\u093e \u0939\u0948\u0964',
    en: 'Location permission denied, using Jaipur.',
  },
  unavailable: {
    hi: '\u0938\u094d\u0925\u093e\u0928 \u0909\u092a\u0932\u092c\u094d\u0927 \u0928\u0939\u0940\u0902 \u0939\u0948, \u091c\u092f\u092a\u0941\u0930 \u0915\u093e \u0909\u092a\u092f\u094b\u0917 \u0915\u093f\u092f\u093e \u091c\u093e \u0930\u0939\u093e \u0939\u0948\u0964',
    en: 'Location unavailable, using Jaipur.',
  },
  selectedFallback: {
    hi: '\u0938\u094d\u0925\u093e\u0928 \u0905\u0928\u0941\u092e\u0924\u093f \u0928\u0939\u0940\u0902 \u092e\u093f\u0932\u0940, \u091a\u092f\u0928\u093f\u0924 \u0938\u094d\u0925\u093e\u0928 \u0915\u093e \u0909\u092a\u092f\u094b\u0917 \u0915\u093f\u092f\u093e \u091c\u093e \u0930\u0939\u093e \u0939\u0948\u0964',
    en: 'Location permission denied, using selected location.',
  },
}

function getCorrectedNow(offsetMs) {
  return new Date(Date.now() + offsetMs)
}

function getDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function normalizeLocation(location, mode = location?.mode || 'Manual') {
  return {
    ...location,
    city: location.city || location.nameEn,
    state: location.state || '',
    country: location.country || 'India',
    mode,
  }
}

function getSavedLocation() {
  try {
    const saved = window.localStorage.getItem(locationStorageKey)
    if (!saved) return null

    const parsed = JSON.parse(saved)
    if (!parsed || typeof parsed.latitude !== 'number' || typeof parsed.longitude !== 'number' || !parsed.nameEn) {
      return null
    }

    return normalizeLocation(
      {
        nameHi: parsed.nameHi || parsed.city || parsed.nameEn,
        nameEn: parsed.nameEn || parsed.city || parsed.nameHi,
        city: parsed.city || parsed.nameEn,
        state: parsed.state || '',
        country: parsed.country || 'India',
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        accuracy: parsed.accuracy,
        source: parsed.source || 'saved',
      },
      parsed.mode || (parsed.source === 'gps' ? 'GPS' : 'Manual'),
    )
  } catch {
    return null
  }
}

function saveLocation(location, mode = location?.mode || 'Manual') {
  try {
    window.localStorage.setItem(
      locationStorageKey,
      JSON.stringify({
        nameHi: location.nameHi,
        nameEn: location.nameEn,
        city: location.city || location.nameEn,
        state: location.state || '',
        country: location.country || 'India',
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        source: location.source,
        mode,
      }),
    )
  } catch {
    // The watch can keep running even when browser storage is unavailable.
  }
}

function getInitialLocation() {
  return getSavedLocation() || normalizeLocation(defaultCity, 'Default')
}

function App() {
  const [timeSync, setTimeSync] = useState({
    offsetMs: 0,
    source: 'Device time',
    lastSyncedAt: null,
  })
  const timeOffsetRef = useRef(0)
  const [now, setNow] = useState(() => getCorrectedNow(0))
  const [, setCurrentDateKey] = useState(() => getDateKey(getCorrectedNow(0)))
  const [panchangDate, setPanchangDate] = useState(() => getCorrectedNow(0))
  const [location, setLocation] = useState(getInitialLocation)
  const [solarTimes, setSolarTimes] = useState(() => getCachedSolarTimes(getCorrectedNow(0), getInitialLocation()))
  const [language, setLanguage] = useState('hi')
  const [voiceMode, setVoiceMode] = useState('silent')
  const [locationStatus, setLocationStatus] = useState({ state: 'idle', message: '' })
  const [panchangSyncing, setPanchangSyncing] = useState(false)
  const lastAnnouncementRef = useRef('')
  const lastLocationKeyRef = useRef(`${location.latitude},${location.longitude}`)
  const solarRequestRef = useRef(0)
  const languageRef = useRef(language)

  function clearLocationStatusSoon() {
    window.setTimeout(() => setLocationStatus({ state: 'idle', message: '' }), 4200)
  }

  function syncTime(forcePanchangRefresh = false) {
    const nextNow = getCorrectedNow(timeOffsetRef.current)
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

  async function syncNetworkTime(forcePanchangRefresh = false) {
    const nextTimeSync = await resolveNetworkTimeOffset()
    timeOffsetRef.current = nextTimeSync.offsetMs
    setTimeSync(nextTimeSync)
    syncTime(forcePanchangRefresh)
  }

  async function refreshSolarTimes(date = panchangDate, targetLocation = location) {
    const requestId = solarRequestRef.current + 1
    solarRequestRef.current = requestId
    const cached = getCachedSolarTimes(date, targetLocation)
    if (cached) setSolarTimes(cached)

    const resolved = await resolveSolarTimes(date, targetLocation)
    if (solarRequestRef.current === requestId) setSolarTimes(resolved)
  }

  useEffect(() => {
    const timer = window.setInterval(() => syncTime(), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    languageRef.current = language
  }, [language])

  useEffect(() => {
    const start = window.setTimeout(() => syncNetworkTime(true), 0)
    const timer = window.setInterval(() => syncNetworkTime(true), networkSyncIntervalMs)
    return () => {
      window.clearTimeout(start)
      window.clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => refreshSolarTimes(panchangDate, location), 0)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panchangDate, location])

  useEffect(() => {
    function handleResume() {
      syncNetworkTime(true)
      refreshSolarTimes(getCorrectedNow(timeOffsetRef.current), location)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  useEffect(() => {
    let cancelled = false

    async function detectInitialLocation() {
      const savedLocation = getSavedLocation()
      const detected = await detectLocation()
      if (cancelled) return

      if (detected.source === 'gps') {
        const gpsLocation = normalizeLocation(detected, 'GPS')
        setLocation(gpsLocation)
        saveLocation(gpsLocation, 'GPS')
        setLocationStatus({ state: 'idle', message: '' })
        syncTime(true)
        return
      }

      if (savedLocation) {
        setLocation(savedLocation)
      } else {
        const fallbackLocation = normalizeLocation(defaultCity, 'Default')
        setLocation(fallbackLocation)
        saveLocation(fallbackLocation, 'Default')
        setLocationStatus({
          state: 'notice',
          message:
            detected.reason === 'denied'
              ? locationMessages.denied[languageRef.current]
              : locationMessages.unavailable[languageRef.current],
        })
        clearLocationStatusSoon()
      }
    }

    detectInitialLocation()

    return () => {
      cancelled = true
    }
  }, [])

  const panchang = useMemo(
    () => calculatePanchang(panchangDate, location, solarTimes),
    [panchangDate, location, solarTimes],
  )
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
    setPanchangDate(getCorrectedNow(timeOffsetRef.current))
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
    const manualLocation = normalizeLocation(nextLocation, 'Manual')
    setLocation(manualLocation)
    saveLocation(manualLocation, 'Manual')
    syncTime(true)
  }

  async function handleDetectLocation() {
    setLocationStatus({
      state: 'loading',
      message: locationMessages.detecting[language],
    })

    const detected = await detectLocation()

    if (detected.source === 'default') {
      const savedLocation = getSavedLocation()
      const fallbackLocation = savedLocation || normalizeLocation(defaultCity, 'Default')
      setLocation(fallbackLocation)
      if (!savedLocation) saveLocation(fallbackLocation, 'Default')
      setLocationStatus({
        state: 'notice',
        message: savedLocation
          ? locationMessages.selectedFallback[language]
          : detected.reason === 'denied'
            ? locationMessages.denied[language]
            : locationMessages.unavailable[language],
      })
      clearLocationStatusSoon()
      return
    }

    const gpsLocation = normalizeLocation(detected, 'GPS')
    setLocation(gpsLocation)
    saveLocation(gpsLocation, 'GPS')
    syncTime(true)
    setLocationStatus({ state: 'idle', message: '' })
  }

  const accuracyInfo = {
    timeSource: timeSync.source,
    timeOffsetSeconds: Math.round(timeSync.offsetMs / 1000),
    timeLastSyncedAt: timeSync.lastSyncedAt,
    sunriseSource: solarTimes?.source || 'Local calculation',
    sunrise: panchang.sunrise,
    sunset: panchang.sunset,
    locationMode: location.mode || 'Default',
    latitude: location.latitude,
    longitude: location.longitude,
    lastSyncedAt: solarTimes?.lastSyncedAt || timeSync.lastSyncedAt,
  }

  return (
    <VedicWatch
      now={now}
      location={location}
      panchang={panchang}
      muhurat={muhurat}
      accuracyInfo={accuracyInfo}
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
