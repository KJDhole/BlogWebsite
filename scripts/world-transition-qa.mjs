import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'

const BASE_URL = 'http://127.0.0.1:4321'
const OUT_DIR = 'world-transition-qa'
const CHECKPOINTS = [0, 180, 450, 700, 950, 1250, 1500]
const DURATION_MS = 1500
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 }
]

await mkdir(OUT_DIR, { recursive: true })
const browser = await chromium.launch({ headless: true })
const report = { runs: [], failures: [] }

function fail(message, detail = {}) {
  report.failures.push({ message, ...detail })
}

function pad(ms) {
  return String(ms).padStart(4, '0')
}

async function installProbe(page) {
  await page.evaluate(() => {
    window.__worldQaFrames = []
    window.addEventListener('glenn:worldtransition', event => {
      window.__worldQaFrames.push({ ...event.detail, at: performance.now() })
    })
  })
}

async function snapshotState(page) {
  return page.evaluate(() => {
    const root = document.documentElement
    const layer = document.querySelector('[data-theme-transition]')
    const styles = getComputedStyle(root)
    return {
      theme: root.dataset.theme || null,
      world: root.dataset.world || null,
      phase: layer?.dataset.phase || null,
      direction: layer?.dataset.direction || null,
      active: Boolean(layer?.classList.contains('is-active')),
      originX: Number.parseFloat(styles.getPropertyValue('--world-origin-x')),
      originY: Number.parseFloat(styles.getPropertyValue('--world-origin-y')),
      innerWidth: window.innerWidth,
      scrollWidth: Math.max(root.scrollWidth, document.body?.scrollWidth ?? 0),
      frames: window.__worldQaFrames ?? []
    }
  })
}

async function waitForCheckpoint(page, targetMs, direction) {
  const target = targetMs / DURATION_MS
  if (targetMs === 0) {
    await page.waitForFunction(expectedDirection => {
      const frames = window.__worldQaFrames ?? []
      return frames.some(frame => frame.direction === expectedDirection)
    }, direction)
    return
  }

  if (targetMs >= DURATION_MS) {
    await page.waitForFunction(() => {
      const layer = document.querySelector('[data-theme-transition]')
      return !layer?.classList.contains('is-active')
    })
    return
  }

  await page.waitForFunction(({ target, direction }) => {
    const frames = window.__worldQaFrames ?? []
    return frames.some(frame => frame.direction === direction && frame.progress >= target)
  }, { target, direction })
}

async function runDirection(page, viewport, { fromTheme, fromWorld, toWorld, direction, navigate = true }) {
  if (navigate) await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  const initial = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    world: document.documentElement.dataset.world
  }))
  if (initial.theme !== fromTheme || initial.world !== fromWorld) {
    fail('Transition started from the wrong persisted world', { viewport: viewport.name, direction, initial, fromTheme, fromWorld })
  }

  await installProbe(page)
  const button = page.locator('[data-world-toggle]').first()
  const box = await button.boundingBox()
  if (!box) throw new Error('Missing visible world toggle')
  const expectedOrigin = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  await button.click()

  await page.waitForFunction(() => {
    const value = getComputedStyle(document.documentElement).getPropertyValue('--world-origin-x')
    return Number.isFinite(Number.parseFloat(value))
  })

  const geometry = await snapshotState(page)
  if (Math.abs(geometry.originX - expectedOrigin.x) > 2 || Math.abs(geometry.originY - expectedOrigin.y) > 2) {
    fail('Solar wave origin drifted away from the actual toggle center', {
      viewport: viewport.name,
      direction,
      expectedOrigin,
      actualOrigin: { x: geometry.originX, y: geometry.originY }
    })
  }

  const frames = []
  for (const checkpoint of CHECKPOINTS) {
    await waitForCheckpoint(page, checkpoint, direction)
    const state = await snapshotState(page)
    if (state.scrollWidth > state.innerWidth + 1) {
      fail('Transition caused horizontal overflow', { viewport: viewport.name, direction, checkpoint, state })
    }
    if (checkpoint >= 450 && checkpoint < 1500 && direction === 'to-solar' && state.world !== 'solar') {
      fail('Solar world had not swapped by the wave checkpoint', { viewport: viewport.name, direction, checkpoint, state })
    }
    await page.screenshot({
      path: `${OUT_DIR}/${viewport.name}-${direction}-${pad(checkpoint)}.png`,
      fullPage: false
    })
    frames.push({ checkpoint, world: state.world, phase: state.phase, active: state.active })
  }

  const final = await snapshotState(page)
  if (final.world !== toWorld) fail('Transition settled on the wrong world', { viewport: viewport.name, direction, final, toWorld })
  if (final.active || final.phase) fail('Transition furniture remained active after settle', { viewport: viewport.name, direction, final })

  report.runs.push({ viewport: viewport.name, direction, expectedOrigin, frames, finalWorld: final.world })
}

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      reducedMotion: 'no-preference',
      colorScheme: 'dark'
    })
    await context.addInitScript(() => {
      localStorage.setItem('glenn-blog-theme', 'dark')
    })

    const page = await context.newPage()
    const consoleErrors = []
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('pageerror', error => consoleErrors.push(error.message))

    try {
      await runDirection(page, viewport, {
        fromTheme: 'dark',
        fromWorld: 'observatory',
        toWorld: 'solar',
        direction: 'to-solar'
      })

      if (viewport.name === 'desktop') {
        await runDirection(page, viewport, {
          fromTheme: 'light',
          fromWorld: 'solar',
          toWorld: 'observatory',
          direction: 'to-observatory',
          navigate: false
        })
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
  console.log(`World Transition QA passed: ${report.runs.length} transition run(s), checkpoints ${CHECKPOINTS.join(', ')}.`)
}