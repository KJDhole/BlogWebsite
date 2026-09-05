import * as THREE from 'three'

const COUNTS = Object.freeze({
  desktop: { far: 900, mid: 360, near: 90 },
  mobile: { far: 420, mid: 170, near: 42 }
})

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
    const z = (rng() * 2 - 1) * radius * 0.58
    const radial = Math.sqrt(Math.max(0, radius * radius - z * z))
    const offset = index * 3
    positions[offset] = Math.cos(theta) * radial
    positions[offset + 1] = Math.sin(theta) * radial * 0.74
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
  return { points, geometry, material }
}

export function createStarField(scene, { mobile = false } = {}) {
  const counts = mobile ? COUNTS.mobile : COUNTS.desktop
  const group = new THREE.Group()
  group.name = 'star-field'

  const far = createLayer({
    count: counts.far,
    radiusMin: 8,
    radiusMax: 18,
    size: mobile ? 0.028 : 0.032,
    opacity: 0.42,
    seed: 1977,
    color: 0xbcc8dc
  })
  const mid = createLayer({
    count: counts.mid,
    radiusMin: 6,
    radiusMax: 13,
    size: mobile ? 0.04 : 0.047,
    opacity: 0.58,
    seed: 4099,
    color: 0xdce7ff
  })
  const near = createLayer({
    count: counts.near,
    radiusMin: 4.5,
    radiusMax: 9,
    size: mobile ? 0.055 : 0.066,
    opacity: 0.68,
    seed: 8923,
    color: 0xf2f5ff
  })

  group.add(far.points, mid.points, near.points)
  scene.add(group)

  function update(elapsedSeconds, storyState) {
    const compact = storyState?.system?.scale ? 1 - storyState.system.scale : 0
    far.points.rotation.y = elapsedSeconds * 0.003
    far.points.rotation.x = -0.025 + compact * 0.015
    mid.points.rotation.y = -elapsedSeconds * 0.006
    mid.points.rotation.x = 0.035 + compact * 0.025
    near.points.rotation.y = elapsedSeconds * 0.009
    near.points.rotation.z = -0.025 + compact * 0.035
  }

  function setTheme(theme) {
    const dark = theme === 'dark'
    far.material.opacity = dark ? 0.48 : 0.34
    mid.material.opacity = dark ? 0.64 : 0.48
    near.material.opacity = dark ? 0.74 : 0.56
    far.material.color.set(dark ? 0xbcc8dc : 0x8290a7)
    mid.material.color.set(dark ? 0xdce7ff : 0xa7b6d1)
    near.material.color.set(dark ? 0xf2f5ff : 0xcbd7eb)
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
