import SunCalc from 'suncalc'
import * as Astronomy from 'astronomy-engine'

const tithis = [
  'प्रतिपदा',
  'द्वितीया',
  'तृतीया',
  'चतुर्थी',
  'पंचमी',
  'षष्ठी',
  'सप्तमी',
  'अष्टमी',
  'नवमी',
  'दशमी',
  'एकादशी',
  'द्वादशी',
  'त्रयोदशी',
  'चतुर्दशी',
  'पूर्णिमा',
  'प्रतिपदा',
  'द्वितीया',
  'तृतीया',
  'चतुर्थी',
  'पंचमी',
  'षष्ठी',
  'सप्तमी',
  'अष्टमी',
  'नवमी',
  'दशमी',
  'एकादशी',
  'द्वादशी',
  'त्रयोदशी',
  'चतुर्दशी',
  'अमावस्या',
]

const nakshatras = [
  'अश्विनी',
  'भरणी',
  'कृत्तिका',
  'रोहिणी',
  'मृगशिरा',
  'आर्द्रा',
  'पुनर्वसु',
  'पुष्य',
  'आश्लेषा',
  'मघा',
  'पूर्व फाल्गुनी',
  'उत्तर फाल्गुनी',
  'हस्त',
  'चित्रा',
  'स्वाती',
  'विशाखा',
  'अनुराधा',
  'ज्येष्ठा',
  'मूल',
  'पूर्वाषाढ़ा',
  'उत्तराषाढ़ा',
  'श्रवण',
  'धनिष्ठा',
  'शतभिषा',
  'पूर्व भाद्रपद',
  'उत्तर भाद्रपद',
  'रेवती',
]

const yogas = [
  'विष्कम्भ',
  'प्रीति',
  'आयुष्मान',
  'सौभाग्य',
  'शोभन',
  'अतिगण्ड',
  'सुकर्मा',
  'धृति',
  'शूल',
  'गण्ड',
  'वृद्धि',
  'ध्रुव',
  'व्याघात',
  'हर्षण',
  'वज्र',
  'सिद्धि',
  'व्यतीपात',
  'वरीयान',
  'परिघ',
  'शिव',
  'सिद्ध',
  'साध्य',
  'शुभ',
  'शुक्ल',
  'ब्रह्म',
  'इन्द्र',
  'वैधृति',
]

const karanas = ['बव', 'बालव', 'कौलव', 'तैतिल', 'गर', 'वणिज', 'विष्टि']
const fixedKaranas = ['शकुनि', 'चतुष्पाद', 'नाग', 'किंस्तुघ्न']
const rashis = ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुंभ', 'मीन']
const months = ['चैत्र', 'वैशाख', 'ज्येष्ठ', 'आषाढ़', 'श्रावण', 'भाद्रपद', 'आश्विन', 'कार्तिक', 'मार्गशीर्ष', 'पौष', 'माघ', 'फाल्गुन']

function normalize(degrees) {
  return ((degrees % 360) + 360) % 360
}

function lahiriAyanamsa(date) {
  const year = date.getUTCFullYear() + (date.getUTCMonth() + 0.5) / 12
  return 22.460148 + 1.396042 * ((year - 1900) / 100) + 0.000308 * ((year - 1900) / 100) ** 2
}

function sidereal(degrees, date) {
  return normalize(degrees - lahiriAyanamsa(date))
}

function getKarana(tithiIndex, phase) {
  const half = Math.floor(phase / 6) + 1
  if (half === 1) return fixedKaranas[3]
  if (half >= 57) return fixedKaranas[Math.min(half - 57, 2)]
  return karanas[(half - 2) % 7]
}

function getLunarMonth(date) {
  try {
    const newMoon = Astronomy.SearchMoonPhase(0, date, -35) || Astronomy.SearchMoonPhase(0, date, 35)
    if (!newMoon) return '—'
    const sunAtNewMoon = sidereal(Astronomy.SunPosition(newMoon.date).elon, newMoon.date)
    return months[(Math.floor(sunAtNewMoon / 30) + 1) % 12]
  } catch {
    return '—'
  }
}

export function calculatePanchang(date, location) {
  try {
    const solarTimes = SunCalc.getTimes(date, location.latitude, location.longitude)
    const moonIllumination = SunCalc.getMoonIllumination(date)
    const moonPhaseAngle = Astronomy.MoonPhase(date)
    const sunLongitude = sidereal(Astronomy.SunPosition(date).elon, date)
    const moonLongitude = sidereal(Astronomy.EclipticGeoMoon(date).lon, date)
    const tithiIndex = Math.floor(moonPhaseAngle / 12)
    const nakshatraIndex = Math.floor(moonLongitude / (360 / 27))
    const yogaIndex = Math.floor(normalize(sunLongitude + moonLongitude) / (360 / 27))

    return {
      status: 'ready',
      sunrise: solarTimes.sunrise,
      sunset: solarTimes.sunset,
      tithi: tithis[tithiIndex] || '—',
      tithiNumber: tithiIndex + 1,
      paksha: moonPhaseAngle < 180 ? 'शुक्ल पक्ष' : 'कृष्ण पक्ष',
      lunarMonth: getLunarMonth(date),
      nakshatra: nakshatras[nakshatraIndex] || '—',
      yoga: yogas[yogaIndex] || '—',
      karana: getKarana(tithiIndex, moonPhaseAngle),
      moonPhase: moonPhaseAngle,
      moonIllumination: moonIllumination.fraction,
      moonSign: rashis[Math.floor(moonLongitude / 30)] || '—',
      sunSign: rashis[Math.floor(sunLongitude / 30)] || '—',
      festival: tithiIndex === 10 || tithiIndex === 25 ? 'एकादशी व्रत' : '—',
    }
  } catch {
    return {
      status: 'syncing',
      sunrise: null,
      sunset: null,
      tithi: '—',
      tithiNumber: null,
      paksha: '—',
      lunarMonth: '—',
      nakshatra: '—',
      yoga: '—',
      karana: '—',
      moonPhase: 0,
      moonIllumination: 0,
      moonSign: '—',
      sunSign: '—',
      festival: '—',
    }
  }
}
