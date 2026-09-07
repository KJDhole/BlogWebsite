import * as THREE from 'three'

const TAU = Math.PI * 2

function clamp01(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
}

function createRadialTexture(size = 64) {
  const data = new Uint8Array(size * size * 4)
  const center = (size - 1) / 2
  const maxRadius = Math.max(center, 1)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x - center) / maxRadius
      const dy = (y - center) / maxRadius
      const radius = Math.sqrt(dx * dx + dy * dy)
      const edge = clamp01(1 - radius)
      const alpha = Math.pow(edge, 2.6)
      const offset = (y * size + x) * 4
      data[offset] = 255
      data[offset + 1] = 255
      data[offset + 2] = 255
      data[offset + 3] = Math.round(alpha * 255)
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.needsUpdate = true
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  return texture
}

function createNebula(texture, { color, opacity, position, scale }) {
  const material = new THREE.SpriteMaterial({
    map: texture,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
  const sprite = new THREE.Sprite(material)
  sprite.position.set(...position)
  sprite.scale.set(scale[0], scale[1], 1)
  return { sprite, material, baseOpacity: opacity, basePosition: sprite.position.clone() }
}

function createGravityArc({
  radiusX,
  radiusY,
  start,
  end,
  position,
  rotation = 0,
  color = 0x96a9cf,
  opacity = 0.16,
  segments = 84
}) {
  const points = []
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments
    const angle = start + (end - start) * t
    points.push(new THREE.Vector3(
      Math.cos(angle) * radiusX,
      Math.sin(angle) * radiusY,
      Math.sin(angle * 0.7) * 0.08
    ))
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false
  })
  const line = new THREE.Line(geometry, material)
  line.position.set(...position)
  line.rotation.z = rotation
  return { line, geometry, material, baseOpacity: opacity, basePosition: line.position.clone() }
}

export function createCosmicField(scene, { mobile = false } = {}) {
  const group = new THREE.Group()
  group.name = 'cosmic-field'

  const glowTexture = createRadialTexture(mobile ? 48 : 64)
  const nebulaA = createNebula(glowTexture, {
    color: 0x5878be,
    opacity: mobile ? 0.12 : 0.16,
    position: [-1.75, 0.95, -2.7],
    scale: mobile ? [3.4, 2.1] : [4.4, 2.7]
  })
  const nebulaB = createNebula(glowTexture, {
    color: 0x684d91,
    opacity: mobile ? 0.07 : 0.10,
    position: [1.95, -1.15, -3.4],
    scale: mobile ? [2.6, 1.8] : [3.5, 2.3]
  })
  const nebulaC = createNebula(glowTexture, {
    color: 0xbd6b51,
    opacity: mobile ? 0.025 : 0.038,
    position: [2.75, 1.48, -4.0],
    scale: mobile ? [1.7, 1.1] : [2.4, 1.5]
  })

  const arcA = createGravityArc({
    radiusX: 2.9,
    radiusY: 0.82,
    start: Math.PI * 1.03,
    end: Math.PI * 1.74,
    position: [0.08, -0.08, -0.7],
    rotation: -0.17,
    opacity: mobile ? 0.09 : 0.14
  })
  const arcB = createGravityArc({
    radiusX: 2.25,
    radiusY: 0.58,
    start: Math.PI * 0.08,
    end: Math.PI * 0.71,
    position: [0.68, 0.18, -1.25],
    rotation: 0.20,
    opacity: mobile ? 0.07 : 0.11
  })
  const arcC = createGravityArc({
    radiusX: 3.65,
    radiusY: 1.12,
    start: Math.PI * 1.33,
    end: Math.PI * 1.77,
    position: [-0.92, 0.72, -2.2],
    rotation: 0.08,
    opacity: mobile ? 0.035 : 0.065
  })

  const planetGeometry = new THREE.SphereGeometry(mobile ? 0.42 : 0.58, mobile ? 18 : 24, mobile ? 12 : 16)
  const planetMaterial = new THREE.MeshBasicMaterial({
    color: 0x101b35,
    transparent: true,
    opacity: mobile ? 0.11 : 0.16,
    depthWrite: false
  })
  const distantPlanet = new THREE.Mesh(planetGeometry, planetMaterial)
  distantPlanet.position.set(-3.05, -1.72, -4.7)
  distantPlanet.scale.set(1, 0.94, 1)

  group.add(
    nebulaA.sprite,
    nebulaB.sprite,
    nebulaC.sprite,
    arcA.line,
    arcB.line,
    arcC.line,
    distantPlanet
  )
  scene.add(group)

  const nebulas = [nebulaA, nebulaB, nebulaC]
  const arcs = [arcA, arcB, arcC]

  function update(elapsedSeconds, storyState) {
    const field = storyState?.field ?? {}
    const energy = clamp01(field.energy ?? 0.22)
    const parallax = clamp01(field.parallax ?? 0.12)
    const drift = clamp01(field.drift ?? 0.35)
    const motion = storyState?.reducedMotion ? 0 : drift

    group.rotation.z = Math.sin(elapsedSeconds * 0.055) * 0.008 * motion
    group.position.x = (parallax - 0.2) * (mobile ? 0.055 : 0.11)
    group.position.y = Math.sin(elapsedSeconds * 0.09) * (mobile ? 0.016 : 0.03) * motion

    nebulas.forEach((nebula, index) => {
      const phase = elapsedSeconds * (0.07 + index * 0.018) + index * 1.8
      nebula.sprite.position.x = nebula.basePosition.x + Math.sin(phase) * (mobile ? 0.025 : 0.055) * motion
      nebula.sprite.position.y = nebula.basePosition.y + Math.cos(phase * 0.83) * (mobile ? 0.018 : 0.042) * motion
      nebula.material.opacity = nebula.baseOpacity * (0.78 + energy * 0.62)
    })

    arcs.forEach((arc, index) => {
      arc.line.position.x = arc.basePosition.x + (parallax - 0.25) * (0.035 + index * 0.018)
      arc.material.opacity = arc.baseOpacity * (0.72 + energy * 0.78)
    })

    planetMaterial.opacity = (mobile ? 0.085 : 0.13) * (0.72 + energy * 0.42)
  }

  function setTheme(theme) {
    const dark = theme === 'dark'
    nebulaA.material.color.set(dark ? 0x6d8fd8 : 0x6980ad)
    nebulaB.material.color.set(dark ? 0x775ba5 : 0x756985)
    nebulaC.material.color.set(dark ? 0xd17a5d : 0xa77f70)
    arcA.material.color.set(dark ? 0xa8bde8 : 0x8190ad)
    arcB.material.color.set(dark ? 0x849ac9 : 0x74849f)
    arcC.material.color.set(dark ? 0x7388b6 : 0x72809a)
    planetMaterial.color.set(dark ? 0x0a1227 : 0x26334d)
    const themeScale = dark ? 1 : 0.72
    nebulas.forEach(nebula => { nebula.material.opacity = nebula.baseOpacity * themeScale })
    arcs.forEach(arc => { arc.material.opacity = arc.baseOpacity * themeScale })
  }

  function destroy() {
    scene.remove(group)
    for (const arc of arcs) {
      arc.geometry.dispose()
      arc.material.dispose()
    }
    for (const nebula of nebulas) nebula.material.dispose()
    planetGeometry.dispose()
    planetMaterial.dispose()
    glowTexture.dispose()
  }

  return { group, update, setTheme, destroy }
}
