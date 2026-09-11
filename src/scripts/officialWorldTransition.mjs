import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderTransitionPass } from 'three/addons/postprocessing/RenderTransitionPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

const clamp01 = value => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))

export function createOfficialWorldTransition(renderer, {
  sceneA,
  cameraA,
  sceneB,
  cameraB,
  width = 1,
  height = 1,
  bloomStrength = 0,
  bloomRadius = 0.22,
  bloomThreshold = 0.86
} = {}) {
  if (!renderer || !sceneA || !cameraA || !sceneB || !cameraB) return null

  const composer = new EffectComposer(renderer)
  const transitionPass = new RenderTransitionPass(sceneA, cameraA, sceneB, cameraB)
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(Math.max(1, width), Math.max(1, height)),
    bloomStrength,
    bloomRadius,
    bloomThreshold
  )
  const outputPass = new OutputPass()

  transitionPass.useTexture(false)
  composer.addPass(transitionPass)
  composer.addPass(bloomPass)
  composer.addPass(outputPass)
  composer.setSize(Math.max(1, width), Math.max(1, height))

  let disposed = false

  function setScenes(next = {}) {
    if (next.sceneA) transitionPass.sceneA = next.sceneA
    if (next.cameraA) transitionPass.cameraA = next.cameraA
    if (next.sceneB) transitionPass.sceneB = next.sceneB
    if (next.cameraB) transitionPass.cameraB = next.cameraB
  }

  function setTransition(value) {
    transitionPass.setTransition(clamp01(value))
  }

  function setMixTexture(texture, threshold = 0.12) {
    if (texture) {
      transitionPass.setTexture(texture)
      transitionPass.setTextureThreshold(clamp01(threshold))
      transitionPass.useTexture(true)
    } else {
      transitionPass.useTexture(false)
    }
  }

  function setBloom(value, { radius = bloomRadius, threshold = bloomThreshold } = {}) {
    bloomPass.strength = Math.max(0, Number(value) || 0)
    bloomPass.radius = clamp01(radius)
    bloomPass.threshold = clamp01(threshold)
  }

  function setSize(nextWidth, nextHeight) {
    const w = Math.max(1, Math.round(nextWidth || 1))
    const h = Math.max(1, Math.round(nextHeight || 1))
    composer.setSize(w, h)
    transitionPass.setSize(w, h)
    bloomPass.setSize(w, h)
  }

  function render(deltaTime = 0) {
    if (disposed) return
    const previousToneMapping = renderer.toneMapping
    if (bloomPass.strength > 0) renderer.toneMapping = THREE.ACESFilmicToneMapping
    composer.render(deltaTime)
    renderer.toneMapping = previousToneMapping
  }

  function dispose() {
    if (disposed) return
    disposed = true
    transitionPass.dispose()
    bloomPass.dispose()
    outputPass.dispose?.()
    composer.dispose()
  }

  return {
    setScenes,
    setTransition,
    setMixTexture,
    setBloom,
    setSize,
    render,
    dispose,
    transitionPass,
    bloomPass
  }
}
