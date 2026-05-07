const items = [
  ['vaar', 'वार'],
  ['nakshatra', 'नक्षत्र'],
  ['yoga', 'योग'],
  ['karana', 'करण'],
]

export default function PanchangPanel({ panchang, vaar }) {
  const values = {
    vaar,
    nakshatra: panchang.nakshatra,
    yoga: panchang.yoga,
    karana: panchang.karana,
  }

  return (
    <div className="absolute inset-[18%] rounded-full border border-sky/30 shadow-[inset_0_0_35px_rgba(0,212,255,0.12)]">
      {items.map(([key, label], index) => {
        const angle = index * 90 + 45
        return (
          <div
            key={key}
            className="absolute left-1/2 top-1/2 w-[32%] -translate-x-1/2 -translate-y-1/2 text-center"
            style={{ transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-118%) rotate(${-angle}deg)` }}
          >
            <div className={`rounded-full border px-2 py-1 backdrop-blur-md ${index === 0 ? 'border-gold/70 bg-gold/10 shadow-goldGlow' : 'border-sky/25 bg-black/25'}`}>
              <div className="text-[clamp(8px,1vw,11px)] text-sky/75">{label}</div>
              <div className="truncate font-serifHindi text-[clamp(10px,1.65vw,16px)] text-gold">{values[key] || '—'}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

