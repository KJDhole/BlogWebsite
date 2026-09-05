import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { getStoryScrollDistance } from '../src/scripts/scrollStory.mjs'

const BASE_URL = 'http://127.0.0.1:4321/'
const frames = [0.30, 0.315, 0.32, 0.325, 0.34, 0.38]

async function capture(browser, { name, viewport }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  const page = await context.newPage()
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-space-scene]')
  await page.waitForTimeout(350)
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
    await page.waitForTimeout(180)
    const actual = await page.evaluate(distance => window.scrollY / distance, storyDistance)
    report.push({ progress, actual })
    const label = String(Math.round(progress * 1000)).padStart(3, '0')
    await page.screenshot({ path: `absorption-qa/${name}-p${label}.png`, fullPage: false })
  }

  await context.close()
  return { name, viewport, storyDistance, report }
}

await mkdir('absorption-qa', { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  const reports = [
    await capture(browser, { name: 'desktop', viewport: { width: 1440, height: 1000 } }),
    await capture(browser, { name: 'mobile', viewport: { width: 390, height: 844 } })
  ]
  await writeFile('absorption-qa/report.json', JSON.stringify(reports, null, 2))
  console.log('Absorption QA captured')
} finally {
  await browser.close()
}
