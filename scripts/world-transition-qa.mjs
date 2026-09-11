import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { getTransitionFrame, worldToTheme } from '../src/scripts/themeWorld.mjs'
import { getStarTransitionFrame, getLayerFoldStrength } from '../src/scripts/starField.mjs'

const BASE_URL = 'http://127.0.0.1:4321'
const OUT_DIR = 'world-transition-qa'
const CHECKPOINTS = [0, 60, 120, 180, 300, 450, 520, 650, 820, 950, 1080, 1320, 1500]
const PHASES = ['ignition', 'convergence', 'layout-release', 'radiation', 'solar-arrival', 'index-reconstruction', 'settle']
const viewports = [
  { name: 'desktop', width: 1440, height: 1000, exactFrames: true },
  { name: 'laptop', width: 1024, height: 768, exactFrames: false },
  { name: 'tablet', width: 768, height: 1024, exactFrames: false },
  { name: 'mobile', width: 390, height: 844, exactFrames: true },
  { name: 'compact', width: 360, height: 800, exactFrames: false }
]

await mkdir(OUT_DIR, { recursive: true })
const browser = await chromium.launch({ headless: true })
const report = { liveRuns: [], hardeningRuns: [], reducedMotion: [], frames: [], fold: [], failures: [] }

function fail(message, detail = {}) {
  report.failures.push({ message, ...detail })
}

function pad(ms) {
  return String(ms).padStart(4, '0')
}

function waveScale(frame, startScale) {
  if (frame.phase === 'radiation') return startScale + (1 - startScale) * frame.phaseProgress
  if (frame.phase === 'solar-arrival') return 1 + frame.phaseProgress * 0.012
  if (frame.phase === 'index-reconstruction') return 1.012 + frame.phaseProgress * 0.005
  if (frame.phase === 'settle') return 1.017 + frame.phaseProgress * 0.003
  return startScale
}

async function loadWorld(page, world) {
  const theme = worldToTheme(world)
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  await page.evaluate(selectedTheme => localStorage.setItem('glenn-blog-theme', selectedTheme), theme)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(100)
  const resolved = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    world: document.documentElement.dataset.world,
    layoutWorld: document.documentElement.dataset.layoutWorld
  }))
  if (resolved.theme !== theme || resolved.world !== world || resolved.layoutWorld !== world) {
    fail('Persisted world did not settle to matching visual/layout state', { requested: { theme, world }, resolved })
  }
}

async function getToggleGeometry(page) {
  const button = page.locator('[data-world-toggle]').first()
  await button.scrollIntoViewIfNeeded()
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)))
  const box = await button.boundingBox()
  if (!box) throw new Error('Missing visible world toggle')
  const origin = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  const toggleRadius = Math.max(box.width, box.height) / 2
  const viewport = page.viewportSize()
  const radius = Math.hypot(
    Math.max(origin.x, viewport.width - origin.x),
    Math.max(origin.y, viewport.height - origin.y)
  )
  return { button, box, origin, toggleRadius, radius }
}

async function inspectStableState(page) {
  return page.evaluate(() => {
    const root = document.documentElement
    const layer = document.querySelector('[data-theme-transition]')
    return {
      world: root.dataset.world,
      layoutWorld: root.dataset.layoutWorld,
      worldTransitioning: root.dataset.worldTransitioning ?? null,
      worldMorphing: root.dataset.worldMorphing ?? null,
      layerActive: Boolean(layer?.classList.contains('is-active')),
      innerWidth,
      scrollWidth: Math.max(root.scrollWidth, document.body?.scrollWidth ?? 0)
    }
  })
}

async function captureStableState(page, viewport, world, label) {
  const state = await inspectStableState(page)
  if (state.world !== world || state.layoutWorld !== world) {
    fail('Hardening stable state did not settle to one world/layout', { viewport: viewport.name, world, label, state })
  }
  if (state.worldTransitioning || state.worldMorphing || state.layerActive) {
    fail('Hardening stable state retained transient transition state', { viewport: viewport.name, world, label, state })
  }
  if (state.scrollWidth > state.innerWidth + 1) {
    fail('Hardening stable state caused horizontal overflow', { viewport: viewport.name, world, label, state })
  }

  await page.screenshot({ path: `${OUT_DIR}/${viewport.name}-${label}-stable.png`, fullPage: false })
  report.hardeningRuns.push({ viewport: viewport.name, width: viewport.width, world, label, ...state })
}

