import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { getTransitionFrame, worldToTheme } from '../src/scripts/themeWorld.mjs'

const BASE_URL = 'http://127.0.0.1:4321'
const OUT_DIR = 'world-transition-qa'
const CHECKPOINTS = [0, 180, 450, 700, 950, 1250, 1500]
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

async function loadWorld(page, world) {
  const theme = worldToTheme(world)
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  await page.evaluate(selectedTheme => localStorage.setItem('glenn-blog-theme', selectedTheme), theme)
  await page.reload({ waitUntil: 'networkidle' })
  const resolved = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    world: document.documentElement.dataset.world
  }))
  if (resolved.theme !== theme || resolved.world !== world) {
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
  return { button, origin, radius }
}

async function runLiveDirection(page, viewport, { fromWorld, toWorld, direction }) {
  await loadWorld(page, fromWorld)
  await page.evaluate(() => {
    window.__worldQaFrames = []
    window.addEventListener('glenn:worldtransition', event => {
      window.__worldQaFrames.push({ ...event.detail, at: performance.now() })
    }, { once: false })
  })

  const { button, origin } = await getToggleGeometry(page)
  await button.click()

  await page.waitForFunction(expectedWorld => {
    const layer = document.querySelector('[data-theme-transition]')
    return document.documentElement.dataset.world === expectedWorld && !layer?.classList.contains('is-active')
  }, toWorld)

  const state = await page.evaluate(() => {
    const root = document.documentElement
    const styles = getComputedStyle(root)
    const frames = window.__worldQaFrames ?? []
    return {
      world: root.dataset.world,
      originX: Number.parseFloat(styles.getPropertyValue('--world-origin-x')),
      originY: Number.parseFloat(styles.getPropertyValue('--world-origin-y')),
      innerWidth: innerWidth,
      scrollWidth: Math.max(root.scrollWidth, document.body?.scrollWidth ?? 0),
      phases: [...new Set(frames.map(frame => frame.phase))]
    }
  })

  if (Math.abs(state.originX - origin.x) > 2 || Math.abs(state.originY - origin.y) > 2) {
    fail('Live transition origin drifted from toggle center', { viewport: viewport.name, direction, origin, state })
  }
  if (state.scrollWidth > state.innerWidth + 1) {
    fail('Live transition caused horizontal overflow', { viewport: viewport.name, direction, state })
  }
  for (const phase of ['eclipse', 'totality', 'solar-wave', 'solar-reveal', 'archive-settle']) {
    if (!state.phases.includes(phase)) fail('Live transition skipped signature phase', { viewport: viewport.name, direction, phase, phases: state.phases })
  }

  report.liveRuns.push({ viewport: viewport.name, direction, origin, finalWorld: state.world, phases: state.phases })
}

