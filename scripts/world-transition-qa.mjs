import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { getTransitionFrame, worldToTheme } from '../src/scripts/themeWorld.mjs'

const BASE_URL = 'http://127.0.0.1:4321'
const OUT_DIR = 'world-transition-qa'
const WORLD_COMMIT_AT_MS = 820
const CHECKPOINTS = [0, 60, 120, 180, 300, 450, 520, 650, 820, 950, 1080, 1320, 1500]
const SIGNATURE_PHASES = ['ignition', 'fold', 'layout-release', 'radiation', 'solar-arrival', 'index-rebuild', 'settle']
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 }
]

await mkdir(OUT_DIR, { recursive: true })
const browser = await chromium.launch({ headless: true })
const report = { liveRuns: [], frames: [], failures: [] }

function fail(message, detail = {}) {
  report.failures.push({ message, ...detail })
}

function pad(ms) {
  return String(ms).padStart(4, '0')
}

function rectSnapshot(rect) {
  if (!rect) return null
  return {
    left: Math.round(rect.left * 10) / 10,
    top: Math.round(rect.top * 10) / 10,
    width: Math.round(rect.width * 10) / 10,
    height: Math.round(rect.height * 10) / 10
  }
}

function materiallyDifferent(a, b) {
  if (!a || !b) return false
  return Math.abs(a.left - b.left) > 24 || Math.abs(a.top - b.top) > 24 || Math.abs(a.width - b.width) > 24 || Math.abs(a.height - b.height) > 24
}

function getWaveScale(detail) {
  const start = detail.waveScaleStart
  const full = 1.02
  if (detail.phase === 'radiation') {
    return detail.direction === 'to-observatory'
      ? full + (start - full) * detail.phaseProgress
      : start + (full - start) * detail.phaseProgress
  }
  const afterRadiation = detail.elapsedMs >= WORLD_COMMIT_AT_MS
  if (detail.direction === 'to-observatory') return afterRadiation ? start : full
  return afterRadiation ? full : start
}

function createDetail({ fromWorld, toWorld, direction, geometry, checkpoint }) {
  const frame = getTransitionFrame(checkpoint, direction)
  const committed = checkpoint >= WORLD_COMMIT_AT_MS
  return {
    fromWorld,
    toWorld,
    theme: worldToTheme(toWorld),
    world: committed ? toWorld : fromWorld,
    direction,
    progress: frame.progress,
    phase: frame.phase,
    phaseProgress: frame.phaseProgress,
    elapsedMs: frame.elapsedMs ?? checkpoint,
    originX: geometry.origin.x,
    originY: geometry.origin.y,
    toggleDiameter: geometry.toggleDiameter,
    waveRadius: geometry.waveRadius,
    waveScaleStart: geometry.waveScaleStart
  }
}

async function loadWorld(page, world) {
  const theme = worldToTheme(world)
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
  await page.evaluate(selectedTheme => localStorage.setItem('glenn-blog-theme', selectedTheme), theme)
  await page.reload({ waitUntil: 'networkidle' })
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const resolved = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    world: document.documentElement.dataset.world,
    layoutWorld: document.documentElement.dataset.layoutWorld
  }))
  if (resolved.theme !== theme || resolved.world !== world || resolved.layoutWorld !== world) {
    fail('Persisted theme did not resolve to requested QA world', { requested: { theme, world }, resolved })
  }
}

async function getToggleGeometry(page) {
  const button = page.locator('[data-world-toggle]').first()
  const box = await button.boundingBox()
  if (!box) throw new Error('Missing visible world toggle')
  const origin = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  const viewport = page.viewportSize()
  const waveRadius = Math.hypot(
    Math.max(origin.x, viewport.width - origin.x),
    Math.max(origin.y, viewport.height - origin.y)
  )
  const toggleDiameter = Math.max(box.width, box.height, 1)
  const waveScaleStart = toggleDiameter / Math.max(1, waveRadius * 2)
  return {
    button,
    box,
    origin,
    waveRadius,
    toggleDiameter,
    waveScaleStart
  }
}

