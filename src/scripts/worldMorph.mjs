function clamp01(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
}

export function createFlipDelta(fromRect, toRect) {
  return {
    x: fromRect.left - toRect.left,
    y: fromRect.top - toRect.top,
    scaleX: fromRect.width / Math.max(1, toRect.width),
    scaleY: fromRect.height / Math.max(1, toRect.height)
  }
}

export function sampleFlip(delta, progress) {
  const t = clamp01(progress)
  const remaining = 1 - t
  if (remaining === 0) {
    return { x: 0, y: 0, scaleX: 1, scaleY: 1 }
  }
  return {
    x: delta.x * remaining,
    y: delta.y * remaining,
    scaleX: 1 + (delta.scaleX - 1) * remaining,
    scaleY: 1 + (delta.scaleY - 1) * remaining
  }
}

function readRect(node) {
  const rect = node.getBoundingClientRect()
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height
  }
}

function clearNodeTransform(node) {
  node.style.removeProperty('--morph-x')
  node.style.removeProperty('--morph-y')
  node.style.removeProperty('--morph-scale-x')
  node.style.removeProperty('--morph-scale-y')
}

export function createWorldMorph(root, { reducedMotion = false } = {}) {
  let destroyed = false
  let prepared = false
  let targetWorld = root?.dataset?.layoutWorld || root?.dataset?.world || 'solar'
  let records = []

  function getNodes() {
    if (!root || destroyed) return []
    return [...root.querySelectorAll('[data-world-morph]')]
  }

  function prepare(toWorld) {
    if (!root || destroyed) return
    targetWorld = toWorld === 'observatory' ? 'observatory' : 'solar'
    const nodes = getNodes()

    if (reducedMotion) {
      root.dataset.layoutWorld = targetWorld
      root.dataset.worldMorphing = 'false'
      records = []
      prepared = true
      return
    }

    const sourceRects = new Map(nodes.map(node => [node.dataset.worldMorph, readRect(node)]))
    root.dataset.layoutWorld = targetWorld
    void root.offsetWidth

    records = nodes.map(node => {
      const key = node.dataset.worldMorph
      const fromRect = sourceRects.get(key)
      const toRect = readRect(node)
      if (!fromRect || fromRect.width <= 0 || fromRect.height <= 0 || toRect.width <= 0 || toRect.height <= 0) {
        return { node, delta: { x: 0, y: 0, scaleX: 1, scaleY: 1 } }
      }
      return { node, delta: createFlipDelta(fromRect, toRect) }
    })

    root.dataset.worldMorphing = 'true'
    prepared = true
    setProgress(0)
  }

  function setProgress(progress) {
    if (!prepared || reducedMotion || destroyed) return
    const t = clamp01(progress)
    for (const { node, delta } of records) {
      const frame = sampleFlip(delta, t)
      node.style.setProperty('--morph-x', `${frame.x}px`)
      node.style.setProperty('--morph-y', `${frame.y}px`)
      node.style.setProperty('--morph-scale-x', String(frame.scaleX))
      node.style.setProperty('--morph-scale-y', String(frame.scaleY))
    }
  }

  function finish() {
    if (!root || destroyed) return
    for (const { node } of records) clearNodeTransform(node)
    root.dataset.layoutWorld = targetWorld
    delete root.dataset.worldMorphing
    records = []
    prepared = false
  }

  function refresh() {
    if (!root || destroyed || prepared) return
    root.dataset.layoutWorld = root.dataset.world === 'observatory' ? 'observatory' : 'solar'
  }

  function destroy() {
    if (destroyed) return
    for (const { node } of records) clearNodeTransform(node)
    records = []
    prepared = false
    destroyed = true
    if (root) delete root.dataset.worldMorphing
  }

  return { prepare, setProgress, finish, refresh, destroy }
}
