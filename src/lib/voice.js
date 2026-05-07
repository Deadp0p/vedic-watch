import bellSoundUrl from '../assets/bell.mp3'

export const voiceModes = [
  { id: 'silent', hi: 'मौन', en: 'Silent' },
  { id: 'all', hi: 'हर मुहूर्त', en: 'Every muhurat' },
  { id: 'good', hi: 'केवल शुभ', en: 'Shubh only' },
]

const announcementStorageKey = 'vedic_last_muhurat_announcement'
let audioContext = null
let bellTimer = null
let bellFadeTimer = null
let bellResolveTimer = null
let bellAudio = null
let speechStartTimer = null
let voiceRunId = 0

const englishNames = {
  रुद्र: 'Rudra',
  आहि: 'Ahi',
  मित्र: 'Mitra',
  पितृ: 'Pitri',
  वसु: 'Vasu',
  वाराह: 'Varaha',
  विश्वदेव: 'Vishwadeva',
  विधि: 'Vidhi',
  सतमुखी: 'Satamukhi',
  पुरुहूत: 'Puruhuta',
  वाहिनी: 'Vahini',
  नक्तनकर: 'Naktanakar',
  वरुण: 'Varuna',
  अर्यमा: 'Aryama',
  भग: 'Bhaga',
  गिरीश: 'Girish',
  अजपाद: 'Ajapada',
  अहिरबुध्न्य: 'Ahirbudhnya',
  पूषा: 'Pusha',
  अश्विनी: 'Ashwini',
  यम: 'Yama',
  अग्नि: 'Agni',
  विधाता: 'Vidhata',
  कण्ड: 'Kanda',
  अदिति: 'Aditi',
  विष्णु: 'Vishnu',
  द्युमद्गद्युतिः: 'Dyumadgadyuti',
  ब्रह्म: 'Brahma',
  समुद्रम: 'Samudram',
}

const englishPanchang = {
  'शुक्ल पक्ष': 'Shukla Paksha',
  'कृष्ण पक्ष': 'Krishna Paksha',
  प्रतिपदा: 'Pratipada',
  द्वितीया: 'Dwitiya',
  तृतीया: 'Tritiya',
  चतुर्थी: 'Chaturthi',
  पंचमी: 'Panchami',
  षष्ठी: 'Shashthi',
  सप्तमी: 'Saptami',
  अष्टमी: 'Ashtami',
  नवमी: 'Navami',
  दशमी: 'Dashami',
  एकादशी: 'Ekadashi',
  द्वादशी: 'Dwadashi',
  त्रयोदशी: 'Trayodashi',
  चतुर्दशी: 'Chaturdashi',
  पूर्णिमा: 'Purnima',
  अमावस्या: 'Amavasya',
}

function selectHindiVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || []

  return (
    voices.find((voice) => voice.name.includes('Google Hindi')) ||
    voices.find((voice) => voice.name.includes('Google हिन्दी')) ||
    voices.find((voice) => voice.lang === 'hi-IN') ||
    voices.find((voice) => voice.lang.startsWith('hi')) ||
    voices[0] ||
    null
  )
}

function formatClockTime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '00:00'

  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function getVedicSpeechParts(muhurat, vedicDayStart, countdownMs = 0) {
  const segmentMs = 48 * 60000
  const start = muhurat?.start
  if (!(start instanceof Date) || !(vedicDayStart instanceof Date)) return { number: 1, elapsedMinutes: 0 }

  const elapsedFromDayStart = Math.max(0, start.getTime() - vedicDayStart.getTime())
  const number = (Math.floor(elapsedFromDayStart / segmentMs) % 30) + 1
  const elapsedInMuhurat = segmentMs - Math.max(0, Math.min(segmentMs, countdownMs))
  const elapsedMinutes = Math.max(0, Math.min(47, Math.floor(elapsedInMuhurat / 60000)))
  return { number, elapsedMinutes }
}

function localize(value, language) {
  if (language === 'hi') return value || '—'
  return englishNames[value] || englishPanchang[value] || value || '—'
}

function getStoredAnnouncementKey() {
  try {
    return window.localStorage.getItem(announcementStorageKey) || ''
  } catch {
    return ''
  }
}

function setStoredAnnouncementKey(key) {
  try {
    window.localStorage.setItem(announcementStorageKey, key)
  } catch {
    // Non-critical: the in-memory ref still prevents duplicates in-session.
  }
}

function createAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return null
  audioContext ||= new AudioContextClass()
  return audioContext
}

function clearBellTimers() {
  window.clearTimeout(bellTimer)
  window.clearTimeout(bellFadeTimer)
  window.clearTimeout(bellResolveTimer)
  bellTimer = null
  bellFadeTimer = null
  bellResolveTimer = null
}

function getBellAudio() {
  if (!bellAudio) {
    bellAudio = new Audio(bellSoundUrl)
    bellAudio.preload = 'auto'
  }

  return bellAudio
}

function stopMp3Bell() {
  if (!bellAudio) return

  bellAudio.pause()
  bellAudio.currentTime = 0
  bellAudio.volume = 0.35
  bellAudio.onended = null
  bellAudio.onerror = null
}

function fadeOutBell(audio, finish) {
  const startVolume = audio.volume || 0.35
  const fadeStartedAt = Date.now()
  const fadeDurationMs = 450

  const tick = () => {
    const progress = Math.min((Date.now() - fadeStartedAt) / fadeDurationMs, 1)
    audio.volume = Math.max(startVolume * (1 - progress), 0)

    if (progress >= 1) {
      finish()
      return
    }

    bellFadeTimer = window.setTimeout(tick, 60)
  }

  tick()
}

