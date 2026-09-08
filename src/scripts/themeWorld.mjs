export const WORLD_BY_THEME = Object.freeze({
  light: 'solar',
  dark: 'observatory'
})

export const THEME_BY_WORLD = Object.freeze({
  solar: 'light',
  observatory: 'dark'
})

const LIMITS = Object.freeze({
  eclipseEnd: 180,
  totalityEnd: 450,
  waveEnd: 950,
  revealEnd: 1250,
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
  const ms = Math.min(LIMITS.settleEnd, Math.max(0, elapsedMs))
  const progress = clamp01(ms / LIMITS.settleEnd)
  let phase = 'archive-settle'
  let start = LIMITS.revealEnd
  let end = LIMITS.settleEnd

  if (ms < LIMITS.eclipseEnd) {
    phase = 'eclipse'
    start = 0
    end = LIMITS.eclipseEnd
  } else if (ms < LIMITS.totalityEnd) {
    phase = 'totality'
    start = LIMITS.eclipseEnd
    end = LIMITS.totalityEnd
  } else if (ms < LIMITS.waveEnd) {
    phase = 'solar-wave'
    start = LIMITS.totalityEnd
    end = LIMITS.waveEnd
  } else if (ms < LIMITS.revealEnd) {
    phase = 'solar-reveal'
    start = LIMITS.waveEnd
    end = LIMITS.revealEnd
  }

  return {
    progress,
    phase,
    phaseProgress: clamp01((ms - start) / Math.max(1, end - start)),
    direction
  }
}
