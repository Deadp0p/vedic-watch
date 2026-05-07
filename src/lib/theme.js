export function getDayPart(now, sunrise, sunset) {
  if (!sunrise || !sunset) return 'night'
  const hour = now.getHours()
  const afterSunrise = now >= sunrise
  const beforeSunset = now < sunset

  if (!afterSunrise || !beforeSunset) return 'night'
  if (hour < 11) return 'morning'
  if (hour < 16) return 'afternoon'
  return 'evening'
}

