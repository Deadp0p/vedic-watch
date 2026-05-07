import SunCalc from 'suncalc'

const dayMuhuratNames = [
  'रुद्र',
  'आहि',
  'मित्र',
  'पितृ',
  'वसु',
  'वाराह',
  'विश्वदेव',
  'विधि',
  'सतमुखी',
  'पुरुहूत',
  'वाहिनी',
  'नक्तनकर',
  'वरुण',
  'अर्यमा',
  'भग',
]

const nightMuhuratNames = [
  'गिरीश',
  'अजपाद',
  'अहिरबुध्न्य',
  'पूषा',
  'अश्विनी',
  'यम',
  'अग्नि',
  'विधाता',
  'कण्ड',
  'अदिति',
  'जीव',
  'विष्णु',
  'द्युमद्गद्युति',
  'ब्रह्म',
  'समुद्रम',
]

const weekdayWindows = {
  rahu: [7, 1, 6, 4, 5, 3, 2],
  gulika: [6, 5, 4, 3, 2, 1, 0],
  yamaganda: [4, 3, 2, 1, 0, 6, 5],
}

function interval(start, end, name, type = 'neutral') {
  return { name, start, end, type }
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000)
}

function formatRange(start, end) {
  if (!start || !end) return '—'
  const formatter = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${formatter.format(start)} - ${formatter.format(end)}`
}

function daySegment(sunrise, sunset, weekday, kind) {
  const index = weekdayWindows[kind][weekday]
  const duration = (sunset.getTime() - sunrise.getTime()) / 8
  const start = new Date(sunrise.getTime() + duration * index)
  return { start, end: new Date(start.getTime() + duration) }
}

export function calculateMuhurat(now, location, sunrise, sunset) {
  if (!sunrise || !sunset) {
    return {
      current: interval(null, null, '—'),
      next: interval(null, null, '—'),
      countdownMs: 0,
      rahuKaal: '—',
      gulikaKaal: '—',
      yamaganda: '—',
      abhijit: '—',
      brahma: '—',
      badge: '—',
      badgeType: 'neutral',
    }
  }

  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const nextSunrise = SunCalc.getTimes(tomorrow, location.latitude, location.longitude).sunrise
  const nightEnd = nextSunrise || addMinutes(sunset, 720)
  const isDay = now >= sunrise && now < sunset
  const names = isDay ? dayMuhuratNames : nightMuhuratNames
  const start = isDay ? sunrise : sunset
  const end = isDay ? sunset : nightEnd
  const segment = (end.getTime() - start.getTime()) / 15
  const index = Math.max(0, Math.min(14, Math.floor((now.getTime() - start.getTime()) / segment)))
  const currentStart = new Date(start.getTime() + segment * index)
  const currentEnd = new Date(currentStart.getTime() + segment)
  const nextIndex = (index + 1) % 15
  const nextStart = currentEnd
  const nextEnd = new Date(nextStart.getTime() + segment)
  const auspiciousNames = new Set(['मित्र', 'वसु', 'विश्वदेव', 'विधि', 'भग', 'ब्रह्म', 'विष्णु', 'अश्विनी'])
  const inauspiciousNames = new Set(['रुद्र', 'आहि', 'यम', 'अग्नि'])
  const currentName = names[index] || '—'
  const badgeType = auspiciousNames.has(currentName) ? 'good' : inauspiciousNames.has(currentName) ? 'bad' : 'neutral'
  const weekday = now.getDay()
  const rahu = daySegment(sunrise, sunset, weekday, 'rahu')
  const gulika = daySegment(sunrise, sunset, weekday, 'gulika')
  const yama = daySegment(sunrise, sunset, weekday, 'yamaganda')
  const solarNoon = new Date((sunrise.getTime() + sunset.getTime()) / 2)
  const abhijitStart = addMinutes(solarNoon, -24)
  const abhijitEnd = addMinutes(solarNoon, 24)
  const brahmaStart = addMinutes(sunrise, -96)
  const brahmaEnd = addMinutes(sunrise, -48)

  return {
    current: interval(currentStart, currentEnd, currentName, badgeType),
    next: interval(nextStart, nextEnd, names[nextIndex] || '—'),
    countdownMs: currentEnd.getTime() - now.getTime(),
    rahuKaal: formatRange(rahu.start, rahu.end),
    gulikaKaal: formatRange(gulika.start, gulika.end),
    yamaganda: formatRange(yama.start, yama.end),
    abhijit: formatRange(abhijitStart, abhijitEnd),
    brahma: formatRange(brahmaStart, brahmaEnd),
    badge: badgeType === 'good' ? 'शुभ' : badgeType === 'bad' ? 'अशुभ' : 'सामान्य',
    badgeType,
  }
}

