import * as THREE from 'three'

function clamp01(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
}

function rangeProgress(value, start, end) {
  return clamp01((value - start) / Math.max(0.0001, end - start))
}

function smoothstep(value) {
  const t = clamp01(value)
  return t * t * (3 - 2 * t)
}

export function sampleSolarTransition(progress, direction) {
  const p = clamp01(progress)
  if (direction === 'to-solar') {
    const arrival = smoothstep(rangeProgress(p, 0.347, 0.72))
    if (arrival >= 1) return { mix: 1, offsetX: 0, offsetY: 0, scale: 1 }
    return {
      mix: arrival,
      offsetX: (1 - arrival) * 0.72,
      offsetY: (1 - arrival) * 0.16,
      scale: 1 + (1 - arrival) * 0.08
    }
  }

  if (direction === 'to-observatory') {
    const withdraw = smoothstep(rangeProgress(p, 0, 0.35))
    return {
      mix: 1 - withdraw,
      offsetX: withdraw * 0.72,
      offsetY: withdraw * 0.16,
      scale: 1 + withdraw * 0.08
    }
  }

  return { mix: direction === 'solar' ? 1 : 0, offsetX: 0, offsetY: 0, scale: 1 }
}

function createMagneticArc({ start, control, end, color, opacity }) {
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(...start),
    new THREE.Vector3(...control),
    new THREE.Vector3(...end)
  )
  const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(56))
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    depthWrite: false
  })
  const line = new THREE.Line(geometry, material)
  return { line, geometry, material, baseOpacity: opacity }
}

function createSpectralGrid(mobile) {
  const points = []
  const verticals = mobile ? 3 : 5
  for (let index = 0; index < verticals; index += 1) {
    const x = -1.35 + index * (mobile ? 0.72 : 0.54)
    points.push(x, -2.35, -0.9, x, 2.35, -0.9)
  }
  for (const y of [-1.36, 1.18]) {
    points.push(-1.55, y, -0.9, 2.1, y, -0.9)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
  const material = new THREE.LineBasicMaterial({
    color: 0x466da8,
    transparent: true,
    opacity: 0,
    depthWrite: false
  })
  const lines = new THREE.LineSegments(geometry, material)
  return { lines, geometry, material }
}

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uWorldMix;
  uniform float uTransitionPulse;
  uniform float uReducedMotion;
  uniform float uDetailOctaves;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.55;
    for (int i = 0; i < 4; i++) {
      if (float(i) >= uDetailOctaves) break;
      value += amplitude * noise(p);
      p = p * 2.03 + vec2(17.1, 9.7);
      amplitude *= 0.48;
    }
    return value;
  }

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float radius = length(p);
    float surface = 1.0 - smoothstep(0.895, 0.925, radius);
    float coronaBand = smoothstep(1.08, 0.91, radius) * (1.0 - smoothstep(0.89, 0.925, radius));
    float outerGlow = smoothstep(1.28, 0.94, radius) * (1.0 - smoothstep(0.91, 1.04, radius));
    float motion = 1.0 - uReducedMotion;

    vec2 flow = p * 6.5;
    flow.x += sin(p.y * 8.0 + uTime * 0.035) * 0.22 * motion;
    flow.y += cos(p.x * 7.0 - uTime * 0.028) * 0.18 * motion;
    float granules = fbm(flow * 2.15 + uTime * 0.018 * motion);
    float cells = fbm(flow * 5.2 - uTime * 0.012 * motion);
    float filament = sin((p.x * 11.0 + p.y * 7.0) + granules * 5.0 + uTime * 0.045 * motion) * 0.5 + 0.5;

    float limb = pow(max(0.0, 1.0 - radius * radius), 0.26);
    vec3 deepSolar = vec3(0.64, 0.24, 0.075);
    vec3 solarOrange = vec3(0.94, 0.49, 0.13);
    vec3 warmIvory = vec3(1.0, 0.82, 0.48);
    vec3 surfaceColor = mix(deepSolar, solarOrange, clamp(granules * 0.90 + cells * 0.19, 0.0, 1.0));
    surfaceColor = mix(surfaceColor, warmIvory, clamp(limb * 0.20 + filament * 0.045, 0.0, 0.25));
    surfaceColor *= 0.68 + limb * 0.32;

    vec3 coronaColor = mix(vec3(0.97, 0.78, 0.48), vec3(0.72, 0.84, 0.98), 0.32 + filament * 0.14);
    float flarePhase = atan(p.y, p.x) * 5.0 + uTime * 0.065 * motion;
    float flare = pow(max(0.0, sin(flarePhase)), 18.0) * coronaBand;
    float flareMotionScale = mix(0.38, 1.0, motion);
    float coronaStrength = coronaBand * (0.25 + filament * 0.15) + outerGlow * 0.11 + flare * flareMotionScale * (0.15 + uTransitionPulse * 0.14);

    vec3 color = surfaceColor * surface + coronaColor * coronaStrength;
    float alpha = max(surface, coronaStrength) * uOpacity * uWorldMix;
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(color, alpha);
  }
