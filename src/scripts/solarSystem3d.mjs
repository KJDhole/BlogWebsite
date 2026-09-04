import * as THREE from 'three'

const TAU = Math.PI * 2
const ORBITS = Object.freeze({
  inner: { radius: 0.92, inclination: 0.14, speed: 0.72 },
  middle: { radius: 1.52, inclination: -0.19, speed: -0.43 },
  accent: { radius: 2.35, inclination: 0.24, speed: 0.31 }
})

function createOrbitRing(radius, inclination, opacity = 0.28) {
  const points = []
  for (let i = 0; i < 128; i += 1) {
    const angle = i / 128 * TAU
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius))
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({
    color: 0x8794a9,
    transparent: true,
    opacity,
    depthWrite: false
  })
  const ring = new THREE.LineLoop(geometry, material)
  ring.rotation.x = inclination
  return { ring, geometry, material }
}

function createPlanet(radius, color) {
  const geometry = new THREE.SphereGeometry(radius, 24, 18)
  const material = new THREE.MeshBasicMaterial({ color })
  const mesh = new THREE.Mesh(geometry, material)
  return { mesh, geometry, material }
}

function placeOrbitalBody(mesh, angle, orbit) {
  const x = Math.cos(angle) * orbit.radius
  const z = Math.sin(angle) * orbit.radius
  const y = Math.sin(angle) * Math.sin(orbit.inclination) * orbit.radius
  mesh.position.set(x, y, z)
}

export function createSolarSystem(scene, { mobile = false, portalPosition } = {}) {
  const group = new THREE.Group()
  group.name = 'solar-system'

  const sunGeometry = new THREE.SphereGeometry(mobile ? 0.17 : 0.19, 30, 22)
  const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xe8edf4 })
  const sun = new THREE.Mesh(sunGeometry, sunMaterial)
  const sunHaloGeometry = new THREE.SphereGeometry(mobile ? 0.24 : 0.27, 24, 18)
  const sunHaloMaterial = new THREE.MeshBasicMaterial({
    color: 0xb9c9e4,
    transparent: true,
    opacity: 0.09,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
  const sunHalo = new THREE.Mesh(sunHaloGeometry, sunHaloMaterial)
  group.add(sunHalo, sun)

  const innerRing = createOrbitRing(ORBITS.inner.radius, ORBITS.inner.inclination, 0.22)
  const middleRing = createOrbitRing(ORBITS.middle.radius, ORBITS.middle.inclination, 0.25)
  const accentRing = createOrbitRing(ORBITS.accent.radius, ORBITS.accent.inclination, 0.32)
  group.add(innerRing.ring, middleRing.ring, accentRing.ring)

  const innerPlanet = createPlanet(mobile ? 0.055 : 0.064, 0x8791a2)
  const middlePlanet = createPlanet(mobile ? 0.066 : 0.075, 0xa7afbb)
  const accentPlanet = createPlanet(mobile ? 0.105 : 0.118, 0xff7545)
  accentPlanet.mesh.name = 'accentPlanet'
  group.add(innerPlanet.mesh, middlePlanet.mesh, accentPlanet.mesh)

  let innerAngle = 0.44
  let middleAngle = 3.3
  let accentAngle = 5.5
  let absorptionStartAngle = null
  let storyState = null
  const capturePoint = portalPosition?.clone?.() ?? new THREE.Vector3(2.15, 0.18, 0.55)

  placeOrbitalBody(innerPlanet.mesh, innerAngle, ORBITS.inner)
  placeOrbitalBody(middlePlanet.mesh, middleAngle, ORBITS.middle)
  placeOrbitalBody(accentPlanet.mesh, accentAngle, ORBITS.accent)
  scene.add(group)

  function update(deltaSeconds) {
    const delta = Math.min(Math.max(deltaSeconds || 0, 0), 0.08)
    innerAngle += ORBITS.inner.speed * delta
    middleAngle += ORBITS.middle.speed * delta
    placeOrbitalBody(innerPlanet.mesh, innerAngle, ORBITS.inner)
    placeOrbitalBody(middlePlanet.mesh, middleAngle, ORBITS.middle)

    const mode = storyState?.accent?.mode ?? 'orbit'
    if (mode === 'orbit') {
      absorptionStartAngle = null
      accentAngle += ORBITS.accent.speed * delta
      placeOrbitalBody(accentPlanet.mesh, accentAngle, ORBITS.accent)
      accentPlanet.mesh.visible = true
      accentPlanet.mesh.scale.setScalar(1)
      return
    }

    if (mode === 'absorbing') {
      if (absorptionStartAngle === null) absorptionStartAngle = accentAngle
      const absorption = Math.min(1, Math.max(0, storyState?.accent?.absorption ?? 0))
      const angle = absorptionStartAngle + absorption * Math.PI * 2.2
      const radius = ORBITS.accent.radius * (1 - absorption) * (1 - 0.35 * absorption)
      accentPlanet.mesh.position.set(
        capturePoint.x + Math.cos(angle) * radius,
        capturePoint.y + Math.sin(angle * 0.72) * radius * 0.24,
        capturePoint.z + Math.sin(angle) * radius * 0.48
      )
      const shrink = Math.max(0.02, 1 - absorption * 0.98)
      const stretch = 1 + Math.sin(absorption * Math.PI) * 0.55
      accentPlanet.mesh.scale.set(shrink * stretch, shrink * 0.82, shrink)
      accentPlanet.mesh.visible = absorption < 0.999
      return
    }

    accentPlanet.mesh.visible = false
    accentPlanet.mesh.scale.setScalar(0.02)
  }

  function setStoryState(state) {
    storyState = state
    const system = state?.system
    if (!system) return
    const scale = Math.max(mobile ? 0.52 : 0.58, system.scale ?? 1)
    group.scale.setScalar(scale)
    group.rotation.x = system.rotationX ?? 0.1
    group.rotation.y = system.rotationY ?? 0
    group.position.y = Math.max(-0.34, Math.min(0.12, (system.lift ?? 0) * 0.006))
  }

  function setTheme(theme) {
    const dark = theme === 'dark'
    sunMaterial.color.set(dark ? 0xf5f6f1 : 0x1c2430)
    sunHaloMaterial.color.set(dark ? 0xb9c9e4 : 0x8196b5)
    sunHaloMaterial.opacity = dark ? 0.12 : 0.075
    innerPlanet.material.color.set(dark ? 0x8791a2 : 0x687384)
    middlePlanet.material.color.set(dark ? 0xa7afbb : 0x7d8795)
    accentPlanet.material.color.set(dark ? 0xff7545 : 0xff6f3d)
    innerRing.material.opacity = dark ? 0.25 : 0.18
    middleRing.material.opacity = dark ? 0.28 : 0.21
    accentRing.material.opacity = dark ? 0.36 : 0.27
  }

  function destroy() {
    scene.remove(group)
    for (const ring of [innerRing, middleRing, accentRing]) {
      ring.geometry.dispose()
      ring.material.dispose()
    }
    for (const planet of [innerPlanet, middlePlanet, accentPlanet]) {
      planet.geometry.dispose()
      planet.material.dispose()
    }
    sunGeometry.dispose()
    sunMaterial.dispose()
    sunHaloGeometry.dispose()
    sunHaloMaterial.dispose()
  }

  return { group, update, setStoryState, setTheme, destroy }
}
