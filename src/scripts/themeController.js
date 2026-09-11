import {
  getTransitionDirection,
  getTransitionFrame,
  themeToWorld,
  worldToTheme
} from './themeWorld.mjs'

const STORAGE_KEY = 'glenn-blog-theme'
const DURATION_MS = 1500
const SWAP_AT_MS = 520
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
  root.dataset.layoutWorld = world
  root.dataset.theme = theme
  localStorage.setItem(STORAGE_KEY, theme)
  updateToggleLabels(world)
  return { theme, world }
}

function dispatch(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }))
}

function dispatchWorldChange(detail) {
  dispatch('glenn:worldchange', detail)
}

function dispatchWorldTransition(detail) {
  dispatch('glenn:worldtransition', detail)
}

function getOrigin(button) {
  const rect = button.getBoundingClientRect()
  const toggleRadius = Math.max(rect.width, rect.height) / 2
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    toggleRadius
  }
}

function setTransitionGeometry(origin) {
  const toggleRadius = Math.max(1, origin.toggleRadius)
  root.style.setProperty('--world-origin-x', `${origin.x}px`)
  root.style.setProperty('--world-origin-y', `${origin.y}px`)
  root.style.setProperty('--world-toggle-radius', `${toggleRadius}px`)
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

function finishTransition({ fromWorld, toWorld, direction }) {
  running = false
  frameHandle = 0
  transitionLayer?.classList.remove('is-active')
  if (transitionLayer) {
    delete transitionLayer.dataset.phase
    delete transitionLayer.dataset.direction
  }
  delete root.dataset.worldTransitioning
  delete root.dataset.worldTransitionPhase
  delete root.dataset.worldTransitionDirection
  root.dataset.layoutWorld = toWorld
  root.style.removeProperty('--world-transition-progress')
  root.style.removeProperty('--world-phase-progress')
  dispatch('glenn:worldtransitionend', {
    fromWorld,
    toWorld,
    world: toWorld,
    theme: worldToTheme(toWorld),
    direction,
    elapsedMs: DURATION_MS,
    progress: 1
  })
}

function runTransition({ fromWorld, toWorld, direction, origin }) {
  running = true
  let startedAt = 0
  let swapped = false
  root.dataset.worldTransitioning = 'true'
  root.dataset.worldTransitionDirection = direction
  transitionLayer?.classList.add('is-active')
  if (transitionLayer) transitionLayer.dataset.direction = direction

  dispatch('glenn:worldtransitionstart', {
    fromWorld,
    toWorld,
    world: fromWorld,
    theme: worldToTheme(fromWorld),
    direction,
    originX: origin.x,
    originY: origin.y,
    toggleRadius: origin.toggleRadius,
    elapsedMs: 0,
    progress: 0,
    layoutWorld: fromWorld
  })

  const tick = now => {
    if (!startedAt) startedAt = now
    const elapsed = Math.min(DURATION_MS, now - startedAt)
    const frame = getTransitionFrame(elapsed, direction)

    if (!swapped && elapsed >= SWAP_AT_MS) {
      swapped = true
      swapWorld(toWorld)
    }

    root.dataset.worldTransitionPhase = frame.phase
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
      layoutWorld: root.dataset.layoutWorld || fromWorld,
      direction,
      elapsedMs: frame.elapsedMs,
      progress: frame.progress,
      phase: frame.phase,
      phaseProgress: frame.phaseProgress,
      originX: origin.x,
      originY: origin.y,
      toggleRadius: origin.toggleRadius
    })

    if (elapsed < DURATION_MS) {
      frameHandle = requestAnimationFrame(tick)
    } else {
      if (!swapped) swapWorld(toWorld)
      finishTransition({ fromWorld, toWorld, direction })
    }
  }

  frameHandle = requestAnimationFrame(tick)
}

function requestWorldToggle(button) {
  if (running) return
  const fromWorld = getCurrentWorld()
  const toWorld = fromWorld === 'solar' ? 'observatory' : 'solar'
  const direction = getTransitionDirection(fromWorld, toWorld)
  const origin = getOrigin(button)
  setTransitionGeometry(origin)

  if (reducedMotion.matches) {
    const next = applyWorld(toWorld)
    dispatchWorldChange(next)
    dispatch('glenn:worldtransitionend', {
      fromWorld,
      toWorld,
      world: toWorld,
      theme: next.theme,
      direction,
      elapsedMs: 0,
      progress: 1,
      reducedMotion: true
    })
    return
  }

  runTransition({ fromWorld, toWorld, direction, origin })
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
root.dataset.layoutWorld = initialWorld
updateToggleLabels(initialWorld)
