import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import LocationSelector from './LocationSelector'
import RotatingInfoPanel from './RotatingInfoPanel'
import VoiceControls from './VoiceControls'
import { sanatanFacts } from '../data/sanatanFacts'
import { formatClock, formatHindiDate, formatShortTime } from '../lib/time'
import clockBase from '../assets/clock3.png'
import clockMiddle from '../assets/clock2.png'
import clockFront from '../assets/clock-1.png'


function t(language, hi, en) {
  return language === 'hi' ? hi : en
}

function displayMuhuratName(name) {
  return name && name !== '—' ? name : '—'
}

function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0)
  return Math.floor((date - start) / 86400000)
}

function isPresent(value) {
  return Boolean(value && value !== '—')
}

function includesAny(value, terms) {
  const text = String(value || '').toLowerCase()
  return terms.some((term) => text.includes(term.toLowerCase()))
}

function isBrahmaMuhurat(now, sunrise) {
  if (!(sunrise instanceof Date)) return false
  const start = new Date(sunrise.getTime() - 96 * 60000)
  const end = new Date(sunrise.getTime() - 48 * 60000)
  return now >= start && now <= end
}

function isAbhijitMuhurat(now, sunrise, sunset) {
  if (!(sunrise instanceof Date) || !(sunset instanceof Date)) return false
  const solarNoon = new Date((sunrise.getTime() + sunset.getTime()) / 2)
  const start = new Date(solarNoon.getTime() - 24 * 60000)
  const end = new Date(solarNoon.getTime() + 24 * 60000)
  return now >= start && now <= end
}

function getActiveShubhPeriodKey(now, panchang) {
  if (isBrahmaMuhurat(now, panchang?.sunrise)) return 'brahma'
  if (isAbhijitMuhurat(now, panchang?.sunrise, panchang?.sunset)) return 'abhijit'
  return ''
}

function isMorningTime(now) {
  const hour = now.getHours()
  return hour >= 4 && hour < 10
}

function getPreferredFactCategories(now, panchang, muhurat) {
  const tithi = panchang?.tithi || ''
  const tithiNumber = panchang?.tithiNumber

  if (isPresent(panchang?.festival)) return ['festival', 'tithi']
  if (tithiNumber === 11 || tithiNumber === 26 || includesAny(tithi, ['एकादशी', 'ekadashi'])) return ['festival', 'tithi']
  if (tithiNumber === 15 || includesAny(tithi, ['पूर्णिमा', 'purnima'])) return ['tithi', 'meditation', 'mantra']
  if (tithiNumber === 30 || includesAny(tithi, ['अमावस्या', 'amavasya'])) return ['meditation', 'wisdom']
  if (isBrahmaMuhurat(now, panchang?.sunrise)) return ['meditation', 'mantra', 'muhurat']
  if (isMorningTime(now)) return ['yoga', 'meditation', 'mantra']
  if (muhurat?.badgeType === 'good') return ['dharma', 'karma', 'wisdom']

  return ['daily', 'wisdom']
}

function getFactIndexesForCategories(categories) {
  const matches = sanatanFacts
    .map((fact, index) => ({ fact, index }))
    .filter(({ fact }) => fact.category && categories.includes(fact.category))
    .map(({ index }) => index)

  return matches.length ? matches : sanatanFacts.map((_, index) => index)
}

function getFactIndexForStep(dayOfYear, indexes, step) {
  if (!indexes.length) return 0
  return indexes[(dayOfYear + step) % indexes.length] || 0
}

function getNextFactStep(dayOfYear, indexes, step) {
  if (indexes.length <= 1) return step + 1
  const currentIndex = getFactIndexForStep(dayOfYear, indexes, step)
  let nextStep = step + 1
  while (getFactIndexForStep(dayOfYear, indexes, nextStep) === currentIndex) {
    nextStep += 1
  }
  return nextStep
}

