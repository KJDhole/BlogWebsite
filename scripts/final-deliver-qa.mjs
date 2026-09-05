import { chromium } from 'playwright'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const BASE_URL = 'http://127.0.0.1:4321'
const STRESS_PATH = '/writing/__qa-ai-design-99/'
const failures = []
const details = {}

function check(condition, message, detail = null) {
  if (!condition) failures.push({ message, detail })
}

function parseColor(value) {
  const text = String(value).trim()
  const rgbMatch = text.match(/rgba?\(([^)]+)\)/)
  if (rgbMatch) {
    const parts = rgbMatch[1].split(/[\s,\/]+/).filter(Boolean).slice(0, 3).map(Number)
    return parts.length === 3 && parts.every(Number.isFinite) ? parts : null
  }
  const hexMatch = text.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!hexMatch) return null
  const hex = hexMatch[1].length === 3
    ? hexMatch[1].split('').map(char => char + char).join('')
    : hexMatch[1]
  return [0, 2, 4].map(index => Number.parseInt(hex.slice(index, index + 2), 16))
}

function luminance(rgb) {
  const values = rgb.map(value => {
    const channel = value / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2]
}

function contrastRatio(foreground, background) {
  const fg = parseColor(foreground)
  const bg = parseColor(background)
  if (!fg || !bg) return null
  const a = luminance(fg)
  const b = luminance(bg)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

function sourceReductionGate() {
  const base = readFileSync('src/layouts/BaseLayout.astro', 'utf8')
  const signal = readFileSync('src/styles/signal-ledger.css', 'utf8')
  const reading = readFileSync('src/styles/reading.css', 'utf8')
  const global = readFileSync('src/styles/global.css', 'utf8')
  const shell = readFileSync('src/scripts/siteShell.js', 'utf8')
  const styles = [global, signal, reading].join('\n')
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))

  check(!existsSync('src/styles/critic-rounds.css'), 'Temporary critic CSS still exists')
  check(!existsSync('src/components/SiteHeader.astro'), 'Retired SiteHeader still exists')
  check(!/critic-rounds\.css/.test(base), 'BaseLayout still imports critic-rounds.css')
  check(!/\.signal-header|\.signal-brand|\.signal-nav|\.signal-menu|\.signal-theme/.test(styles), 'Dead top-header CSS remains')
  check(!/signal-menu/.test(shell), 'Dead mobile-header runtime remains')
  check(!/linear-gradient|radial-gradient/.test(styles), 'Gradient found in final CSS')
  check(!/border-radius\s*:/.test(styles), 'Border radius found in final CSS')
  check(!/box-shadow\s*:/.test(styles), 'Box shadow found in final CSS')

  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
  const forbiddenDeps = ['three', 'react', 'react-dom', 'vue', 'svelte', 'gsap', 'framer-motion']
  const presentForbidden = forbiddenDeps.filter(name => name in deps)
  check(presentForbidden.length === 0, 'Heavy/retired UI dependency remains', presentForbidden)
  details.dependencies = Object.keys(deps).sort()
}

function performanceGate() {
  const astroDir = 'dist/_astro'
  const jsFiles = existsSync(astroDir)
    ? readdirSync(astroDir)
        .filter(name => name.endsWith('.js'))
        .map(name => ({ name, bytes: statSync(join(astroDir, name)).size }))
        .sort((a, b) => b.bytes - a.bytes)
    : []
  const oversized = jsFiles.filter(file => file.bytes > 500_000)
  check(oversized.length === 0, 'JavaScript chunk exceeds 500kB', oversized)
  details.jsChunks = jsFiles
}