async function runLiveDirection(page, viewport, { fromWorld, toWorld, direction }, clickSide) {
  await loadWorld(page, fromWorld)
  await page.evaluate(() => {
    window.__worldQaFrames = []
    window.__heroBefore = document.querySelector('#hero-title')
    window.__articleBefore = [...document.querySelectorAll('.article-row')]
    window.addEventListener('glenn:worldtransition', event => {
      window.__worldQaFrames.push({ ...event.detail, at: performance.now() })
    })
  })

  const { button, box, origin, toggleRadius } = await getToggleGeometry(page)
  const clickX = clickSide === 'left' ? Math.max(2, box.width * 0.12) : Math.min(box.width - 2, box.width * 0.88)
  await button.click({ position: { x: clickX, y: box.height / 2 } })

  await page.waitForFunction(expectedWorld => {
    const layer = document.querySelector('[data-theme-transition]')
    return document.documentElement.dataset.world === expectedWorld && !layer?.classList.contains('is-active')
  }, toWorld)

  const state = await page.evaluate(() => {
    const root = document.documentElement
    const styles = getComputedStyle(root)
    const frames = window.__worldQaFrames ?? []
    const heroAfter = document.querySelector('#hero-title')
    const articleAfter = [...document.querySelectorAll('.article-row')]
    return {
      world: root.dataset.world,
      layoutWorld: root.dataset.layoutWorld,
      originX: Number.parseFloat(styles.getPropertyValue('--world-origin-x')),
      originY: Number.parseFloat(styles.getPropertyValue('--world-origin-y')),
      innerWidth,
      scrollWidth: Math.max(root.scrollWidth, document.body?.scrollWidth ?? 0),
      phases: [...new Set(frames.map(frame => frame.phase))],
      sameHeroNode: window.__heroBefore === heroAfter,
      sameArticleNodes: window.__articleBefore.length === articleAfter.length && window.__articleBefore.every((node, index) => node === articleAfter[index])
    }
  })

  if (Math.abs(state.originX - origin.x) > 2 || Math.abs(state.originY - origin.y) > 2) {
    fail('Live transition origin drifted from toggle center', { viewport: viewport.name, direction, clickSide, origin, state })
  }
  if (!state.sameHeroNode) fail('Hero title was replaced instead of morphed as the same DOM node', { viewport: viewport.name, direction })
  if (!state.sameArticleNodes) fail('Article rows were replaced instead of morphed as the same DOM nodes', { viewport: viewport.name, direction })
  if (state.world !== toWorld || state.layoutWorld !== toWorld) fail('World/layout state did not settle together', { viewport: viewport.name, direction, state })
  if (state.scrollWidth > state.innerWidth + 1) fail('Live transition caused horizontal overflow', { viewport: viewport.name, direction, state })
  for (const required of ['ignition', 'convergence', 'layout-release', 'radiation', 'settle']) {
    if (!state.phases.includes(required)) fail('Live transition skipped a load-bearing phase', { viewport: viewport.name, direction, required, phases: state.phases })
  }

  report.liveRuns.push({
    viewport: viewport.name,
    direction,
    clickSide,
    origin,
    toggleRadius,
    finalWorld: state.world,
    phases: state.phases,
    sameHeroNode: state.sameHeroNode,
    sameArticleNodes: state.sameArticleNodes
  })
}

async function runReducedMotion(page, viewport) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await loadWorld(page, 'observatory')
  await page.evaluate(() => {
    window.__reducedMotionEvents = { start: 0, transition: 0, end: 0 }
    window.addEventListener('glenn:worldtransitionstart', () => { window.__reducedMotionEvents.start += 1 })
    window.addEventListener('glenn:worldtransition', () => { window.__reducedMotionEvents.transition += 1 })
    window.addEventListener('glenn:worldtransitionend', () => { window.__reducedMotionEvents.end += 1 })
  })

  const { button } = await getToggleGeometry(page)
  await button.click()
  await page.waitForFunction(() => {
    const root = document.documentElement
    return root.dataset.world === 'solar' && root.dataset.layoutWorld === 'solar'
  })
  await page.waitForTimeout(40)

  const solarState = await page.evaluate(() => {
    const root = document.documentElement
    const layer = document.querySelector('[data-theme-transition]')
    const wave = document.querySelector('[data-solar-wave]')
    return {
      world: root.dataset.world,
      layoutWorld: root.dataset.layoutWorld,
      worldTransitioning: root.dataset.worldTransitioning ?? null,
      worldMorphing: root.dataset.worldMorphing ?? null,
      layerActive: Boolean(layer?.classList.contains('is-active')),
      waveOpacity: wave ? Number.parseFloat(getComputedStyle(wave).opacity) : 0,
      innerWidth,
      scrollWidth: Math.max(root.scrollWidth, document.body?.scrollWidth ?? 0),
      events: { ...window.__reducedMotionEvents }
    }
  })

  if (solarState.worldTransitioning || solarState.worldMorphing || solarState.layerActive) {
    fail('Reduced motion activated animated transition surfaces', { viewport: viewport.name, state: solarState })
  }
  if (solarState.events.start !== 0 || solarState.events.transition !== 0) {
    fail('Reduced motion dispatched animated transition frames', { viewport: viewport.name, state: solarState })
  }
  if (solarState.events.end !== 1) {
    fail('Reduced motion did not emit one settled transition end', { viewport: viewport.name, state: solarState })
  }
  if (solarState.scrollWidth > solarState.innerWidth + 1) {
    fail('Reduced motion Solar state caused horizontal overflow', { viewport: viewport.name, state: solarState })
  }

  await page.screenshot({ path: `${OUT_DIR}/${viewport.name}-reduced-solar.png`, fullPage: false })

  const reverseToggle = page.locator('[data-world-toggle]').first()
  await reverseToggle.click()
  await page.waitForFunction(() => {
    const root = document.documentElement
    return root.dataset.world === 'observatory' && root.dataset.layoutWorld === 'observatory'
  })
  await page.waitForTimeout(40)
  const observatoryState = await inspectStableState(page)

  if (observatoryState.worldTransitioning || observatoryState.worldMorphing || observatoryState.layerActive) {
    fail('Reduced motion reverse retained animated transition surfaces', { viewport: viewport.name, state: observatoryState })
  }
  if (observatoryState.scrollWidth > observatoryState.innerWidth + 1) {
    fail('Reduced motion Observatory state caused horizontal overflow', { viewport: viewport.name, state: observatoryState })
  }

  await page.screenshot({ path: `${OUT_DIR}/${viewport.name}-reduced-observatory.png`, fullPage: false })
  report.reducedMotion.push({ viewport: viewport.name, width: viewport.width, solar: solarState, observatory: observatoryState })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
}

