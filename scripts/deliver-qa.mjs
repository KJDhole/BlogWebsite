import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'

const BASE_URL = 'http://127.0.0.1:4321'
const OUT_DIR = 'deliver-qa'
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'laptop', width: 1024, height: 768 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'small-mobile', width: 360, height: 800 }
]
const themes = ['light', 'dark']
const routes = [
  { name: 'home', path: '/' },
  { name: 'article', path: '/writing/commerce-agent-rules/' },
  { name: 'archive', path: '/archive/' },
  { name: 'tags', path: '/tags/' }
]

const stressSvg = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="#dedbd2"/><path d="M0 690L430 390L760 610L1040 300L1600 710V900H0Z" fill="#8f8a80"/><circle cx="1260" cy="220" r="90" fill="#ef6b2e"/></svg>`)
const stressFixture = `
  <h2>长内容压力测试：这是一段需要在中文阅读环境里保持明确层级和呼吸感的章节标题</h2>
  <p>${'这是一段用于验证中文长文阅读节奏的正文。它不依赖卡片或装饰，而应该依靠字宽、行高、段落间距与稳定的阅读列来保持舒适。'.repeat(16)}</p>
  <p><a class="long-url" href="#">https://example.com/${'very-long-unbroken-segment-'.repeat(18)}end</a></p>
  <blockquote><p>引用块需要在移动端保持清晰的左侧引导线，同时不能挤压正文到难以阅读。</p></blockquote>
  <div class="code-block">
    <div class="code-block-head"><span>typescript</span><button class="copy-control" type="button">COPY</button></div>
    <pre><code>const extremelyLongIdentifierWithoutSpaces = '${'0123456789abcdef'.repeat(24)}';\nconsole.log(extremelyLongIdentifierWithoutSpaces)</code></pre>
  </div>
  <blockquote class="prompt-block">
    <div class="prompt-block-head"><span>PROMPT</span><button class="copy-control" type="button">COPY</button></div>
    <p>请分析这段超长 Prompt，在手机端保持可读，不使用额外卡片，不让内容突破阅读列。</p>
  </blockquote>
  <table>
    <thead><tr>${Array.from({ length: 8 }, (_, index) => `<th>字段 ${index + 1}</th>`).join('')}</tr></thead>
    <tbody><tr>${Array.from({ length: 8 }, (_, index) => `<td>用于横向滚动验证的长表格单元格 ${index + 1}</td>`).join('')}</tr></tbody>
  </table>
  <img alt="stress normal" src="data:image/svg+xml,${stressSvg}" />
  <img class="media-wide" alt="stress wide" src="data:image/svg+xml,${stressSvg}" />
  <img class="media-full" alt="stress full" src="data:image/svg+xml,${stressSvg}" />
