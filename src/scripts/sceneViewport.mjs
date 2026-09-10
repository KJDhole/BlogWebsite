function clamp01(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
}

function copyRect(rect) {
  return {
    left: Number(rect?.left) || 0,
    top: Number(rect?.top) || 0,
    width: Math.max(1, Number(rect?.width) || 1),
    height: Math.max(1, Number(rect?.height) || 1)
  }
}

export function interpolateRect(fromRect, toRect, progress) {
  const from = copyRect(fromRect)
  const to = copyRect(toRect)
  const t = clamp01(progress)
  if (t === 0) return from
  if (t === 1) return to
  return {
    left: from.left + (to.left - from.left) * t,
    top: from.top + (to.top - from.top) * t,
    width: from.width + (to.width - from.width) * t,
    height: from.height + (to.height - from.height) * t
  }
}

export function sampleSceneViewport({ from, stage, to, progress }) {
  const t = clamp01(progress)
  if (t <= 0.35) return interpolateRect(from, stage, t / 0.35)
  if (t <= 0.72) return copyRect(stage)
  return interpolateRect(stage, to, (t - 0.72) / 0.28)
}

export function createSceneViewport(sceneNode, { getAnchor, reducedMotion = false } = {}) {
  let destroyed = false
  let currentWorld = 'solar'
  let lastRect = null

  function getStageRect() {
    return {
      left: 0,
      top: 0,
      width: Math.max(1, window.innerWidth),
      height: Math.max(1, window.innerHeight)
    }
  }

  function readAnchor(world) {
    const rect = getAnchor?.(world)
    return rect ? copyRect(rect) : getStageRect()
  }

  function applyRect(rect) {
    if (!sceneNode || destroyed) return
    const next = copyRect(rect)
    lastRect = next
    sceneNode.style.setProperty('--scene-x', `${next.left}px`)
    sceneNode.style.setProperty('--scene-y', `${next.top}px`)
    sceneNode.style.setProperty('--scene-width', `${next.width}px`)
    sceneNode.style.setProperty('--scene-height', `${next.height}px`)
  }

  function setWorld(world) {
    if (destroyed) return
    currentWorld = world === 'observatory' ? 'observatory' : 'solar'
    applyRect(readAnchor(currentWorld))
  }

  function setTransition(detail = {}) {
    if (destroyed) return
    const fromWorld = detail.fromWorld === 'observatory' ? 'observatory' : 'solar'
    const toWorld = detail.toWorld === 'observatory' ? 'observatory' : 'solar'
    const progress = clamp01(detail.progress ?? 0)

    if (reducedMotion) {
      currentWorld = toWorld
      applyRect(readAnchor(toWorld))
      return
    }

    applyRect(sampleSceneViewport({
      from: readAnchor(fromWorld),
      stage: getStageRect(),
      to: readAnchor(toWorld),
      progress
    }))
  }

  function refresh() {
    if (destroyed) return
    setWorld(currentWorld)
  }

  function getRect() {
    return lastRect ? { ...lastRect } : null
  }

  function destroy() {
    destroyed = true
    lastRect = null
  }

  return { setWorld, setTransition, refresh, getRect, destroy }
}
