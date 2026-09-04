export function getIndicatorGeometry(trackRect, buttonRect) {
  const width = Math.max(18, buttonRect.width)
  const height = 1.5
  const offsetX = buttonRect.left - trackRect.left + (buttonRect.width - width) / 2
  return {
    width,
    height,
    offsetX,
    centerX: buttonRect.left + buttonRect.width / 2,
    centerY: trackRect.bottom - 5 - height / 2
  }
}

export function getDropGeometry(indicatorGeometry, { mobile = false } = {}) {
  const dropHeight = mobile ? 66 : 92
  const target = {
    x: indicatorGeometry.centerX,
    y: indicatorGeometry.centerY
  }
  return {
    portal: { ...target },
    dropStart: {
      x: target.x,
      y: target.y - dropHeight
    },
    target,
    targetWidth: indicatorGeometry.width,
    targetHeight: indicatorGeometry.height
  }
}

export function createNavPortal(node, { indicator, allButton } = {}) {
  let lastGeometry = null

  function measure() {
    const track = indicator?.parentElement
    if (!node || !track || !allButton) {
      lastGeometry = null
      return null
    }
    const trackRect = track.getBoundingClientRect()
    const buttonRect = allButton.getBoundingClientRect()
    lastGeometry = getIndicatorGeometry(trackRect, buttonRect)
    node.style.left = `${lastGeometry.centerX}px`
    node.style.top = `${lastGeometry.centerY}px`
    return lastGeometry
  }

  function setState(state = {}) {
    if (!node) return
    const opacity = Math.min(1, Math.max(0, state.opacity ?? 0))
    const scale = Math.max(0.01, state.scale ?? 0.01)
    const pulse = Math.min(1, Math.max(0, state.pulse ?? 0))
    node.style.opacity = String(opacity)
    node.style.setProperty('--portal-scale', String(scale * (1 + pulse * 0.08)))
    node.style.setProperty('--portal-pulse', String(pulse))
  }

  function destroy() {
    if (!node) return
    node.style.opacity = '0'
    node.style.removeProperty('--portal-scale')
    node.style.removeProperty('--portal-pulse')
    lastGeometry = null
  }

  return {
    measure,
    setState,
    destroy,
    get geometry() {
      return lastGeometry
    }
  }
}
