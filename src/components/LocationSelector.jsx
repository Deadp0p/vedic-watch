import { MapPin, Navigation } from 'lucide-react'
import { cityOptions } from '../lib/location'

export default function LocationSelector({ location, onSelect, onDetect, language, isDetecting = false }) {
  const hasCustomLocation = !cityOptions.some((city) => city.nameEn === location.nameEn)

  return (
    <div className="location-control relative z-50 flex items-center justify-center gap-2">
      <button
        type="button"
        className="icon-button"
        title={language === 'hi' ? 'स्थान खोजें' : 'Detect location'}
        onClick={onDetect}
        disabled={isDetecting}
      >
        <Navigation size={15} />
      </button>
      <label className="relative">
        <MapPin className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-softgold" size={14} />
        <select
          className="location-select h-9 max-w-[136px] rounded-full border border-gold/35 bg-[rgba(35,24,10,0.45)] pl-7 pr-7 text-[12px] text-softgold shadow-[0_0_18px_rgba(212,175,55,0.1)] outline-none backdrop-blur-[14px]"
          value={location.nameEn}
          onChange={(event) => {
            const city = cityOptions.find((item) => item.nameEn === event.target.value)
            if (city) onSelect(city)
          }}
        >
          {hasCustomLocation ? (
            <option value={location.nameEn}>{language === 'hi' ? location.nameHi : location.nameEn}</option>
          ) : null}
          {cityOptions.map((city) => (
            <option key={city.nameEn} value={city.nameEn}>
              {language === 'hi' ? city.nameHi : city.nameEn}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
