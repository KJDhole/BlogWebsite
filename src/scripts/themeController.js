import {
  getTransitionDirection,
  getTransitionFrame,
  themeToWorld,
  worldToTheme
} from './themeWorld.mjs'

const STORAGE_KEY = 'glenn-blog-theme'
const DURATION_MS = 1500
const WORLD_COMMIT_AT_MS = 820
const root = document.documentElement
const transitionLayer = document.querySelector('[data-theme-transition]')
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

let running = false
let frameHandle = 0

function getCurrentWorld() {
  return root.dataset.world === 'observatory' ? 'observatory' : 'solar'
}

function updateToggleLabels(world = getCurrentWorld()) {
  const destination = world === 'solar' ? 'Observatory' : 'Solar Archive'
  document.querySelectorAll('[data-world-toggle]').forEach(button => {
    button.setAttribute('aria-label', `切换到 ${destination}`)
    button.setAttribute('title', `切换到 ${destination}`)
  })
}

function applyWorld(world, { syncLayout = true } = {}) {
  const theme = worldToTheme(world)
  root.dataset.world = world
  root.dataset.theme = theme
  if (syncLayout) root.dataset.layoutWorld = world
  localStorage.setItem(STORAGE_KEY, theme)
  updateToggleLabels(world)
  return { theme, world }
}

function dispatchTransitionEvent(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }))
}

function getToggleGeometry(button) {
  const rect = button.getBoundingClientRect()
  const origin = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  }
  const waveRadius = Math.hypot(
    Math.max(origin.x, window.innerWidth - origin.x),
    Math.max(origin.y, window.innerHeight - origin.y)
  )
  const toggleDiameter = Math.max(rect.width, rect.height, 1)
  const waveScaleStart = toggleDiameter / Math.max(1, waveRadius * 2)

  return { origin, waveRadius, toggleDiameter, waveScaleStart }
}

function setTransitionGeometry({ origin, waveRadius, toggleDiameter, waveScaleStart }) {
  root.style.setProperty('--world-origin-x', `${origin.x}px`)
  root.style.setProperty('--world-origin-y', `${origin.y}px`)
  root.style.setProperty('--world-wave-radius', `${waveRadius}px`)
  root.style.setProperty('--world-toggle-diameter', `${toggleDiameter}px`)
  root.style.setProperty('--world-wave-scale-start', String(waveScaleStart))
  root.style.setProperty('--world-wave-scale', String(waveScaleStart))
}

function commitWorld(toWorld) {
  const next = applyWorld(toWorld, { syncLayout: false })
  dispatchTransitionEvent('glenn:worldchange', next)
  return next
}

function transitionDetail({ fromWorld, toWorld, direction, geometry, frame, committed }) {
  return {
    fromWorld,
    toWorld,
    theme: worldToTheme(toWorld),
    world: committed ? toWorld : fromWorld,
    direction,
    progress: frame.progress,
    phase: frame.phase,
    phaseProgress: frame.phaseProgress,
    elapsedMs: frame.elapsedMs,
    originX: geometry.origin.x,
    originY: geometry.origin.y,
    toggleDiameter: geometry.toggleDiameter,
    waveRadius: geometry.waveRadius,
    waveScaleStart: geometry.waveScaleStart
  }
}

function getWaveScale(detail) {
  const start = detail.waveScaleStart
  const full = 1.02
  if (detail.phase === 'radiation') {
    return detail.direction === 'to-observatory'
      ? full + (start - full) * detail.phaseProgress
      : start + (full - start) * detail.phaseProgress
  }

  const afterRadiation = detail.elapsedMs >= WORLD_COMMIT_AT_MS
  if (detail.direction === 'to-observatory') return afterRadiation ? start : full
  return afterRadiation ? full : start
}

function paintTransitionFrame(detail) {
  root.style.setProperty('--world-transition-progress', String(detail.progress))
  root.style.setProperty('--world-phase-progress', String(detail.phaseProgress))
  root.style.setProperty('--world-wave-scale', String(getWaveScale(detail)))
  if (transitionLayer) {
    transitionLayer.dataset.phase = detail.phase
    transitionLayer.dataset.direction = detail.direction
  }
  dispatchTransitionEvent('glenn:worldtransition', detail)
}

