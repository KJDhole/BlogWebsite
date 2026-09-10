const clamp01 = value => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))

function copyRect(rect) {
  return {
    left: Number(rect?.left) || 0,
    top: Number(rect?.top) || 0,
    width: Math.max(1, Number(rect?.width) || 1),
    height: Math.max(1, Number(rect?.height) || 1)
  }
}

export function interpolateRect(from, to, progress) {
  const a = copyRect(from)
  const b = copyRect(to)
  const t = clamp01(progress)
  return {
    left: a.left + (b.left - a.left) * t,
    top: a.top + (b.top - a.top) * t,
    width: a.width + (b.width - a.width) * t,
    height: a.height + (b.height - a.height) * t
  }
}

export function createViewportStage(viewport = {}) {
  return {
    left: 0,
    top: 0,
    width: Math.max(1, Number(viewport.width) || 1),
    height: Math.max(1, Number(viewport.height) || 1)
  }
}

function easeInOut(value) {
  const t = clamp01(value)
  return t * t * (3 - 2 * t)
}

export function createSceneViewport(sceneNode, { getAnchor, reducedMotion = false, onResize = () => {} } = {}) {
  if (!sceneNode) {
    return {
      setWorld() {},
      setTransition() {},
      refresh() {},
      destroy() {}
    }
  }

  let world = 'observatory'
  let transition = null
  let destroyed = false

  function viewportStage() {
    return createViewportStage({ width: window.innerWidth, height: window.innerHeight })
  }

  function anchorRect(nextWorld) {
    const value = getAnchor?.(nextWorld)
    if (!value) return { left: 0, top: 0, width: 1, height: 1 }
    if (typeof value.getBoundingClientRect === 'function') return copyRect(value.getBoundingClientRect())
    return copyRect(value)
  }

  function applyRect(rect) {
    if (destroyed) return
    sceneNode.dataset.sceneViewport = 'active'
    sceneNode.style.setProperty('--scene-left', `${rect.left}px`)
    sceneNode.style.setProperty('--scene-top', `${rect.top}px`)
    sceneNode.style.setProperty('--scene-width', `${rect.width}px`)
    sceneNode.style.setProperty('--scene-height', `${rect.height}px`)
    onResize(rect)
  }

  function stableRect() {
    return anchorRect(world)
  }

  function transitionRect(detail) {
    const source = anchorRect(detail.fromWorld || world)
    const destination = anchorRect(detail.toWorld || world)
    if (reducedMotion) return destination

    const stage = viewportStage()
    const progress = clamp01(detail.progress ?? 0)
    const openUntil = 0.55

    if (progress <= openUntil) {
      return interpolateRect(source, stage, easeInOut(progress / openUntil))
    }
    return interpolateRect(stage, destination, easeInOut((progress - openUntil) / (1 - openUntil)))
  }

  function setWorld(nextWorld) {
    world = nextWorld === 'solar' ? 'solar' : 'observatory'
    transition = null
    applyRect(stableRect())
  }

  function setTransition(detail = {}) {
    transition = { ...detail }
    applyRect(transitionRect(transition))
  }

  function refresh() {
    if (destroyed) return
    applyRect(transition ? transitionRect(transition) : stableRect())
  }

  function destroy() {
    destroyed = true
    transition = null
    delete sceneNode.dataset.sceneViewport
    for (const property of ['--scene-left', '--scene-top', '--scene-width', '--scene-height']) {
      sceneNode.style.removeProperty(property)
    }
  }

  setWorld(world)
  return { setWorld, setTransition, refresh, destroy }
}
