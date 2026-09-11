import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderTransitionPass } from 'three/addons/postprocessing/RenderTransitionPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

const clamp01 = value => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))

export function getOfficialTransitionMix(direction, progress = 0) {
  const p = clamp01(progress)
  return direction === 'to-observatory' ? 1 - p : p
}

function createRadialMaskTexture(renderer, detail = {}) {
  if (typeof document === 'undefined') return null

  const rect = renderer.domElement?.getBoundingClientRect?.() ?? {
    left: 0,
    top: 0,
    width: window.innerWidth,
    height: window.innerHeight
  }
  const width = Math.max(1, rect.width || window.innerWidth || 1)
  const height = Math.max(1, rect.height || window.innerHeight || 1)
  const textureWidth = 256
  const textureHeight = Math.max(64, Math.round(textureWidth * height / width))
  const scaleX = textureWidth / width
  const scaleY = textureHeight / height
  const originX = (Number.isFinite(detail.originX) ? detail.originX - rect.left : width / 2) * scaleX
  const originY = (Number.isFinite(detail.originY) ? detail.originY - rect.top : height / 2) * scaleY

  const canvas = document.createElement('canvas')
  canvas.width = textureWidth
  canvas.height = textureHeight
  const context = canvas.getContext('2d')
  if (!context) return null

  const radius = Math.max(
    Math.hypot(originX, originY),
    Math.hypot(textureWidth - originX, originY),
    Math.hypot(originX, textureHeight - originY),
    Math.hypot(textureWidth - originX, textureHeight - originY)
  )
  const gradient = context.createRadialGradient(originX, originY, 0, originX, originY, Math.max(1, radius))
  gradient.addColorStop(0, '#000000')
  gradient.addColorStop(0.16, '#050505')
  gradient.addColorStop(0.62, '#b8b8b8')
  gradient.addColorStop(1, '#ffffff')
  context.fillStyle = gradient
  context.fillRect(0, 0, textureWidth, textureHeight)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.NoColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}

export function createWorldSceneTransition(renderer, {
  observatoryScene,
  solarScene,
  camera,
  mobile = false
} = {}) {
  if (!renderer || !observatoryScene || !solarScene || !camera) {
    return {
      setTransition() {},
      setSize() {},
      render() { return false },
      isActive() { return false },
      getDebugState() { return null },
      destroy() {}
    }
  }

  const composer = new EffectComposer(renderer)
  composer.setPixelRatio?.(renderer.getPixelRatio?.() ?? 1)

  // Official pass convention: transition=0 renders scene B, transition=1 renders scene A.
  const transitionPass = new RenderTransitionPass(solarScene, camera, observatoryScene, camera)
  transitionPass.setTextureThreshold(0.24)
  transitionPass.useTexture(true)
  composer.addPass(transitionPass)

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(1, 1),
    0,
    mobile ? 0.24 : 0.32,
    0.88
  )
  composer.addPass(bloomPass)

  const outputPass = new OutputPass()
  composer.addPass(outputPass)

  let active = false
  let currentDirection = 'none'
  let currentProgress = 0
  let maskTexture = null
  let maskKey = ''
  let destroyed = false

  function updateMask(detail = {}) {
    const rect = renderer.domElement?.getBoundingClientRect?.()
    const width = Math.max(1, Math.round(rect?.width || renderer.domElement?.clientWidth || 1))
    const height = Math.max(1, Math.round(rect?.height || renderer.domElement?.clientHeight || 1))
    const x = Math.round(Number.isFinite(detail.originX) ? detail.originX : width / 2)
    const y = Math.round(Number.isFinite(detail.originY) ? detail.originY : height / 2)
    const nextKey = `${width}:${height}:${x}:${y}`
    if (nextKey === maskKey && maskTexture) return

    const nextTexture = createRadialMaskTexture(renderer, detail)
    if (!nextTexture) return
    maskTexture?.dispose()
    maskTexture = nextTexture
    maskKey = nextKey
    transitionPass.setTexture(maskTexture)
    transitionPass.useTexture(true)
  }

  function setTransition(detail = {}) {
    if (destroyed) return
    const direction = detail.direction === 'to-solar' || detail.direction === 'to-observatory'
      ? detail.direction
      : 'none'

    if (direction === 'none' || detail.reducedMotion) {
      active = false
      currentDirection = 'none'
      currentProgress = direction === 'to-solar' ? 1 : 0
      bloomPass.strength = 0
      return
    }

    currentDirection = direction
    currentProgress = clamp01(detail.progress ?? 0)
    active = currentProgress < 0.9999
    updateMask(detail)
    transitionPass.setTransition(getOfficialTransitionMix(direction, currentProgress))

    const peak = Math.sin(Math.PI * currentProgress)
    bloomPass.strength = (mobile ? 0.08 : 0.12) * Math.max(0, peak)
  }

  function setSize(width, height) {
    if (destroyed) return
    const w = Math.max(1, Math.round(width || 1))
    const h = Math.max(1, Math.round(height || 1))
    composer.setSize(w, h)
    maskKey = ''
  }

  function render(deltaSeconds = 0) {
    if (!active || destroyed) return false
    const previousToneMapping = renderer.toneMapping
    try {
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      composer.render(Math.max(0, Number(deltaSeconds) || 0))
    } finally {
      renderer.toneMapping = previousToneMapping
    }
    return true
  }

  function isActive() {
    return active && !destroyed
  }

  function getDebugState() {
    return {
      active: isActive(),
      direction: currentDirection,
      progress: currentProgress,
      mix: getOfficialTransitionMix(currentDirection, currentProgress)
    }
  }

  function destroy() {
    if (destroyed) return
    destroyed = true
    active = false
    maskTexture?.dispose()
    maskTexture = null
    transitionPass.dispose?.()
    bloomPass.dispose?.()
    outputPass.dispose?.()
    composer.dispose?.()
  }

  return {
    setTransition,
    setSize,
    render,
    isActive,
    getDebugState,
    destroy
  }
}