async function dispatchOffCenterToggleClick(button, box) {
  await button.evaluate((node, point) => {
    node.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: point.x,
      clientY: point.y
    }))
  }, { x: box.x + 2, y: box.y + 2 })
}

async function armLiveProbe(page) {
  return page.evaluate(() => {
    window.__worldQaFrames = []
    window.__worldQaLatest = null
    window.__worldQaHero = document.querySelector('#hero-title')
    window.__worldQaFirstArticle = document.querySelector('.article-row')
    const heroRect = window.__worldQaHero?.getBoundingClientRect()
    const sceneRect = document.querySelector('[data-space-scene]')?.getBoundingClientRect()
    window.addEventListener('glenn:worldtransition', event => {
      const detail = { ...event.detail, at: performance.now() }
      window.__worldQaLatest = detail
      window.__worldQaFrames.push(detail)
    })
    return {
      heroRect: heroRect ? { left: heroRect.left, top: heroRect.top, width: heroRect.width, height: heroRect.height } : null,
      sceneRect: sceneRect ? { left: sceneRect.left, top: sceneRect.top, width: sceneRect.width, height: sceneRect.height } : null
    }
  })
}

async function readLiveState(page) {
  return page.evaluate(() => {
    const root = document.documentElement
    const rootStyles = getComputedStyle(root)
    const layer = document.querySelector('[data-theme-transition]')
    const wave = document.querySelector('[data-solar-wave]')
    const hero = document.querySelector('#hero-title')
    const firstArticle = document.querySelector('.article-row')
    const scene = document.querySelector('[data-space-scene]')
    const heroRect = hero?.getBoundingClientRect()
    const sceneRect = scene?.getBoundingClientRect()
    const waveStyles = wave ? getComputedStyle(wave) : null
    const overflowing = [...document.querySelectorAll('body *')]
      .map(node => {
        const rect = node.getBoundingClientRect()
        const style = getComputedStyle(node)
        const morphOwner = node.closest?.('[data-world-morph]')
        return {
          tag: node.tagName.toLowerCase(),
          id: node.id || null,
          className: typeof node.className === 'string' ? node.className : null,
          text: (node.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80) || null,
          worldMorph: node.dataset?.worldMorph || null,
          nearestWorldMorph: morphOwner?.dataset?.worldMorph || null,
          left: Math.round(rect.left * 10) / 10,
          right: Math.round(rect.right * 10) / 10,
          width: Math.round(rect.width * 10) / 10,
          position: style.position,
          display: style.display,
          visibility: style.visibility
        }
      })
      .filter(item => item.visibility !== 'hidden' && item.width > 0 && (item.right > innerWidth + 1 || item.left < -1))
      .sort((a, b) => Math.max(b.right - innerWidth, -b.left) - Math.max(a.right - innerWidth, -a.left))
      .slice(0, 12)

    return {
      latest: window.__worldQaLatest,
      frames: window.__worldQaFrames ?? [],
      world: root.dataset.world,
      layoutWorld: root.dataset.layoutWorld,
      theme: root.dataset.theme,
      phase: layer?.dataset.phase ?? null,
      active: Boolean(layer?.classList.contains('is-active')),
      originX: Number.parseFloat(rootStyles.getPropertyValue('--world-origin-x')),
      originY: Number.parseFloat(rootStyles.getPropertyValue('--world-origin-y')),
      toggleDiameter: Number.parseFloat(rootStyles.getPropertyValue('--world-toggle-diameter')),
      waveRadius: Number.parseFloat(rootStyles.getPropertyValue('--world-wave-radius')),
      waveScaleStart: Number.parseFloat(rootStyles.getPropertyValue('--world-wave-scale-start')),
      waveScale: Number.parseFloat(rootStyles.getPropertyValue('--world-wave-scale')),
      waveOpacity: waveStyles ? Number.parseFloat(waveStyles.opacity) : null,
      waveTransform: waveStyles?.transform ?? null,
      detachedEclipseCore: Boolean(document.querySelector('[data-eclipse-core]')),
      heroSame: hero === window.__worldQaHero,
      firstArticleSame: firstArticle === window.__worldQaFirstArticle,
      heroRect: heroRect ? { left: heroRect.left, top: heroRect.top, width: heroRect.width, height: heroRect.height } : null,
      sceneRect: sceneRect ? { left: sceneRect.left, top: sceneRect.top, width: sceneRect.width, height: sceneRect.height } : null,
      innerWidth,
      scrollWidth: Math.max(root.scrollWidth, document.body?.scrollWidth ?? 0),
      overflowing
    }
  })
}

