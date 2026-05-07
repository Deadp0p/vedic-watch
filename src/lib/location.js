export const defaultCity = {
  nameHi: 'भोपाल',
  nameEn: 'Bhopal',
  latitude: 23.2599,
  longitude: 77.4126,
}

export const cityOptions = [
  defaultCity,
  { nameHi: 'वाराणसी', nameEn: 'Varanasi', latitude: 25.3176, longitude: 82.9739 },
  { nameHi: 'उज्जैन', nameEn: 'Ujjain', latitude: 23.1765, longitude: 75.7885 },
  { nameHi: 'दिल्ली', nameEn: 'Delhi', latitude: 28.6139, longitude: 77.209 },
  { nameHi: 'मुंबई', nameEn: 'Mumbai', latitude: 19.076, longitude: 72.8777 },
  { nameHi: 'जयपुर', nameEn: 'Jaipur', latitude: 26.9124, longitude: 75.7873 },
  { nameHi: 'चेन्नई', nameEn: 'Chennai', latitude: 13.0827, longitude: 80.2707 },
]

async function reverseGeocode(latitude, longitude) {
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
    )
    if (!response.ok) return null
    const data = await response.json()
    return data.city || data.locality || data.principalSubdivision || null
  } catch {
    return null
  }
}

export function detectLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ ...defaultCity, source: 'default', reason: 'unsupported' })
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        const detectedName = await reverseGeocode(latitude, longitude)
        resolve({
          nameHi: detectedName || 'Detected Location',
          nameEn: detectedName || 'Detected Location',
          latitude,
          longitude,
          source: 'gps',
        })
      },
      (error) =>
        resolve({
          ...defaultCity,
          source: 'default',
          reason: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable',
        }),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 600000 },
    )
  })
}
