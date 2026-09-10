import * as THREE from 'three'
import { createStarField } from './starField.mjs'
import { createCosmicField } from './cosmicField.mjs'
import { createSolarField, sampleSolarTransition } from './solarField.mjs'

function clamp01(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
}

function unavailableApi() {
  return {
    available: false,
    setStoryState() {},
    setTheme() {},
    setWorld() {},
    setWorldTransition() {},
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

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 70)
  camera.position.set(0.08, 0.2, 8.25)
  camera.lookAt(0, 0, 0)

  // All visual worlds are instantiated once and share this renderer/context.
  const stars = createStarField(scene, { mobile })
  const cosmicField = createCosmicField(scene, { mobile })
  const solarField = createSolarField(scene, { mobile, reducedMotion })
  const unprojectPoint = new THREE.Vector3()
  const unprojectDirection = new THREE.Vector3()
  const worldTarget = new THREE.Vector3()

  let currentStory = {
    field: { energy: 0.22, parallax: 0, drift: reducedMotion ? 0 : 0.35 },
    reducedMotion
  }
  let currentTheme = theme
  let currentWorld = theme === 'dark' ? 'observatory' : 'solar'
  let worldMix = currentWorld === 'solar' ? 1 : 0
  let frameHandle = 0
  let destroyed = false
  let contextAvailable = true
  let pageHidden = document.hidden
  let lastFrame = performance.now()
  let elapsedSeconds = 0

  function applyStableWorldMix(value) {
    worldMix = clamp01(value)
    stars.setWorldMix(worldMix)
    solarField.setWorldMix(worldMix)
    cosmicField.group.visible = worldMix < 0.995
  }

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

  function screenOriginToWorld(originX, originY) {
    const rect = canvas.getBoundingClientRect()
    const width = Math.max(1, rect.width)
    const height = Math.max(1, rect.height)
    const nx = ((Number(originX) - rect.left) / width) * 2 - 1
    const ny = -(((Number(originY) - rect.top) / height) * 2 - 1)

    unprojectPoint.set(Number.isFinite(nx) ? nx : 0, Number.isFinite(ny) ? ny : 0, 0.5).unproject(camera)
    unprojectDirection.copy(unprojectPoint).sub(camera.position).normalize()
    const distance = Math.abs(unprojectDirection.z) > 0.0001
      ? (0 - camera.position.z) / unprojectDirection.z
      : 0
    worldTarget.copy(camera.position).add(unprojectDirection.multiplyScalar(distance))
    return worldTarget
  }

  function setTheme(nextTheme) {
    currentTheme = nextTheme === 'dark' ? 'dark' : 'light'
    stars.setTheme(currentTheme)
    cosmicField.setTheme(currentTheme)
    solarField.setTheme(currentTheme)
  }

  function setWorld(nextWorld) {
    currentWorld = nextWorld === 'observatory' ? 'observatory' : 'solar'
    stars.setTransitionState({ direction: 'none', progress: 1 })
    solarField.setTransitionState({ direction: 'none', progress: 1 })
    applyStableWorldMix(currentWorld === 'solar' ? 1 : 0)
  }

  function setWorldTransition(detail = {}) {
    const progress = clamp01(detail.progress ?? 0)
    const target = screenOriginToWorld(detail.originX, detail.originY)

    stars.setTransitionState({
      ...detail,
      progress,
      targetX: target.x,
      targetY: target.y
    })

    const solarPose = sampleSolarTransition(progress, detail.direction)
    worldMix = solarPose.mix
    cosmicField.group.visible = worldMix < 0.995
    solarField.setTransitionState({ ...detail, progress })
  }

  function setStoryState(nextState) {
    if (!nextState) return
    currentStory = nextState
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
    if (cosmicField.group.visible) cosmicField.update(elapsedSeconds, currentStory)
    solarField.update(elapsedSeconds, currentStory)
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
    stars.destroy()
    cosmicField.destroy()
    solarField.destroy()
    renderer.dispose()
    scene.clear()
  }

  return {
    available: true,
    setStoryState,
    setTheme,
    setWorld,
    setWorldTransition,
    resize,
    destroy
  }
}
