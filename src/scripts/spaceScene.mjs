import * as THREE from 'three'
import { createStarField } from './starField.mjs'
import { createCosmicField } from './cosmicField.mjs'
import { createSolarField } from './solarField.mjs'
import { createOfficialWorldTransition } from './officialWorldTransition.mjs'

function clamp01(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
}

function getBloomStrength(detail = {}, reducedMotion = false) {
  if (reducedMotion) return 0
  const phaseProgress = clamp01(detail.phaseProgress ?? 0)

  switch (detail.phase) {
    case 'ignition':
      return 0.18 + phaseProgress * 0.48
    case 'convergence':
      return 0.66 + phaseProgress * 0.16
    case 'layout-release':
      return 0.82
    case 'radiation':
      return 0.82 - phaseProgress * 0.50
    case 'solar-arrival':
      return 0.32 * (1 - phaseProgress)
    default:
      return 0
  }
}

function unavailableApi() {
  return {
    available: false,
    setStoryState() {},
    setTheme() {},
    setWorld() {},
    setWorldTransition() {},
    getDebugState() { return null },
    resize() {},
    destroy() {}
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

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.2 : 1.65))
  renderer.setClearColor(0x000000, 0)

  const observatoryScene = new THREE.Scene()
  const solarScene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 70)
  camera.position.set(0.08, 0.2, 8.25)
  camera.lookAt(0, 0, 0)

  // The two visual worlds are separate scenes but share one renderer, camera and RAF lifecycle.
  const stars = createStarField(observatoryScene, { mobile, reducedMotion })
  const cosmicField = createCosmicField(observatoryScene, { mobile })
  const solarField = createSolarField(solarScene, { mobile, reducedMotion })
  stars.setWorldMix(0)
  solarField.setWorldMix(1)

  const officialTransition = createOfficialWorldTransition(renderer, {
    sceneA: observatoryScene,
    cameraA: camera,
    sceneB: solarScene,
    cameraB: camera,
    bloomStrength: 0,
    bloomRadius: mobile ? 0.16 : 0.22,
    bloomThreshold: 0.86
  })

  const targetNdc = new THREE.Vector3()
  const targetWorld = new THREE.Vector3()
  const targetDirection = new THREE.Vector3()

  let currentStory = {
    field: { energy: 0.22, parallax: 0, drift: reducedMotion ? 0 : 0.35 },
    reducedMotion
  }
  let currentTheme = theme
  let currentWorld = theme === 'dark' ? 'observatory' : 'solar'
  let transitionActive = false
  let transitionRatio = currentWorld === 'observatory' ? 1 : 0
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
    officialTransition?.setSize(width, height)
  }

  function getTransitionTarget(detail = {}) {
    const parent = canvas.parentElement
    const rect = parent?.getBoundingClientRect?.() ?? canvas.getBoundingClientRect()
    const width = Math.max(1, rect.width || canvas.clientWidth || 1)
    const height = Math.max(1, rect.height || canvas.clientHeight || 1)
    const originX = Number.isFinite(detail.originX) ? detail.originX : rect.left + width / 2
    const originY = Number.isFinite(detail.originY) ? detail.originY : rect.top + height / 2
    const ndcX = ((originX - rect.left) / width) * 2 - 1
    const ndcY = -(((originY - rect.top) / height) * 2 - 1)

    targetNdc.set(ndcX, ndcY, 0.5).unproject(camera)
    targetDirection.copy(targetNdc).sub(camera.position).normalize()
    const distance = Math.abs(targetDirection.z) > 0.0001
      ? (0 - camera.position.z) / targetDirection.z
      : 0
    targetWorld.copy(camera.position).addScaledVector(targetDirection, distance)
    return targetWorld
  }

  function setTheme(nextTheme) {
    currentTheme = nextTheme === 'dark' ? 'dark' : 'light'
    stars.setTheme(currentTheme)
    cosmicField.setTheme(currentTheme)
    solarField.setTheme(currentTheme)
  }

  function setWorld(nextWorld) {
    currentWorld = nextWorld === 'observatory' ? 'observatory' : 'solar'
    transitionRatio = currentWorld === 'observatory' ? 1 : 0
    if (!transitionActive) {
      officialTransition?.setTransition(transitionRatio)
      officialTransition?.setBloom(0)
    }
  }

  function setWorldTransition(detail = {}) {
    const progress = clamp01(detail.progress ?? 0)
    const direction = detail.direction === 'to-solar' || detail.direction === 'to-observatory'
      ? detail.direction
      : null
    const target = getTransitionTarget(detail)

    stars.setTransitionState({
      ...detail,
      targetX: target.x,
      targetY: target.y,
      targetZ: 0
    })
    solarField.setTransitionState(detail)

    if (!direction) {
      transitionActive = false
      officialTransition?.setBloom(0)
      return
    }

    transitionRatio = direction === 'to-solar' ? 1 - progress : progress
    transitionActive = progress < 0.999 && !reducedMotion
    officialTransition?.setTransition(transitionRatio)
    officialTransition?.setBloom(getBloomStrength(detail, reducedMotion))

    if (!transitionActive) officialTransition?.setBloom(0)
  }

  function setStoryState(nextState) {
    if (!nextState) return
    currentStory = nextState
  }

  function getDebugState() {
    return {
      world: currentWorld,
      worldMix: currentWorld === 'solar' ? 1 : 0,
      transitionActive,
      transitionRatio,
      stars: stars.getDebugState?.() ?? null
    }
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
    elapsedSeconds += reducedMotion ? deltaSeconds * 0.03 : deltaSeconds

    stars.update(elapsedSeconds, currentStory)
    cosmicField.update(elapsedSeconds, currentStory)
    solarField.update(elapsedSeconds, currentStory)

    if (transitionActive && officialTransition) {
      officialTransition.render(deltaSeconds)
    } else {
      renderer.render(currentWorld === 'solar' ? solarScene : observatoryScene, camera)
    }
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
  setWorld(currentWorld)
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
    officialTransition?.dispose()
    stars.destroy()
    cosmicField.destroy()
    solarField.destroy()
    renderer.dispose()
    observatoryScene.clear()
    solarScene.clear()
  }

  return {
    available: true,
    setStoryState,
    setTheme,
    setWorld,
    setWorldTransition,
    getDebugState,
    resize,
    destroy
  }
}