export default function VedicWatch({
  now,
  location,
  panchang,
  muhurat,
  accuracyInfo,
  language,
  setLanguage,
  voiceMode,
  setVoiceMode,
  onSelectLocation,
  onDetectLocation,
  locationStatus,
  panchangSyncing,
  soundNotice,
  shubhPulseActive,
}) {
  const vedicTime = getVedicTimeParts(now, muhurat)
  const dayOfYear = getDayOfYear(now)
  const currentYear = now.getFullYear()
  const preferredFactCategories = getPreferredFactCategories(now, panchang, muhurat)
  const factCategoryKey = preferredFactCategories.join('|')
  const factSelectionKey = `${currentYear}-${dayOfYear}-${factCategoryKey}`
  const [factRotation, setFactRotation] = useState(() => ({ key: factSelectionKey, step: 0 }))
  const factRotationStep = factRotation.key === factSelectionKey ? factRotation.step : 0
  const matchingFactIndexes = useMemo(
    () => getFactIndexesForCategories(factCategoryKey.split('|')),
    [factCategoryKey],
  )
  const factIndex = getFactIndexForStep(dayOfYear, matchingFactIndexes, factRotationStep)
  const activeFact = sanatanFacts[factIndex] || sanatanFacts[0]
  const fact = activeFact[language === 'hi' ? 'hi' : 'en']
  const [periodPulseKey, setPeriodPulseKey] = useState('')
  const lastPeriodPulseKeyRef = useRef('')
  const activeShubhPeriodKey = getActiveShubhPeriodKey(now, panchang)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFactRotation((current) => ({
        key: factSelectionKey,
        step:
          current.key === factSelectionKey
            ? getNextFactStep(dayOfYear, matchingFactIndexes, current.step)
            : getNextFactStep(dayOfYear, matchingFactIndexes, 0),
      }))
    }, 15000)

    return () => window.clearInterval(timer)
  }, [dayOfYear, factSelectionKey, matchingFactIndexes])

  useEffect(() => {
    if (!activeShubhPeriodKey || lastPeriodPulseKeyRef.current === activeShubhPeriodKey) return

    lastPeriodPulseKeyRef.current = activeShubhPeriodKey
    setPeriodPulseKey(activeShubhPeriodKey)
    const timer = window.setTimeout(() => setPeriodPulseKey(''), 10000)
    return () => window.clearTimeout(timer)
  }, [activeShubhPeriodKey])

  const anyShubhPulseActive = shubhPulseActive || Boolean(periodPulseKey)

  return (
    <main className={`vedic-watch-shell relative h-[100vh] w-screen overflow-hidden bg-black text-ivory ${anyShubhPulseActive ? 'shubh-pulse-active' : ''}`}>
      <AnimatedBackground />

      <div className="top-controls">
        <button type="button" className="watch-button" onClick={() => setLanguage(language === 'hi' ? 'en' : 'hi')}>
          {language === 'hi' ? 'हिं' : 'EN'}
        </button>
        <VoiceControls mode={voiceMode} onChange={setVoiceMode} language={language} />
        <LocationSelector
          location={location}
          onSelect={onSelectLocation}
          onDetect={onDetectLocation}
          language={language}
          isDetecting={locationStatus?.state === 'loading'}
        />
      </div>
      {locationStatus?.message ? (
        <div className="pointer-events-none absolute right-4 top-[58px] z-50 max-w-[min(320px,calc(100vw-2rem))] rounded-md border border-gold/30 bg-[rgba(18,11,4,0.72)] px-3 py-2 text-right font-serifHindi text-[12px] leading-snug text-[#FFF4D6] shadow-[0_0_24px_rgba(212,175,55,0.16)] backdrop-blur-[14px]">
          {locationStatus.message}
        </div>
      ) : null}
      {soundNotice ? (
        <div className="pointer-events-none absolute left-1/2 top-[58px] z-50 max-w-[min(360px,calc(100vw-2rem))] -translate-x-1/2 rounded-full border border-gold/24 bg-[rgba(18,11,4,0.66)] px-3 py-1.5 text-center font-serifHindi text-[11px] text-[#FFF4D6]/82 shadow-[0_0_20px_rgba(212,175,55,0.14)] backdrop-blur-[12px]">
          {soundNotice}
        </div>
      ) : null}

      <section className="watch-grid relative z-10 mx-auto grid h-full w-full max-w-[1500px] items-center gap-[clamp(24px,2vw,30px)] px-[clamp(10px,1.6vw,28px)] pt-11 pb-10 max-lg:grid-cols-1 max-lg:grid-rows-[minmax(0,1fr)_auto] max-lg:gap-3 max-lg:pt-14">
        <div className="watch-column watch-column-left grid gap-3.5 max-lg:hidden">
          <FactBox language={language} fact={fact} category={activeFact.category} />
          <SidePanel title={t(language, 'पंचांग विवरण', 'Panchang Details')} delay={0}>
            {panchangSyncing ? <SyncingPill language={language} /> : null}
            <DataRow label={t(language, 'नक्षत्र', 'Nakshatra')} value={panchang.nakshatra} />
            <DataRow label={t(language, 'योग', 'Yoga')} value={panchang.yoga} />
            <DataRow label={t(language, 'करण', 'Karana')} value={panchang.karana} />
            <DataRow label={t(language, 'चंद्र राशि', 'Moon Sign')} value={panchang.moonSign} />
            <DataRow label={t(language, 'सूर्य राशि', 'Sun Sign')} value={panchang.sunSign} />
          </SidePanel>
          <VedicTimeInfo language={language} vedicTime={vedicTime} />
        </div>

        <div className="watch-center relative mx-auto grid w-full place-items-center px-4">
          <WatchFace now={now} panchang={panchang} muhurat={muhurat} language={language} vedicTime={vedicTime} />
          <div className="mt-3 hidden w-[min(92vw,680px)] space-y-3 max-lg:block">
            <FactBox language={language} fact={fact} category={activeFact.category} compact />
            <RotatingInfoPanel now={now} muhurat={muhurat} panchang={panchang} language={language} />
          </div>
        </div>

        <div className="watch-column watch-column-right grid gap-3 max-lg:hidden">
          <SidePanel
            title={t(language, 'वैदिक मुहूर्त (30 प्रणाली)', 'Vedic Muhurat (30 System)')}
            badge={t(language, 'स्थिर', 'Fixed')}
            className="vedic-system-panel"
            delay={2.6}
          >
            <MethodNote language={language} type="vedic" />
            <DataRow
              label={t(language, 'वर्तमान मुहूर्त', 'Current Muhurat')}
              value={displayMuhuratName(muhurat.current.name)}
              tone={muhurat.badgeType === 'good' ? 'good' : 'neutral'}
              currentBadge
              highlight
              pulse={shubhPulseActive && muhurat.badgeType === 'good'}
              language={language}
            />
            <DataRow label={t(language, 'अगला मुहूर्त', 'Next Muhurat')} value={displayMuhuratName(muhurat.next.name)} />
          </SidePanel>
          <SidePanel
            title={t(language, 'पारंपरिक मुहूर्त', 'Traditional Muhurat')}
            badge={t(language, 'सूर्य आधारित', 'Sun-based')}
            className="traditional-system-panel"
            delay={3.2}
          >
            <MethodNote language={language} type="traditional" />
            <DataRow label={t(language, 'ब्रह्म मुहूर्त', 'Brahma Muhurat')} value={muhurat.brahma} tone="good" shubh pulse={periodPulseKey === 'brahma'} language={language} />
            <DataRow label={t(language, 'अभिजित', 'Abhijit')} value={muhurat.abhijit} tone="good" shubh pulse={periodPulseKey === 'abhijit'} language={language} />
            <DataRow label={t(language, 'राहु काल', 'Rahu Kaal')} value={muhurat.rahuKaal} tone="bad" />
            <DataRow label={t(language, 'गुलिक', 'Gulika')} value={muhurat.gulikaKaal} />
            <DataRow label={t(language, 'यमगण्ड', 'Yamaganda')} value={muhurat.yamaganda} tone="bad" />
          </SidePanel>
          <InternationalTimeCard now={now} location={location} language={language} />
        </div>
      </section>
      <AccuracyFooter language={language} location={location} accuracyInfo={accuracyInfo} />
    </main>
  )
}

