import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

function collectSourceText(directory) {
  const root = fileURLToPath(new URL(`../${directory}/`, import.meta.url))
  const walk = path => readdirSync(path).flatMap(name => {
    const full = resolve(path, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
  return walk(root)
    .filter(path => /\.(astro|js|mjs|css)$/.test(path))
    .map(path => readFileSync(path, 'utf8'))
    .join('\n')
}

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

test('homepage uses LedgerEntry and the retired Orbit runtime is absent from production', () => {
  const homeSource = read('src/pages/index.astro')
  const packageJson = read('package.json')
  const productionSource = collectSourceText('src')

  assert.match(homeSource, /id="writing"/)
  assert.match(homeSource, /LedgerEntry/)
  assert.doesNotMatch(homeSource, /SpaceScene|orbit-wrap|nav-portal|flight-orb/)
  assert.doesNotMatch(packageJson, /"three"/)
  assert.doesNotMatch(productionSource, /from ['"]three['"]|scrollStory|spaceScene|filterArticles/)

  for (const path of [
    'src/components/SpaceScene.astro',
    'src/scripts/blackHolePortal.mjs',
    'src/scripts/home.js',
    'src/scripts/navPortal.mjs',
    'src/scripts/orbitMotion.mjs',
    'src/scripts/scrollStory.mjs',
    'src/scripts/solarSystem3d.mjs',
    'src/scripts/spaceScene.mjs',
    'src/scripts/starField.mjs',
    'src/scripts/filterArticles.mjs',
    'src/styles/space.css',
    'scripts/absorption-qa.mjs',
    '.github/workflows/absorption-qa.yml'
  ]) {
    assert.equal(existsSync(new URL(`../${path}`, import.meta.url)), false, `${path} should be retired`)
  }
})
