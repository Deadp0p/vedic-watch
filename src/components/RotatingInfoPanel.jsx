import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { formatCountdown } from '../lib/time'

function t(language, hi, en) {
  return language === 'hi' ? hi : en
}

export default function RotatingInfoPanel({ muhurat, panchang, language }) {
  const cards = [
    {
      label: t(language, 'मुहूर्त', 'Muhurat'),
      value: muhurat.current.name,
      meta: `${t(language, 'अगला मुहूर्त', 'Next Muhurat')} ${muhurat.next.name} · ${formatCountdown(muhurat.countdownMs)}`,
      tone: muhurat.badgeType,
    },
    {
      label: t(language, 'पंचांग', 'Panchang'),
      value: panchang.nakshatra,
      meta: `${panchang.yoga} · ${panchang.karana}`,
      tone: 'neutral',
    },
    {
      label: t(language, 'काल', 'Timings'),
      value: `${t(language, 'राहु', 'Rahu')} ${muhurat.rahuKaal}`,
      meta: `${t(language, 'गुलिक', 'Gulika')} ${muhurat.gulikaKaal} · ${t(language, 'यमगण्ड', 'Yamaganda')} ${muhurat.yamaganda}`,
      tone: 'bad',
    },
    {
      label: t(language, 'शुभ समय', 'Auspicious Times'),
      value: `${t(language, 'ब्रह्म', 'Brahma')} ${muhurat.brahma}`,
      meta: `${t(language, 'अभिजित', 'Abhijit')} ${muhurat.abhijit}`,
      tone: 'good',
    },
  ]
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % cards.length)
    }, 6000)
    return () => window.clearInterval(timer)
  }, [cards.length])

  const card = cards[index]
  const toneClass =
    card.tone === 'good'
      ? 'text-softgold'
      : card.tone === 'bad'
        ? 'text-[#f4b469]'
        : 'text-gold'

  return (
    <div className="bronze-glass premium-card lift-card mx-auto h-[82px] w-full overflow-hidden rounded-lg px-5 py-3 text-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${card.label}-${index}`}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ duration: 0.42, ease: 'easeOut' }}
          className="grid h-full place-items-center"
        >
          <div className="min-w-0">
            <div className="truncate text-[10px] uppercase tracking-[0.16em] text-antiquegold">{card.label}</div>
            <div className={`mt-1 truncate font-serifHindi text-[18px] font-black leading-tight ${toneClass}`}>{card.value || '—'}</div>
            <div className="mt-1 truncate text-[11px] text-ivory/58">{card.meta}</div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
