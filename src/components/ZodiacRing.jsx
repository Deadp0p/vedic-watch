import { motion } from 'framer-motion'

const zodiac = [
  ['♈', 'मेष'],
  ['♉', 'वृषभ'],
  ['♊', 'मिथुन'],
  ['♋', 'कर्क'],
  ['♌', 'सिंह'],
  ['♍', 'कन्या'],
  ['♎', 'तुला'],
  ['♏', 'वृश्चिक'],
  ['♐', 'धनु'],
  ['♑', 'मकर'],
  ['♒', 'कुंभ'],
  ['♓', 'मीन'],
]

export default function ZodiacRing({ activeMoonSign, activeSunSign }) {
  return (
    <motion.div
      className="absolute inset-[1.8%] rounded-full border border-gold/34 shadow-[0_0_24px_rgba(212,175,55,0.13)]"
      animate={{ rotate: 360 }}
      transition={{ duration: 220, repeat: Infinity, ease: 'linear' }}
    >
      {zodiac.map(([icon, label], index) => {
        const angle = index * 30 - 90
        const active = label === activeMoonSign || label === activeSunSign
        return (
          <div
            key={label}
            className="absolute left-1/2 top-1/2 h-[8.5%] w-[8.5%] -translate-x-1/2 -translate-y-1/2"
            style={{ transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-540%) rotate(${-angle}deg)` }}
          >
            <div
              className={`grid h-full w-full place-items-center rounded-full border text-[clamp(15px,2.5vw,28px)] backdrop-blur-md ${
                active
                  ? 'border-sky/70 text-sky shadow-[0_0_10px_rgba(0,212,255,0.46)]'
                  : 'border-gold/24 bg-black/16 text-gold shadow-[0_0_6px_rgba(212,175,55,0.13)]'
              }`}
              title={label}
            >
              {icon}
            </div>
          </div>
        )
      })}
    </motion.div>
  )
}
