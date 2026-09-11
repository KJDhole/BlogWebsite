import * as THREE from 'three'

const COUNTS = Object.freeze({
  desktop: { far: 1120, mid: 440, near: 96 },
  mobile: { far: 330, mid: 122, near: 28 }
})

const FOLD_STRENGTH = Object.freeze({ far: 0.32, mid: 0.66, near: 1 })

function clamp01(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
}

function smooth01(value) {
  const t = clamp01(value)
  return t * t * (3 - 2 * t)
}

export function getLayerFoldStrength(layer) {
  return FOLD_STRENGTH[layer] ?? 0
}

export function sampleFoldPoint(base, target, progress, {
  strength = 1,
  bend = 0.5,
  direction = 'to-solar'
} = {}) {
  const t = clamp01(progress)
  if (t === 0) return { x: base.x, y: base.y, z: base.z }
  if (t === 1) return { x: target.x, y: target.y, z: target.z }

  const dx = target.x - base.x
  const dy = target.y - base.y
  const distance = Math.max(0.0001, Math.hypot(dx, dy))
  const perpendicularX = -dy / distance
  const perpendicularY = dx / distance
  const directionCurve = direction === 'to-observatory' ? -0.72 : 1
  const arc = Math.sin(Math.PI * t) * distance * 0.15 * strength * bend * directionCurve

  return {
    x: base.x + dx * t + perpendicularX * arc,
    y: base.y + dy * t + perpendicularY * arc,
    z: base.z + (target.z - base.z) * t + Math.sin(Math.PI * t) * 0.08 * strength
  }
}

export function getStarTransitionFrame({ direction, progress }) {
  const p = clamp01(progress)

  if (direction === 'to-solar') {
    return {
      fold: smooth01((p - 0.08) / 0.27),
      visibility: {
        far: 1 - smooth01((p - 0.20) / 0.22),
        mid: 1 - smooth01((p - 0.26) / 0.25),
        near: 1 - smooth01((p - 0.31) / 0.28)
      }
    }
  }

  if (direction === 'to-observatory') {
    return {
      fold: 1 - smooth01((p - 0.30) / 0.40),
      visibility: {
        far: smooth01((p - 0.24) / 0.30),
        mid: smooth01((p - 0.29) / 0.32),
        near: smooth01((p - 0.34) / 0.34)
      }
    }
  }

  return { fold: 0, visibility: { far: 1, mid: 1, near: 1 } }
}

function createRng(seed) {
  let state = seed >>> 0
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 4294967296
  }
}

function createLayer({ name, count, spreadX, spreadY, zMin, zMax, size, opacity, seed, color }) {
  const rng = createRng(seed)
  const positions = new Float32Array(count * 3)
  const bends = new Float32Array(count)

  for (let index = 0; index < count; index += 1) {
    const offset = index * 3
    const edgeBias = 0.66 + rng() * 0.34
    positions[offset] = (rng() * 2 - 1) * spreadX * edgeBias
    positions[offset + 1] = (rng() * 2 - 1) * spreadY * (0.72 + rng() * 0.28)
    positions[offset + 2] = zMin + (zMax - zMin) * rng()
    bends[index] = (rng() < 0.5 ? -1 : 1) * (0.72 + rng() * 0.56)
  }

  const basePositions = positions.slice()
  const geometry = new THREE.BufferGeometry()
  const positionAttribute = new THREE.BufferAttribute(positions, 3)
  positionAttribute.setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute('position', positionAttribute)
  const material = new THREE.PointsMaterial({
    color,
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity,
    depthWrite: false
  })
  const points = new THREE.Points(geometry, material)
  return {
    name,
    count,
    points,
    geometry,
    material,
    positionAttribute,
    positions,
    basePositions,
    bends,
    baseOpacity: opacity,
    foldStrength: getLayerFoldStrength(name)
  }
}

function createNearStreaks(count, mobile) {
  const positions = new Float32Array(count * 6)
  const geometry = new THREE.BufferGeometry()
  const attribute = new THREE.BufferAttribute(positions, 3)
  attribute.setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute('position', attribute)
  const material = new THREE.LineBasicMaterial({
    color: 0xdbe8ff,
    transparent: true,
    opacity: 0,
    depthWrite: false
  })
  const lines = new THREE.LineSegments(geometry, material)
  lines.name = 'near-star-fold-streaks'
  lines.visible = false
  material.opacity = mobile ? 0.10 : 0.16
  return { positions, geometry, attribute, material, lines }
}

