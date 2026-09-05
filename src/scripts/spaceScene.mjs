import * as THREE from 'three'
import { createStarField } from './starField.mjs'
import { createSolarSystem } from './solarSystem3d.mjs'
import { createBlackHolePortal } from './blackHolePortal.mjs'

function unavailableApi() {
  return {
    available: false,
    setStoryState() {},
    setTheme() {},
    resize() {},
    destroy() {}
  }
}

function clampStoryState(state, mobile) {
  if (!state?.system) return state
  const minimumScale = mobile ? 0.52 : 0.58
  return {
    ...state,
    system: {
      ...state.system,
      scale: Math.max(minimumScale, state.system.scale ?? 1),
      lift: Math.max(mobile ? -30 : -46, Math.min(10, state.system.lift ?? 0))
    }
  }
}

export function createSpaceScene(canvas, {
  mobile = false,
  reducedMotion = false,
  theme = 'light',
  onUnavailable = () => {}
} = {}) {
  if (!canvas || typeof window === 'undefined' || typeof document === 'undefined') {
    onUnavailable()
    return unavailableApi()
  }

  let renderer
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !mobile,
      powerPreference: 'high-performance'
    })
  } catch {
    onUnavailable()
    return unavailableApi()
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.75))
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60)
  camera.position.set(0.15, 1.75, 7.1)
  camera.lookAt(0, 0, 0)

  const portalPosition = new THREE.Vector3(2.15, 0.18, 0.55)
  const stars = createStarField(scene, { mobile })
  const solarSystem = createSolarSystem(scene, { mobile, portalPosition })
  const heroPortal = createBlackHolePortal({ position: portalPosition })
  scene.add(heroPortal.group)

  let currentStory = null
  let currentTheme = theme
  let frameHandle = 0
  let destroyed = false
  let contextAvailable = true
  let pageHidden = document.hidden
  let lastFrame = performance.now()
  let elapsedSeconds = 0

  function resize() {
    if (destroyed || !contextAvailable) return
    const parent = canvas.parentElement
    const rect = parent?.getBoundingClientRect?.() ?? canvas.getBoundingClientRect()
    const width = Math.max(1, Math.round(rect.width || canvas.clientWidth || 1))
    const height = Math.max(1, Math.round(rect.height || canvas.clientHeight || width))
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }

  function setTheme(nextTheme) {
    currentTheme = nextTheme === 'dark' ? 'dark' : 'light'
    stars.setTheme(currentTheme)
    solarSystem.setTheme(currentTheme)
    heroPortal.setTheme(currentTheme)
  }

  function setStoryState(nextState) {
    currentStory = clampStoryState(nextState, mobile)
    if (!currentStory) return

    if (reducedMotion || currentStory.reducedMotion) {
      solarSystem.setStoryState({
        ...currentStory,
        system: { scale: 1, rotationX: 0.1, rotationY: 0, lift: 0 },
        accent: { mode: 'orbit', absorption: 0 }
      })
      heroPortal.setState({ opacity: 0, scale: 0, distortion: 0, pulse: 0 })
      return
    }

    solarSystem.setStoryState(currentStory)
    heroPortal.setState(currentStory.heroPortal)
  }

  function renderFrame(now) {
    if (destroyed || !contextAvailable) return
    frameHandle = requestAnimationFrame(renderFrame)
    if (pageHidden) {
      lastFrame = now
      return
    }

    const deltaSeconds = Math.min(Math.max((now - lastFrame) / 1000, 0), 0.08)
    lastFrame = now
    elapsedSeconds += deltaSeconds
    const motionDelta = reducedMotion ? deltaSeconds * 0.06 : deltaSeconds

    stars.update(elapsedSeconds, currentStory)
    solarSystem.update(motionDelta)
    renderer.render(scene, camera)
  }

  function handleVisibility() {
    pageHidden = document.hidden
    lastFrame = performance.now()
  }

  function handleContextLost(event) {
    event.preventDefault()
    contextAvailable = false
    if (frameHandle) cancelAnimationFrame(frameHandle)
    frameHandle = 0
    onUnavailable()
  }

  document.addEventListener('visibilitychange', handleVisibility)
  canvas.addEventListener('webglcontextlost', handleContextLost, false)

  let resizeObserver = null
  if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) {
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas.parentElement)
  } else {
    window.addEventListener('resize', resize, { passive: true })
  }

  setTheme(currentTheme)
  resize()
  frameHandle = requestAnimationFrame(renderFrame)

  function destroy() {
    if (destroyed) return
    destroyed = true
    if (frameHandle) cancelAnimationFrame(frameHandle)
    frameHandle = 0
    document.removeEventListener('visibilitychange', handleVisibility)
    canvas.removeEventListener('webglcontextlost', handleContextLost, false)
    if (resizeObserver) resizeObserver.disconnect()
    else window.removeEventListener('resize', resize)
    stars.destroy()
    solarSystem.destroy()
    scene.remove(heroPortal.group)
    heroPortal.destroy()
    renderer.dispose()
    scene.clear()
  }

  return {
    available: true,
    setStoryState,
    setTheme,
    resize,
    destroy
  }
}
