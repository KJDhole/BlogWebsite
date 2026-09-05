import * as THREE from 'three'

function disposeMesh(mesh) {
  mesh.geometry?.dispose?.()
  if (Array.isArray(mesh.material)) mesh.material.forEach(material => material.dispose?.())
  else mesh.material?.dispose?.()
}

export function createBlackHolePortal({ position } = {}) {
  const group = new THREE.Group()
  group.name = 'hero-black-hole-portal'
  group.position.copy(position?.clone?.() ?? new THREE.Vector3(2.15, 0.18, 0.55))
  group.visible = false

  const coreGeometry = new THREE.SphereGeometry(0.25, 32, 24)
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0,
    depthWrite: false
  })
  const core = new THREE.Mesh(coreGeometry, coreMaterial)

  const ringGeometry = new THREE.TorusGeometry(0.34, 0.018, 12, 72)
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xff8b63,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
  const ring = new THREE.Mesh(ringGeometry, ringMaterial)
  ring.rotation.x = 0.88
  ring.rotation.y = 0.18

  const ringTwoGeometry = new THREE.TorusGeometry(0.39, 0.009, 10, 72)
  const ringTwoMaterial = new THREE.MeshBasicMaterial({
    color: 0x8ca8ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
  const ringTwo = new THREE.Mesh(ringTwoGeometry, ringTwoMaterial)
  ringTwo.rotation.x = 1.03
  ringTwo.rotation.y = -0.2

  const haloGeometry = new THREE.SphereGeometry(0.47, 24, 18)
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: 0x435b8d,
    transparent: true,
    opacity: 0,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
  const halo = new THREE.Mesh(haloGeometry, haloMaterial)

  group.add(halo, ringTwo, ring, core)

  function setState(portalState = {}) {
    const opacity = Math.min(1, Math.max(0, portalState.opacity ?? 0))
    const scale = Math.max(0.01, portalState.scale ?? 0.01)
    const distortion = Math.min(1, Math.max(0, portalState.distortion ?? 0))
    const pulse = Math.min(1, Math.max(0, portalState.pulse ?? 0))
    group.visible = opacity > 0.002
    group.scale.setScalar(scale * (1 + pulse * 0.08))
    coreMaterial.opacity = opacity
    ringMaterial.opacity = opacity * (0.48 + distortion * 0.32)
    ringTwoMaterial.opacity = opacity * (0.24 + distortion * 0.22)
    haloMaterial.opacity = opacity * (0.045 + distortion * 0.07)
    ring.rotation.z = distortion * 0.38
    ringTwo.rotation.z = -distortion * 0.28
  }

  function setTheme(theme) {
    const dark = theme === 'dark'
    ringMaterial.color.set(dark ? 0xff8b63 : 0xff7545)
    ringTwoMaterial.color.set(dark ? 0x8ca8ff : 0x718fd8)
    haloMaterial.color.set(dark ? 0x435b8d : 0x536988)
  }

  function destroy() {
    for (const mesh of [core, ring, ringTwo, halo]) disposeMesh(mesh)
    group.clear()
  }

  return { group, setState, setTheme, destroy }
}
