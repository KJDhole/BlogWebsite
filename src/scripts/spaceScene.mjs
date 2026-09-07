import * as THREE from 'three'
import { createStarField } from './starField.mjs'
import { createCosmicField } from './cosmicField.mjs'

function unavailableApi() {
  return {
    available: false,
    setStoryState() {},
    setTheme() {},
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

  const stars = createStarField(scene, { mobile })
  const cosmicField = createCosmicField(scene, { mobile })

  let currentStory = {
    field: { energy: 0.22, parallax: 0, drift: reducedMotion ? 0 : 0.35 },
    reducedMotion
  }
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
    cosmicField.setTheme(currentTheme)
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
    cosmicField.update(elapsedSeconds, currentStory)
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
    cosmicField.destroy()
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
