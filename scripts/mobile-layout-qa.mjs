import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto('http://127.0.0.1:4321/writing/__qa-ai-design-99/', { waitUntil: 'domcontentloaded' })
  const result = await page.evaluate(() => {
    const heading = document.querySelector('.article-opening h1')
    if (!heading) return { exists: false }
    const rect = heading.getBoundingClientRect()
    return {
      exists: true,
      left: rect.left,
      right: rect.right,
      width: rect.width,
      viewport: window.innerWidth,
      lineHeight: getComputedStyle(heading).lineHeight
    }
  })

  if (!result.exists) throw new Error('Mobile article H1 is missing')
  if (result.width < result.viewport * 0.72) {
    throw new Error(`Mobile article H1 collapsed into a narrow column: ${JSON.stringify(result)}`)
  }
  if (result.left < -1 || result.right > result.viewport + 1) {
    throw new Error(`Mobile article H1 is clipped: ${JSON.stringify(result)}`)
  }
  console.log('Mobile article title geometry OK', result)
} finally {
  await browser.close()
}
