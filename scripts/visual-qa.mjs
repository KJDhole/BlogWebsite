import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { getStoryScrollDistance } from '../src/scripts/scrollStory.mjs'

const BASE_URL = 'http://127.0.0.1:4321/'
const frames = [0.05, 0.24, 0.38, 0.52, 0.62, 0.71, 0.80]

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function getStoryGeometry(page, mobile) {
  const geometry = await page.evaluate(() => ({
    heroHeight: document.querySelector('.hero')?.offsetHeight ?? 0,
    maxScroll: Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
  }))
  return {
    ...geometry,
    storyDistance: getStoryScrollDistance({ ...geometry, mobile })
  }
}

async function inspectViewport(browser, { name, viewport, reducedMotion = false }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  const page = await context.newPage()
  if (reducedMotion) await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-space-scene]')
  await page.waitForTimeout(500)

  const initial = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    fallback: document.querySelector('[data-space-scene]')?.classList.contains('is-fallback') ?? true
  }))
  assert(initial.scrollWidth <= initial.innerWidth + 1, `${name}: horizontal overflow ${initial.scrollWidth} > ${initial.innerWidth}`)
  if (!reducedMotion) assert(!initial.fallback, `${name}: WebGL unexpectedly fell back`)

  const mobile = viewport.width <= 760
  const { storyDistance } = await getStoryGeometry(page, mobile)
  const report = { name, viewport, reducedMotion, storyDistance, frames: [] }

  for (const progress of frames) {
    await page.evaluate(y => {
      document.documentElement.style.scrollBehavior = 'auto'
      window.scrollTo(0, y)
    }, storyDistance * progress)

    await page.waitForTimeout(progress >= 0.80 ? 1100 : 260)
    const frameName = `${name}-p${String(Math.round(progress * 100)).padStart(2, '0')}.png`
    await page.screenshot({ path: `visual-qa/${frameName}`, fullPage: false })

    const metrics = await page.evaluate(({ requestedProgress, storyDistance }) => {
      const hero = document.querySelector('.hero')?.getBoundingClientRect()
      const scene = document.querySelector('[data-space-scene]')?.getBoundingClientRect()
      const all = document.querySelector('[data-category="All"]')?.getBoundingClientRect()
      const list = document.querySelector('.filter-list')?.getBoundingClientRect()
      const portal = document.querySelector('.nav-portal')?.getBoundingClientRect()
      const portalStyle = getComputedStyle(document.querySelector('.nav-portal'))
      const orbStyle = getComputedStyle(document.querySelector('.flight-orb'))
      const indicatorStyle = getComputedStyle(document.querySelector('.filter-indicator'))
      return {
        requestedProgress,
        actualProgress: window.scrollY / storyDistance,
        scrollY: window.scrollY,
        maxScroll: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
        hero: hero && { top: hero.top, bottom: hero.bottom },
        scene: scene && { top: scene.top, bottom: scene.bottom },
        allCenterX: all ? all.left + all.width / 2 : null,
        indicatorCenterY: list ? list.bottom - 5 - 0.75 : null,
        portalCenterX: portal ? portal.left + portal.width / 2 : null,
        portalCenterY: portal ? portal.top + portal.height / 2 : null,
        portalOpacity: Number.parseFloat(portalStyle.opacity || '0'),
        orbOpacity: Number.parseFloat(orbStyle.opacity || '0'),
        indicatorOpacity: Number.parseFloat(indicatorStyle.opacity || '0'),
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth
      }
    }, { requestedProgress: progress, storyDistance })

    console.log('VISUAL_QA_FRAME', JSON.stringify({ name, ...metrics }))
    report.frames.push({ progress, ...metrics })
    await writeFile('visual-qa/report-partial.json', JSON.stringify(report, null, 2))

    assert(Math.abs(metrics.actualProgress - progress) < 0.01, `${name} p=${progress}: requested story progress was not reached`)
    assert(metrics.scrollWidth <= metrics.innerWidth + 1, `${name} p=${progress}: horizontal overflow`)
    if (metrics.hero && metrics.scene) {
      assert(metrics.scene.bottom <= metrics.hero.bottom + 1, `${name} p=${progress}: space scene crosses hero bottom`)
    }

    if (!reducedMotion && Math.abs(progress - 0.62) < 0.001) {
      assert(metrics.portalOpacity > 0.35, `${name}: nav portal should be visible at p=.62`)
      assert(Math.abs(metrics.portalCenterX - metrics.allCenterX) < 2, `${name}: nav portal X misaligned`)
      assert(Math.abs(metrics.portalCenterY - metrics.indicatorCenterY) < 2, `${name}: nav portal Y misaligned`)
    }

    if (!reducedMotion && Math.abs(progress - 0.71) < 0.001) {
      assert(metrics.orbOpacity > 0.2, `${name}: ejected orange orb should be visible at p=.71`)
    }

    if (!reducedMotion && Math.abs(progress - 0.80) < 0.001) {
      assert(metrics.indicatorOpacity > 0.9, `${name}: landing should settle into indicator`)
    }

    if (reducedMotion) {
      assert(metrics.indicatorOpacity > 0.9, `${name}: reduced motion must keep indicator visible`)
    }
  }

  await context.close()
  return report
}

