export const RELEASE_ANGLE = 60

export function clamp01(value) {
  return Math.min(1, Math.max(0, value))
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

function rounded(value) {
  return Number(value.toFixed(4))
}

export function freeFallProgress(rawProgress) {
  const t = clamp01(rawProgress)
  return t * t
}

export function landingProgressFromElapsed(rawElapsedMs, { mobile = false } = {}) {
  const elapsedMs = Math.max(0, Number.isFinite(rawElapsedMs) ? rawElapsedMs : 0)
  const holdMs = mobile ? 45 : 65
  const totalMs = mobile ? 860 : 925
  if (elapsedMs <= holdMs) return 0.66
  const t = clamp01((elapsedMs - holdMs) / (totalMs - holdMs))
  return rounded(0.66 + (0.97 - 0.66) * t)
}

export function getLandingMotionState(rawProgress, { mobile = false } = {}) {
  const progress = clamp01(rawProgress)
  const fallT = rangeProgress(progress, 0.66, 0.78)
  const impactT = rangeProgress(progress, 0.78, 0.815)
  const bounceT = rangeProgress(progress, 0.815, 0.89)
  const settleT = rangeProgress(progress, 0.89, 0.91)
  const morphT = smoothstep(rangeProgress(progress, 0.91, 0.97))

  const impact = progress >= 0.78 && progress <= 0.815
    ? Math.sin(Math.PI * impactT)
    : 0
  const bounce = progress >= 0.815 && progress <= 0.89
    ? Math.sin(Math.PI * bounceT)
    : 0

  const sink = mobile ? 3.2 : 5.2
  const bounceHeight = mobile ? 12 : 18
  const yOffset = impact * sink - bounce * bounceHeight
  const scaleX = 1 + impact * 0.38 - bounce * 0.055
  const scaleY = 1 - impact * 0.53 + bounce * 0.095

  let phase = 'approach'
  if (progress >= 0.97) phase = 'settled'
  else if (progress >= 0.91) phase = 'morph'
  else if (progress >= 0.89) phase = 'settle'
  else if (progress >= 0.815) phase = 'bounce'
  else if (progress >= 0.78) phase = 'impact'
  else if (progress > 0.66) phase = 'fall'
  else if (progress >= 0.66) phase = 'drop-ready'

  return {
    progress: rounded(progress),
    phase,
    fall: rounded(freeFallProgress(fallT)),
    impact: rounded(impact),
    bounce: rounded(bounce),
    settle: rounded(settleT),
    morph: rounded(morphT),
    yOffset: rounded(yOffset),
    scaleX: rounded(scaleX),
    scaleY: rounded(scaleY)
  }
}

export function getOrbitTransitionState(rawProgress, { mobile = false } = {}) {
  const progress = clamp01(rawProgress)
  const focus = smoothstep(rangeProgress(progress, 0.18, 0.38))
  const flight = smoothstep(rangeProgress(progress, 0.38, 0.66))
  const breakup = easeOutCubic(rangeProgress(progress, 0.42, 0.86))
  const satelliteCollapse = smoothstep(rangeProgress(progress, 0.48, 0.88))
  const landing = getLandingMotionState(progress, { mobile })
  const indicatorMorph = landing.morph
  const fade = smoothstep(rangeProgress(progress, 0.5, 0.94))

  let phase = 'orbit'
  if (progress >= 0.97) phase = 'settled'
  else if (progress >= 0.91) phase = 'morph'
  else if (progress >= 0.89) phase = 'landing'
  else if (progress >= 0.815) phase = 'bounce'
  else if (progress >= 0.78) phase = 'impact'
  else if (progress > 0.66) phase = 'fall'
  else if (progress > 0.38) phase = 'release'
  else if (progress > 0.18) phase = 'prepare'

  const xAmplitude = mobile ? -12 : -34
  const yPrepare = mobile ? 8 : 15
  const yBreak = mobile ? -16 : -30
  const rotateAmplitude = mobile ? -4.5 : -10
  const scaleLoss = mobile ? 0.09 : 0.13
  const tiltLoss = mobile ? 0.08 : 0.14

  return {
    progress,
    phase,
    focus: rounded(focus),
    flight: rounded(flight),
    breakup: rounded(breakup),
    satelliteCollapse: rounded(satelliteCollapse),
    indicatorMorph: rounded(indicatorMorph),
    landing,
    systemX: rounded(xAmplitude * focus - (mobile ? 4 : 12) * breakup),
    systemY: rounded(yPrepare * focus + yBreak * breakup),
    systemScale: rounded(1 - 0.035 * focus - scaleLoss * breakup),
    systemRotate: rounded((mobile ? 2.2 : 4.5) * focus + rotateAmplitude * breakup),
    systemTilt: rounded(1 - 0.035 * focus - tiltLoss * breakup),
    systemOpacity: rounded(1 - fade),
    coreOpacity: rounded(1 - smoothstep(rangeProgress(progress, 0.68, 0.94))),
    gridOpacity: rounded(1 - smoothstep(rangeProgress(progress, 0.42, 0.82)))
  }
}

const SPEEDS = {
  a: 360 / 18000,
  b: -360 / 31000,
  c: 360 / 42000
}

export function advanceOrbitAngles(angles, deltaMs) {
  return {
    a: angles.a + SPEEDS.a * deltaMs,
    b: angles.b + SPEEDS.b * deltaMs,
    c: angles.c + SPEEDS.c * deltaMs
  }
}

export function nearestEquivalentAngle(targetAngle, currentAngle) {
  const turns = Math.round((currentAngle - targetAngle) / 360)
  return targetAngle + turns * 360
}



export function buildTangentFlightPath(start, target, center, releaseAngle, { mobile = false } = {}) {
  const dx = start.x - center.x
  const dy = start.y - center.y
  const length = Math.hypot(dx, dy)
  const fallbackRadians = releaseAngle * Math.PI / 180
  const radial = length > 0.001
    ? { x: dx / length, y: dy / length }
    : { x: Math.cos(fallbackRadians), y: Math.sin(fallbackRadians) }
  // Screen coordinates grow downward, so clockwise tangent is perpendicular to the radial vector.
  const tangent = { x: -radial.y, y: radial.x }
  const launch = mobile ? 48 : 72
  const clearance = mobile ? 18 : 28
  const escapeTravel = mobile ? 78 : 118
  const escapeClearance = mobile ? 34 : 52

  const controlOut = {
    x: start.x + tangent.x * launch + radial.x * clearance,
    y: start.y + tangent.y * launch + radial.y * clearance
  }
  const escape = {
    x: start.x + tangent.x * escapeTravel + radial.x * escapeClearance,
    y: start.y + tangent.y * escapeTravel + radial.y * escapeClearance
  }
  const controlEscape = {
    x: escape.x + tangent.x * (mobile ? 42 : 68),
    y: escape.y + tangent.y * (mobile ? 42 : 68)
  }
  const controlLand = {
    x: target.x + (mobile ? 34 : 56),
    y: target.y - (mobile ? 66 : 92)
  }

  return { start, controlOut, escape, controlEscape, controlLand, target }
}

export function sampleTangentFlightPath(path, rawT) {
  const t = clamp01(rawT)
  if (t === 0) return { ...path.start }
  if (t === 1) return { ...path.target }

  const escapeSplit = 0.34
  if (t <= escapeSplit) {
    return cubicBezierPoint(
      path.start,
      path.controlOut,
      path.escape,
      path.escape,
      t / escapeSplit
    )
  }

  return cubicBezierPoint(
    path.escape,
    path.controlEscape,
    path.controlLand,
    path.target,
    (t - escapeSplit) / (1 - escapeSplit)
  )
}

export function cubicBezierPoint(start, control1, control2, end, rawT) {
  const t = clamp01(rawT)
  if (t === 0) return { x: start.x, y: start.y }
  if (t === 1) return { x: end.x, y: end.y }

  const mt = 1 - t
  return {
    x: mt ** 3 * start.x + 3 * mt ** 2 * t * control1.x + 3 * mt * t ** 2 * control2.x + t ** 3 * end.x,
    y: mt ** 3 * start.y + 3 * mt ** 2 * t * control1.y + 3 * mt * t ** 2 * control2.y + t ** 3 * end.y
  }
}
