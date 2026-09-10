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
  let transitionRects = null

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
    transitionRects = null
    applyRect(readAnchor(currentWorld))
  }

  function beginTransition(fromWorld) {
    if (destroyed) return
    const sourceWorld = fromWorld === 'observatory' ? 'observatory' : 'solar'
    transitionRects = {
      fromWorld: sourceWorld,
      toWorld: null,
      from: readAnchor(sourceWorld),
      stage: getStageRect(),
      to: null
    }
  }

  function captureTarget(toWorld) {
    if (destroyed) return
    const destination = toWorld === 'observatory' ? 'observatory' : 'solar'
    if (!transitionRects) beginTransition(currentWorld)
    transitionRects.toWorld = destination
    transitionRects.to = readAnchor(destination)
    transitionRects.stage = getStageRect()
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

    const cached = transitionRects && transitionRects.fromWorld === fromWorld && transitionRects.toWorld === toWorld
      ? transitionRects
      : null

    applyRect(sampleSceneViewport({
      from: cached?.from ?? readAnchor(fromWorld),
      stage: cached?.stage ?? getStageRect(),
      to: cached?.to ?? readAnchor(toWorld),
      progress
    }))
  }

  function finishTransition(world) {
    if (destroyed) return
    currentWorld = world === 'observatory' ? 'observatory' : 'solar'
    const finalRect = transitionRects?.toWorld === currentWorld && transitionRects?.to
      ? transitionRects.to
      : readAnchor(currentWorld)
    transitionRects = null
    applyRect(finalRect)
  }

  function refresh() {
    if (destroyed || transitionRects) return
    setWorld(currentWorld)
  }

  function getRect() {
    return lastRect ? { ...lastRect } : null
  }

  function destroy() {
    destroyed = true
    lastRect = null
    transitionRects = null
  }

  return {
    setWorld,
    beginTransition,
    captureTarget,
    setTransition,
    finishTransition,
    refresh,
    getRect,
    destroy
  }
}
