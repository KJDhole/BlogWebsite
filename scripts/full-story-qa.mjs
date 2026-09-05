import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { getStoryScrollDistance } from '../src/scripts/scrollStory.mjs'

const BASE_URL = 'http://127.0.0.1:4321/'
const FRAMES = [0.05, 0.24, 0.38, 0.52, 0.62, 0.71, 0.77]

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function storyDistance(page, mobile) {
  const layout = await page.evaluate(() => ({
    heroHeight: document.querySelector('.hero')?.offsetHeight ?? 0,
    maxScroll: Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
  }))
  return getStoryScrollDistance({ ...layout, mobile })
}

async function captureViewport(browser, { name, viewport, reducedMotion = 'no-preference' }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion })
  const page = await context.newPage()
  const consoleErrors = []
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', error => consoleErrors.push(error.message))

  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-space-scene]')
  await page.waitForTimeout(350)

  const mobile = viewport.width <= 760
  const distance = await storyDistance(page, mobile)
  const report = []

  for (const progress of FRAMES) {
    await page.evaluate(y => {
      document.documentElement.style.scrollBehavior = 'auto'
      window.scrollTo(0, y)
    }, distance * progress)
    await page.waitForTimeout(220)

    const metrics = await page.evaluate(distanceValue => {
      const hero = document.querySelector('.hero')?.getBoundingClientRect()
      const scene = document.querySelector('[data-space-scene]')?.getBoundingClientRect()
      const portal = document.querySelector('.nav-portal')
      const portalRect = portal?.getBoundingClientRect()
      const portalStyle = portal ? getComputedStyle(portal) : null
      const allButton = document.querySelector('.filter-button[data-category="All"]')?.getBoundingClientRect()
      const indicator = document.querySelector('.filter-indicator')?.getBoundingClientRect()
      const orb = document.querySelector('.flight-orb')
      const orbRect = orb?.getBoundingClientRect()
      const orbStyle = orb ? getComputedStyle(orb) : null
      const html = document.documentElement
      return {
        actualProgress: window.scrollY / distanceValue,
        scrollY: window.scrollY,
        bodyWidth: html.scrollWidth,
        viewportWidth: window.innerWidth,
        hero: hero ? { top: hero.top, bottom: hero.bottom, width: hero.width, height: hero.height } : null,
        scene: scene ? { top: scene.top, bottom: scene.bottom, width: scene.width, height: scene.height } : null,
        portal: portalRect ? {
          x: portalRect.left + portalRect.width / 2,
          y: portalRect.top + portalRect.height / 2,
          width: portalRect.width,
          height: portalRect.height,
          opacity: Number(portalStyle?.opacity ?? 0)
        } : null,
        allButton: allButton ? {
          x: allButton.left + allButton.width / 2,
          y: allButton.bottom - 5 - 0.75,
          width: allButton.width
        } : null,
        indicator: indicator ? {
          x: indicator.left + indicator.width / 2,
          y: indicator.top + indicator.height / 2,
          width: indicator.width,
          height: indicator.height,
          opacity: Number(getComputedStyle(document.querySelector('.filter-indicator')).opacity)
        } : null,
        orb: orbRect ? {
          x: orbRect.left + orbRect.width / 2,
          y: orbRect.top + orbRect.height / 2,
          width: orbRect.width,
          height: orbRect.height,
          opacity: Number(orbStyle?.opacity ?? 0)
        } : null,
        fallback: document.querySelector('[data-space-scene]')?.classList.contains('is-fallback') ?? false
      }
    }, distance)

    report.push({ progress, ...metrics })
    const label = String(Math.round(progress * 100)).padStart(2, '0')
    await page.screenshot({ path: `full-story-qa/${name}-p${label}.png`, fullPage: false })
  }

  assert(consoleErrors.length === 0, `${name}: browser console errors: ${consoleErrors.join(' | ')}`)
  for (const frame of report) {
    assert(frame.bodyWidth <= frame.viewportWidth + 1, `${name}: horizontal overflow at p=${frame.progress}`)
    assert(frame.scene && frame.hero, `${name}: missing hero/scene geometry`)
    assert(frame.scene.bottom <= frame.hero.bottom + 1, `${name}: scene escapes hero at p=${frame.progress}`)
  }

  if (reducedMotion === 'reduce') {
    for (const frame of report) {
      assert((frame.portal?.opacity ?? 0) < 0.05, `${name}: reduced-motion portal should stay hidden`)
      assert((frame.orb?.opacity ?? 0) < 0.05, `${name}: reduced-motion flight orb should stay hidden`)
      assert((frame.indicator?.opacity ?? 0) > 0.9, `${name}: reduced-motion indicator should stay visible`)
    }
  } else {
    const by = Object.fromEntries(report.map(frame => [frame.progress, frame]))
    assert((by[0.05].portal?.opacity ?? 0) < 0.05, `${name}: nav portal should be hidden at p=.05`)
    assert((by[0.52].portal?.opacity ?? 0) < 0.12, `${name}: nav portal should still be nearly hidden at p=.52`)
    assert((by[0.62].portal?.opacity ?? 0) > 0.45, `${name}: nav portal should be visible at p=.62`)
    assert(Math.abs(by[0.62].portal.x - by[0.62].allButton.x) <= 1.5, `${name}: portal x should align to All at p=.62`)
    assert(Math.abs(by[0.62].portal.y - by[0.62].allButton.y) <= 1.5, `${name}: portal y should align to All at p=.62`)
    assert((by[0.71].orb?.opacity ?? 0) > 0.4, `${name}: ejected orb should be visible at p=.71`)
  }

  await context.close()
  return { name, viewport, reducedMotion, storyDistance: distance, report }
}

await mkdir('full-story-qa', { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  const reports = [
    await captureViewport(browser, { name: 'desktop', viewport: { width: 1440, height: 1000 } }),
    await captureViewport(browser, { name: 'mobile', viewport: { width: 390, height: 844 } }),
    await captureViewport(browser, { name: 'reduced', viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  ]
  await writeFile('full-story-qa/report.json', JSON.stringify(reports, null, 2))
  console.log('Full story QA passed')
} finally {
  await browser.close()
}
