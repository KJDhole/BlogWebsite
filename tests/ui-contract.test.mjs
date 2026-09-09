import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('Astro homepage keeps the approved research folio controls around the cosmic scene', async () => {
  const page = await read('../src/pages/index.astro')
  assert.match(page, /class="hero/)
  assert.match(page, /<SpaceScene/)
  assert.match(page, /id="article-search"/)
  assert.match(page, /data-category="All"/)
  assert.match(page, /getCollection\('posts'/)
  assert.match(page, /<ArticleRow/)
})

test('theme ownership is shared through one world state instead of page-local toggles', async () => {
  const baseLayout = await read('../src/layouts/BaseLayout.astro')
  const page = await read('../src/pages/index.astro')
  const siteHeader = await read('../src/components/SiteHeader.astro')
  const homeScript = await read('../src/scripts/home.js')

  assert.match(baseLayout, /dataset\.world/)
  assert.match(baseLayout, /ThemeTransition/)
  assert.match(baseLayout, /solar\.css/)
  assert.match(page, /data-world-toggle/)
  assert.match(siteHeader, /data-world-toggle/)
  assert.doesNotMatch(siteHeader, /localStorage\.setItem\('glenn-blog-theme'/)
  assert.doesNotMatch(homeScript, /function\s+applyTheme|function\s+getInitialTheme/)
  assert.match(homeScript, /glenn:worldchange/)
  assert.match(homeScript, /glenn:worldtransition/)
})

test('homepage client coordinates reversible cosmic motion without owning article data or navigation-flight choreography', async () => {
  const script = await read('../src/scripts/home.js')
  assert.doesNotMatch(script, /const\s+articles\s*=\s*\[/)
  assert.match(script, /querySelectorAll\(['"]\.article-row['"]\)/)
  assert.match(script, /filterArticleMetadata/)
  assert.match(script, /getScrollStoryState/)
  assert.match(script, /createSpaceScene/)
  assert.match(script, /sampleCosmicPath/)
  assert.match(script, /data-cosmic-traveler/)
  assert.doesNotMatch(script, /createNavPortal|getLandingMotionState|landingProgressFromElapsed|buildEjectionPath|sampleEjectionPath/)
  assert.doesNotMatch(script, /currentDropGeometry|currentEjectionPath|landingStartedAt/)
})

test('cosmic traveler geometry is cached outside the animation frame loop', async () => {
  const script = await read('../src/scripts/home.js')
  assert.match(script, /currentCosmicPath/)
  assert.match(script, /refreshCosmicGeometry/)
  assert.doesNotMatch(script, /getBoundingClientRect\(\)[\s\S]*requestAnimationFrame\(animate/i)
})

test('responsive reduced-motion and deep-space containment rules survive the migration', async () => {
  const styles = `${await read('../src/styles/global.css')}\n${await read('../src/styles/space.css')}\n${await read('../src/styles/solar.css')}`
  assert.match(styles, /prefers-reduced-motion/)
  assert.match(styles, /max-width:\s*760px/)
  assert.match(styles, /\.space-scene/)
  assert.match(styles, /\.space-canvas/)
  assert.match(styles, /\.cosmic-traveler/)
  assert.match(styles, /\.cosmic-path/)
  assert.match(styles, /is-fallback/)
  assert.match(styles, /overflow:\s*(clip|hidden)/)
  assert.match(styles, /pointer-events:\s*none/)
  assert.doesNotMatch(styles, /\.nav-portal\s*\{/)
})
