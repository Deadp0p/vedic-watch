import SunCalc from 'suncalc'

const dayMuhuratNames = [
  '\u0930\u0941\u0926\u094d\u0930',
  '\u0906\u0939\u093f',
  '\u092e\u093f\u0924\u094d\u0930',
  '\u092a\u093f\u0924\u0943',
  '\u0935\u0938\u0941',
  '\u0935\u093e\u0930\u093e\u0939',
  '\u0935\u093f\u0936\u094d\u0935\u0926\u0947\u0935',
  '\u0935\u093f\u0927\u093f',
  '\u0938\u0924\u092e\u0941\u0916\u0940',
  '\u092a\u0941\u0930\u0941\u0939\u0942\u0924',
  '\u0935\u093e\u0939\u093f\u0928\u0940',
  '\u0928\u0915\u094d\u0924\u0928\u0915\u0930',
  '\u0935\u0930\u0941\u0923',
  '\u0905\u0930\u094d\u092f\u092e\u093e',
  '\u092d\u0917',
]

const nightMuhuratNames = [
  '\u0917\u093f\u0930\u0940\u0936',
  '\u0905\u091c\u092a\u093e\u0926',
  '\u0905\u0939\u093f\u0930\u092c\u0941\u0927\u094d\u0928\u094d\u092f',
  '\u092a\u0942\u0937\u093e',
  '\u0905\u0936\u094d\u0935\u093f\u0928\u0940',
  '\u092f\u092e',
  '\u0905\u0917\u094d\u0928\u093f',
  '\u0935\u093f\u0927\u093e\u0924\u093e',
  '\u0915\u0923\u094d\u0921',
  '\u0905\u0926\u093f\u0924\u093f',
  '\u0905\u0926\u093f\u0924\u093f',
  '\u0935\u093f\u0937\u094d\u0923\u0941',
  '\u0926\u094d\u092f\u0941\u092e\u0926\u094d\u0917\u0926\u094d\u092f\u0941\u0924\u093f',
  '\u092c\u094d\u0930\u0939\u094d\u092e',
  '\u0938\u092e\u0941\u0926\u094d\u0930\u092e',
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
  if (!start || !end) return '\u2014'
  const formatter = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
  const formatTime = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null
    const parts = formatter.formatToParts(date)
    const hour = parts.find((part) => part.type === 'hour')?.value
    const minute = parts.find((part) => part.type === 'minute')?.value
    return hour && minute ? `${hour}:${minute}` : null
  }
  const startText = formatTime(start)
  const endText = formatTime(end)
  return startText && endText ? `${startText} - ${endText}` : '\u2014'
}

function daySegment(sunrise, sunset, weekday, kind) {
  const index = weekdayWindows[kind][weekday]
  const duration = (sunset.getTime() - sunrise.getTime()) / 8
  const start = new Date(sunrise.getTime() + duration * index)
  return { start, end: new Date(start.getTime() + duration) }
}

function getSunriseForDate(date, location) {
  return SunCalc.getTimes(date, location.latitude, location.longitude).sunrise
}

function getVedicDayStart(now, location, sunrise) {
  if (sunrise && now >= sunrise) return sunrise

  const previousDay = new Date(now)
  previousDay.setDate(now.getDate() - 1)
  return getSunriseForDate(previousDay, location)
}

function getStandardMuhurat(now, location, sunrise) {
  const names = [...dayMuhuratNames, ...nightMuhuratNames]
  const vedicDayStart = getVedicDayStart(now, location, sunrise)
  const segment = 48 * 60000
  const elapsed = Math.max(0, now.getTime() - vedicDayStart.getTime())
  const absoluteIndex = Math.floor(elapsed / segment)
  const index = absoluteIndex % 30
  const currentStart = new Date(vedicDayStart.getTime() + absoluteIndex * segment)
  const currentEnd = new Date(currentStart.getTime() + segment)
  const nextIndex = (index + 1) % 30

  return {
    currentStart,
    currentEnd,
    currentName: names[index] || '\u2014',
    nextStart: currentEnd,
    nextEnd: new Date(currentEnd.getTime() + segment),
    nextName: names[nextIndex] || '\u2014',
    vedicDayStart,
  }
}

function getDynamicMuhurat(now, location, sunrise, sunset) {
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const nextSunrise = getSunriseForDate(tomorrow, location)
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

  return {
    currentStart,
    currentEnd,
    currentName: names[index] || '\u2014',
    nextStart: currentEnd,
    nextEnd: new Date(currentEnd.getTime() + segment),
    nextName: names[nextIndex] || '\u2014',
    vedicDayStart: getVedicDayStart(now, location, sunrise),
  }
}

export function calculateMuhurat(now, location, sunrise, sunset, mode = 'standard') {
  if (!sunrise || !sunset) {
    return {
      current: interval(null, null, '\u2014'),
      next: interval(null, null, '\u2014'),
      countdownMs: 0,
      rahuKaal: '\u2014',
      gulikaKaal: '\u2014',
      yamaganda: '\u2014',
      abhijit: '\u2014',
      brahma: '\u2014',
      badge: '\u2014',
      badgeType: 'neutral',
      mode,
      vedicDayStart: null,
    }
  }

  const activeMuhurat =
    mode === 'dynamic'
      ? getDynamicMuhurat(now, location, sunrise, sunset)
      : getStandardMuhurat(now, location, sunrise)
  const auspiciousNames = new Set([
    '\u092e\u093f\u0924\u094d\u0930',
    '\u0935\u0938\u0941',
    '\u0935\u093f\u0936\u094d\u0935\u0926\u0947\u0935',
    '\u0935\u093f\u0927\u093f',
    '\u092d\u0917',
    '\u092c\u094d\u0930\u0939\u094d\u092e',
    '\u0935\u093f\u0937\u094d\u0923\u0941',
    '\u0905\u0936\u094d\u0935\u093f\u0928\u0940',
  ])
  const inauspiciousNames = new Set(['\u0930\u0941\u0926\u094d\u0930', '\u0906\u0939\u093f', '\u092f\u092e', '\u0905\u0917\u094d\u0928\u093f'])
  const currentName = activeMuhurat.currentName
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
    current: interval(activeMuhurat.currentStart, activeMuhurat.currentEnd, currentName, badgeType),
    next: interval(activeMuhurat.nextStart, activeMuhurat.nextEnd, activeMuhurat.nextName),
    countdownMs: activeMuhurat.currentEnd.getTime() - now.getTime(),
    rahuKaal: formatRange(rahu.start, rahu.end),
    gulikaKaal: formatRange(gulika.start, gulika.end),
    yamaganda: formatRange(yama.start, yama.end),
    abhijit: formatRange(abhijitStart, abhijitEnd),
    brahma: formatRange(brahmaStart, brahmaEnd),
    badge: badgeType === 'good' ? '\u0936\u0941\u092d' : badgeType === 'bad' ? '\u0905\u0936\u0941\u092d' : '\u0938\u093e\u092e\u093e\u0928\u094d\u092f',
    badgeType,
    mode,
    vedicDayStart: activeMuhurat.vedicDayStart,
  }
}
