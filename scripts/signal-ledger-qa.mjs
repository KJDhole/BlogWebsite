import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'

const BASE_URL = 'http://127.0.0.1:4321'
const STRESS_PATH = '/writing/__qa-ai-design-99/'
const OUT_DIR = 'artifacts/signal-ledger-qa'

const viewports = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1440x1000', width: 1440, height: 1000 },
  { name: '1280x800', width: 1280, height: 800 },
  { name: '1024x1366', width: 1024, height: 1366 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '430x932', width: 430, height: 932 },
  { name: '390x844', width: 390, height: 844 },
  { name: '375x812', width: 375, height: 812 }
]

const themes = ['light', 'dark']
const shortcutContract = { metaKey: true, ctrlKey: true }
const report = {
  generatedAt: new Date().toISOString(),
  sourceRoute: STRESS_PATH,
  shortcutContract,
  cases: [],
  interactions: [],
  sourceCoverage: {},
  failures: []
}

await mkdir(OUT_DIR, { recursive: true })

function fail(message, detail = {}) {
  report.failures.push({ message, ...detail })
}

function check(condition, message, detail = {}) {
  if (!condition) fail(message, detail)
}

async function pollPreview() {
  const deadline = Date.now() + 45_000
  let lastError = null
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE_URL}/`)
      if (response.ok) return
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  throw new Error(`Preview did not become ready: ${lastError?.message ?? 'unknown error'}`)
}

async function makeContext(browser, viewport, theme = 'light', reducedMotion = 'no-preference') {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    colorScheme: theme,
    reducedMotion
  })
  await context.addInitScript(selectedTheme => {
    localStorage.setItem('glenn-blog-theme', selectedTheme)
  }, theme)
  return context
}

function watchErrors(page) {
  const errors = []
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`))
  return errors
}

async function goto(page, path) {
  const response = await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(140)
  check(Boolean(response?.ok()), 'Route did not return a successful response', {
    path,
    status: response?.status() ?? null
  })
  return response
}

async function documentMetrics(page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    theme: document.documentElement.dataset.theme ?? null
  }))
}

async function assertNoOverflow(page, label) {
  const metrics = await documentMetrics(page)
  check(metrics.scrollWidth <= metrics.innerWidth + 1, 'Global horizontal overflow', { label, ...metrics })
  return metrics
}

async function acceptanceViewport(browser, viewport) {
  const context = await makeContext(browser, viewport, 'light')
  const page = await context.newPage()
  const errors = watchErrors(page)
  try {
    await goto(page, STRESS_PATH)
    const metrics = await assertNoOverflow(page, `stress-${viewport.name}`)
    const article = await page.evaluate(() => {
      const h1 = document.querySelector('.article-opening h1')
      const h1Rect = h1?.getBoundingClientRect()
      const mobileToc = document.querySelector('.article-toc-mobile')
      const desktopToc = document.querySelector('.article-context-rail')
      const code = document.querySelector('.code-frame pre, .code-block pre, .article-body > pre')
      const images = [...document.querySelectorAll('.article-body img')]
      const pagination = document.querySelectorAll('.article-pagination a').length
      return {
        h1: h1Rect ? { left: h1Rect.left, right: h1Rect.right, width: h1Rect.width } : null,
        mobileTocDisplay: mobileToc ? getComputedStyle(mobileToc).display : null,
        desktopTocDisplay: desktopToc ? getComputedStyle(desktopToc).display : null,
        desktopTocPosition: desktopToc ? getComputedStyle(desktopToc).position : null,
        codePresent: Boolean(code),
        codeOverflowX: code ? getComputedStyle(code).overflowX : null,
        codeScrollWidth: code?.scrollWidth ?? null,
        codeClientWidth: code?.clientWidth ?? null,
        imageCount: images.length,
        promptCount: document.querySelectorAll('.prompt-block').length,
        tableCount: document.querySelectorAll('.article-body table').length,
        pagination
      }
    })

    check(article.codePresent, 'Real stress article did not render its code fence', { viewport: viewport.name, article })
    check(article.codeOverflowX === 'auto' || article.codeOverflowX === 'scroll', 'Code does not own local horizontal overflow', { viewport: viewport.name, article })
    check(article.imageCount > 0, 'Real stress article did not render converted image markers', { viewport: viewport.name, article })
    check(article.pagination >= 1, 'Stress article has no reachable previous/next navigation', { viewport: viewport.name, article })

    if (viewport.width > 1040) {
      check(article.desktopTocDisplay !== 'none', 'Desktop context TOC is hidden', { viewport: viewport.name, article })
      check(article.desktopTocPosition === 'sticky', 'Desktop context TOC is not sticky', { viewport: viewport.name, article })
    } else {
      check(article.mobileTocDisplay !== 'none', 'Mobile/tablet TOC is not available', { viewport: viewport.name, article })
      check(article.desktopTocDisplay === 'none', 'Desktop TOC should collapse below 1040px', { viewport: viewport.name, article })
    }

    if (viewport.width === 375) {
      check(Boolean(article.h1), '375px article H1 missing', { article })
      if (article.h1) {
        check(article.h1.left >= -1 && article.h1.right <= viewport.width + 1, '375px article H1 is clipped', { article })
      }
    }

    report.cases.push({ viewport: viewport.name, metrics, article, consoleErrors: errors })
    check(errors.length === 0, 'Console/page errors detected', { viewport: viewport.name, errors })

    await page.screenshot({ path: `${OUT_DIR}/full-page-${viewport.name}.png`, fullPage: true })
  } catch (error) {
    fail('Unhandled acceptance viewport error', { viewport: viewport.name, error: error instanceof Error ? error.message : String(error) })
  } finally {
    await context.close()
  }
}

