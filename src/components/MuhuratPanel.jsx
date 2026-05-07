import { motion } from 'framer-motion'
import { formatCountdown } from '../lib/time'

export default function MuhuratPanel({ muhurat }) {
  const badgeClass =
    muhurat.badgeType === 'good'
      ? 'border-emerald-300/70 text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.45)]'
      : muhurat.badgeType === 'bad'
        ? 'border-red-300/70 text-red-200 shadow-[0_0_18px_rgba(248,113,113,0.35)]'
        : 'border-gold/60 text-gold'

  return (
    <motion.div
      className="absolute inset-[31%] rounded-full border border-gold/35 bg-black/12 shadow-[inset_0_0_35px_rgba(212,175,55,0.12)]"
      animate={{ boxShadow: ['inset 0 0 28px rgba(212,175,55,0.12)', 'inset 0 0 54px rgba(0,212,255,0.2)', 'inset 0 0 28px rgba(212,175,55,0.12)'] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="absolute left-1/2 top-[10%] w-[78%] -translate-x-1/2 text-center">
        <motion.div
          className="mx-auto max-w-[88%] truncate rounded-full border border-gold/60 bg-gold/10 px-3 py-1 font-serifHindi text-[clamp(12px,2vw,22px)] text-gold shadow-goldGlow"
          animate={{ scale: [1, 1.035, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {muhurat.current.name}
        </motion.div>
        <div className="mt-1 font-digital text-[clamp(12px,2vw,20px)] text-sky">{formatCountdown(muhurat.countdownMs)}</div>
      </div>
      <div className="absolute bottom-[13%] left-1/2 w-[72%] -translate-x-1/2 text-center">
        <div className="text-[clamp(8px,1.1vw,11px)] text-sky/70">अगला मुहूर्त</div>
        <div className="truncate font-serifHindi text-[clamp(11px,1.7vw,17px)] text-white/85">{muhurat.next.name}</div>
      </div>
      <div className={`absolute right-[9%] top-1/2 -translate-y-1/2 rounded-full border bg-black/35 px-2 py-1 text-[clamp(8px,1.1vw,12px)] ${badgeClass}`}>
        {muhurat.badge}
      </div>
    </motion.div>
  )
}

