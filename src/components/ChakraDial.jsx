import { motion } from 'framer-motion'

export default function ChakraDial() {
  return (
    <>
      <motion.div
        className="absolute inset-[11%] rounded-full border border-gold/18 bg-[conic-gradient(from_0deg,rgba(212,175,55,0.085),transparent_9%,rgba(0,212,255,0.052)_17%,transparent_25%,rgba(212,175,55,0.082)_34%,transparent_43%,rgba(0,212,255,0.052)_50%,transparent_61%,rgba(212,175,55,0.075)_72%,transparent_82%,rgba(0,212,255,0.052)_92%,rgba(212,175,55,0.085))]"
        animate={{ rotate: -360 }}
        transition={{ duration: 300, repeat: Infinity, ease: 'linear' }}
      />
      <div className="absolute inset-[17.5%] rounded-full border border-gold/14 shadow-[inset_0_0_15px_rgba(212,175,55,0.075)]" />
      <div className="absolute inset-[31%] rounded-full border border-sky/14 shadow-[0_0_19px_rgba(0,212,255,0.07)]" />
      {[0, 1, 2, 3, 4, 5].map((dot) => (
        <motion.div
          key={dot}
          className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-sky shadow-[0_0_6px_rgba(0,212,255,0.5)]"
          animate={{ rotate: 360 }}
          transition={{ duration: 36 + dot * 4, repeat: Infinity, ease: 'linear' }}
          style={{
            transformOrigin: `${dot % 2 === 0 ? -145 : -120}px 0`,
            transform: `rotate(${dot * 60}deg) translateX(${dot % 2 === 0 ? 145 : 120}px)`,
          }}
        />
      ))}
    </>
  )
}
