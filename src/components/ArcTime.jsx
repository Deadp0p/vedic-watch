export default function ArcTime({ time, hindiDate, englishDate, samvat }) {
  return (
    <svg className="absolute inset-[7%] z-20 overflow-visible" viewBox="0 0 100 100" aria-label={time}>
      <defs>
        <path id="timeArc" d="M 18 36 A 36 36 0 0 1 82 36" />
        <path id="dateArc" d="M 24 43 A 29 29 0 0 1 76 43" />
      </defs>
      <text className="fill-white font-digital text-[9px] tracking-[0.08em] drop-shadow-[0_0_9px_rgba(0,212,255,0.34)]">
        <textPath href="#timeArc" startOffset="50%" textAnchor="middle">
          {time}
        </textPath>
      </text>
      <text className="fill-[#d4af37] font-serifHindi text-[2.15px] tracking-normal">
        <textPath href="#dateArc" startOffset="50%" textAnchor="middle">
          {hindiDate} · {englishDate} · विक्रम संवत {samvat}
        </textPath>
      </text>
    </svg>
  )
}