function playMp3Bell() {
  return new Promise((resolve, reject) => {
    const audio = getBellAudio()
    let settled = false

    const finish = () => {
      if (settled) return
      settled = true
      clearBellTimers()
      stopMp3Bell()
      resolve()
    }

    const fail = (error) => {
      if (settled) return
      settled = true
      clearBellTimers()
      stopMp3Bell()
      reject(error)
    }

    clearBellTimers()
    stopMp3Bell()
    audio.volume = 0.35
    audio.currentTime = 0
    audio.onended = finish
    audio.onerror = fail

    const playAttempt = audio.play()

    if (!playAttempt?.then) {
      bellResolveTimer = window.setTimeout(finish, 2100)
      return
    }

    playAttempt
      .then(() => {
        const durationSeconds = Number.isFinite(audio.duration) ? audio.duration : 0

        if (!durationSeconds || durationSeconds > 2) {
          bellTimer = window.setTimeout(() => fadeOutBell(audio, finish), 1500)
          bellResolveTimer = window.setTimeout(finish, 2200)
          return
        }

        bellResolveTimer = window.setTimeout(finish, durationSeconds * 1000 + 150)
      })
      .catch(fail)
  })
}

function playSyntheticBell(onAudioBlocked) {
  clearBellTimers()

  return new Promise((resolve) => {
    try {
      const context = createAudioContext()
      if (!context) {
        resolve()
        return
      }

      const startBell = () => {
        const now = context.currentTime
        const output = context.createGain()
        const fundamental = context.createOscillator()
        const overtone = context.createOscillator()

        output.gain.setValueAtTime(0.0001, now)
        output.gain.exponentialRampToValueAtTime(0.3, now + 0.04)
        output.gain.exponentialRampToValueAtTime(0.0001, now + 1.05)

        fundamental.type = 'sine'
        fundamental.frequency.setValueAtTime(880, now)
        fundamental.frequency.exponentialRampToValueAtTime(660, now + 1.05)

        overtone.type = 'sine'
        overtone.frequency.setValueAtTime(1320, now)
        overtone.frequency.exponentialRampToValueAtTime(990, now + 1.05)

        fundamental.connect(output)
        overtone.connect(output)
        output.connect(context.destination)

        fundamental.start(now)
        overtone.start(now)
        fundamental.stop(now + 1.1)
        overtone.stop(now + 1.1)

        bellTimer = window.setTimeout(resolve, 1120)
      }

      if (context.state === 'suspended') {
        context.resume().then(startBell).catch(() => {
          onAudioBlocked?.()
          resolve()
        })
      } else {
        startBell()
      }
    } catch {
      onAudioBlocked?.()
      resolve()
    }
  })
}

async function playSoftBell(onAudioBlocked) {
  try {
    await playMp3Bell()
  } catch {
    await playSyntheticBell(onAudioBlocked)
  }
}

export function stopVoiceAudio() {
  voiceRunId += 1
  clearBellTimers()
  stopMp3Bell()
  window.clearTimeout(speechStartTimer)
  speechStartTimer = null
  window.speechSynthesis?.cancel?.()
}

function buildAnnouncement({ language, muhurat, panchang, now, vedicDayStart, countdownMs }) {
  const vedic = getVedicSpeechParts(muhurat, vedicDayStart, countdownMs)
  const timeText = formatClockTime(now)

  if (language === 'en') {
    return `Current Muhurat is ${localize(muhurat.name, 'en')}. ${localize(panchang.paksha, 'en')}, ${localize(panchang.tithi, 'en')}. Vedic time: Muhurta ${vedic.number}, ${vedic.elapsedMinutes} minutes elapsed. International time is ${timeText}.`
  }

  const [hour, minute] = timeText.split(':')
  return `वर्तमान मुहूर्त ${muhurat.name} है। ${panchang.paksha}, ${panchang.tithi}। वैदिक समय ${vedic.number}वाँ मुहूर्त, ${vedic.elapsedMinutes} मिनट व्यतीत। अंतरराष्ट्रीय समय ${hour} बजकर ${minute} मिनट।`
}

export async function speakMuhurat({
  mode,
  muhurat,
  panchang,
  now,
  vedicDayStart,
  countdownMs,
  lastKeyRef,
  language = 'hi',
  onAudioBlocked,
  trigger = 'transition',
}) {
  if (mode === 'silent' || !muhurat?.name || muhurat.name === '—' || !window.speechSynthesis) return
  if (mode === 'good' && muhurat.type !== 'good') return

  const key = `${muhurat.name}-${muhurat.start?.getTime?.() || ''}`
  const guardKey = `${trigger}-${mode}-${key}`
  if (!key || lastKeyRef.current === guardKey) return
  if (trigger === 'transition' && getStoredAnnouncementKey() === key) return
  lastKeyRef.current = guardKey
  if (trigger === 'transition') setStoredAnnouncementKey(key)

  const text = buildAnnouncement({ language, muhurat, panchang, now, vedicDayStart, countdownMs })
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = language === 'en' ? 'en-IN' : 'hi-IN'
  utterance.voice = language === 'hi' ? selectHindiVoice() : null
  utterance.rate = 0.9
  utterance.pitch = 0.9
  utterance.volume = 1

  stopVoiceAudio()
  const runId = voiceRunId
  await playSoftBell(onAudioBlocked)

  speechStartTimer = window.setTimeout(() => {
    utterance.onend = () => {
      if (runId === voiceRunId) playSoftBell(onAudioBlocked)
    }
    utterance.onerror = () => {
      if (runId === voiceRunId) playSoftBell(onAudioBlocked)
    }
    if (runId !== voiceRunId) return
    window.speechSynthesis.speak(utterance)
  }, 300)
}