function SyncingPill({ language }) {
  return (
    <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(0,212,255,0.35)] bg-[rgba(0,212,255,0.08)] px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-[#bff7ff] shadow-[0_0_14px_rgba(0,212,255,0.18)]">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00d4ff] shadow-[0_0_8px_rgba(0,212,255,0.75)]" />
      {t(language, 'पंचांग सिंक हो रहा है', 'Syncing Panchang')}
    </div>
  )
}

function MethodNote({ language, type = 'vedic' }) {
  const copy =
    type === 'traditional'
      ? t(
          language,
          'यह मुहूर्त सूर्योदय और सूर्यास्त के अनुसार बदलते हैं।',
          'These timings vary according to sunrise and sunset.',
        )
      : t(
          language,
          'यह 48 मिनट के स्थिर मुहूर्त पर आधारित प्रणाली है।',
          'This system uses fixed 48-minute Muhurta divisions.',
        )

  return (
    <p className="mb-1 font-serifHindi text-[11px] leading-snug text-[#FFF4D6]/62">
      {copy}
    </p>
  )
}

function AccuracyFooter({ language, location, accuracyInfo }) {
  return (
    <footer className="accuracy-footer">
      {accuracyInfo ? (
        <>
          <div>
            {t(language, '\u0938\u0942\u0930\u094d\u092f\u094b\u0926\u092f', 'Sunrise')}: {formatShortTime(accuracyInfo.sunrise)} ·{' '}
            {t(language, '\u0938\u0942\u0930\u094d\u092f\u093e\u0938\u094d\u0924', 'Sunset')}: {formatShortTime(accuracyInfo.sunset)} ·{' '}
            {t(language, '\u0938\u092e\u092f \u0938\u094d\u0930\u094b\u0924', 'Time source')}: {accuracyInfo.timeSource}
          </div>
          <div>
            {t(language, '\u0938\u094d\u0925\u093e\u0928', 'Location')}: {language === 'hi' ? location.nameHi : location.nameEn} ·{' '}
            {t(language, 'GPS', 'GPS')}: {Number(accuracyInfo.latitude).toFixed(4)}, {Number(accuracyInfo.longitude).toFixed(4)} ·{' '}
            {t(language, '\u0938\u093f\u0902\u0915', 'Sync')}: {formatShortTime(accuracyInfo.lastSyncedAt)}
          </div>
        </>
      ) : (
        <div>
          {t(
            language,
            `गणना ${location.nameHi} के सूर्योदय/सूर्यास्त पर आधारित है।`,
            `Calculations are based on sunrise/sunset for ${location.nameEn}.`,
          )}
        </div>
      )}
    </footer>
  )
}

