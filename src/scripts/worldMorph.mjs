function clamp01(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
}

function smoothstep(value) {
  const t = clamp01(value)
  return t * t * (3 - 2 * t)
}

function rangeProgress(value, start, end) {
  return clamp01((value - start) / Math.max(1, end - start))
}

export function getLayoutMorphProgress(elapsedMs, direction = 'to-solar') {
  const elapsed = Math.max(0, Number(elapsedMs) || 0)
  const start = direction === 'to-observatory' ? 120 : 300
  const end = direction === 'to-observatory' ? 1200 : 1320
  return smoothstep(rangeProgress(elapsed, start, end))
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

function localProgress(key, progress) {
  const t = clamp01(progress)
  if (/^article-(date|main|meta)-\d+$/.test(key)) {
    const index = Number(key.match(/-(\d+)$/)?.[1] ?? 0)
    const start = Math.min(0.72 + index * 0.035, 0.84)
    return smoothstep(rangeProgress(t, start, 1))
  }
  if (key === 'writing-heading' || key === 'writing-tools') {
    return smoothstep(rangeProgress(t, 0.48, 0.94))
  }
  if (key === 'observation-meta') {
    return smoothstep(rangeProgress(t, 0.18, 0.78))
  }
  return t
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
        return { key, node, delta: { x: 0, y: 0, scaleX: 1, scaleY: 1 } }
      }
      return { key, node, delta: createFlipDelta(fromRect, toRect) }
    })

    root.dataset.worldMorphing = 'true'
    prepared = true
    setProgress(0)
  }

  function setProgress(progress) {
    if (!prepared || reducedMotion || destroyed) return
    const t = clamp01(progress)
    for (const { key, node, delta } of records) {
      const frame = sampleFlip(delta, localProgress(key, t))
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
