export const defaultCity = {
  nameHi: '\u091c\u092f\u092a\u0941\u0930',
  nameEn: 'Jaipur',
  city: 'Jaipur',
  state: 'Rajasthan',
  country: 'India',
  latitude: 26.9124,
  longitude: 75.7873,
  mode: 'Default',
}

export const cityOptions = [
  defaultCity,
  { nameHi: '\u0935\u093e\u0930\u093e\u0923\u0938\u0940', nameEn: 'Varanasi', city: 'Varanasi', latitude: 25.3176, longitude: 82.9739 },
  { nameHi: '\u0909\u091c\u094d\u091c\u0948\u0928', nameEn: 'Ujjain', city: 'Ujjain', latitude: 23.1765, longitude: 75.7885 },
  { nameHi: '\u0926\u093f\u0932\u094d\u0932\u0940', nameEn: 'Delhi', city: 'Delhi', latitude: 28.6139, longitude: 77.209 },
  { nameHi: '\u092e\u0941\u0902\u092c\u0908', nameEn: 'Mumbai', city: 'Mumbai', latitude: 19.076, longitude: 72.8777 },
  { nameHi: '\u091a\u0947\u0928\u094d\u0928\u0908', nameEn: 'Chennai', city: 'Chennai', latitude: 13.0827, longitude: 80.2707 },
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
      resolve({ ...defaultCity, source: 'default', mode: 'Default', reason: 'unsupported' })
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords
        const detectedName = await reverseGeocode(latitude, longitude)
        resolve({
          nameHi: detectedName || 'Detected Location',
          nameEn: detectedName || 'Detected Location',
          city: detectedName || 'Detected Location',
          latitude,
          longitude,
          accuracy,
          source: 'gps',
          mode: 'GPS',
        })
      },
      (error) =>
        resolve({
          ...defaultCity,
          source: 'default',
          mode: 'Default',
          reason: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable',
        }),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
    )
  })
}
