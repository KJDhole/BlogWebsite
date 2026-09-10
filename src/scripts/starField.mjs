import * as THREE from 'three'

const COUNTS = Object.freeze({
  desktop: { far: 1120, mid: 440, near: 96 },
  mobile: { far: 330, mid: 122, near: 28 }
})

const DEPTH_WEIGHT = Object.freeze({ far: 0.28, mid: 0.58, near: 0.90 })

function clamp01(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
}

function rangeProgress(value, start, end) {
  return clamp01((value - start) / Math.max(0.0001, end - start))
}

export function foldPoint(x, y, targetX, targetY, progress, depthWeight, out = { x: 0, y: 0 }) {
  const p = clamp01(progress)
  const weight = clamp01(depthWeight)
  if (p === 0) {
    out.x = x
    out.y = y
    return out
  }
  if (p === 1) {
    out.x = targetX
    out.y = targetY
    return out
  }

  const effective = 1 - Math.pow(1 - p, 1 + weight * 1.8)
  const dx = targetX - x
  const dy = targetY - y
  const distance = Math.hypot(dx, dy) || 1
  const normalX = -dy / distance
  const normalY = dx / distance
  const bend = Math.sin(Math.PI * effective) * distance * 0.08 * weight

  out.x = x + dx * effective + normalX * bend
  out.y = y + dy * effective + normalY * bend
  return out
}

function createRng(seed) {
  let state = seed >>> 0
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 4294967296
  }
}

function createLayer({ count, spreadX, spreadY, zMin, zMax, size, opacity, seed, color }) {
  const rng = createRng(seed)
  const positions = new Float32Array(count * 3)

  for (let index = 0; index < count; index += 1) {
    const offset = index * 3
    const edgeBias = 0.66 + rng() * 0.34
    positions[offset] = (rng() * 2 - 1) * spreadX * edgeBias
    positions[offset + 1] = (rng() * 2 - 1) * spreadY * (0.72 + rng() * 0.28)
    positions[offset + 2] = zMin + (zMax - zMin) * rng()
  }

  const basePositions = positions.slice()
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color,
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity,
    depthWrite: false
  })
  const points = new THREE.Points(geometry, material)
  return { points, geometry, material, basePositions, baseOpacity: opacity, baseSize: size, deformed: false }
}

