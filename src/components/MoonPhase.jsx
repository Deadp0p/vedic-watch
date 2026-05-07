import { motion } from 'framer-motion'

export default function MoonPhase({ illumination = 0, phase = 0 }) {
  const waxing = phase <= 180
  const shadowOffset = waxing ? 26 - illumination * 52 : illumination * 52 - 26

  return (
    <div className="relative grid place-items-center">
      <motion.div
        className="absolute h-[150%] w-[150%] rounded-full bg-[radial-gradient(circle,rgba(0,212,255,0.14),rgba(212,175,55,0.06)_34%,transparent_66%)]"
        animate={{ scale: [0.92, 1.04, 0.92], opacity: [0.38, 0.56, 0.38] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="relative h-[clamp(98px,18vw,178px)] w-[clamp(98px,18vw,178px)] overflow-hidden rounded-full border border-gold/48 bg-[#d8d4c5] shadow-[inset_-18px_-18px_30px_rgba(0,0,0,0.45),0_0_22px_rgba(0,212,255,0.2)]"
        animate={{ rotate: [0, 2, 0, -2, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_34%_28%,rgba(255,255,255,0.9),transparent_18%),radial-gradient(circle_at_64%_64%,rgba(80,80,75,0.38),transparent_14%),radial-gradient(circle_at_45%_72%,rgba(80,80,75,0.28),transparent_10%)]" />
        <div
          className="absolute inset-y-[-4%] w-[110%] rounded-full bg-[#080b13]/90 blur-[1px]"
          style={{ left: `calc(50% + ${shadowOffset}%)`, transform: waxing ? 'translateX(-100%)' : 'translateX(-10%)' }}
        />
      </motion.div>
      <div className="absolute -bottom-6 text-[10px] uppercase tracking-[0.18em] text-sky/80">
        {Math.round(illumination * 100)}% lunar
      </div>
    </div>
  )
}