async function captureExactFrame(page, viewport, { fromWorld, toWorld, direction }, checkpoint) {
  await loadWorld(page, fromWorld)
  const { origin, radius } = await getToggleGeometry(page)
  const frame = getTransitionFrame(checkpoint, direction)
  const swapped = checkpoint >= 450
  const visualWorld = swapped ? toWorld : fromWorld
  const visualTheme = worldToTheme(visualWorld)
  const active = checkpoint < 1500

  // Resolve the actual base world before freezing the transition furniture.
  // Directly mutating data-world left the renderer and page surface in a mixed state,
  // which made exact screenshots darker than the real transition/stable destination.
  if (visualWorld !== fromWorld) await loadWorld(page, visualWorld)
  const stableBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)

  await page.evaluate(({ frame, direction, origin, radius, visualWorld, visualTheme, active, fromWorld, toWorld }) => {
    const root = document.documentElement
    const layer = document.querySelector('[data-theme-transition]')

    root.dataset.world = visualWorld
    root.dataset.theme = visualTheme
    root.style.setProperty('--world-origin-x', `${origin.x}px`)
    root.style.setProperty('--world-origin-y', `${origin.y}px`)
    root.style.setProperty('--world-wave-radius', `${radius}px`)
    root.style.setProperty('--world-transition-progress', String(frame.progress))
    root.style.setProperty('--world-phase-progress', String(frame.phaseProgress))

    if (layer) {
      layer.classList.toggle('is-active', active)
      if (active) {
        layer.dataset.phase = frame.phase
        layer.dataset.direction = direction
      } else {
        delete layer.dataset.phase
        delete layer.dataset.direction
      }
    }

    window.dispatchEvent(new CustomEvent('glenn:worldchange', {
      detail: { theme: visualTheme, world: visualWorld }
    }))
    if (active) {
      window.dispatchEvent(new CustomEvent('glenn:worldtransition', {
        detail: {
          fromWorld,
          toWorld,
          theme: visualTheme,
          world: visualWorld,
          direction,
          progress: frame.progress,
          phase: frame.phase,
          phaseProgress: frame.phaseProgress,
          originX: origin.x,
          originY: origin.y
        }
      }))
    }
  }, { frame, direction, origin, radius, visualWorld, visualTheme, active, fromWorld, toWorld })

  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const state = await page.evaluate(() => {
    const root = document.documentElement
    const layer = document.querySelector('[data-theme-transition]')
    return {
      world: root.dataset.world,
      theme: root.dataset.theme,
      phase: layer?.dataset.phase ?? null,
      active: Boolean(layer?.classList.contains('is-active')),
      backgroundColor: getComputedStyle(document.body).backgroundColor,
      innerWidth: innerWidth,
      scrollWidth: Math.max(root.scrollWidth, document.body?.scrollWidth ?? 0)
    }
  })

  if (state.scrollWidth > state.innerWidth + 1) {
    fail('Frozen transition frame caused horizontal overflow', { viewport: viewport.name, direction, checkpoint, state })
  }
  if (state.world !== visualWorld || state.theme !== visualTheme) {
    fail('Frozen transition frame resolved the wrong base world', {
      viewport: viewport.name,
      direction,
      checkpoint,
      expected: { world: visualWorld, theme: visualTheme },
      state
    })
  }
  if (active && state.phase !== frame.phase) {
    fail('Frozen transition frame rendered the wrong phase', { viewport: viewport.name, direction, checkpoint, expected: frame.phase, state })
  }
  if (!active && state.backgroundColor !== stableBackground) {
    fail('Settled transition frame no longer matches the stable destination surface', {
      viewport: viewport.name,
      direction,
      checkpoint,
      stableBackground,
      state
    })
  }

  await page.screenshot({
    path: `${OUT_DIR}/${viewport.name}-${direction}-${pad(checkpoint)}.png`,
    fullPage: false
  })
  report.frames.push({ viewport: viewport.name, direction, checkpoint, phase: active ? frame.phase : null, world: visualWorld })
}

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      reducedMotion: 'no-preference',
      colorScheme: 'dark'
    })
    const page = await context.newPage()
    const consoleErrors = []
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('pageerror', error => consoleErrors.push(error.message))

    try {
      const toSolar = { fromWorld: 'observatory', toWorld: 'solar', direction: 'to-solar' }
      await runLiveDirection(page, viewport, toSolar)
      for (const checkpoint of CHECKPOINTS) await captureExactFrame(page, viewport, toSolar, checkpoint)

      if (viewport.name === 'desktop') {
        const toObservatory = { fromWorld: 'solar', toWorld: 'observatory', direction: 'to-observatory' }
        await runLiveDirection(page, viewport, toObservatory)
        for (const checkpoint of CHECKPOINTS) await captureExactFrame(page, viewport, toObservatory, checkpoint)
      }
    } catch (error) {
      fail('Unhandled transition QA error', {
        viewport: viewport.name,
        error: error instanceof Error ? error.message : String(error)
      })
    } finally {
      if (consoleErrors.length) fail('Browser console/page errors during transition QA', { viewport: viewport.name, consoleErrors })
      await page.close()
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
  console.log(`World Transition QA passed: ${report.liveRuns.length} live transition run(s), ${report.frames.length} exact visual frame(s).`)
}
