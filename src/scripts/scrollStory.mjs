export const STORY_PHASES = Object.freeze([
  'drift',
  'charge',
  'flyby',
  'settle'
])

export const STORY_LIMITS = Object.freeze({
  driftEnd: 0.24,
  chargeEnd: 0.44,
  flybyEnd: 0.72
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

function lerp(start, end, amount) {
  return start + (end - start) * amount
}

function rounded(value) {
  return Number(value.toFixed(4))
}

export function getStoryScrollDistance({ heroHeight, mobile = false, maxScroll } = {}) {
  const height = Math.max(0, Number.isFinite(heroHeight) ? heroHeight : 0)
  const preferred = height * (mobile ? 0.92 : 0.96)
  const available = Number.isFinite(maxScroll) ? Math.max(0, maxScroll) : preferred
  return Math.max(1, Math.min(Math.max(preferred, 1), available))
}

function phaseFor(progress) {
  if (progress < STORY_LIMITS.driftEnd) return 'drift'
  if (progress < STORY_LIMITS.chargeEnd) return 'charge'
  if (progress < STORY_LIMITS.flybyEnd) return 'flyby'
  return 'settle'
}

export function getScrollStoryState(rawProgress, { mobile = false, reducedMotion = false } = {}) {
  const progress = clamp01(rawProgress)

  if (reducedMotion) {
    return {
      progress,
      phase: 'reduced',
      charge: 0,
      pathProgress: 0,
      trail: 0,
      field: {
        energy: 0.18,
        parallax: 0,
        drift: 0
      },
      traveler: {
        visible: false,
        opacity: 0,
        scale: 1
      },
      reducedMotion: true
    }
  }

  const driftT = smoothstep(rangeProgress(progress, 0, STORY_LIMITS.driftEnd))
  const chargeT = smoothstep(rangeProgress(progress, STORY_LIMITS.driftEnd, STORY_LIMITS.chargeEnd))
  const flybyT = smoothstep(rangeProgress(progress, STORY_LIMITS.chargeEnd, STORY_LIMITS.flybyEnd))
  const settleT = smoothstep(rangeProgress(progress, STORY_LIMITS.flybyEnd, 1))

  let pathProgress
  if (progress < STORY_LIMITS.driftEnd) {
    pathProgress = lerp(0.035, 0.12, driftT)
  } else if (progress < STORY_LIMITS.chargeEnd) {
    pathProgress = lerp(0.12, 0.2, chargeT)
  } else if (progress < STORY_LIMITS.flybyEnd) {
    pathProgress = lerp(0.2, 1, flybyT)
  } else {
    pathProgress = 1
  }

  const charge = progress < STORY_LIMITS.driftEnd
    ? lerp(0.08, 0.16, driftT)
    : progress < STORY_LIMITS.chargeEnd
      ? lerp(0.16, 1, chargeT)
      : progress < STORY_LIMITS.flybyEnd
        ? lerp(1, 0.36, flybyT)
        : lerp(0.36, 0.04, settleT)

  const trail = progress < STORY_LIMITS.chargeEnd
    ? 0
    : progress < STORY_LIMITS.flybyEnd
      ? Math.sin(Math.PI * flybyT) * 0.92
      : (1 - settleT) * 0.18

  const energy = progress < STORY_LIMITS.driftEnd
    ? lerp(0.22, 0.28, driftT)
    : progress < STORY_LIMITS.chargeEnd
      ? lerp(0.28, 0.9, chargeT)
      : progress < STORY_LIMITS.flybyEnd
        ? lerp(0.9, 0.72, flybyT)
        : lerp(0.72, 0.2, settleT)

  const desktopParallax = progress < STORY_LIMITS.flybyEnd
    ? lerp(0.12, 0.72, smoothstep(rangeProgress(progress, 0.12, STORY_LIMITS.flybyEnd)))
    : lerp(0.72, 0.18, settleT)
  const desktopDrift = progress < STORY_LIMITS.flybyEnd
    ? lerp(0.38, 1, smoothstep(rangeProgress(progress, 0, STORY_LIMITS.flybyEnd)))
    : lerp(1, 0.28, settleT)

  const opacity = progress < STORY_LIMITS.flybyEnd
    ? 1
    : 1 - settleT * 0.88
  const scale = progress < STORY_LIMITS.chargeEnd
    ? 0.92 + charge * 0.11
    : progress < STORY_LIMITS.flybyEnd
      ? 1.03 + Math.sin(Math.PI * flybyT) * 0.2
      : lerp(1.03, 0.82, settleT)

  return {
    progress: rounded(progress),
    phase: phaseFor(progress),
    charge: rounded(charge),
    pathProgress: rounded(pathProgress),
    trail: rounded(trail),
    field: {
      energy: rounded(energy),
      parallax: rounded(desktopParallax * (mobile ? 0.48 : 1)),
      drift: rounded(desktopDrift * (mobile ? 0.58 : 1))
    },
    traveler: {
      visible: opacity > 0.04,
      opacity: rounded(opacity),
      scale: rounded(scale)
    },
    reducedMotion: false
  }
}