function finishTransition(detail) {
  running = false
  frameHandle = 0
  transitionLayer?.classList.remove('is-active')
  if (transitionLayer) {
    delete transitionLayer.dataset.phase
    delete transitionLayer.dataset.direction
  }
  root.style.removeProperty('--world-transition-progress')
  root.style.removeProperty('--world-phase-progress')
  root.style.removeProperty('--world-wave-scale')
  dispatchTransitionEvent('glenn:worldtransitionend', {
    ...detail,
    progress: 1,
    phaseProgress: 1,
    world: detail.toWorld,
    theme: worldToTheme(detail.toWorld)
  })
}

function runTransition({ fromWorld, toWorld, direction, geometry }) {
  running = true
  let startedAt = 0
  let committed = false
  transitionLayer?.classList.add('is-active')
  if (transitionLayer) transitionLayer.dataset.direction = direction

  const initialFrame = getTransitionFrame(0, direction)
  const initialDetail = transitionDetail({ fromWorld, toWorld, direction, geometry, frame: initialFrame, committed })
  if (transitionLayer) transitionLayer.dataset.phase = initialFrame.phase
  dispatchTransitionEvent('glenn:worldtransitionstart', initialDetail)
  paintTransitionFrame(initialDetail)

  const tick = now => {
    if (!startedAt) startedAt = now
    const elapsed = Math.min(DURATION_MS, now - startedAt)
    const frame = getTransitionFrame(elapsed, direction)

    if (!committed && elapsed >= WORLD_COMMIT_AT_MS) {
      committed = true
      commitWorld(toWorld)
    }

    const detail = transitionDetail({ fromWorld, toWorld, direction, geometry, frame, committed })
    paintTransitionFrame(detail)

    if (elapsed < DURATION_MS) {
      frameHandle = requestAnimationFrame(tick)
      return
    }

    if (!committed) {
      committed = true
      commitWorld(toWorld)
    }
    finishTransition(transitionDetail({
      fromWorld,
      toWorld,
      direction,
      geometry,
      frame: getTransitionFrame(DURATION_MS, direction),
      committed
    }))
  }

  frameHandle = requestAnimationFrame(tick)
}

function requestWorldToggle(button) {
  if (running) return
  const fromWorld = getCurrentWorld()
  const toWorld = fromWorld === 'solar' ? 'observatory' : 'solar'
  const direction = getTransitionDirection(fromWorld, toWorld)
  const geometry = getToggleGeometry(button)
  setTransitionGeometry(geometry)

  if (reducedMotion.matches) {
    const startDetail = transitionDetail({
      fromWorld,
      toWorld,
      direction,
      geometry,
      frame: getTransitionFrame(0, direction),
      committed: false
    })
    dispatchTransitionEvent('glenn:worldtransitionstart', startDetail)
    const next = applyWorld(toWorld)
    dispatchTransitionEvent('glenn:worldchange', next)
    dispatchTransitionEvent('glenn:worldtransitionend', {
      ...startDetail,
      progress: 1,
      phaseProgress: 1,
      world: toWorld,
      theme: next.theme
    })
    return
  }

  runTransition({ fromWorld, toWorld, direction, geometry })
}

document.addEventListener('click', event => {
  const button = event.target.closest?.('[data-world-toggle]')
  if (!button) return
  requestWorldToggle(button)
})

document.addEventListener('keydown', event => {
  if (event.key !== 'Enter' && event.key !== ' ') return
  const button = event.target.closest?.('[data-world-toggle]')
  if (!button) return
  event.preventDefault()
  requestWorldToggle(button)
})

window.addEventListener('pagehide', () => {
  if (frameHandle) cancelAnimationFrame(frameHandle)
})

const initialTheme = root.dataset.theme === 'dark' ? 'dark' : 'light'
const initialWorld = themeToWorld(initialTheme)
root.dataset.world = initialWorld
root.dataset.layoutWorld = root.dataset.layoutWorld || initialWorld
updateToggleLabels(initialWorld)