async function testMechanicsProbe(browser) {
  const viewport = { width: 390, height: 844 }
  const context = await makeContext(browser, viewport, 'light')
  const page = await context.newPage()
  const errors = watchErrors(page)
  try {
    await goto(page, STRESS_PATH)
    const before = await documentMetrics(page)
    const probe = await page.evaluate(() => {
      const body = document.querySelector('.article-body')
      if (!body) throw new Error('Missing article body')
      const table = document.createElement('table')
      table.dataset.qaTableProbe = ''
      const row = document.createElement('tr')
      for (let index = 0; index < 8; index += 1) {
        const cell = document.createElement('td')
        cell.textContent = `QA table mechanics probe ${index + 1} — ${'LONGCELL'.repeat(14)}`
        row.append(cell)
      }
      table.append(row)
      body.append(table)
      const result = {
        scrollWidth: table.scrollWidth,
        clientWidth: table.clientWidth,
        overflowX: getComputedStyle(table).overflowX,
        documentScrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth
      }
      table.remove()
      return result
    })
    check(probe.scrollWidth > probe.clientWidth, 'Table mechanics probe is not locally scrollable', probe)
    check(probe.overflowX === 'auto' || probe.overflowX === 'scroll', 'Table mechanics probe lacks local overflow', probe)
    check(probe.documentScrollWidth <= probe.innerWidth + 1, 'Table mechanics probe widened the document', probe)
    check(before.scrollWidth <= before.innerWidth + 1, 'Stress source overflowed before mechanics probe', before)
    check(errors.length === 0, 'Mechanics probe emitted browser errors', { errors })
    report.sourceCoverage.tableInSource = false
    report.sourceCoverage.tableMechanicsProbe = probe
  } finally {
    await context.close()
  }
}

async function testSearch(browser, viewport) {
  const context = await makeContext(browser, viewport, 'light')
  const page = await context.newPage()
  const errors = watchErrors(page)
  try {
    await goto(page, '/')
    const opener = page.locator('[data-search-open]:visible').first()
    await opener.click()
    const dialog = page.locator('[data-search-dialog]')
    const input = page.locator('[data-search-input]')
    check(await dialog.evaluate(node => node.open), 'Search did not open by click', { viewport: viewport.name })
    check(await input.evaluate(node => node === document.activeElement), 'Search input did not receive focus', { viewport: viewport.name })
    await input.fill('AI 设计')
    await page.waitForTimeout(80)
    const results = await page.locator('[data-search-result]').count()
    check(results >= 1, 'Search could not find the temporary real-content article', { viewport: viewport.name, results })

    if (viewport.width === 1440) {
      await page.screenshot({ path: `${OUT_DIR}/search-1440x1000.png` })
    }

    await page.keyboard.press('Escape')
    check(!(await dialog.evaluate(node => node.open)), 'Escape did not close Search', { viewport: viewport.name })
    check(await opener.evaluate(node => node === document.activeElement), 'Search did not return focus to opener', { viewport: viewport.name })

    await page.keyboard.press('Control+K')
    check(await dialog.evaluate(node => node.open), 'Ctrl/Cmd+K did not open Search', { viewport: viewport.name })
    await page.keyboard.press('Escape')
    report.interactions.push({ type: 'search', viewport: viewport.name, results })
    check(errors.length === 0, 'Search interaction emitted browser errors', { viewport: viewport.name, errors })
  } finally {
    await context.close()
  }
}