function writeLayerFold(layer, target, fold, direction) {
  const positions = layer.positions
  const base = layer.basePositions
  const strength = layer.foldStrength
  const directionCurve = direction === 'to-observatory' ? -0.72 : 1
  const t = clamp01(fold)
  const arcPhase = Math.sin(Math.PI * t)

  for (let index = 0; index < layer.count; index += 1) {
    const offset = index * 3
    const baseX = base[offset]
    const baseY = base[offset + 1]
    const baseZ = base[offset + 2]
    const dx = target.x - baseX
    const dy = target.y - baseY
    const distance = Math.max(0.0001, Math.hypot(dx, dy))
    const arc = arcPhase * distance * 0.15 * strength * layer.bends[index] * directionCurve

    positions[offset] = baseX + dx * t + (-dy / distance) * arc
    positions[offset + 1] = baseY + dy * t + (dx / distance) * arc
    positions[offset + 2] = baseZ + (target.z - baseZ) * t + arcPhase * 0.08 * strength
  }

  layer.positionAttribute.needsUpdate = true
}

function restoreLayer(layer) {
  layer.positions.set(layer.basePositions)
  layer.positionAttribute.needsUpdate = true
}

export function createStarField(scene, { mobile = false, reducedMotion = false } = {}) {
  const counts = mobile ? COUNTS.mobile : COUNTS.desktop
  const group = new THREE.Group()
  group.name = 'star-field'

  const far = createLayer({
    name: 'far',
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
    name: 'mid',
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
    name: 'near',
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
  const streaks = createNearStreaks(counts.near, mobile)

  group.add(far.points, mid.points, near.points, streaks.lines)
  scene.add(group)

  let worldMix = 0
  let transitionActive = false
  let transitionDirection = 'none'
  let transitionFrame = getStarTransitionFrame({ direction: 'none', progress: 0 })
  const transitionTarget = { x: 4, y: 3, z: 0 }

  function setStableOpacity(layer, visibility = 1) {
    layer.material.opacity = layer.baseOpacity * clamp01(visibility)
  }

  function updateStreaks() {
    const visible = transitionActive
      && transitionDirection === 'to-solar'
      && transitionFrame.fold > 0.58
      && transitionFrame.visibility.near > 0.03
      && !reducedMotion

    streaks.lines.visible = visible
    if (!visible) {
      streaks.material.opacity = 0
      return
    }

    const trailStrength = smooth01((transitionFrame.fold - 0.58) / 0.35)
    const opacity = (mobile ? 0.11 : 0.18) * trailStrength * transitionFrame.visibility.near
    streaks.material.opacity = opacity
    const source = near.positions

    for (let index = 0; index < near.count; index += 1) {
      const starOffset = index * 3
      const lineOffset = index * 6
      const x = source[starOffset]
      const y = source[starOffset + 1]
      const z = source[starOffset + 2]
      const dx = x - transitionTarget.x
      const dy = y - transitionTarget.y
      const length = Math.max(0.0001, Math.hypot(dx, dy))
      const trail = (mobile ? 0.045 : 0.075) + trailStrength * (mobile ? 0.045 : 0.085)

      streaks.positions[lineOffset] = x
      streaks.positions[lineOffset + 1] = y
      streaks.positions[lineOffset + 2] = z
      streaks.positions[lineOffset + 3] = x + (dx / length) * trail
      streaks.positions[lineOffset + 4] = y + (dy / length) * trail
      streaks.positions[lineOffset + 5] = z
    }
    streaks.attribute.needsUpdate = true
  }

  function applyTransitionGeometry() {
    if (!transitionActive || reducedMotion) return
    for (const layer of [far, mid, near]) {
      writeLayerFold(layer, transitionTarget, transitionFrame.fold, transitionDirection)
      setStableOpacity(layer, transitionFrame.visibility[layer.name])
    }
    group.visible = Math.max(
      transitionFrame.visibility.far,
      transitionFrame.visibility.mid,
      transitionFrame.visibility.near
    ) > 0.002
    updateStreaks()
  }

  function update(elapsedSeconds, storyState) {
    if (transitionActive && !reducedMotion) {
      far.points.rotation.z = 0
      mid.points.rotation.z = 0
      near.points.rotation.z = 0
      far.points.position.set(0, 0, 0)
      mid.points.position.set(0, 0, 0)
      near.points.position.set(0, 0, 0)
      applyTransitionGeometry()
      return
    }

    const field = storyState?.field ?? {}
    const energy = clamp01(field.energy ?? 0.22)
    const parallax = storyState?.reducedMotion ? 0 : clamp01(field.parallax ?? 0.12)
    const drift = storyState?.reducedMotion ? 0 : clamp01(field.drift ?? 0.35)
    const nightVisibility = 1 - clamp01(worldMix)

    far.points.rotation.z = elapsedSeconds * 0.0008 * drift
    far.points.position.x = -parallax * 0.025
    far.points.position.y = parallax * 0.012

    mid.points.rotation.z = -elapsedSeconds * 0.0015 * drift
    mid.points.position.x = parallax * 0.055
    mid.points.position.y = -parallax * 0.026

    near.points.rotation.z = elapsedSeconds * 0.0025 * drift
    near.points.position.x = -parallax * 0.095
    near.points.position.y = parallax * 0.048

    const pulse = storyState?.reducedMotion ? 1 : 0.96 + Math.sin(elapsedSeconds * 0.31) * 0.04
    far.material.opacity = far.baseOpacity * (0.82 + energy * 0.30) * pulse * nightVisibility
    mid.material.opacity = mid.baseOpacity * (0.82 + energy * 0.38) * pulse * nightVisibility
    near.material.opacity = near.baseOpacity * (0.80 + energy * 0.44) * pulse * nightVisibility
    streaks.lines.visible = false
    streaks.material.opacity = 0
    group.visible = nightVisibility > 0.002
  }

  function setTransitionState(detail = {}) {
    const direction = detail.direction === 'to-solar' || detail.direction === 'to-observatory'
      ? detail.direction
      : 'none'
    const progress = clamp01(detail.progress ?? 0)

    if (Number.isFinite(detail.targetX)) transitionTarget.x = detail.targetX
    if (Number.isFinite(detail.targetY)) transitionTarget.y = detail.targetY
    if (Number.isFinite(detail.targetZ)) transitionTarget.z = detail.targetZ

    if (direction === 'none') {
      transitionActive = false
      transitionDirection = 'none'
      streaks.lines.visible = false
      return
    }

    transitionDirection = direction
    transitionFrame = getStarTransitionFrame({ direction, progress })
    transitionActive = progress < 0.999

    if (!transitionActive) {
      worldMix = direction === 'to-solar' ? 1 : 0
      if (direction === 'to-observatory') {
        for (const layer of [far, mid, near]) restoreLayer(layer)
      }
      streaks.lines.visible = false
      streaks.material.opacity = 0
      return
    }

    applyTransitionGeometry()
  }

  function setWorldMix(value) {
    worldMix = clamp01(value)
    if (transitionActive) return
    const nightVisibility = 1 - worldMix
    far.material.opacity = far.baseOpacity * nightVisibility
    mid.material.opacity = mid.baseOpacity * nightVisibility
    near.material.opacity = near.baseOpacity * nightVisibility
    streaks.lines.visible = false
    group.visible = nightVisibility > 0.002
  }

  function setTheme(theme) {
    const dark = theme === 'dark'
    far.baseOpacity = dark ? 0.50 : 0.46
    mid.baseOpacity = dark ? 0.67 : 0.62
    near.baseOpacity = dark ? 0.80 : 0.72
    far.material.color.set(dark ? 0xb9c7e2 : 0x586b8d)
    mid.material.color.set(dark ? 0xe0e9ff : 0x7186ab)
    near.material.color.set(dark ? 0xf8faff : 0x9aabca)
    streaks.material.color.set(dark ? 0xdbe8ff : 0x7892bd)
    if (!transitionActive) setWorldMix(worldMix)
  }

  function getDebugState() {
    return {
      active: transitionActive,
      direction: transitionDirection,
      fold: transitionFrame.fold,
      visibility: { ...transitionFrame.visibility },
      target: { ...transitionTarget }
    }
  }

  function destroy() {
    scene.remove(group)
    for (const layer of [far, mid, near]) {
      layer.geometry.dispose()
      layer.material.dispose()
    }
    streaks.geometry.dispose()
    streaks.material.dispose()
  }

  return {
    group,
    update,
    setWorldMix,
    setTheme,
    setTransitionState,
    getDebugState,
    destroy
  }
}
