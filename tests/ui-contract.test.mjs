import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('Astro homepage keeps the approved hero search and category controls around the 3D scene', async () => {
  const page = await read('../src/pages/index.astro')
  assert.match(page, /class="hero/)
  assert.match(page, /<SpaceScene/)
  assert.match(page, /id="article-search"/)
  assert.match(page, /data-category="All"/)
  assert.match(page, /getCollection\('posts'/)
  assert.match(page, /<ArticleRow/)
})

test('homepage client code coordinates the new 3d story without owning article data or old svg geometry', async () => {
  const script = await read('../src/scripts/home.js')
  assert.doesNotMatch(script, /const\s+articles\s*=\s*\[/)
  assert.match(script, /querySelectorAll\(['"]\.article-row['"]\)/)
  assert.match(script, /filterArticleMetadata/)
  assert.match(script, /getScrollStoryState/)
  assert.match(script, /createSpaceScene/)
  assert.match(script, /createNavPortal/)
  assert.match(script, /getLandingMotionState/)
  assert.match(script, /landingProgressFromElapsed/)
  assert.doesNotMatch(script, /orbitNodes\s*=|orbit-ring-a|setSvgPoint/)
})

test('flight animation consumes cached navigation geometry instead of measuring layout every raf', async () => {
  const script = await read('../src/scripts/home.js')
  assert.match(script, /currentDropGeometry/)
  assert.match(script, /currentEjectionPath/)
  assert.match(script, /refreshFlightGeometry/)
  assert.doesNotMatch(script, /function\s+getCurrentDropGeometry/)
})

test('responsive reduced-motion and deep-space containment rules survive the migration', async () => {
  const styles = `${await read('../src/styles/global.css')}\n${await read('../src/styles/space.css')}`
  assert.match(styles, /prefers-reduced-motion/)
  assert.match(styles, /max-width:\s*760px/)
  assert.match(styles, /\.space-scene/)
  assert.match(styles, /\.space-canvas/)
  assert.match(styles, /\.nav-portal/)
  assert.match(styles, /is-fallback/)
  assert.match(styles, /overflow:\s*(clip|hidden)/)
  assert.match(styles, /pointer-events:\s*none/)
})