function validateCommonState({ viewport, direction, checkpoint, origin, state, mode }) {
  if (Math.abs(state.originX - origin.x) > 2 || Math.abs(state.originY - origin.y) > 2) {
    fail('Transition origin drifted from toggle center', { viewport: viewport.name, direction, checkpoint, mode, origin, state })
  }
  if (state.detachedEclipseCore) {
    fail('Detached eclipse core reappeared during transition', { viewport: viewport.name, direction, checkpoint, mode })
  }
  if (!state.heroSame || !state.firstArticleSame) {
    fail('World switch replaced shared content DOM instead of morphing it', { viewport: viewport.name, direction, checkpoint, mode, state })
  }
  if (state.scrollWidth > state.innerWidth + 1) {
    fail('World transition caused horizontal overflow', {
      viewport: viewport.name,
      direction,
      checkpoint,
      mode,
      scrollWidth: state.scrollWidth,
      innerWidth: state.innerWidth,
      overflowing: state.overflowing
    })
  }
  if (Number.isFinite(state.waveRadius) && Number.isFinite(state.waveScaleStart) && Number.isFinite(state.toggleDiameter)) {
    const startingDiameter = state.waveRadius * 2 * state.waveScaleStart
    if (Math.abs(startingDiameter - state.toggleDiameter) > 2) {
      fail('Radiation wave no longer starts from toggle diameter', {
        viewport: viewport.name,
        direction,
        checkpoint,
        mode,
        startingDiameter,
        toggleDiameter: state.toggleDiameter
      })
    }
  }
}

function validateObservedPhaseOrder({ viewport, direction, frames }) {
  const indices = frames
    .map(frame => SIGNATURE_PHASES.indexOf(frame.phase))
    .filter(index => index >= 0)
  if (!indices.length || frames[0]?.phase !== 'ignition' || frames.at(-1)?.phase !== 'settle') {
    fail('Live transition did not expose ignition and settle boundaries', {
      viewport: viewport.name,
      direction,
      first: frames[0]?.phase,
      last: frames.at(-1)?.phase
    })
    return
  }
  for (let index = 1; index < indices.length; index += 1) {
    if (indices[index] < indices[index - 1]) {
      fail('Live transition phase order moved backwards', { viewport: viewport.name, direction, frames })
      return
    }
  }
}

async function runLiveDirection(context, viewport, { fromWorld, toWorld, direction }) {
  const page = await context.newPage()
  const consoleErrors = []
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', error => consoleErrors.push(error.message))

  try {
    await loadWorld(page, fromWorld)
    const initial = await armLiveProbe(page)
    const geometry = await getToggleGeometry(page)
    await dispatchOffCenterToggleClick(geometry.button, geometry.box)
    await page.waitForFunction(expectedWorld => {
      const layer = document.querySelector('[data-theme-transition]')
      return document.documentElement.dataset.world === expectedWorld && !layer?.classList.contains('is-active')
    }, toWorld, { timeout: 5000 })

    const state = await readLiveState(page)
    validateCommonState({ viewport, direction, checkpoint: 1500, origin: geometry.origin, state, mode: 'live' })
    validateObservedPhaseOrder({ viewport, direction, frames: state.frames })

    if (state.world !== toWorld || state.layoutWorld !== toWorld) {
      fail('Live transition did not settle into destination world/layout', { viewport: viewport.name, direction, toWorld, state })
    }
    if (!materiallyDifferent(rectSnapshot(initial.heroRect), rectSnapshot(state.heroRect))) {
      fail('Hero title geometry did not materially change between visual worlds', {
        viewport: viewport.name,
        direction,
        from: rectSnapshot(initial.heroRect),
        to: rectSnapshot(state.heroRect)
      })
    }
    if (consoleErrors.length) {
      fail('Browser console/page errors during live transition', { viewport: viewport.name, direction, consoleErrors })
    }

    report.liveRuns.push({
      viewport: viewport.name,
      direction,
      origin: geometry.origin,
      finalWorld: state.world,
      observedPhases: [...new Set(state.frames.map(frame => frame.phase))],
      initialHeroRect: rectSnapshot(initial.heroRect),
      finalHeroRect: rectSnapshot(state.heroRect),
      initialSceneRect: rectSnapshot(initial.sceneRect),
      finalSceneRect: rectSnapshot(state.sceneRect)
    })
  } finally {
    await page.close()
  }
}

