export const WORLD_BY_THEME = Object.freeze({
  light: 'solar',
  dark: 'observatory'
})

export const THEME_BY_WORLD = Object.freeze({
  solar: 'light',
  observatory: 'dark'
})

export const WORLD_TRANSITION_LIMITS = Object.freeze({
  ignitionEnd: 120,
  foldEnd: 300,
  layoutReleaseEnd: 520,
  radiationEnd: 820,
  solarArrivalEnd: 1080,
  indexRebuildEnd: 1320,
  settleEnd: 1500
})

const clamp01 = value => Math.min(1, Math.max(0, value))

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
  const ms = Math.min(WORLD_TRANSITION_LIMITS.settleEnd, Math.max(0, elapsedMs))
  const progress = clamp01(ms / WORLD_TRANSITION_LIMITS.settleEnd)
  let phase = 'settle'
  let start = WORLD_TRANSITION_LIMITS.indexRebuildEnd
  let end = WORLD_TRANSITION_LIMITS.settleEnd

  if (ms < WORLD_TRANSITION_LIMITS.ignitionEnd) {
    phase = 'ignition'
    start = 0
    end = WORLD_TRANSITION_LIMITS.ignitionEnd
  } else if (ms < WORLD_TRANSITION_LIMITS.foldEnd) {
    phase = 'fold'
    start = WORLD_TRANSITION_LIMITS.ignitionEnd
    end = WORLD_TRANSITION_LIMITS.foldEnd
  } else if (ms < WORLD_TRANSITION_LIMITS.layoutReleaseEnd) {
    phase = 'layout-release'
    start = WORLD_TRANSITION_LIMITS.foldEnd
    end = WORLD_TRANSITION_LIMITS.layoutReleaseEnd
  } else if (ms < WORLD_TRANSITION_LIMITS.radiationEnd) {
    phase = 'radiation'
    start = WORLD_TRANSITION_LIMITS.layoutReleaseEnd
    end = WORLD_TRANSITION_LIMITS.radiationEnd
  } else if (ms < WORLD_TRANSITION_LIMITS.solarArrivalEnd) {
    phase = 'solar-arrival'
    start = WORLD_TRANSITION_LIMITS.radiationEnd
    end = WORLD_TRANSITION_LIMITS.solarArrivalEnd
  } else if (ms < WORLD_TRANSITION_LIMITS.indexRebuildEnd) {
    phase = 'index-rebuild'
    start = WORLD_TRANSITION_LIMITS.solarArrivalEnd
    end = WORLD_TRANSITION_LIMITS.indexRebuildEnd
  }

  return {
    progress,
    phase,
    phaseProgress: clamp01((ms - start) / Math.max(1, end - start)),
    elapsedMs: ms,
    direction
  }
}
