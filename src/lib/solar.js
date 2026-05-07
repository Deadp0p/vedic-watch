import SunCalc from 'suncalc'

const solarStorageKey = 'vedic_solar_times'

function getDateKey(date) {
  return date.toISOString().slice(0, 10)
}

function getLocationKey(location) {
  return `${Number(location.latitude).toFixed(4)},${Number(location.longitude).toFixed(4)}`
}

function getCacheKey(date, location) {
  return `${getDateKey(date)}|${getLocationKey(location)}`
}

function readCache() {
  try {
    return JSON.parse(window.localStorage.getItem(solarStorageKey)) || {}
  } catch {
    return {}
  }
}

function writeCache(cache) {
  try {
    window.localStorage.setItem(solarStorageKey, JSON.stringify(cache))
  } catch {
    // Sunrise/sunset can always fall back to local calculation.
  }
}

function toSolarResult(value, fallbackSource = 'Local calculation') {
  if (!value) return null
  const sunrise = new Date(value.sunrise)
  const sunset = new Date(value.sunset)
  if (Number.isNaN(sunrise.getTime()) || Number.isNaN(sunset.getTime())) return null

  return {
    sunrise,
    sunset,
    source: value.source || fallbackSource,
    lastSyncedAt: value.lastSyncedAt ? new Date(value.lastSyncedAt) : null,
  }
}

function getLocalSolarTimes(date, location) {
  const times = SunCalc.getTimes(date, location.latitude, location.longitude)
  return {
    sunrise: times.sunrise,
    sunset: times.sunset,
    source: 'Local calculation',
    lastSyncedAt: new Date(),
  }
}

export function getCachedSolarTimes(date, location) {
  const cached = readCache()[getCacheKey(date, location)]
  return toSolarResult(cached)
}

export async function resolveSolarTimes(date, location) {
  const cache = readCache()
  const cacheKey = getCacheKey(date, location)
  const cached = toSolarResult(cache[cacheKey])
  if (cached) return cached

  const localTimes = getLocalSolarTimes(date, location)

  try {
    const params = new URLSearchParams({
      lat: String(location.latitude),
      lng: String(location.longitude),
      date: getDateKey(date),
      formatted: '0',
    })
    const response = await fetch(`https://api.sunrise-sunset.org/json?${params.toString()}`)
    if (!response.ok) throw new Error('sunrise API unavailable')

    const data = await response.json()
    const apiSunrise = new Date(data?.results?.sunrise)
    const apiSunset = new Date(data?.results?.sunset)
    if (data.status !== 'OK' || Number.isNaN(apiSunrise.getTime()) || Number.isNaN(apiSunset.getTime())) {
      throw new Error('sunrise API returned invalid data')
    }

    const apiTimes = {
      sunrise: apiSunrise,
      sunset: apiSunset,
      source: 'API',
      lastSyncedAt: new Date(),
    }
    cache[cacheKey] = {
      sunrise: apiTimes.sunrise.toISOString(),
      sunset: apiTimes.sunset.toISOString(),
      source: apiTimes.source,
      lastSyncedAt: apiTimes.lastSyncedAt.toISOString(),
    }
    writeCache(cache)
    return apiTimes
  } catch {
    cache[cacheKey] = {
      sunrise: localTimes.sunrise.toISOString(),
      sunset: localTimes.sunset.toISOString(),
      source: localTimes.source,
      lastSyncedAt: localTimes.lastSyncedAt.toISOString(),
    }
    writeCache(cache)
    return localTimes
  }
}