async function captureExactFrame(page, viewport, { fromWorld, toWorld, direction }, checkpoint) {
  await loadWorld(page, fromWorld)
  const { origin, toggleRadius, radius } = await getToggleGeometry(page)
  const frame = getTransitionFrame(checkpoint, direction)
  const swapped = checkpoint >= 520
  const visualWorld = swapped ? toWorld : fromWorld
  const visualTheme = worldToTheme(visualWorld)
  const active = checkpoint < 1500
  const startScale = Math.min(1, toggleRadius / Math.max(1, radius))
  const scale = waveScale(frame, startScale)
  const waveRadius = radius * scale
  const starFrame = getStarTransitionFrame({ direction, progress: frame.progress })

  await page.evaluate(({ frame, direction, origin, toggleRadius, radius, startScale, scale, visualWorld, visualTheme, active, fromWorld, toWorld, swapped }) => {
    const root = document.documentElement
    const layer = document.querySelector('[data-theme-transition]')

    window.dispatchEvent(new CustomEvent('glenn:worldtransitionstart', {
      detail: { fromWorld, toWorld, direction, originX: origin.x, originY: origin.y, toggleRadius }
    }))

    root.dataset.world = visualWorld
    root.dataset.theme = visualTheme
    root.dataset.worldTransitioning = active ? 'true' : 'false'
    root.dataset.worldTransitionPhase = frame.phase
    root.dataset.worldTransitionDirection = direction
    root.style.setProperty('--world-origin-x', `${origin.x}px`)
    root.style.setProperty('--world-origin-y', `${origin.y}px`)
    root.style.setProperty('--world-toggle-radius', `${toggleRadius}px`)
    root.style.setProperty('--world-wave-radius', `${radius}px`)
    root.style.setProperty('--world-wave-start-scale', String(startScale))
    root.style.setProperty('--world-wave-scale', String(scale))
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

    if (swapped) {
      window.dispatchEvent(new CustomEvent('glenn:worldchange', {
        detail: { theme: visualTheme, world: visualWorld }
      }))
    }

    if (active) {
      window.dispatchEvent(new CustomEvent('glenn:worldtransition', {
        detail: {
          fromWorld,
          toWorld,
          theme: visualTheme,
          world: visualWorld,
          layoutWorld: root.dataset.layoutWorld,
          direction,
          elapsedMs: frame.elapsedMs,
          progress: frame.progress,
          phase: frame.phase,
          phaseProgress: frame.phaseProgress,
          originX: origin.x,
          originY: origin.y,
          toggleRadius
        }
      }))
    } else {
      root.dataset.layoutWorld = toWorld
      window.dispatchEvent(new CustomEvent('glenn:worldtransitionend', {
        detail: { fromWorld, toWorld, world: toWorld, theme: visualTheme, direction, elapsedMs: 1500, progress: 1 }
      }))
    }
  }, { frame, direction, origin, toggleRadius, radius, startScale, scale, visualWorld, visualTheme, active, fromWorld, toWorld, swapped })

  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const state = await page.evaluate(() => {
    const root = document.documentElement
    const layer = document.querySelector('[data-theme-transition]')
    const hero = document.querySelector('#hero-title')?.getBoundingClientRect()
    const wave = document.querySelector('[data-solar-wave]')
    const waveRect = wave?.getBoundingClientRect()
    return {
      world: root.dataset.world,
      layoutWorld: root.dataset.layoutWorld,
      phase: layer?.dataset.phase ?? null,
      active: Boolean(layer?.classList.contains('is-active')),
      innerWidth,
      scrollWidth: Math.max(root.scrollWidth, document.body?.scrollWidth ?? 0),
      hero: hero ? { left: hero.left, top: hero.top, width: hero.width, height: hero.height } : null,
      wave: waveRect && wave ? { width: waveRect.width, height: waveRect.height, opacity: getComputedStyle(wave).opacity } : null,
      hasDetachedBlackCore: Boolean(document.querySelector('[data-eclipse-core], .theme-eclipse-core'))
    }
  })

  if (state.scrollWidth > state.innerWidth + 1) fail('Frozen transition frame caused horizontal overflow', { viewport: viewport.name, direction, checkpoint, state })
  if (state.hasDetachedBlackCore) fail('Detached black eclipse core exists in transition DOM', { viewport: viewport.name, direction, checkpoint })
  if (active && state.phase !== frame.phase) fail('Frozen transition frame rendered wrong phase', { viewport: viewport.name, direction, checkpoint, expected: frame.phase, state })
  if (!active && (state.world !== toWorld || state.layoutWorld !== toWorld)) fail('Final frame did not settle both world and layout state', { viewport: viewport.name, direction, checkpoint, state })
  if (checkpoint === 520 && waveRadius + 0.5 < toggleRadius) fail('First radiation radius starts smaller than toggle radius', { viewport: viewport.name, direction, checkpoint, waveRadius, toggleRadius })

  if (direction === 'to-solar' && checkpoint >= 180 && checkpoint <= 450) {
    report.fold.push({ viewport: viewport.name, checkpoint, fold: starFrame.fold, visibility: starFrame.visibility })
    if (checkpoint >= 300 && starFrame.fold <= 0) fail('Star field did not begin folding before radiation', { viewport: viewport.name, checkpoint, starFrame })
    if (!(starFrame.visibility.far <= starFrame.visibility.mid && starFrame.visibility.mid <= starFrame.visibility.near)) {
      fail('Star depth visibility does not preserve far-before-near convergence', { viewport: viewport.name, checkpoint, starFrame })
    }
  }

  await page.screenshot({
    path: `${OUT_DIR}/${viewport.name}-${direction}-${pad(checkpoint)}.png`,
    fullPage: false
  })
  report.frames.push({
    viewport: viewport.name,
    direction,
    checkpoint,
    phase: active ? frame.phase : null,
    world: visualWorld,
    layoutWorld: state.layoutWorld,
    toggleRadius,
    waveRadius,
    fold: starFrame.fold,
    visibility: starFrame.visibility,
    hero: state.hero
  })
}

