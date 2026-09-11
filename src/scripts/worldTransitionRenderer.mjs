import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderTransitionPass } from 'three/addons/postprocessing/RenderTransitionPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

const clamp01 = value => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))

export function getOfficialTransitionMix(direction, progress = 0) {
  const p = clamp01(progress)
  return direction === 'to-solar' ? 1 - p : p
}

function createMaskCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 2
  return canvas
}

export function createWorldTransitionRenderer({
  renderer,
  observatoryScene,
  solarScene,
  camera
} = {}) {
  const maskCanvas = createMaskCanvas()
  const maskTexture = new THREE.CanvasTexture(maskCanvas)
  maskTexture.generateMipmaps = false
  maskTexture.minFilter = THREE.LinearFilter
  maskTexture.magFilter = THREE.LinearFilter
  maskTexture.wrapS = THREE.ClampToEdgeWrapping
  maskTexture.wrapT = THREE.ClampToEdgeWrapping

  const composer = new EffectComposer(renderer)
  const transitionPass = new RenderTransitionPass(observatoryScene, camera, solarScene, camera)
  transitionPass.setTexture(maskTexture)
  transitionPass.setTextureThreshold(0.1)
  transitionPass.useTexture(true)
  composer.addPass(transitionPass)

  const outputPass = new OutputPass()
  composer.addPass(outputPass)

  let width = 1
  let height = 1
  let direction = 'to-solar'
  let progress = 0
  let maskKey = ''

  function drawMask({ originX, originY, width: viewportWidth, height: viewportHeight } = {}) {
    const sourceWidth = Math.max(1, Number(viewportWidth) || window.innerWidth || width)
    const sourceHeight = Math.max(1, Number(viewportHeight) || window.innerHeight || height)
    const sourceX = Number.isFinite(originX) ? originX : sourceWidth / 2
    const sourceY = Number.isFinite(originY) ? originY : sourceHeight / 2
    const nextKey = `${Math.round(sourceX)}:${Math.round(sourceY)}:${Math.round(sourceWidth)}:${Math.round(sourceHeight)}`
    if (nextKey === maskKey) return
    maskKey = nextKey

    const maxDimension = 512
    const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight))
    const canvasWidth = Math.max(2, Math.round(sourceWidth * scale))
    const canvasHeight = Math.max(2, Math.round(sourceHeight * scale))
    if (maskCanvas.width !== canvasWidth) maskCanvas.width = canvasWidth
    if (maskCanvas.height !== canvasHeight) maskCanvas.height = canvasHeight

    const context = maskCanvas.getContext('2d')
    if (!context) return

    const x = clamp01(sourceX / sourceWidth) * canvasWidth
    const y = clamp01(sourceY / sourceHeight) * canvasHeight
    const radius = Math.hypot(
      Math.max(x, canvasWidth - x),
      Math.max(y, canvasHeight - y)
    )
    const gradient = context.createRadialGradient(x, y, 0, x, y, Math.max(1, radius))
    gradient.addColorStop(0, '#ffffff')
    gradient.addColorStop(0.18, '#f8f8f8')
    gradient.addColorStop(0.56, '#8d8d8d')
    gradient.addColorStop(1, '#000000')

    context.clearRect(0, 0, canvasWidth, canvasHeight)
    context.fillStyle = gradient
    context.fillRect(0, 0, canvasWidth, canvasHeight)
    maskTexture.needsUpdate = true
  }

  function setMaskOrigin({ originX, originY, width: viewportWidth, height: viewportHeight } = {}) {
    drawMask({ originX, originY, width: viewportWidth, height: viewportHeight })
  }

  function setTransition(next = {}) {
    direction = next.direction === 'to-observatory' ? 'to-observatory' : 'to-solar'
    progress = clamp01(next.progress ?? 0)
    transitionPass.setTransition(getOfficialTransitionMix(direction, progress))
  }

  function render({ world = 'observatory', transitioning = false } = {}) {
    if (transitioning && progress > 0 && progress < 1) {
      composer.render()
      return
    }
    renderer.render(world === 'solar' ? solarScene : observatoryScene, camera)
  }

  function resize(nextWidth, nextHeight) {
    width = Math.max(1, Math.round(Number(nextWidth) || 1))
    height = Math.max(1, Math.round(Number(nextHeight) || 1))
    composer.setSize(width, height)
  }

  function destroy() {
    maskTexture.dispose()
    transitionPass.dispose()
    outputPass.dispose?.()
    composer.dispose?.()
  }

  drawMask({
    originX: typeof window !== 'undefined' ? window.innerWidth / 2 : 1,
    originY: typeof window !== 'undefined' ? window.innerHeight / 2 : 1,
    width: typeof window !== 'undefined' ? window.innerWidth : 2,
    height: typeof window !== 'undefined' ? window.innerHeight : 2
  })

  return {
    setMaskOrigin,
    setTransition,
    render,
    resize,
    destroy
  }
}