async function inspectAggressiveLanding(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-space-scene]')
  await page.waitForTimeout(300)
  const { storyDistance } = await getStoryGeometry(page, false)

  await page.evaluate(y => {
    document.documentElement.style.scrollBehavior = 'auto'
    window.scrollTo(0, y)
  }, storyDistance)

  const samples = []
  for (let elapsed = 0; elapsed <= 1120; elapsed += 40) {
    if (elapsed > 0) await page.waitForTimeout(40)
    const sample = await page.evaluate(() => {
      const orb = document.querySelector('.flight-orb')
      const indicator = document.querySelector('.filter-indicator')
      const list = document.querySelector('.filter-list')?.getBoundingClientRect()
      const orbRect = orb?.getBoundingClientRect()
      const orbStyle = orb ? getComputedStyle(orb) : null
      const indicatorStyle = indicator ? getComputedStyle(indicator) : null
      return {
        orbOpacity: Number.parseFloat(orbStyle?.opacity || '0'),
        indicatorOpacity: Number.parseFloat(indicatorStyle?.opacity || '0'),
        orbCenterY: orbRect ? orbRect.top + orbRect.height / 2 : null,
        orbWidth: orbRect?.width ?? 0,
        orbHeight: orbRect?.height ?? 0,
        targetY: list ? list.bottom - 5 - 0.75 : null
      }
    })
    samples.push({ elapsed, ...sample })
  }

  const early = samples.find(sample => sample.elapsed >= 80 && sample.elapsed <= 160)
  assert(early?.orbOpacity > 0.8, 'aggressive scroll: orange orb should still be visible early in time-based landing')
  assert(early?.indicatorOpacity < 0.1, 'aggressive scroll: indicator must not instantly replace the landing orb')

  const squash = samples.some(sample => sample.orbOpacity > 0.5 && sample.orbWidth > sample.orbHeight * 1.35)
  assert(squash, 'aggressive scroll: impact squash should still occur')

  let contacted = false
  let bounced = false
  for (const sample of samples) {
    if (sample.orbCenterY == null || sample.targetY == null || sample.orbOpacity <= 0.3) continue
    if (sample.orbCenterY >= sample.targetY - 2) contacted = true
    if (contacted && sample.orbCenterY < sample.targetY - 4) bounced = true
  }
  assert(bounced, 'aggressive scroll: bounce should occur after contact instead of being skipped')

  const late = samples.at(-1)
  assert(late.indicatorOpacity > 0.9, 'aggressive scroll: final indicator should be restored after landing')
  await page.screenshot({ path: 'visual-qa/aggressive-scroll-final.png', fullPage: false })
  await context.close()
  return { storyDistance, samples }
}

async function inspectWebglFallback(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-space-scene]')
  await page.waitForTimeout(300)

  const before = await page.evaluate(() => document.querySelector('[data-space-scene]')?.classList.contains('is-fallback') ?? true)
  assert(!before, 'context loss QA: scene should start in WebGL mode')

  const eventPrevented = await page.evaluate(() => {
    const canvas = document.querySelector('[data-space-canvas]')
    const event = new Event('webglcontextlost', { cancelable: true })
    canvas.dispatchEvent(event)
    return event.defaultPrevented
  })
  assert(eventPrevented, 'context loss QA: webglcontextlost should be prevented')
  await page.waitForTimeout(100)

  const fallback = await page.evaluate(() => {
    const scene = document.querySelector('[data-space-scene]')
    const canvas = document.querySelector('[data-space-canvas]')
    const fallbackNode = document.querySelector('[data-space-fallback]')
    return {
      active: scene?.classList.contains('is-fallback') ?? false,
      canvasDisplay: canvas ? getComputedStyle(canvas).display : '',
      fallbackDisplay: fallbackNode ? getComputedStyle(fallbackNode).display : ''
    }
  })
  assert(fallback.active, 'context loss QA: scene should switch to SVG fallback')
  assert(fallback.canvasDisplay === 'none', 'context loss QA: failed canvas should be hidden')
  assert(fallback.fallbackDisplay === 'grid', 'context loss QA: SVG fallback should be visible')

  await page.focus('#article-search')
  const searchFocused = await page.evaluate(() => document.activeElement?.id === 'article-search')
  assert(searchFocused, 'context loss QA: search must remain keyboard-focusable')

  await page.click('[data-category="AI"]')
  const aiActive = await page.evaluate(() => document.querySelector('[data-category="AI"]')?.classList.contains('is-active') ?? false)
  assert(aiActive, 'context loss QA: category controls must remain usable')
  await page.screenshot({ path: 'visual-qa/webgl-fallback.png', fullPage: false })
  await context.close()
  return { eventPrevented, fallback, searchFocused, aiActive }
}

await mkdir('visual-qa', { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  const reports = []
  reports.push(await inspectViewport(browser, { name: 'desktop', viewport: { width: 1440, height: 1000 } }))
  reports.push(await inspectViewport(browser, { name: 'mobile', viewport: { width: 390, height: 844 } }))
  reports.push(await inspectViewport(browser, { name: 'reduced', viewport: { width: 1440, height: 1000 }, reducedMotion: true }))
  const aggressiveLanding = await inspectAggressiveLanding(browser)
  const webglFallback = await inspectWebglFallback(browser)
  await writeFile('visual-qa/report.json', JSON.stringify({ reports, aggressiveLanding, webglFallback }, null, 2))
  console.log('Visual QA passed')
} finally {
  await browser.close()
}