`

await mkdir(OUT_DIR, { recursive: true })
const browser = await chromium.launch({ headless: true })
const report = { cases: [], search: [], stress: [], failures: [] }

function recordFailure(message, detail = {}) {
  report.failures.push({ message, ...detail })
}

function safeName(value) {
  return value.replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '')
}

async function inspectPage(page, { theme, viewport, route }) {
  const consoleErrors = []
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', error => consoleErrors.push(error.message))

  const response = await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(120)

  const metrics = await page.evaluate(() => {
    const root = document.documentElement
    const body = document.body
    const article = document.querySelector('.article-body')
    return {
      title: document.title,
      theme: root.dataset.theme || null,
      innerWidth: window.innerWidth,
      scrollWidth: Math.max(root.scrollWidth, body?.scrollWidth ?? 0),
      articleWidth: article ? article.getBoundingClientRect().width : null,
      articleFontSize: article ? Number.parseFloat(getComputedStyle(article).fontSize) : null
    }
  })

  const item = {
    theme,
    viewport: viewport.name,
    route: route.name,
    status: response?.status() ?? null,
    metrics,
    consoleErrors
  }
  report.cases.push(item)

  if (!response || !response.ok()) recordFailure('Route did not return a successful response', item)
  if (metrics.theme !== theme) recordFailure('Persisted theme did not resolve correctly', item)
  if (metrics.scrollWidth > metrics.innerWidth + 1) recordFailure('Global horizontal overflow detected', item)
  if (consoleErrors.length) recordFailure('Browser console/page errors detected', item)
  if (route.name === 'article' && metrics.articleWidth && metrics.articleWidth > 760) recordFailure('Article reading measure exceeded 760px', item)
  if (route.name === 'article' && metrics.articleFontSize && metrics.articleFontSize < 17) recordFailure('Article font size dropped below readable floor', item)

  const shouldCapture = ['desktop', 'mobile'].includes(viewport.name) && ['home', 'article'].includes(route.name)
  if (shouldCapture) {
    await page.screenshot({
      path: `${OUT_DIR}/${safeName(`${theme}-${viewport.name}-${route.name}`)}.png`,
      fullPage: true
    })
  }
}

async function testSearch(context, theme, viewport) {
  if (viewport.name !== 'desktop' && viewport.name !== 'mobile') return
  const page = await context.newPage()
  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })
    await page.locator('[data-search-open]:visible').first().click()
    const search = page.locator('[data-search-input]')
    await search.fill('Commerce Agent')
    await page.waitForTimeout(80)
    const matched = await page.locator('[data-search-result]').count()
    await search.fill('___definitely_missing___')
    await page.waitForTimeout(80)
    const missing = await page.locator('[data-search-result]').count()
    report.search.push({ theme, viewport: viewport.name, matched, missing })
    if (matched !== 1 || missing !== 0) recordFailure('Command search contract failed', { theme, viewport: viewport.name, matched, missing })
  } finally {
    await page.close()
  }
}

async function testStress(context, theme, viewport) {
  if (viewport.name !== 'desktop' && viewport.name !== 'mobile') return
  const page = await context.newPage()
  try {
    await page.goto(`${BASE_URL}/writing/commerce-agent-rules/`, { waitUntil: 'networkidle' })
    await page.evaluate(html => {
      const body = document.querySelector('.article-body')
      if (!body) throw new Error('Missing .article-body')
      body.innerHTML = html
    }, stressFixture)
    await page.waitForTimeout(100)

    const metrics = await page.evaluate(() => {
      const root = document.documentElement
      const body = document.querySelector('.article-body')
      const pre = document.querySelector('.code-block pre')
      const table = document.querySelector('.article-body table')
      const longUrl = document.querySelector('.long-url')
      const prompt = document.querySelector('.prompt-block')
      const quote = document.querySelector('.article-body blockquote:not(.prompt-block)')
      const images = [...document.querySelectorAll('.article-body img')].map(image => {
        const rect = image.getBoundingClientRect()
        return { left: rect.left, right: rect.right, width: rect.width }
      })
      const longRect = longUrl?.getBoundingClientRect()
      const bodyRect = body?.getBoundingClientRect()
      return {
        innerWidth: window.innerWidth,
        scrollWidth: root.scrollWidth,
        codeScrollable: Boolean(pre && pre.scrollWidth > pre.clientWidth),
        tableScrollable: Boolean(table && table.scrollWidth > table.clientWidth),
        longUrlContained: Boolean(longRect && bodyRect && longRect.right <= bodyRect.right + 1 && longRect.left >= bodyRect.left - 1),
        promptVisible: Boolean(prompt && prompt.getBoundingClientRect().height > 0),
        quoteVisible: Boolean(quote && quote.getBoundingClientRect().height > 0),
        imagesContained: images.every(image => image.left >= -1 && image.right <= window.innerWidth + 1),
        imageCount: images.length
      }
    })

    const item = { theme, viewport: viewport.name, ...metrics }
    report.stress.push(item)
    if (metrics.scrollWidth > metrics.innerWidth + 1) recordFailure('Stress fixture caused global horizontal overflow', item)
    if (!metrics.codeScrollable) recordFailure('Long code line did not stay inside its own scroll container', item)
    if (!metrics.tableScrollable) recordFailure('Wide table did not stay inside its own scroll container', item)
    if (!metrics.longUrlContained) recordFailure('Long URL escaped the reading column', item)
    if (!metrics.promptVisible || !metrics.quoteVisible) recordFailure('Prompt or quote block collapsed', item)
    if (!metrics.imagesContained || metrics.imageCount !== 3) recordFailure('Normal/wide/full image containment failed', item)

    await page.screenshot({
      path: `${OUT_DIR}/${safeName(`${theme}-${viewport.name}-stress`)}.png`,
      fullPage: true
    })
  } finally {
    await page.close()
  }
}

try {
  for (const theme of themes) {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
        colorScheme: theme === 'dark' ? 'dark' : 'light'
      })
      await context.addInitScript(selectedTheme => {
        if (location.protocol === 'http:' || location.protocol === 'https:') {
          localStorage.setItem('glenn-blog-theme', selectedTheme)
        }
      }, theme)

      try {
        for (const route of routes) {
          const page = await context.newPage()
          try {
            await inspectPage(page, { theme, viewport, route })
          } catch (error) {
            recordFailure('Unhandled route inspection error', {
              theme,
              viewport: viewport.name,
              route: route.name,
              error: error instanceof Error ? error.message : String(error)
            })
          } finally {
            await page.close()
          }
        }
        await testSearch(context, theme, viewport)
        await testStress(context, theme, viewport)
      } finally {
        await context.close()
      }
    }
  }
} finally {
  await browser.close()
  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify(report, null, 2))
}

if (report.failures.length) {
  console.error(`Deliver QA failed with ${report.failures.length} issue(s).`)
  for (const failure of report.failures) console.error('-', failure.message, JSON.stringify(failure))
  process.exitCode = 1
} else {
  console.log(`Deliver QA passed: ${report.cases.length} route checks, ${report.search.length} search checks, ${report.stress.length} stress checks.`)
}
