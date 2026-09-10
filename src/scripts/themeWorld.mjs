export const WORLD_BY_THEME = Object.freeze({
  light: 'solar',
  dark: 'observatory'
})

export const THEME_BY_WORLD = Object.freeze({
  solar: 'light',
  observatory: 'dark'
})

export const TRANSITION_TIMELINE = Object.freeze({
  ignitionEnd: 120,
  convergenceEnd: 300,
  layoutReleaseEnd: 520,
  radiationEnd: 820,
  solarArrivalEnd: 1080,
  indexReconstructionEnd: 1320,
  settleEnd: 1500
})

const clamp01 = value => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))

export function themeToWorld(theme) {
  return WORLD_BY_THEME[theme] ?? 'solar'
}

export function worldToTheme(world) {
  return THEME_BY_WORLD[world] ?? 'light'
}

export function getTransitionDirection(fromWorld, toWorld) {
  if (fromWorld === toWorld) return 'none'
  return toWorld === 'solar' ? 'to-solar' : 'to-observatory'
}

export function getTransitionFrame(elapsedMs, direction) {
  const ms = Math.min(TRANSITION_TIMELINE.settleEnd, Math.max(0, Number(elapsedMs) || 0))
  const progress = clamp01(ms / TRANSITION_TIMELINE.settleEnd)
  let phase = 'settle'
  let start = TRANSITION_TIMELINE.indexReconstructionEnd
  let end = TRANSITION_TIMELINE.settleEnd

  if (ms < TRANSITION_TIMELINE.ignitionEnd) {
    phase = 'ignition'
    start = 0
    end = TRANSITION_TIMELINE.ignitionEnd
  } else if (ms < TRANSITION_TIMELINE.convergenceEnd) {
    phase = 'convergence'
    start = TRANSITION_TIMELINE.ignitionEnd
    end = TRANSITION_TIMELINE.convergenceEnd
  } else if (ms < TRANSITION_TIMELINE.layoutReleaseEnd) {
    phase = 'layout-release'
    start = TRANSITION_TIMELINE.convergenceEnd
    end = TRANSITION_TIMELINE.layoutReleaseEnd
  } else if (ms < TRANSITION_TIMELINE.radiationEnd) {
    phase = 'radiation'
    start = TRANSITION_TIMELINE.layoutReleaseEnd
    end = TRANSITION_TIMELINE.radiationEnd
  } else if (ms < TRANSITION_TIMELINE.solarArrivalEnd) {
    phase = 'solar-arrival'
    start = TRANSITION_TIMELINE.radiationEnd
    end = TRANSITION_TIMELINE.solarArrivalEnd
  } else if (ms < TRANSITION_TIMELINE.indexReconstructionEnd) {
    phase = 'index-reconstruction'
    start = TRANSITION_TIMELINE.solarArrivalEnd
    end = TRANSITION_TIMELINE.indexReconstructionEnd
  }

  return {
    elapsedMs: ms,
    progress,
    phase,
    phaseProgress: clamp01((ms - start) / Math.max(1, end - start)),
    direction
  }
}

export function getMorphProgress(elapsedMs) {
  const ms = Number(elapsedMs) || 0
  return clamp01((ms - TRANSITION_TIMELINE.convergenceEnd) /
    (TRANSITION_TIMELINE.solarArrivalEnd - TRANSITION_TIMELINE.convergenceEnd))
}

export function getIndexProgress(elapsedMs) {
  const ms = Number(elapsedMs) || 0
  return clamp01((ms - TRANSITION_TIMELINE.solarArrivalEnd) /
    (TRANSITION_TIMELINE.indexReconstructionEnd - TRANSITION_TIMELINE.solarArrivalEnd))
}
