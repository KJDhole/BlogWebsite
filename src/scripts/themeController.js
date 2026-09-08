import {
  getTransitionDirection,
  getTransitionFrame,
  themeToWorld,
  worldToTheme
} from './themeWorld.mjs'

const STORAGE_KEY = 'glenn-blog-theme'
const DURATION_MS = 1500
const SWAP_AT_MS = 450
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

function applyWorld(world) {
  const theme = worldToTheme(world)
  root.dataset.world = world
  root.dataset.theme = theme
  localStorage.setItem(STORAGE_KEY, theme)
  updateToggleLabels(world)
  return { theme, world }
}

function dispatchWorldChange(detail) {
  window.dispatchEvent(new CustomEvent('glenn:worldchange', { detail }))
}

function dispatchWorldTransition(detail) {
  window.dispatchEvent(new CustomEvent('glenn:worldtransition', { detail }))
}

function getOrigin(button, event) {
  const rect = button.getBoundingClientRect()
  const hasPointerCoordinates = Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY) && (event.clientX !== 0 || event.clientY !== 0)
  return {
    x: hasPointerCoordinates ? event.clientX : rect.left + rect.width / 2,
    y: hasPointerCoordinates ? event.clientY : rect.top + rect.height / 2
  }
}

function setTransitionGeometry(origin) {
  const radius = Math.hypot(
    Math.max(origin.x, window.innerWidth - origin.x),
    Math.max(origin.y, window.innerHeight - origin.y)
  )
  root.style.setProperty('--world-origin-x', `${origin.x}px`)
  root.style.setProperty('--world-origin-y', `${origin.y}px`)
  root.style.setProperty('--world-wave-radius', `${radius}px`)
  return radius
}

function swapWorld(toWorld) {
  let next
  const commit = () => {
    next = applyWorld(toWorld)
  }

  if (typeof document.startViewTransition === 'function') {
    document.startViewTransition(commit)
  } else {
    commit()
  }

  dispatchWorldChange(next ?? { theme: worldToTheme(toWorld), world: toWorld })
}

function finishTransition() {
  running = false
  frameHandle = 0
  transitionLayer?.classList.remove('is-active')
  if (transitionLayer) {
    delete transitionLayer.dataset.phase
    delete transitionLayer.dataset.direction
  }
  root.style.removeProperty('--world-transition-progress')
  root.style.removeProperty('--world-phase-progress')
}

function runTransition({ fromWorld, toWorld, direction, origin }) {
  running = true
  let startedAt = 0
  let swapped = false
  transitionLayer?.classList.add('is-active')
  if (transitionLayer) transitionLayer.dataset.direction = direction

  const tick = now => {
    if (!startedAt) startedAt = now
    const elapsed = Math.min(DURATION_MS, now - startedAt)
    const frame = getTransitionFrame(elapsed, direction)

    if (!swapped && elapsed >= SWAP_AT_MS) {
      swapped = true
      swapWorld(toWorld)
    }

    root.style.setProperty('--world-transition-progress', String(frame.progress))
    root.style.setProperty('--world-phase-progress', String(frame.phaseProgress))
    if (transitionLayer) {
      transitionLayer.dataset.phase = frame.phase
      transitionLayer.dataset.direction = direction
    }

    dispatchWorldTransition({
      fromWorld,
      toWorld,
      theme: worldToTheme(toWorld),
      world: swapped ? toWorld : fromWorld,
      direction,
      progress: frame.progress,
      phase: frame.phase,
      phaseProgress: frame.phaseProgress,
      originX: origin.x,
      originY: origin.y
    })

    if (elapsed < DURATION_MS) {
      frameHandle = requestAnimationFrame(tick)
    } else {
      if (!swapped) swapWorld(toWorld)
      finishTransition()
    }
  }

  frameHandle = requestAnimationFrame(tick)
}

function requestWorldToggle(button, event) {
  if (running) return
  const fromWorld = getCurrentWorld()
  const toWorld = fromWorld === 'solar' ? 'observatory' : 'solar'
  const direction = getTransitionDirection(fromWorld, toWorld)
  const origin = getOrigin(button, event)
  setTransitionGeometry(origin)

  if (reducedMotion.matches) {
    const next = applyWorld(toWorld)
    dispatchWorldChange(next)
    return
  }

  runTransition({ fromWorld, toWorld, direction, origin })
}

document.addEventListener('click', event => {
  const button = event.target.closest?.('[data-world-toggle]')
  if (!button) return
  requestWorldToggle(button, event)
})

document.addEventListener('keydown', event => {
  if (event.key !== 'Enter' && event.key !== ' ') return
  const button = event.target.closest?.('[data-world-toggle]')
  if (!button) return
  event.preventDefault()
  requestWorldToggle(button, null)
})

window.addEventListener('pagehide', () => {
  if (frameHandle) cancelAnimationFrame(frameHandle)
})

// Keep persisted light/dark semantics while exposing the richer personality vocabulary.
const initialTheme = root.dataset.theme === 'dark' ? 'dark' : 'light'
const initialWorld = themeToWorld(initialTheme)
root.dataset.world = initialWorld
updateToggleLabels(initialWorld)