async function dispatchExactFrame(page, { fromWorld, toWorld, direction, geometry, checkpoint }) {
  const startDetail = createDetail({ fromWorld, toWorld, direction, geometry, checkpoint: 0 })
  const detail = createDetail({ fromWorld, toWorld, direction, geometry, checkpoint })
  const startWaveScale = getWaveScale(startDetail)
  const waveScale = getWaveScale(detail)

  await page.evaluate(({ startDetail, detail, startWaveScale, waveScale, checkpoint, worldCommitAtMs }) => {
    const root = document.documentElement
    const layer = document.querySelector('[data-theme-transition]')

    const setGeometry = frameDetail => {
      root.style.setProperty('--world-origin-x', `${frameDetail.originX}px`)
      root.style.setProperty('--world-origin-y', `${frameDetail.originY}px`)
      root.style.setProperty('--world-wave-radius', `${frameDetail.waveRadius}px`)
      root.style.setProperty('--world-toggle-diameter', `${frameDetail.toggleDiameter}px`)
      root.style.setProperty('--world-wave-scale-start', String(frameDetail.waveScaleStart))
    }
    const paint = (frameDetail, scale) => {
      root.style.setProperty('--world-transition-progress', String(frameDetail.progress))
      root.style.setProperty('--world-phase-progress', String(frameDetail.phaseProgress))
      root.style.setProperty('--world-wave-scale', String(scale))
      if (layer) {
        layer.classList.add('is-active')
        layer.dataset.phase = frameDetail.phase
        layer.dataset.direction = frameDetail.direction
      }
    }

    setGeometry(startDetail)
    paint(startDetail, startWaveScale)
    window.dispatchEvent(new CustomEvent('glenn:worldtransitionstart', { detail: startDetail }))
    window.dispatchEvent(new CustomEvent('glenn:worldtransition', { detail: startDetail }))

    if (checkpoint >= worldCommitAtMs) {
      root.dataset.world = detail.toWorld
      root.dataset.theme = detail.theme
      localStorage.setItem('glenn-blog-theme', detail.theme)
      window.dispatchEvent(new CustomEvent('glenn:worldchange', {
        detail: { world: detail.toWorld, theme: detail.theme }
      }))
    }

    paint(detail, waveScale)
    window.dispatchEvent(new CustomEvent('glenn:worldtransition', { detail }))

    if (checkpoint >= 1500) {
      window.dispatchEvent(new CustomEvent('glenn:worldtransitionend', {
        detail: { ...detail, progress: 1, phaseProgress: 1, world: detail.toWorld, theme: detail.theme }
      }))
      if (layer) {
        layer.classList.remove('is-active')
        delete layer.dataset.phase
        delete layer.dataset.direction
      }
      root.style.removeProperty('--world-transition-progress')
      root.style.removeProperty('--world-phase-progress')
      root.style.removeProperty('--world-wave-scale')
    }
  }, { startDetail, detail, startWaveScale, waveScale, checkpoint, worldCommitAtMs: WORLD_COMMIT_AT_MS })

  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  return detail
}