function WatchFace({ panchang, muhurat, language, vedicTime }) {
  const [parallax, setParallax] = useState({ x: 0, y: 0 })

  function handlePointerMove(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    setParallax({
      x: ((event.clientX - rect.left) / rect.width - 0.5) * 2,
      y: ((event.clientY - rect.top) / rect.height - 0.5) * 2,
    })
  }

  return (
    <motion.section
      className="watch-face relative aspect-square w-[min(85vh,50vw,820px)] max-w-[820px] overflow-visible rounded-full"
      animate={{ scale: [1, 1.015, 1] }}
      transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setParallax({ x: 0, y: 0 })}
    >
      <MechanicalClockLayers parallax={parallax} />

      <div className="pointer-events-none absolute inset-[13%] z-20 rounded-full bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.35)_0%,rgba(0,0,0,0.15)_60%,transparent_100%)]" />

      <div className="bronze-glass premium-card centered-premium-card absolute left-1/2 top-[6.2%] z-40 flex w-[min(46%,300px)] -translate-x-1/2 flex-col items-center rounded-md px-3 py-1.5 text-center shadow-[0_12px_34px_rgba(0,0,0,0.42)] [text-shadow:0_3px_10px_rgba(0,0,0,0.8)]">
        <div className="font-serifHindi text-[clamp(17px,2.35vw,27px)] font-black leading-tight text-ivory drop-shadow-[0_0_7px_rgba(212,175,55,0.18)]">
          {formatVedicTimeTitle(vedicTime.number, language)}
        </div>
        <div className="mt-1 max-w-full truncate font-serifHindi text-[clamp(10px,1.15vw,13px)] leading-snug text-softgold">
          {formatVedicMinutes(vedicTime.minutes, language)}
        </div>
      </div>

      <div className="absolute left-1/2 top-[30.5%] z-40 grid w-[min(50%,360px)] -translate-x-1/2 place-items-center text-center [text-shadow:0_3px_10px_rgba(0,0,0,0.8)]">
        <CleanMoon phase={panchang.moonPhase} illumination={panchang.moonIllumination} />
      </div>

      <div className="absolute left-1/2 top-[53%] z-50 flex w-[min(62%,390px)] -translate-x-1/2 flex-col items-center text-center [text-shadow:0_3px_10px_rgba(0,0,0,0.8)]">
        <div className="min-h-[1.2em] max-w-full overflow-visible whitespace-nowrap font-serifHindi text-[clamp(22px,3.55vw,37px)] font-black leading-[1.18] text-softgold drop-shadow-[0_0_7px_rgba(212,175,55,0.28)]">
          {panchang.tithi}
        </div>
        <div className="mt-3 max-w-full truncate font-serifHindi text-[clamp(12px,1.55vw,17px)] font-semibold leading-snug text-ivory/88">
          {panchang.paksha}
        </div>
      </div>

      <MuhuratCard muhurat={muhurat} language={language} vedicTime={vedicTime} />
    </motion.section>
  )
}

