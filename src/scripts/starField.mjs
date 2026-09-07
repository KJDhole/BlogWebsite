import * as THREE from 'three'

const COUNTS = Object.freeze({
  desktop: { far: 980, mid: 420, near: 110 },
  mobile: { far: 360, mid: 145, near: 34 }
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

function createLayer({ count, radiusMin, radiusMax, size, opacity, seed, color }) {
  const rng = createRng(seed)
  const positions = new Float32Array(count * 3)

  for (let index = 0; index < count; index += 1) {
    const radius = radiusMin + (radiusMax - radiusMin) * rng()
    const theta = rng() * Math.PI * 2
    const z = (rng() * 2 - 1) * radius * 0.64
    const radial = Math.sqrt(Math.max(0, radius * radius - z * z))
    const offset = index * 3
    positions[offset] = Math.cos(theta) * radial
    positions[offset + 1] = Math.sin(theta) * radial * 0.78
    positions[offset + 2] = z
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

  const far = createLayer({
    count: counts.far,
    radiusMin: 8,
    radiusMax: 20,
    size: mobile ? 0.025 : 0.029,
    opacity: 0.38,
    seed: 1977,
    color: 0xaebbd4
  })
  const mid = createLayer({
    count: counts.mid,
    radiusMin: 5.8,
    radiusMax: 14,
    size: mobile ? 0.037 : 0.043,
    opacity: 0.54,
    seed: 4099,
    color: 0xd7e3fa
  })
  const near = createLayer({
    count: counts.near,
    radiusMin: 4.2,
    radiusMax: 9.5,
    size: mobile ? 0.052 : 0.062,
    opacity: 0.67,
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

    far.points.rotation.y = elapsedSeconds * 0.0018 * drift
    far.points.rotation.x = -0.025 + parallax * 0.01

    mid.points.rotation.y = -elapsedSeconds * 0.0042 * drift
    mid.points.rotation.x = 0.032 + parallax * 0.025

    near.points.rotation.y = elapsedSeconds * 0.0075 * drift
    near.points.rotation.z = -0.022 + parallax * 0.038

    const pulse = storyState?.reducedMotion ? 1 : 0.96 + Math.sin(elapsedSeconds * 0.31) * 0.04
    far.material.opacity = far.baseOpacity * (0.82 + energy * 0.30) * pulse
    mid.material.opacity = mid.baseOpacity * (0.82 + energy * 0.38) * pulse
    near.material.opacity = near.baseOpacity * (0.80 + energy * 0.44) * pulse
  }

  function setTheme(theme) {
    const dark = theme === 'dark'
    far.baseOpacity = dark ? 0.46 : 0.30
    mid.baseOpacity = dark ? 0.62 : 0.43
    near.baseOpacity = dark ? 0.75 : 0.51
    far.material.opacity = far.baseOpacity
    mid.material.opacity = mid.baseOpacity
    near.material.opacity = near.baseOpacity
    far.material.color.set(dark ? 0xb9c7e2 : 0x75839d)
    mid.material.color.set(dark ? 0xe0e9ff : 0x9eacc6)
    near.material.color.set(dark ? 0xf8faff : 0xc4d0e5)
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
