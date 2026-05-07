const devtoolsThreshold = 160
const warningMessage = 'Developer tools are disabled for this production app.'

function isBlockedShortcut(event) {
  const key = event.key.toLowerCase()
  const hasModifier = event.ctrlKey || event.metaKey

  return (
    event.key === 'F12' ||
    (hasModifier && event.shiftKey && ['i', 'j', 'c'].includes(key)) ||
    (hasModifier && ['u', 's'].includes(key))
  )
}

function hasDevtoolsSizeSignal() {
  return (
    window.outerWidth - window.innerWidth > devtoolsThreshold ||
    window.outerHeight - window.innerHeight > devtoolsThreshold
  )
}

export function installProductionSecurity() {
  if (!import.meta.env.PROD) return

  let hasWarned = false

  function warnDevtools() {
    if (hasWarned) return
    hasWarned = true
    window.alert(warningMessage)
  }

  document.addEventListener('contextmenu', (event) => {
    event.preventDefault()
  })

  document.addEventListener('keydown', (event) => {
    if (!isBlockedShortcut(event)) return
    event.preventDefault()
    warnDevtools()
  })

  window.setInterval(() => {
    if (hasDevtoolsSizeSignal()) warnDevtools()
  }, 1500)
}
