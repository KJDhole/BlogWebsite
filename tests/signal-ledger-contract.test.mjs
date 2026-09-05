import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('Signal Ledger shared shell exposes publication navigation, command search and theme persistence', () => {
  const headerSource = read('src/components/SiteHeader.astro')
  const searchSource = read('src/components/SearchOverlay.astro')
  const footerSource = read('src/components/SignalFooter.astro')
  const siteShellSource = read('src/scripts/siteShell.js')
  const signalCss = read('src/styles/signal-ledger.css')
  const baseLayout = read('src/layouts/BaseLayout.astro')

  assert.match(headerSource, /GLENN/)
  assert.match(headerSource, /data-search-open/)
  assert.match(headerSource, /Writing/)
  assert.match(headerSource, /Archive/)
  assert.match(headerSource, /Tags/)
  assert.match(searchSource, /<dialog/)
  assert.match(searchSource, /data-search-index/)
  assert.match(searchSource, /data-search-results/)
  assert.match(footerSource, /rss\.xml/i)
  assert.match(footerSource, /GitHub/)
  assert.match(footerSource, /X/)
  assert.match(siteShellSource, /glenn-blog-theme/)
  assert.match(siteShellSource, /metaKey|ctrlKey/)
  assert.match(signalCss, /--signal-accent:/)
  assert.match(signalCss, /prefers-reduced-motion/)
  assert.doesNotMatch(signalCss, /linear-gradient|radial-gradient/)
  assert.match(baseLayout, /signal-ledger\.css/)
  assert.match(baseLayout, /#f2efe8/i)
  assert.match(baseLayout, /#171715/i)
})

test('Signal Ledger keeps semantic discovery metadata and a visible keyboard focus contract', () => {
  const baseLayout = read('src/layouts/BaseLayout.astro')
  const signalCss = read('src/styles/signal-ledger.css')

  assert.match(baseLayout, /rel="canonical"/)
  assert.match(baseLayout, /application\/rss\+xml/)
  assert.match(baseLayout, /application\/ld\+json/)
  assert.match(baseLayout, /og:title/)
  assert.match(signalCss, /:focus-visible/)
})
