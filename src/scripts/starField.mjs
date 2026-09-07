import * as THREE from 'three'

const COUNTS = Object.freeze({
  desktop: { far: 1120, mid: 440, near: 96 },
  mobile: { far: 330, mid: 122, near: 28 }
})

function clamp01(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
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
  return { points, geometry, material, baseOpacity: opacity }
}

export function createStarField(scene, { mobile = false } = {}) {
  const counts = mobile ? COUNTS.mobile : COUNTS.desktop
  const group = new THREE.Group()
  group.name = 'star-field'

  // These layers are distributed inside the camera frustum rather than on a
  // giant spherical shell. That keeps the visual density high without adding
  // thousands of points that never reach the viewport.
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

  group.add(far.points, mid.points, near.points)
  scene.add(group)

  function update(elapsedSeconds, storyState) {
    const field = storyState?.field ?? {}
    const energy = clamp01(field.energy ?? 0.22)
    const parallax = storyState?.reducedMotion ? 0 : clamp01(field.parallax ?? 0.12)
    const drift = storyState?.reducedMotion ? 0 : clamp01(field.drift ?? 0.35)

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
    far.material.opacity = far.baseOpacity * (0.82 + energy * 0.30) * pulse
    mid.material.opacity = mid.baseOpacity * (0.82 + energy * 0.38) * pulse
    near.material.opacity = near.baseOpacity * (0.80 + energy * 0.44) * pulse
  }

  function setTheme(theme) {
    const dark = theme === 'dark'
    far.baseOpacity = dark ? 0.50 : 0.36
    mid.baseOpacity = dark ? 0.67 : 0.50
    near.baseOpacity = dark ? 0.80 : 0.60
    far.material.opacity = far.baseOpacity
    mid.material.opacity = mid.baseOpacity
    near.material.opacity = near.baseOpacity
    far.material.color.set(dark ? 0xb9c7e2 : 0x7385a2)
    mid.material.color.set(dark ? 0xe0e9ff : 0x9aacc9)
    near.material.color.set(dark ? 0xf8faff : 0xc8d5eb)
  }

  function destroy() {
    scene.remove(group)
    for (const layer of [far, mid, near]) {
      layer.geometry.dispose()
      layer.material.dispose()
    }
  }

  return { update, setTheme, destroy }
}
