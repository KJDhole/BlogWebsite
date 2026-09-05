export const STORY_PHASES = Object.freeze([
  'stable-orbit',
  'portal-emerge',
  'absorb',
  'compact',
  'nav-portal',
  'eject',
  'landing'
])

export const STORY_LIMITS = Object.freeze({
  stableEnd: 0.18,
  portalEnd: 0.32,
  absorbEnd: 0.46,
  compactEnd: 0.58,
  navPortalEnd: 0.66,
  ejectEnd: 0.76,
  desktopMinScale: 0.58,
  mobileMinScale: 0.52
})

function clamp01(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
}

function rangeProgress(value, start, end) {
  if (end <= start) return value >= end ? 1 : 0
  return clamp01((value - start) / (end - start))
}

function smoothstep(value) {
  const t = clamp01(value)
  return t * t * (3 - 2 * t)
}

function easeOutCubic(value) {
  const t = clamp01(value)
  return 1 - Math.pow(1 - t, 3)
}

function lerp(start, end, amount) {
  return start + (end - start) * amount
}

export function getStoryScrollDistance({ heroHeight, mobile = false, maxScroll } = {}) {
  const height = Math.max(0, Number.isFinite(heroHeight) ? heroHeight : 0)
  const preferred = height * (mobile ? 0.92 : 0.96)
  const available = Number.isFinite(maxScroll) ? Math.max(0, maxScroll) : preferred
  return Math.max(1, Math.min(Math.max(preferred, 1), available))
}

function phaseFor(progress) {
  if (progress < STORY_LIMITS.stableEnd) return 'stable-orbit'
  if (progress < STORY_LIMITS.portalEnd) return 'portal-emerge'
  if (progress < STORY_LIMITS.absorbEnd) return 'absorb'
  if (progress < STORY_LIMITS.compactEnd) return 'compact'
  if (progress < STORY_LIMITS.navPortalEnd) return 'nav-portal'
  if (progress < STORY_LIMITS.ejectEnd) return 'eject'
  return 'landing'
}

export function getScrollStoryState(rawProgress, { mobile = false, reducedMotion = false } = {}) {
  const progress = clamp01(rawProgress)
  const minimumScale = mobile ? STORY_LIMITS.mobileMinScale : STORY_LIMITS.desktopMinScale

  if (reducedMotion) {
    return {
      progress,
      phase: 'reduced',
      system: { scale: 1, rotationX: 0, rotationY: 0, lift: 0 },
      heroPortal: { opacity: 0, scale: 0, distortion: 0, pulse: 0 },
      accent: { mode: 'orbit', absorption: 0 },
      navPortal: { opacity: 0, scale: 0, pulse: 0 },
      ejection: { progress: 0 },
      landingReady: false,
      reducedMotion: true
    }
  }

  const portalIn = smoothstep(rangeProgress(progress, STORY_LIMITS.stableEnd, 0.25))
  const portalOut = smoothstep(rangeProgress(progress, 0.40, 0.54))
  const heroPortalOpacity = portalIn * (1 - portalOut)
  const absorption = smoothstep(rangeProgress(progress, STORY_LIMITS.portalEnd, STORY_LIMITS.absorbEnd))
  const compact = smoothstep(rangeProgress(progress, STORY_LIMITS.stableEnd, STORY_LIMITS.compactEnd))
  const navPortalIn = smoothstep(rangeProgress(progress, STORY_LIMITS.compactEnd, 0.625))
  const navPortalOut = smoothstep(rangeProgress(progress, 0.705, STORY_LIMITS.ejectEnd))
  const navPortalOpacity = navPortalIn * (1 - navPortalOut)
  const ejectionProgress = smoothstep(rangeProgress(progress, STORY_LIMITS.navPortalEnd, STORY_LIMITS.ejectEnd))

  const scale = Math.max(
    minimumScale,
    lerp(1, minimumScale, easeOutCubic(rangeProgress(progress, STORY_LIMITS.stableEnd, 0.64)))
  )

  const rotationX = lerp(0.10, mobile ? 0.22 : 0.28, compact)
  const rotationY = lerp(-0.06, mobile ? -0.36 : -0.52, compact)
  const lift = lerp(0, mobile ? -26 : -42, smoothstep(rangeProgress(progress, 0.30, 0.68)))

  let accentMode = 'orbit'
  if (progress >= STORY_LIMITS.absorbEnd) accentMode = 'hidden'
  else if (progress >= STORY_LIMITS.portalEnd) accentMode = 'absorbing'

  return {
    progress,
    phase: phaseFor(progress),
    system: { scale, rotationX, rotationY, lift },
    heroPortal: {
      opacity: heroPortalOpacity,
      scale: 0.2 + portalIn * 0.8,
      distortion: heroPortalOpacity * (0.35 + absorption * 0.65),
      pulse: Math.sin(absorption * Math.PI) * heroPortalOpacity
    },
    accent: { mode: accentMode, absorption },
    navPortal: {
      opacity: navPortalOpacity,
      scale: 0.25 + navPortalIn * 0.75,
      pulse: Math.sin(ejectionProgress * Math.PI) * navPortalOpacity
    },
    ejection: { progress: ejectionProgress },
    landingReady: progress >= STORY_LIMITS.ejectEnd,
    reducedMotion: false
  }
}

export function buildEjectionPath(start, end, { mobile = false } = {}) {
  const side = mobile ? 18 : 28
  const lift = mobile ? 28 : 42
  return {
    start: { ...start },
    control1: { x: start.x + side, y: start.y - lift },
    control2: { x: end.x - side * 0.55, y: end.y - lift * 0.35 },
    end: { ...end }
  }
}

function cubicBezierPoint(start, control1, control2, end, rawProgress) {
  const t = clamp01(rawProgress)
  if (t === 0) return { ...start }
  if (t === 1) return { ...end }
  const mt = 1 - t
  return {
    x: mt ** 3 * start.x + 3 * mt ** 2 * t * control1.x + 3 * mt * t ** 2 * control2.x + t ** 3 * end.x,
    y: mt ** 3 * start.y + 3 * mt ** 2 * t * control1.y + 3 * mt * t ** 2 * control2.y + t ** 3 * end.y
  }
}

export function sampleEjectionPath(path, progress) {
  return cubicBezierPoint(path.start, path.control1, path.control2, path.end, progress)
}