function MechanicalClockLayers({ parallax }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="divine-clock-pulse absolute inset-[-10%] z-0 rounded-full" />
      <div className="temple-aura absolute inset-[-16%] z-0 rounded-full" />
      <div className="clock-blue-aura absolute inset-[-4%] z-0 rounded-full" />
      <div className="absolute inset-[-2%] z-[1] overflow-hidden rounded-full [mask-image:radial-gradient(circle,black_74%,transparent_79%)] [-webkit-mask-image:radial-gradient(circle,black_74%,transparent_79%)]">
        <div className="absolute inset-[2%] rounded-full shadow-[0_25px_60px_rgba(0,0,0,0.6)]" />
        <div
          className="clock-layer-shell z-[1]"
          style={{ '--parallax-x': `${parallax.x * 4}px`, '--parallax-y': `${parallax.y * 4}px`, '--clock-scale': '1' }}
        >
          <img
            className="clock-layer-image"
            src={clockBase}
            alt=""
            aria-hidden="true"
            style={{ filter: 'contrast(1.05) drop-shadow(0 28px 48px rgba(0,0,0,0.58)) drop-shadow(0 0 22px rgba(0,212,255,0.07))' }}
          />
        </div>
        <div
          className="clock-layer-shell z-[2] opacity-[0.85]"
          style={{ '--parallax-x': `${parallax.x * 7}px`, '--parallax-y': `${parallax.y * 7}px`, '--clock-scale': '0.82' }}
        >
          <img
            className="clock-layer-image clock-rotate-cw shadow-[0_10px_35px_rgba(212,175,55,0.25)]"
            src={clockMiddle}
            alt=""
            aria-hidden="true"
            style={{ filter: 'brightness(1.08) drop-shadow(0 14px 30px rgba(0,0,0,0.36)) drop-shadow(0 10px 24px rgba(212,175,55,0.22)) drop-shadow(0 0 16px rgba(0,212,255,0.12))' }}
          />
        </div>
        <div
          className="clock-layer-shell z-[3] opacity-[0.72]"
          style={{ '--parallax-x': `${parallax.x * 10}px`, '--parallax-y': `${parallax.y * 10}px`, '--clock-scale': '0.62' }}
        >
          <img
            className="clock-layer-image clock-rotate-ccw shadow-[0_5px_20px_rgba(255,215,120,0.2)]"
            src={clockFront}
            alt=""
            aria-hidden="true"
            style={{ filter: 'brightness(1.08) drop-shadow(0 10px 22px rgba(0,0,0,0.34)) drop-shadow(0 0 22px rgba(255,215,120,0.24)) drop-shadow(0 0 12px rgba(0,212,255,0.12))' }}
          />
        </div>
      </div>
    </div>
  )
}

