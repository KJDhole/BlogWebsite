import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'

const BASE_URL = 'http://127.0.0.1:4321'
const cases = [
  { name: 'desktop-home', path: '/', viewport: { width: 1440, height: 1000 } },
  { name: 'desktop-article', path: '/writing/commerce-agent-rules/', viewport: { width: 1440, height: 1000 } },
  { name: 'mobile-home', path: '/', viewport: { width: 390, height: 844 } },
  { name: 'mobile-article', path: '/writing/commerce-agent-rules/', viewport: { width: 390, height: 844 } }
]

await mkdir('design-baseline', { recursive: true })
const browser = await chromium.launch({ headless: true })
const report = []
try {
  for (const item of cases) {
    const context = await browser.newContext({ viewport: item.viewport, deviceScaleFactor: 1 })
    const page = await context.newPage()
    const errors = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
    page.on('pageerror', err => errors.push(err.message))
    await page.goto(`${BASE_URL}${item.path}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await page.screenshot({ path: `design-baseline/${item.name}.png`, fullPage: true })
    const metrics = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      title: document.title,
      theme: document.documentElement.dataset.theme || null
    }))
    report.push({ ...item, metrics, errors })
    await context.close()
  }
  await writeFile('design-baseline/report.json', JSON.stringify(report, null, 2))
} finally {
  await browser.close()
}
