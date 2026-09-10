import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { getTransitionFrame, worldToTheme } from '../src/scripts/themeWorld.mjs'

const BASE_URL = 'http://127.0.0.1:4321'
const OUT_DIR = 'world-transition-qa'
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

async function loadWorld(page, world) {
  const theme = worldToTheme(world)
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
  await page.evaluate(selectedTheme => localStorage.setItem('glenn-blog-theme', selectedTheme), theme)
  await page.reload({ waitUntil: 'networkidle' })
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
  const radius = Math.hypot(
    Math.max(origin.x, viewport.width - origin.x),
    Math.max(origin.y, viewport.height - origin.y)
  )
  return { button, box, origin, radius }
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

async function waitForCheckpoint(page, checkpoint, toWorld) {
  if (checkpoint < 1500) {
    await page.waitForFunction(target => {
      const latest = window.__worldQaLatest
      return latest && Number(latest.elapsedMs) >= target
    }, checkpoint, { timeout: 5000 })
    return
  }

  await page.waitForFunction(expectedWorld => {
    const layer = document.querySelector('[data-theme-transition]')
    return document.documentElement.dataset.world === expectedWorld && !layer?.classList.contains('is-active')
  }, toWorld, { timeout: 5000 })
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
      scrollWidth: Math.max(root.scrollWidth, document.body?.scrollWidth ?? 0)
    }
  })
}

function validateCommonState({ viewport, direction, checkpoint, origin, state }) {
  if (Math.abs(state.originX - origin.x) > 2 || Math.abs(state.originY - origin.y) > 2) {
    fail('Transition origin drifted from toggle center', { viewport: viewport.name, direction, checkpoint, origin, state })
  }
  if (state.detachedEclipseCore) {
    fail('Detached eclipse core reappeared during live transition', { viewport: viewport.name, direction, checkpoint })
  }
  if (!state.heroSame || !state.firstArticleSame) {
    fail('World switch replaced shared content DOM instead of morphing it', { viewport: viewport.name, direction, checkpoint, state })
  }
  if (state.scrollWidth > state.innerWidth + 1) {
    fail('Live transition caused horizontal overflow', { viewport: viewport.name, direction, checkpoint, state })
  }
  if (Number.isFinite(state.waveRadius) && Number.isFinite(state.waveScaleStart) && Number.isFinite(state.toggleDiameter)) {
    const startingDiameter = state.waveRadius * 2 * state.waveScaleStart
    if (Math.abs(startingDiameter - state.toggleDiameter) > 2) {
      fail('Radiation wave no longer starts from toggle diameter', {
        viewport: viewport.name,
        direction,
        checkpoint,
        startingDiameter,
        toggleDiameter: state.toggleDiameter,
        state
      })
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
    const { button, origin } = await getToggleGeometry(page)

    // Deliberately click near the button's upper-left edge. Origin must still be the button center.
    await button.click({ position: { x: 2, y: 2 } })
    await waitForCheckpoint(page, 1500, toWorld)

    const state = await readLiveState(page)
    validateCommonState({ viewport, direction, checkpoint: 1500, origin, state })
    const phases = [...new Set(state.frames.map(frame => frame.phase))]
    for (const phase of SIGNATURE_PHASES) {
      if (!phases.includes(phase)) {
        fail('Live transition skipped signature phase', { viewport: viewport.name, direction, phase, phases })
      }
    }
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
      origin,
      finalWorld: state.world,
      phases,
      initialHeroRect: rectSnapshot(initial.heroRect),
      finalHeroRect: rectSnapshot(state.heroRect),
      initialSceneRect: rectSnapshot(initial.sceneRect),
      finalSceneRect: rectSnapshot(state.sceneRect)
    })
  } finally {
    await page.close()
  }
}

async function captureLiveCheckpoint(context, viewport, { fromWorld, toWorld, direction }, checkpoint) {
  const page = await context.newPage()
  const consoleErrors = []
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', error => consoleErrors.push(error.message))

  try {
    await loadWorld(page, fromWorld)
    const initial = await armLiveProbe(page)
    const { button, origin } = await getToggleGeometry(page)
    await button.click({ position: { x: 2, y: 2 } })
    await waitForCheckpoint(page, checkpoint, toWorld)

    const state = await readLiveState(page)
    validateCommonState({ viewport, direction, checkpoint, origin, state })

    const actualElapsed = Number(state.latest?.elapsedMs ?? (checkpoint >= 1500 ? 1500 : checkpoint))
    const expectedFrame = getTransitionFrame(actualElapsed, direction)
    if (checkpoint < 1500 && state.phase !== expectedFrame.phase) {
      fail('Live checkpoint rendered an unexpected transition phase', {
        viewport: viewport.name,
        direction,
        checkpoint,
        actualElapsed,
        expected: expectedFrame.phase,
        state
      })
    }
    if (checkpoint >= 1500 && state.active) {
      fail('Settled checkpoint left transition layer active', { viewport: viewport.name, direction, checkpoint, state })
    }
    if (checkpoint >= 520 && checkpoint < 820 && !(state.waveOpacity > 0)) {
      fail('Radiation phase has no visible wave', { viewport: viewport.name, direction, checkpoint, state })
    }
    if (consoleErrors.length) {
      fail('Browser console/page errors during checkpoint capture', { viewport: viewport.name, direction, checkpoint, consoleErrors })
    }

    await page.screenshot({
      path: `${OUT_DIR}/${viewport.name}-${direction}-${pad(checkpoint)}.png`,
      fullPage: false
    })

    report.frames.push({
      viewport: viewport.name,
      direction,
      checkpoint,
      actualElapsed,
      phase: checkpoint < 1500 ? state.phase : null,
      world: state.world,
      layoutWorld: state.layoutWorld,
      origin,
      heroRect: rectSnapshot(state.heroRect),
      initialHeroRect: rectSnapshot(initial.heroRect),
      sceneRect: rectSnapshot(state.sceneRect),
      waveOpacity: state.waveOpacity,
      waveScale: state.waveScale
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
        await captureLiveCheckpoint(context, viewport, toSolar, checkpoint)
      }

      if (viewport.name === 'desktop') {
        const toObservatory = { fromWorld: 'solar', toWorld: 'observatory', direction: 'to-observatory' }
        await runLiveDirection(context, viewport, toObservatory)
        for (const checkpoint of CHECKPOINTS) {
          await captureLiveCheckpoint(context, viewport, toObservatory, checkpoint)
        }
      } else {
        // Mobile reverse still gets a full live integrity pass plus the final settled screenshot.
        const toObservatory = { fromWorld: 'solar', toWorld: 'observatory', direction: 'to-observatory' }
        await runLiveDirection(context, viewport, toObservatory)
        await captureLiveCheckpoint(context, viewport, toObservatory, 1500)
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
  console.log(`World Transition QA passed: ${report.liveRuns.length} live transition run(s), ${report.frames.length} dense live frame(s).`)
}