function MuhuratCard({ muhurat, language, vedicTime }) {
  return (
    <motion.div
      className="muhurat-center-card bronze-glass premium-card centered-premium-card absolute bottom-[4.8%] left-1/2 z-40 w-[min(62%,390px)] -translate-x-1/2 rounded-md px-4 py-2 text-center [text-shadow:0_3px_10px_rgba(0,0,0,0.8)]"
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{ opacity: { duration: 0.45 }, y: { duration: 0.45 } }}
    >
      <div className="text-[clamp(8px,0.92vw,10px)] uppercase tracking-[0.14em] text-[#FFF4D6] opacity-100 [text-shadow:0_0_10px_rgba(255,244,214,0.26),0_3px_10px_rgba(0,0,0,0.86)]">
        {t(language, 'वर्तमान मुहूर्त', 'Current Muhurat')}
      </div>
      <div className="mt-1 truncate font-serifHindi text-[clamp(14px,1.65vw,19px)] font-black text-softgold">
        {displayMuhuratName(muhurat.current.name)}
      </div>
      <motion.div
        className="mt-0.5 font-digital text-[clamp(25px,3.75vw,40px)] font-black leading-none text-ivory"
        animate={{
          opacity: [0.9, 1, 0.9],
        }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
      >
        {formatRemainingMuhuratTime(vedicTime.remainingSeconds)}
      </motion.div>
      <div className="mt-0.5 truncate font-serifHindi text-[clamp(8px,0.9vw,10px)] text-ivory/68">
        {formatVedicTimeSummary(vedicTime, language)}
      </div>
    </motion.div>
  )
}

function AnimatedBackground() {
  return (
    <>
      <div className="cosmic-css-bg" />
      <div className="cosmic-nebula" />
      <div className="cosmic-cloud cloud-blue" />
      <div className="cosmic-cloud cloud-indigo" />
      <div className="cosmic-cloud cloud-gold" />
      <div className="clock-gold-aura-bg" />
      <div className="cosmic-mandala" />
      <div className="stars stars-small" />
      <div className="stars stars-medium" />
      <div className="stars stars-large" />
      <div className="gold-dust" />
      <div className="foreground-particles" />
      <div className="overlay-bg" />
    </>
  )
}


function CleanMoon({ illumination = 0, phase = 0 }) {
  const waxing = phase <= 180
  const shadowOffset = waxing ? 26 - illumination * 52 : illumination * 52 - 26

  return (
    <motion.div
      className="relative grid place-items-center"
      animate={{ y: [-3, 3, -3] }}
      transition={{ repeat: Infinity, duration: 5.2, ease: 'easeInOut' }}
    >
      <motion.div
        className="absolute h-[156%] w-[156%] rounded-full bg-[radial-gradient(circle,rgba(245,215,110,0.18),rgba(212,175,55,0.08)_35%,transparent_68%)]"
        animate={{ opacity: [0.48, 0.76, 0.48], scale: [0.96, 1.06, 0.96] }}
        transition={{ repeat: Infinity, duration: 6.5, ease: 'easeInOut' }}
      />
      <div className="relative h-[clamp(78px,12.4vw,116px)] w-[clamp(78px,12.4vw,116px)] overflow-hidden rounded-full border border-softgold/48 bg-[#d8d4c5] shadow-[inset_-14px_-14px_24px_rgba(0,0,0,0.42),0_0_18px_rgba(212,175,55,0.16)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_34%_28%,rgba(255,255,255,0.86),transparent_18%),radial-gradient(circle_at_64%_64%,rgba(80,80,75,0.34),transparent_14%),radial-gradient(circle_at_45%_72%,rgba(80,80,75,0.25),transparent_10%)]" />
        <div
          className="absolute inset-y-[-4%] w-[110%] rounded-full bg-[#080704]/90 blur-[0.4px]"
          style={{ left: `calc(50% + ${shadowOffset}%)`, transform: waxing ? 'translateX(-100%)' : 'translateX(-10%)' }}
        />
      </div>
    </motion.div>
  )
}

