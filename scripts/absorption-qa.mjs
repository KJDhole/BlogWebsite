import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { getStoryScrollDistance } from '../src/scripts/scrollStory.mjs'

const BASE_URL = 'http://127.0.0.1:4321/'
const OUTPUT_DIR = 'cosmic-motion-qa'
const frames = [0, 0.12, 0.24, 0.34, 0.44, 0.52, 0.60, 0.72, 0.84, 1]
const PATH_TOLERANCE_PX = 2.5

async function readFrameMetrics(page) {
  return page.evaluate(() => {
    const scene = document.querySelector('[data-space-scene]')
    const path = document.querySelector('[data-cosmic-path]')
    const traveler = document.querySelector('[data-cosmic-traveler]')
    if (!scene || !path || !traveler) {
      return { error: 'missing cosmic scene hooks' }
    }

    const travelerMatrix = traveler.getScreenCTM()
    const pathMatrix = path.getScreenCTM()
    if (!travelerMatrix || !pathMatrix) {
      return { error: 'missing SVG screen transform' }
    }

    const travelerCenter = {
      x: travelerMatrix.e,
      y: travelerMatrix.f
    }
    const totalLength = path.getTotalLength()
    let nearestDistance = Number.POSITIVE_INFINITY
    let nearestPoint = null

    for (let index = 0; index <= 240; index += 1) {
      const point = path.getPointAtLength(totalLength * index / 240)
      const screenPoint = new DOMPoint(point.x, point.y).matrixTransform(pathMatrix)
      const distance = Math.hypot(
        screenPoint.x - travelerCenter.x,
        screenPoint.y - travelerCenter.y
      )
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestPoint = { x: screenPoint.x, y: screenPoint.y }
      }
    }

    return {
      phase: scene.dataset.cosmicPhase ?? null,
      pathProgress: Number(scene.dataset.pathProgress ?? 0),
      travelerCenter,
      nearestPoint,
      nearestDistance,
      travelerOpacity: Number(getComputedStyle(traveler).opacity || 0)
    }
  })
}

async function capture(browser, { name, viewport }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  const page = await context.newPage()
  const consoleErrors = []
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', error => consoleErrors.push(error.message))

  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-space-scene]')
  await page.waitForSelector('[data-cosmic-path]')
  await page.waitForTimeout(300)

  const mobile = viewport.width <= 760
  const layout = await page.evaluate(() => ({
    heroHeight: document.querySelector('.hero')?.offsetHeight ?? 0,
    maxScroll: Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
  }))
  const storyDistance = getStoryScrollDistance({ ...layout, mobile })
  const report = []

  for (const progress of frames) {
    await page.evaluate(y => {
      document.documentElement.style.scrollBehavior = 'auto'
      window.scrollTo(0, y)
    }, storyDistance * progress)
    await page.waitForTimeout(160)

    const actual = await page.evaluate(distance => window.scrollY / distance, storyDistance)
    const metrics = await readFrameMetrics(page)
    const label = String(Math.round(progress * 1000)).padStart(4, '0')
    await page.screenshot({
      path: `${OUTPUT_DIR}/${name}-p${label}.png`,
      fullPage: false
    })

    report.push({ progress, actual, ...metrics })
  }

  await context.close()
  return { name, viewport, storyDistance, consoleErrors, report }
}

await mkdir(OUTPUT_DIR, { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  const reports = [
    await capture(browser, { name: 'desktop', viewport: { width: 1440, height: 1000 } }),
    await capture(browser, { name: 'mobile', viewport: { width: 390, height: 844 } })
  ]

  const failures = []
  for (const captureReport of reports) {
    if (captureReport.consoleErrors.length) {
      failures.push(`${captureReport.name}: console errors: ${captureReport.consoleErrors.join(' | ')}`)
    }
    for (const frame of captureReport.report) {
      if (frame.error) {
        failures.push(`${captureReport.name} ${frame.progress}: ${frame.error}`)
        continue
      }
      if (frame.nearestDistance > PATH_TOLERANCE_PX) {
        failures.push(
          `${captureReport.name} ${frame.progress}: traveler is ${frame.nearestDistance.toFixed(2)}px from visible path`
        )
      }
    }
  }

  const output = {
    pathTolerancePx: PATH_TOLERANCE_PX,
    failures,
    captures: reports
  }
  await writeFile(`${OUTPUT_DIR}/report.json`, JSON.stringify(output, null, 2))

  if (failures.length) {
    console.error(failures.join('\n'))
    process.exitCode = 1
  } else {
    console.log(`Cosmic Motion QA captured ${frames.length * reports.length} frames with 0 path-adherence failures`)
  }
} finally {
  await browser.close()
}
