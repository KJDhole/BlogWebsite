import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { getStoryScrollDistance } from '../src/scripts/scrollStory.mjs'

const BASE_URL = 'http://127.0.0.1:4321/'
const frames = [0.05, 0.24, 0.38, 0.52, 0.62, 0.71, 0.80]

function assert(condition, message) {
  if (!condition) throw new Error(message)
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
    fallback: document.querySelector('[data-space-scene]')?.classList.contains('is-fallback') ?? true,
    heroHeight: document.querySelector('.hero')?.offsetHeight ?? 0,
    maxScroll: Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
  }))
  assert(initial.scrollWidth <= initial.innerWidth + 1, `${name}: horizontal overflow ${initial.scrollWidth} > ${initial.innerWidth}`)
  if (!reducedMotion) assert(!initial.fallback, `${name}: WebGL unexpectedly fell back`)

  const mobile = viewport.width <= 760
  const storyDistance = getStoryScrollDistance({
    heroHeight: initial.heroHeight,
    mobile,
    maxScroll: initial.maxScroll
  })
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

await mkdir('visual-qa', { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  const reports = []
  reports.push(await inspectViewport(browser, { name: 'desktop', viewport: { width: 1440, height: 1000 } }))
  reports.push(await inspectViewport(browser, { name: 'mobile', viewport: { width: 390, height: 844 } }))
  reports.push(await inspectViewport(browser, { name: 'reduced', viewport: { width: 1440, height: 1000 }, reducedMotion: true }))
  await writeFile('visual-qa/report.json', JSON.stringify(reports, null, 2))
  console.log('Visual QA passed')
} finally {
  await browser.close()
}