async function captureExactCheckpoint(context, viewport, { fromWorld, toWorld, direction }, checkpoint) {
  const page = await context.newPage()
  const consoleErrors = []
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', error => consoleErrors.push(error.message))

  try {
    await loadWorld(page, fromWorld)
    const initial = await armLiveProbe(page)
    const geometry = await getToggleGeometry(page)
    const detail = await dispatchExactFrame(page, { fromWorld, toWorld, direction, geometry, checkpoint })
    const state = await readLiveState(page)
    validateCommonState({ viewport, direction, checkpoint, origin: geometry.origin, state, mode: 'exact' })

    if (checkpoint < 1500 && state.phase !== detail.phase) {
      fail('Exact checkpoint rendered the wrong transition phase', {
        viewport: viewport.name,
        direction,
        checkpoint,
        expected: detail.phase,
        state
      })
    }
    if (checkpoint < 1500 && Number(state.latest?.elapsedMs) !== checkpoint) {
      fail('Exact checkpoint drifted from requested elapsed time', {
        viewport: viewport.name,
        direction,
        checkpoint,
        actualElapsed: state.latest?.elapsedMs
      })
    }
    const expectedWorld = checkpoint >= WORLD_COMMIT_AT_MS ? toWorld : fromWorld
    if (state.world !== expectedWorld) {
      fail('Exact checkpoint resolved the wrong visual world', {
        viewport: viewport.name,
        direction,
        checkpoint,
        expectedWorld,
        actualWorld: state.world
      })
    }
    if (checkpoint < 1500 && state.layoutWorld !== toWorld) {
      fail('Exact checkpoint did not keep destination layout geometry prepared', {
        viewport: viewport.name,
        direction,
        checkpoint,
        expectedLayoutWorld: toWorld,
        actualLayoutWorld: state.layoutWorld
      })
    }
    if (checkpoint >= 1500 && (state.active || state.world !== toWorld || state.layoutWorld !== toWorld)) {
      fail('Exact settled checkpoint did not finish cleanly', { viewport: viewport.name, direction, checkpoint, state })
    }
    if (checkpoint >= 520 && checkpoint < 820 && !(state.waveOpacity > 0)) {
      fail('Radiation checkpoint has no visible wave', { viewport: viewport.name, direction, checkpoint, state })
    }
    if (consoleErrors.length) {
      fail('Browser console/page errors during exact checkpoint capture', { viewport: viewport.name, direction, checkpoint, consoleErrors })
    }

    await page.screenshot({
      path: `${OUT_DIR}/${viewport.name}-${direction}-${pad(checkpoint)}.png`,
      fullPage: false
    })

    report.frames.push({
      viewport: viewport.name,
      direction,
      checkpoint,
      actualElapsed: state.latest?.elapsedMs ?? checkpoint,
      phase: checkpoint < 1500 ? state.phase : null,
      world: state.world,
      layoutWorld: state.layoutWorld,
      origin: geometry.origin,
      heroRect: rectSnapshot(state.heroRect),
      initialHeroRect: rectSnapshot(initial.heroRect),
      sceneRect: rectSnapshot(state.sceneRect),
      waveOpacity: state.waveOpacity,
      waveScale: state.waveScale,
      overflowing: state.overflowing
    })
  } finally {
    await page.close()
  }
}

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      reducedMotion: 'no-preference',
      colorScheme: 'dark'
    })

    try {
      const toSolar = { fromWorld: 'observatory', toWorld: 'solar', direction: 'to-solar' }
      await runLiveDirection(context, viewport, toSolar)
      for (const checkpoint of CHECKPOINTS) {
        await captureExactCheckpoint(context, viewport, toSolar, checkpoint)
      }

      const toObservatory = { fromWorld: 'solar', toWorld: 'observatory', direction: 'to-observatory' }
      await runLiveDirection(context, viewport, toObservatory)
      if (viewport.name === 'desktop') {
        for (const checkpoint of CHECKPOINTS) {
          await captureExactCheckpoint(context, viewport, toObservatory, checkpoint)
        }
      } else {
        await captureExactCheckpoint(context, viewport, toObservatory, 1500)
      }
    } finally {
      await context.close()
    }
  }
} finally {
  await browser.close()
  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify(report, null, 2))
}

if (report.failures.length) {
  console.error(`World Transition QA failed with ${report.failures.length} issue(s).`)
  for (const failure of report.failures) console.error('-', failure.message, JSON.stringify(failure))
  process.exitCode = 1
} else {
  console.log(`World Transition QA passed: ${report.liveRuns.length} live integrity run(s), ${report.frames.length} exact visual frame(s).`)
}