export function createStarField(scene, { mobile = false } = {}) {
  const counts = mobile ? COUNTS.mobile : COUNTS.desktop
  const group = new THREE.Group()
  group.name = 'star-field'

  const far = createLayer({
    count: counts.far,
    spreadX: 5.1,
    spreadY: 3.75,
    zMin: -7.5,
    zMax: -2.1,
    size: mobile ? 0.031 : 0.034,
    opacity: 0.40,
    seed: 1977,
    color: 0xaebbd4
  })
  const mid = createLayer({
    count: counts.mid,
    spreadX: 3.75,
    spreadY: 2.9,
    zMin: -2.0,
    zMax: 1.7,
    size: mobile ? 0.041 : 0.047,
    opacity: 0.56,
    seed: 4099,
    color: 0xd7e3fa
  })
  const near = createLayer({
    count: counts.near,
    spreadX: 2.45,
    spreadY: 1.95,
    zMin: 1.8,
    zMax: 4.25,
    size: mobile ? 0.055 : 0.064,
    opacity: 0.69,
    seed: 8923,
    color: 0xf4f7ff
  })

  const layers = [
    { layer: far, weight: DEPTH_WEIGHT.far },
    { layer: mid, weight: DEPTH_WEIGHT.mid },
    { layer: near, weight: DEPTH_WEIGHT.near }
  ]
  const foldScratch = { x: 0, y: 0 }

  group.add(far.points, mid.points, near.points)
  scene.add(group)

  let worldMix = 0
  let transitionState = null

  function restoreLayer(layer) {
    if (!layer.deformed) return
    layer.geometry.attributes.position.array.set(layer.basePositions)
    layer.geometry.attributes.position.needsUpdate = true
    layer.material.size = layer.baseSize
    layer.deformed = false
  }

  function restoreAllLayers() {
    for (const { layer } of layers) restoreLayer(layer)
  }

  function applyFold(layer, weight, foldStrength, targetX, targetY) {
    const positions = layer.geometry.attributes.position.array
    const base = layer.basePositions
    for (let offset = 0; offset < positions.length; offset += 3) {
      foldPoint(base[offset], base[offset + 1], targetX, targetY, foldStrength, weight, foldScratch)
      positions[offset] = foldScratch.x
      positions[offset + 1] = foldScratch.y
      positions[offset + 2] = base[offset + 2]
    }
    layer.geometry.attributes.position.needsUpdate = true
    layer.deformed = foldStrength > 0
  }

  function getTransitionFrame() {
    if (!transitionState) return null
    const progress = clamp01(transitionState.progress)
    if (transitionState.direction === 'to-solar') {
      return {
        foldStrength: rangeProgress(progress, 0.08, 0.347),
        visibility: 1 - rangeProgress(progress, 0.30, 0.55)
      }
    }
    if (transitionState.direction === 'to-observatory') {
      const expansion = rangeProgress(progress, 0.36, 0.82)
      return {
        foldStrength: 1 - expansion,
        visibility: expansion
      }
    }
    return null
  }

  function update(elapsedSeconds, storyState) {
    const field = storyState?.field ?? {}
    const energy = clamp01(field.energy ?? 0.22)
    const parallax = storyState?.reducedMotion ? 0 : clamp01(field.parallax ?? 0.12)
    const drift = storyState?.reducedMotion ? 0 : clamp01(field.drift ?? 0.35)
    const transitionFrame = storyState?.reducedMotion ? null : getTransitionFrame()
    const nightVisibility = transitionFrame ? transitionFrame.visibility : 1 - clamp01(worldMix)

    if (transitionFrame) {
      far.points.rotation.z = 0
      mid.points.rotation.z = 0
      near.points.rotation.z = 0
      far.points.position.set(0, 0, 0)
      mid.points.position.set(0, 0, 0)
      near.points.position.set(0, 0, 0)
      for (const { layer, weight } of layers) {
        applyFold(
          layer,
          weight,
          transitionFrame.foldStrength,
          transitionState.targetX,
          transitionState.targetY
        )
      }
      near.material.size = near.baseSize * (1 + transitionFrame.foldStrength * (mobile ? 0.16 : 0.34))
      mid.material.size = mid.baseSize * (1 + transitionFrame.foldStrength * 0.10)
    } else {
      restoreAllLayers()
      far.points.rotation.z = elapsedSeconds * 0.0008 * drift
      far.points.position.x = -parallax * 0.025
      far.points.position.y = parallax * 0.012

      mid.points.rotation.z = -elapsedSeconds * 0.0015 * drift
      mid.points.position.x = parallax * 0.055
      mid.points.position.y = -parallax * 0.026

      near.points.rotation.z = elapsedSeconds * 0.0025 * drift
      near.points.position.x = -parallax * 0.095
      near.points.position.y = parallax * 0.048
    }

    const pulse = storyState?.reducedMotion ? 1 : 0.96 + Math.sin(elapsedSeconds * 0.31) * 0.04
    far.material.opacity = far.baseOpacity * (0.82 + energy * 0.30) * pulse * nightVisibility
    mid.material.opacity = mid.baseOpacity * (0.82 + energy * 0.38) * pulse * nightVisibility
    near.material.opacity = near.baseOpacity * (0.80 + energy * 0.44) * pulse * nightVisibility
    group.visible = nightVisibility > 0.002
  }

  function setWorldMix(value) {
    worldMix = clamp01(value)
    if (transitionState) return
    restoreAllLayers()
    const nightVisibility = 1 - worldMix
    far.material.opacity = far.baseOpacity * nightVisibility
    mid.material.opacity = mid.baseOpacity * nightVisibility
    near.material.opacity = near.baseOpacity * nightVisibility
    group.visible = nightVisibility > 0.002
  }

  function setTransitionState(detail = {}) {
    const direction = detail.direction
    const progress = clamp01(detail.progress ?? 0)
    if ((direction !== 'to-solar' && direction !== 'to-observatory') || progress >= 1) {
      transitionState = null
      restoreAllLayers()
      return
    }
    transitionState = {
      direction,
      progress,
      targetX: Number.isFinite(detail.targetX) ? detail.targetX : 0,
      targetY: Number.isFinite(detail.targetY) ? detail.targetY : 0
    }
  }

  function setTheme(theme) {
    const dark = theme === 'dark'
    far.baseOpacity = dark ? 0.50 : 0.46
    mid.baseOpacity = dark ? 0.67 : 0.62
    near.baseOpacity = dark ? 0.80 : 0.72
    far.material.color.set(dark ? 0xb9c7e2 : 0x586b8d)
    mid.material.color.set(dark ? 0xe0e9ff : 0x7186ab)
    near.material.color.set(dark ? 0xf8faff : 0x9aabca)
    if (!transitionState) setWorldMix(worldMix)
  }

  function destroy() {
    scene.remove(group)
    for (const { layer } of layers) {
      layer.geometry.dispose()
      layer.material.dispose()
    }
  }

  return { group, update, setWorldMix, setTransitionState, setTheme, destroy }
}
