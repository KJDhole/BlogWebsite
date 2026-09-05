import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('Signal Ledger article uses asymmetric meta/body/context reading grid', () => {
  const layoutSource = read('src/layouts/ArticleLayout.astro')
  const readingCss = read('src/styles/reading.css')

  assert.match(layoutSource, /class="signal-article"/)
  assert.match(layoutSource, /article-meta-rail/)
  assert.match(layoutSource, /article-context-rail/)
  assert.match(layoutSource, /article-toc-mobile/)
  assert.match(layoutSource, /<SignalFooter/)
  assert.match(readingCss, /\.article-body/)
  assert.match(readingCss, /44rem|45rem/)
  assert.match(readingCss, /\.media-wide/)
  assert.match(readingCss, /\.media-full/)
})

test('article enhancement exposes section state, code copy and prompt copy without a motion library', () => {
  const enhanceSource = read('src/scripts/articleEnhance.js')

  assert.match(enhanceSource, /IntersectionObserver/)
  assert.match(enhanceSource, /data-section-index|dataset\.sectionIndex/)
  assert.match(enhanceSource, /data-copy-code|dataset\.copyCode/)
  assert.match(enhanceSource, /data-copy-prompt|dataset\.copyPrompt/)
  assert.match(enhanceSource, /aria-current/)
  assert.match(enhanceSource, /navigator\.clipboard/)
  assert.doesNotMatch(enhanceSource, /gsap|anime|framer|motion\./i)
})

test('reading primitives keep code tables prompts quotes and long urls inside mobile-safe regions', () => {
  const readingCss = read('src/styles/reading.css')

  assert.match(readingCss, /overflow-x:\s*auto/)
  assert.match(readingCss, /overflow-wrap:\s*anywhere/)
  assert.match(readingCss, /\.prompt-block/)
  assert.match(readingCss, /blockquote/)
  assert.match(readingCss, /table/)
  assert.match(readingCss, /max-width:\s*760px/)
  assert.doesNotMatch(readingCss, /border-radius:\s*(1[2-9]|[2-9]\d)px/)
})