function SidePanel({ title, badge, children, className = '', delay = 0 }) {
  return (
    <motion.aside
      className={`side-panel bronze-glass premium-card lift-card relative z-30 rounded-lg p-2.5 [text-shadow:0_3px_10px_rgba(0,0,0,0.8)] ${className}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: delay * 0.03, ease: 'easeOut' }}
    >
      <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
        <h2 className="side-panel-title truncate font-serifHindi text-[clamp(14px,1.2vw,18px)] font-black text-softgold">{title}</h2>
        {badge ? (
          <span className="panel-mode-badge shrink-0 rounded-full border border-gold/24 bg-[rgba(212,175,55,0.1)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-antiquegold">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="side-panel-body grid gap-1.5">{children}</div>
    </motion.aside>
  )
}

function formatVedicTimeTitle(number, language) {
  return language === 'hi' ? `${number}वाँ मुहूर्त` : `Muhurta ${number}`
}

function formatVedicMinutes(minutes, language) {
  return language === 'hi' ? `${minutes} मिनट` : `${minutes} min`
}

function formatRemainingMuhuratTime(remainingSeconds) {
  const clampedSeconds = Math.max(0, Math.min(48 * 60, remainingSeconds))
  const minutes = Math.floor(clampedSeconds / 60)
  const seconds = clampedSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatVedicTimeSummary(vedicTime, language) {
  const elapsedText = language === 'hi' ? `${vedicTime.minutes} मिनट व्यतीत` : `${vedicTime.minutes} min elapsed`
  return `${formatVedicTimeTitle(vedicTime.number, language)} • ${elapsedText}`
}

function getVedicTimeParts(now, muhurat) {
  if (!(now instanceof Date) || !muhurat?.vedicDayStart) return { number: 1, minutes: 0, remainingSeconds: 48 * 60 }
  const segmentMs = 48 * 60000
  const elapsed = Math.max(0, now.getTime() - muhurat.vedicDayStart.getTime())
  const number = (Math.floor(elapsed / segmentMs) % 30) + 1
  const elapsedInMuhuratMs = elapsed % segmentMs
  const minutes = Math.floor(elapsedInMuhuratMs / 60000)
  const secondsElapsed = Math.floor(elapsedInMuhuratMs / 1000)
  const remainingSeconds = 48 * 60 - secondsElapsed
  return { number, minutes, remainingSeconds }
}

function VedicTimeInfo({ language, vedicTime }) {
  return (
    <section className="vedic-time-info bronze-glass premium-card lift-card relative z-30 rounded-lg p-2.5 [text-shadow:0_3px_10px_rgba(0,0,0,0.8)]">
      <h2 className="mb-1.5 font-serifHindi text-[clamp(13px,1.08vw,16px)] font-black text-softgold">
        {t(language, 'वैदिक समय', 'Vedic Time')}
      </h2>
      <div className="mb-1 font-serifHindi text-[12px] font-black text-[#FFF4D6]">
        {t(language, 'अभी', 'Now')}: {formatVedicTimeTitle(vedicTime.number, language)} • {formatVedicMinutes(vedicTime.minutes, language)}
      </div>
      <p className="font-serifHindi text-[11.5px] leading-snug text-[#FFF4D6]">
        {t(
          language,
          'वैदिक वॉच 30 मुहूर्तों वाले दिन पर आधारित है। यह सूर्योदय से शुरू होता है, जहाँ 1 मुहूर्त = 48 मिनट होता है।',
          'Vedic Watch follows a 30-Muhurta day starting from sunrise, where 1 Muhurta = 48 minutes.',
        )}
      </p>
    </section>
  )
}

function InternationalTimeCard({ now, location, language }) {
  const dateText =
    language === 'hi'
      ? formatHindiDate(now)
      : new Intl.DateTimeFormat('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(now)

  return (
    <section className="international-time-card bronze-glass premium-card lift-card relative z-30 rounded-lg p-2.5 text-center [text-shadow:0_3px_10px_rgba(0,0,0,0.8)]">
      <h2 className="mb-1 truncate font-serifHindi text-[clamp(12px,1vw,15px)] font-black text-softgold">
        {t(language, 'भारतीय समय (IST – Indian Standard Time)', 'Indian Standard Time (IST)')}
      </h2>
      <div className="font-digital text-[clamp(19px,1.75vw,25px)] font-black leading-none text-ivory">
        {formatClock(now)}
      </div>
      <div className="mt-1 truncate font-serifHindi text-[11px] text-[#FFF4D6]/78">{dateText}</div>
      <div className="mt-0.5 truncate text-[10px] uppercase tracking-[0.12em] text-antiquegold">
        {language === 'hi' ? location.nameHi : location.nameEn}
      </div>
    </section>
  )
}

function DataRow({ label, value, tone = 'neutral', shubh = false, currentBadge = false, highlight = false, pulse = false, language = 'hi' }) {
  const toneClass = tone === 'good' ? 'text-softgold' : tone === 'bad' ? 'text-[#f4b469]' : 'text-ivory/90'
  const isShubh = shubh
  return (
    <div
      className={`premium-card lift-card data-row-card rounded-md border bg-[rgba(73,45,17,0.25)] px-2.5 py-1.5 shadow-[inset_0_0_14px_rgba(0,0,0,0.28)] ${pulse ? 'shubh-start-pulse' : ''} ${
        isShubh
          ? 'shubh-row border-l-[3px] border-l-[rgba(0,212,255,0.82)] border-y-gold/14 border-r-gold/14'
          : highlight
            ? 'current-muhurat-row border-l-[3px] border-l-[rgba(245,215,110,0.82)] border-y-gold/18 border-r-gold/18'
          : 'border-gold/14'
      }`}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="truncate text-[11px] uppercase tracking-[0.12em] text-antiquegold">{label}</div>
        {isShubh ? (
          <span className="shubh-badge inline-flex shrink-0 items-center gap-1 rounded-full border border-[rgba(0,212,255,0.45)] bg-[rgba(0,212,255,0.1)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#bff7ff]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00d4ff] shadow-[0_0_8px_rgba(0,212,255,0.75)]" />
            {t(language, '\u0936\u0941\u092d', 'Shubh')}
          </span>
        ) : null}
        {currentBadge ? (
          <span className="current-badge inline-flex shrink-0 items-center gap-1 rounded-full border border-gold/45 bg-[rgba(212,175,55,0.12)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-softgold">
            {t(language, '\u0935\u0930\u094d\u0924\u092e\u093e\u0928', 'Current')}
          </span>
        ) : null}
      </div>
      <div className={`data-row-value mt-0.5 truncate font-serifHindi text-[13.5px] font-bold ${toneClass}`}>{value || '—'}</div>
    </div>
  )
}

function FactBox({ language, fact, category, compact = false }) {
  return (
    <motion.section
      className={`fact-card premium-card lift-card relative z-30 rounded-lg p-2.5 [text-shadow:0_3px_10px_rgba(0,0,0,0.8)] ${compact ? 'mx-auto w-[min(92vw,680px)]' : ''}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{ opacity: { duration: 0.65, ease: 'easeOut' }, y: { duration: 0.65, ease: 'easeOut' } }}
    >
      <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
        <div className="truncate font-serifHindi text-[clamp(15px,1.35vw,20px)] font-black text-[#D4AF37]">
          {t(language, 'सनातन तथ्य', 'Sanatan Fact')}
        </div>
        {category ? (
          <span className="max-w-[42%] truncate rounded-full border border-gold/25 bg-[rgba(212,175,55,0.12)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#D4AF37]">
            {category}
          </span>
        ) : null}
      </div>
      <div className="hidden">
        {t(language, 'आज का सनातन तथ्य', 'Sanatan Fact of the Day')}
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={fact}
          className="fact-copy font-serifHindi text-[clamp(13px,1.1vw,16px)] leading-snug text-[#FFF4D6]"
          initial={{ opacity: 0, y: 7, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -5, scale: 0.98 }}
          transition={{ duration: 0.42, ease: 'easeOut' }}
        >
          {fact}
        </motion.p>
      </AnimatePresence>
    </motion.section>
  )
}