const strengths = {
  far: getLayerFoldStrength('far'),
  mid: getLayerFoldStrength('mid'),
  near: getLayerFoldStrength('near')
}
if (!(strengths.near > strengths.mid && strengths.mid > strengths.far)) {
  fail('Gravitational fold strength is not depth ordered', { strengths })
}

const exactPhases = new Set(CHECKPOINTS.filter(ms => ms < 1500).map(ms => getTransitionFrame(ms, 'to-solar').phase))
for (const phase of PHASES) {
  if (!exactPhases.has(phase)) fail('Exact checkpoint matrix does not cover required phase', { phase, exactPhases: [...exactPhases] })
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
      const toObservatory = { fromWorld: 'solar', toWorld: 'observatory', direction: 'to-observatory' }

      await runLiveDirection(page, viewport, toSolar, 'left')
      await captureStableState(page, viewport, 'solar', 'to-solar')

      if (viewport.exactFrames) {
        for (const checkpoint of CHECKPOINTS) await captureExactFrame(page, viewport, toSolar, checkpoint)
      }

      await runLiveDirection(page, viewport, toObservatory, 'right')
      await captureStableState(page, viewport, 'observatory', 'to-observatory')

      if (viewport.name === 'desktop') {
        for (const checkpoint of CHECKPOINTS) await captureExactFrame(page, viewport, toObservatory, checkpoint)
      }

      await runReducedMotion(page, viewport)
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
  console.log(`World Transition QA passed: ${report.liveRuns.length} live transition run(s), ${report.hardeningRuns.length} responsive stable checks, ${report.reducedMotion.length} reduced-motion checks, ${report.frames.length} exact visual frame(s), ${report.fold.length} fold checkpoints.`)
}
