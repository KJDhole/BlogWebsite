function clamp01(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
}

function normalizeDimension(value, fallback) {
  return Math.max(1, Number.isFinite(value) ? value : fallback)
}

export function getCosmicPath({ width = 1000, height = 1000, mobile = false } = {}) {
  const w = normalizeDimension(width, 1000)
  const h = normalizeDimension(height, 1000)

  if (mobile) {
    return {
      start: { x: 0.20 * w, y: 0.70 * h },
      control1: { x: 0.34 * w, y: 0.54 * h },
      control2: { x: 0.68 * w, y: 0.36 * h },
      end: { x: 0.80 * w, y: 0.57 * h }
    }
  }

  return {
    start: { x: 0.14 * w, y: 0.67 * h },
    control1: { x: 0.32 * w, y: 0.40 * h },
    control2: { x: 0.75 * w, y: 0.19 * h },
    end: { x: 0.90 * w, y: 0.56 * h }
  }
}

export function sampleCosmicPath(path, rawProgress) {
  const t = clamp01(rawProgress)
  if (t === 0) return { ...path.start }
  if (t === 1) return { ...path.end }

  const mt = 1 - t
  return {
    x: mt ** 3 * path.start.x
      + 3 * mt ** 2 * t * path.control1.x
      + 3 * mt * t ** 2 * path.control2.x
      + t ** 3 * path.end.x,
    y: mt ** 3 * path.start.y
      + 3 * mt ** 2 * t * path.control1.y
      + 3 * mt * t ** 2 * path.control2.y
      + t ** 3 * path.end.y
  }
}

export function getCosmicPathD(path) {
  return `M ${path.start.x} ${path.start.y} C ${path.control1.x} ${path.control1.y} ${path.control2.x} ${path.control2.y} ${path.end.x} ${path.end.y}`
}