async function browserGate() {
  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' })
    await context.addInitScript(() => localStorage.setItem('glenn-blog-theme', 'light'))
    const page = await context.newPage()

    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(120)
    check((await page.locator('.signal-header, .site-topbar, .signal-nav').count()) === 0, 'Top navigation rendered in final browser output')

    await page.locator('body').focus().catch(() => {})
    const tabStops = []
    for (let index = 0; index < 12; index += 1) {
      await page.keyboard.press('Tab')
      tabStops.push(await page.evaluate(() => {
        const el = document.activeElement
        if (!(el instanceof HTMLElement)) return null
        return {
          tag: el.tagName,
          text: el.textContent?.trim().slice(0, 80) ?? '',
          search: el.hasAttribute('data-search-open'),
          theme: el.hasAttribute('data-theme-toggle'),
          href: el.getAttribute('href'),
          outlineStyle: getComputedStyle(el).outlineStyle,
          outlineWidth: getComputedStyle(el).outlineWidth
        }
      }))
    }
    check(tabStops.some(stop => stop?.search), 'Keyboard Tab did not reach Search control', tabStops)
    check(tabStops.some(stop => stop?.theme), 'Keyboard Tab did not reach Theme control', tabStops)
    check(tabStops.some(stop => stop?.href?.startsWith('/writing/')), 'Keyboard Tab did not reach an article link', tabStops)
    const focusedStop = tabStops.find(stop => stop?.search || stop?.theme)
    check(Boolean(focusedStop && focusedStop.outlineStyle !== 'none' && parseFloat(focusedStop.outlineWidth) >= 1), 'Keyboard focus indicator is not visibly styled', focusedStop)

    const searchOpener = page.locator('[data-search-open]:visible').first()
    await searchOpener.focus()
    await page.keyboard.press('Control+K')
    const dialog = page.locator('[data-search-dialog]')
    check(await dialog.evaluate(node => node.open), 'Ctrl/Cmd+K did not open Search in final gate')
    check(await page.locator('[data-search-input]').evaluate(node => node === document.activeElement), 'Search input did not receive focus')
    await page.keyboard.press('Escape')
    check(!(await dialog.evaluate(node => node.open)), 'Escape did not close Search in final gate')
    check(await searchOpener.evaluate(node => node === document.activeElement), 'Search did not return focus to opener')

    await page.goto(`${BASE_URL}${STRESS_PATH}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(180)
    const articleA11y = await page.evaluate(() => {
      const pageH1s = [...document.querySelectorAll('.article-opening h1')]
      const bodyH1s = [...document.querySelectorAll('.article-body h1')]
      const h2s = [...document.querySelectorAll('.article-body h2')]
      const tocCurrent = document.querySelector('.article-context-rail a[aria-current="location"]')
      const currentBefore = tocCurrent ? getComputedStyle(tocCurrent, '::before').content : null
      const copy = document.querySelector('.copy-control')
      const articleLink = document.querySelector('.article-body a')
      const bodyStyle = getComputedStyle(document.body)
      const rootStyle = getComputedStyle(document.documentElement)
      const bodyLinkStyle = articleLink ? getComputedStyle(articleLink) : null
      return {
        pageH1Count: pageH1s.length,
        preservedSourceH1Count: bodyH1s.length,
        h2Count: h2s.length,
        currentToc: Boolean(tocCurrent),
        currentBefore,
        copyTabIndex: copy instanceof HTMLElement ? copy.tabIndex : null,
        articleLinkPresent: Boolean(articleLink),
        articleLinkDecoration: bodyLinkStyle?.textDecorationLine ?? null,
        foreground: bodyStyle.color,
        background: bodyStyle.backgroundColor,
        muted: rootStyle.getPropertyValue('--muted').trim()
      }
    })
    check(articleA11y.pageH1Count === 1, 'Article opening does not have exactly one page-level H1', articleA11y)
    check(articleA11y.h2Count > 0, 'Stress article has no semantic H2 sections', articleA11y)
    check(articleA11y.currentToc, 'Active desktop TOC item lacks aria-current', articleA11y)
    check(Boolean(articleA11y.currentBefore && articleA11y.currentBefore !== 'none' && articleA11y.currentBefore !== 'normal'), 'Active TOC lacks a non-color marker', articleA11y)
    check(articleA11y.copyTabIndex !== null && articleA11y.copyTabIndex >= 0, 'Copy control is not keyboard reachable', articleA11y)
    if (articleA11y.articleLinkPresent) check(articleA11y.articleLinkDecoration.includes('underline'), 'Body link is not visibly distinguishable', articleA11y)

    const lightBodyContrast = contrastRatio(articleA11y.foreground, articleA11y.background)
    const lightMutedContrast = contrastRatio(articleA11y.muted, articleA11y.background)
    check(lightBodyContrast !== null && lightBodyContrast >= 4.5, 'Light body contrast below 4.5:1', { lightBodyContrast, articleA11y })
    check(lightMutedContrast !== null && lightMutedContrast >= 4.5, 'Light muted contrast below 4.5:1', { lightMutedContrast, articleA11y })

    await context.close()

    const darkContext = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' })
    await darkContext.addInitScript(() => localStorage.setItem('glenn-blog-theme', 'dark'))
    const darkPage = await darkContext.newPage()
    await darkPage.goto(`${BASE_URL}${STRESS_PATH}`, { waitUntil: 'domcontentloaded' })
    await darkPage.waitForTimeout(120)
    const darkMetrics = await darkPage.evaluate(() => {
      const body = getComputedStyle(document.body)
      const root = getComputedStyle(document.documentElement)
      return {
        theme: document.documentElement.dataset.theme,
        foreground: body.color,
        background: body.backgroundColor,
        muted: root.getPropertyValue('--muted').trim(),
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth
      }
    })
    check(darkMetrics.theme === 'dark', 'Dark theme did not persist in final gate', darkMetrics)
    check(darkMetrics.scrollWidth <= darkMetrics.innerWidth + 1, 'Dark mobile page has horizontal overflow', darkMetrics)
    const darkBodyContrast = contrastRatio(darkMetrics.foreground, darkMetrics.background)
    const darkMutedContrast = contrastRatio(darkMetrics.muted, darkMetrics.background)
    check(darkBodyContrast !== null && darkBodyContrast >= 4.5, 'Dark body contrast below 4.5:1', { darkBodyContrast, darkMetrics })
    check(darkMutedContrast !== null && darkMutedContrast >= 4.5, 'Dark muted contrast below 4.5:1', { darkMutedContrast, darkMetrics })
    details.contrast = { lightBodyContrast, lightMutedContrast, darkBodyContrast, darkMutedContrast }
    details.tabStops = tabStops
    details.sourceHeadingPreservation = { bodyH1Count: articleA11y.preservedSourceH1Count }
    await darkContext.close()
  } finally {
    await browser.close()
  }
}

sourceReductionGate()
performanceGate()
await browserGate()

if (failures.length) {
  console.error(`Final Deliver QA failed with ${failures.length} issue(s).`)
  for (const failure of failures) console.error('-', failure.message, failure.detail ?? '')
  process.exitCode = 1
} else {
  console.log('Final Deliver QA passed.')
  console.log(JSON.stringify(details, null, 2))
}