`

export function createSolarField(scene, { mobile = false, reducedMotion = false } = {}) {
  const group = new THREE.Group()
  group.name = 'solar-field'

  const uniforms = {
    uTime: { value: 0 },
    uOpacity: { value: mobile ? 0.78 : 0.84 },
    uWorldMix: { value: 0 },
    uTransitionPulse: { value: 0 },
    uReducedMotion: { value: reducedMotion ? 1 : 0 },
    uDetailOctaves: { value: mobile ? 3 : 4 }
  }

  const solarGeometry = new THREE.PlaneGeometry(mobile ? 5.2 : 6.2, mobile ? 5.2 : 6.2, 1, 1)
  const solarMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  })
  const solarLimb = new THREE.Mesh(solarGeometry, solarMaterial)
  solarLimb.name = 'cropped-solar-limb'
  solarLimb.position.set(mobile ? 2.86 : 3.28, mobile ? 0.16 : 0.08, -0.45)

  const spectral = createSpectralGrid(mobile)
  const spectralBaseX = mobile ? 1.92 : 2.18
  spectral.lines.position.set(spectralBaseX, 0.03, 0)

  const arcA = createMagneticArc({
    start: [0.62, 0.72, -0.12],
    control: [1.35, 1.73, 0.05],
    end: [2.12, 0.78, -0.12],
    color: 0x3d68a8,
    opacity: mobile ? 0.07 : 0.12
  })
  const arcB = createMagneticArc({
    start: [0.76, -0.86, -0.06],
    control: [1.63, -1.68, 0.08],
    end: [2.48, -0.72, -0.06],
    color: 0x8ba9cf,
    opacity: mobile ? 0.05 : 0.09
  })
  const arcC = createMagneticArc({
    start: [1.18, 1.10, -0.18],
    control: [2.12, 2.05, 0.02],
    end: [3.02, 0.94, -0.18],
    color: 0xc66e4b,
    opacity: 0.042
  })

  const arcs = mobile ? [arcA, arcB] : [arcA, arcB, arcC]
  group.add(solarLimb, spectral.lines, ...arcs.map(arc => arc.line))
  scene.add(group)

  let worldMix = 0
  let transitionPulse = 0
  let transitionState = null

  function applyMix() {
    const mix = clamp01(worldMix)
    uniforms.uWorldMix.value = mix
    spectral.material.opacity = (mobile ? 0.045 : 0.072) * mix
    arcs.forEach(arc => { arc.material.opacity = arc.baseOpacity * mix })
    group.visible = mix > 0.002
  }

  function setWorldMix(value) {
    worldMix = clamp01(value)
    applyMix()
  }

  function setTheme(theme) {
    const darkTheme = theme === 'dark'
    spectral.material.color.set(darkTheme ? 0x6f88b5 : 0x3f66a3)
    arcA.material.color.set(darkTheme ? 0x6f8fc8 : 0x315f9f)
    arcB.material.color.set(darkTheme ? 0x8ba5cf : 0x7296c5)
    arcC.material.color.set(darkTheme ? 0xb47b69 : 0xb85b3e)
  }

  function setTransitionState(state = {}) {
    if (reducedMotion) {
      transitionState = null
      transitionPulse = 0
      uniforms.uTransitionPulse.value = 0
      return
    }

    const direction = state.direction
    const progress = clamp01(state.progress ?? 0)
    if (direction !== 'to-solar' && direction !== 'to-observatory') {
      transitionState = null
      transitionPulse = 0
      uniforms.uTransitionPulse.value = 0
      return
    }

    transitionState = { direction, progress }
    const pose = sampleSolarTransition(progress, direction)
    worldMix = pose.mix
    applyMix()

    const activePulse = state.phase === 'radiation' || state.phase === 'solar-arrival'
    transitionPulse = activePulse ? 1 - clamp01(state.phaseProgress ?? 0) * 0.55 : 0
    uniforms.uTransitionPulse.value = transitionPulse
  }

  function update(elapsedSeconds, storyState) {
    const calm = reducedMotion || storyState?.reducedMotion
    uniforms.uReducedMotion.value = calm ? 1 : 0
    uniforms.uTime.value = calm ? 0 : elapsedSeconds * 0.42
    const energy = clamp01(storyState?.field?.energy ?? 0.22)
    uniforms.uOpacity.value = (mobile ? 0.76 : 0.83) * (0.97 + energy * 0.035)

    if (transitionState && !calm) {
      const pose = sampleSolarTransition(transitionState.progress, transitionState.direction)
      group.position.x = pose.offsetX
      group.position.y = pose.offsetY
      group.scale.setScalar(pose.scale)
      spectral.lines.position.x = spectralBaseX
      return
    }

    group.position.x = 0
    group.scale.setScalar(1)
    if (calm) {
      group.position.y = 0
      spectral.lines.position.x = spectralBaseX
      return
    }

    group.position.y = Math.sin(elapsedSeconds * 0.04) * (mobile ? 0.004 : 0.008) * worldMix
    spectral.lines.position.x = spectralBaseX + Math.sin(elapsedSeconds * 0.018) * 0.009 * worldMix
  }

  function destroy() {
    scene.remove(group)
    solarGeometry.dispose()
    solarMaterial.dispose()
    spectral.geometry.dispose()
    spectral.material.dispose()
    for (const arc of [arcA, arcB, arcC]) {
      arc.geometry.dispose()
      arc.material.dispose()
    }
  }

  applyMix()
  return {
    group,
    update,
    setWorldMix,
    setTheme,
    setTransitionState,
    destroy
  }
}
