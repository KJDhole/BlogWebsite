const clamp01 = value => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))

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
  return {
    x: delta.x * remaining,
    y: delta.y * remaining,
    scaleX: 1 + (delta.scaleX - 1) * remaining,
    scaleY: 1 + (delta.scaleY - 1) * remaining
  }
}

function measure(nodes) {
  const rects = new Map()
  for (const node of nodes) {
    const key = node.dataset.worldMorph
    if (!key || node.hidden) continue
    const rect = node.getBoundingClientRect()
    rects.set(key, {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    })
  }
  return rects
}

function clearNode(node) {
  node.style.removeProperty('--morph-x')
  node.style.removeProperty('--morph-y')
  node.style.removeProperty('--morph-scale-x')
  node.style.removeProperty('--morph-scale-y')
}

export function createWorldMorph(root, { reducedMotion = false } = {}) {
  let nodes = []
  let deltas = new Map()
  let prepared = false

  function refresh() {
    nodes = [...root.querySelectorAll('[data-world-morph]')]
  }

  function prepare(toWorld) {
    refresh()
    const source = measure(nodes)
    root.dataset.layoutWorld = toWorld

    if (reducedMotion) {
      prepared = true
      return
    }

    const destination = measure(nodes)
    deltas = new Map()
    root.dataset.worldMorphing = 'true'

    for (const node of nodes) {
      const key = node.dataset.worldMorph
      const fromRect = source.get(key)
      const toRect = destination.get(key)
      if (!fromRect || !toRect) continue
      const delta = createFlipDelta(fromRect, toRect)
      deltas.set(key, delta)
      node.style.setProperty('--morph-x', `${delta.x}px`)
      node.style.setProperty('--morph-y', `${delta.y}px`)
      node.style.setProperty('--morph-scale-x', String(delta.scaleX))
      node.style.setProperty('--morph-scale-y', String(delta.scaleY))
    }

    prepared = true
  }

  function setProgress(progress) {
    if (!prepared || reducedMotion) return
    for (const node of nodes) {
      const key = node.dataset.worldMorph
      const delta = deltas.get(key)
      if (!delta) continue
      const frame = sampleFlip(delta, progress)
      node.style.setProperty('--morph-x', `${frame.x}px`)
      node.style.setProperty('--morph-y', `${frame.y}px`)
      node.style.setProperty('--morph-scale-x', String(frame.scaleX))
      node.style.setProperty('--morph-scale-y', String(frame.scaleY))
    }
  }

  function finish() {
    for (const node of nodes) clearNode(node)
    delete root.dataset.worldMorphing
    deltas.clear()
    prepared = false
  }

  function destroy() {
    finish()
    nodes = []
  }

  refresh()
  return { prepare, setProgress, finish, refresh, destroy }
}
