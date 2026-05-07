export const hindiWeekdays = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार']
export const englishWeekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const hindiDateFormatter = new Intl.DateTimeFormat('hi-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const englishDateFormatter = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('en-IN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const shortTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function formatClock(date) {
  return timeFormatter.format(date)
}

export function formatShortTime(date) {
  if (!date || Number.isNaN(date.getTime())) return '—'
  return shortTimeFormatter.format(date)
}

export function formatHindiDate(date) {
  return hindiDateFormatter.format(date)
}

export function formatEnglishDate(date) {
  return englishDateFormatter.format(date)
}

export function getVikramSamvat(date) {
  const year = date.getFullYear()
  const month = date.getMonth()
  return month >= 3 ? year + 57 : year + 56
}

export function formatCountdown(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '00:00'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