async function captureEditorialEvidence(browser) {
  const desktop = { width: 1440, height: 1000 }
  const context = await makeContext(browser, desktop, 'light')
  const page = await context.newPage()
  const errors = watchErrors(page)
  try {
    await goto(page, '/')
    await page.screenshot({ path: `${OUT_DIR}/homepage-top-1440x1000.png` })
    await page.locator('#writing').scrollIntoViewIfNeeded()
    await page.waitForTimeout(80)
    await page.screenshot({ path: `${OUT_DIR}/homepage-writing-1440x1000.png` })

    await goto(page, STRESS_PATH)
    await page.screenshot({ path: `${OUT_DIR}/article-header-1440x1000.png` })
    const firstH2 = page.locator('.article-body h2').first()
    if (await firstH2.count()) {
      await firstH2.scrollIntoViewIfNeeded()
      await page.waitForTimeout(80)
      await page.screenshot({ path: `${OUT_DIR}/article-body-1440x1000.png` })
    }
    const firstImage = page.locator('.article-body img').first()
    if (await firstImage.count()) {
      await firstImage.scrollIntoViewIfNeeded()
      await page.waitForTimeout(120)
      await page.screenshot({ path: `${OUT_DIR}/article-media-1440x1000.png` })
    }

    await goto(page, '/archive/')
    await page.screenshot({ path: `${OUT_DIR}/archive-1440x1000.png` })

    const archiveIntegrity = await page.evaluate(() => [...document.querySelectorAll('.archive-year')].every(year => year.querySelector('.archive-entry')))
    check(archiveIntegrity, 'Archive contains an empty invented group')

    await goto(page, '/tags/')
    const topicIntegrity = await page.evaluate(() => [...document.querySelectorAll('.topic-row')].every(row => {
      const text = row.querySelector('.topic-count')?.textContent ?? ''
      return !/^0+\s/.test(text.trim())
    }))
    check(topicIntegrity, 'Topic index contains an empty invented topic')
    check(errors.length === 0, 'Editorial evidence routes emitted browser errors', { errors })
  } finally {
    await context.close()
  }

  const darkContext = await makeContext(browser, desktop, 'dark')
  const darkPage = await darkContext.newPage()
  const darkErrors = watchErrors(darkPage)
  try {
    await goto(darkPage, '/')
    const metrics = await documentMetrics(darkPage)
    check(metrics.theme === 'dark', 'Dark theme did not persist', metrics)
    await assertNoOverflow(darkPage, 'dark-home-1440x1000')
    await darkPage.screenshot({ path: `${OUT_DIR}/dark-mode-1440x1000.png` })
    check(darkErrors.length === 0, 'Dark mode emitted browser errors', { errors: darkErrors })
  } finally {
    await darkContext.close()
  }

  const mobile = { width: 390, height: 844 }
  const mobileContext = await makeContext(browser, mobile, 'light')
  const mobilePage = await mobileContext.newPage()
  const mobileErrors = watchErrors(mobilePage)
  try {
    await goto(mobilePage, '/')
    await mobilePage.screenshot({ path: `${OUT_DIR}/mobile-home-390x844.png` })
    await goto(mobilePage, STRESS_PATH)
    await mobilePage.screenshot({ path: `${OUT_DIR}/mobile-article-390x844.png` })
    check(mobileErrors.length === 0, 'Mobile evidence emitted browser errors', { errors: mobileErrors })
  } finally {
    await mobileContext.close()
  }
}

async function testReducedMotion(browser) {
  const viewport = { width: 390, height: 844 }
  const context = await makeContext(browser, viewport, 'light', 'reduce')
  const page = await context.newPage()
  const errors = watchErrors(page)
  try {
    await goto(page, '/')
    const state = await page.evaluate(() => ({
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      writing: Boolean(document.querySelector('#writing')),
      search: Boolean(document.querySelector('[data-search-open]'))
    }))
    check(state.reducedMotion, 'prefers-reduced-motion: reduce was not applied', state)
    check(state.writing && state.search, 'Reduced motion removed core functionality', state)
    await testSearchInExistingPage(page)
    check(errors.length === 0, 'Reduced-motion mode emitted browser errors', { errors })
  } finally {
    await context.close()
  }
}

async function testSearchInExistingPage(page) {
  const opener = page.locator('[data-search-open]:visible').first()
  await opener.click()
  const dialog = page.locator('[data-search-dialog]')
  check(await dialog.evaluate(node => node.open), 'Search failed under reduced motion')
  await page.keyboard.press('Escape')
}

await pollPreview()
const browser = await chromium.launch({ headless: true })
try {
  for (const viewport of viewports) await acceptanceViewport(browser, viewport)
  await testMechanicsProbe(browser)
  await testSearch(browser, { name: '1440x1000', width: 1440, height: 1000 })
  await testSearch(browser, { name: '390x844', width: 390, height: 844 })
  await captureEditorialEvidence(browser)
  await testReducedMotion(browser)

  report.sourceCoverage.promptMarkerInSource = false
  report.sourceCoverage.note = 'Saved source is preserved verbatim; it contains code fences and image markers, but no Markdown table or [!PROMPT] marker. Table mechanics are browser-probed separately.'
} finally {
  await browser.close()
  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify(report, null, 2))
}

if (report.failures.length) {
  console.error(`Signal Ledger QA failed with ${report.failures.length} issue(s).`)
  for (const failure of report.failures) console.error('-', failure.message, JSON.stringify(failure))
  process.exitCode = 1
} else {
  console.log(`Signal Ledger QA passed: ${report.cases.length} acceptance viewports, ${report.interactions.length} interaction checks, ${themes.join('/')} themes.`)
}
