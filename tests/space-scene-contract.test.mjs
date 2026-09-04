import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('space scene shell provides WebGL canvas and SVG fallback without React', async () => {
  const component = await read('../src/components/SpaceScene.astro')
  assert.match(component, /data-space-scene/)
  assert.match(component, /data-space-canvas/)
  assert.match(component, /data-space-fallback/)
  assert.match(component, /orbit-fallback-accent/)
  assert.doesNotMatch(component, /react|ReactThreeFiber|@react-three/i)
})

test('homepage preserves all controls while mounting space scene and nav portal', async () => {
  const page = await read('../src/pages/index.astro')
  assert.match(page, /<SpaceScene/)
  assert.match(page, /class="nav-portal"/)
  assert.match(page, /id="article-search"/)
  assert.match(page, /data-category="All"/)
  assert.match(page, /<ArticleRow/)
})

test('3d scene responsibilities stay split into focused modules', async () => {
  const stars = await read('../src/scripts/starField.mjs')
  const solar = await read('../src/scripts/solarSystem3d.mjs')
  const portal = await read('../src/scripts/blackHolePortal.mjs')
  assert.match(stars, /createStarField/)
  assert.match(solar, /createSolarSystem/)
  assert.match(solar, /accentPlanet/)
  assert.match(portal, /createBlackHolePortal/)
  assert.doesNotMatch(portal, /createSolarSystem/)
})

test('space scene exposes a small lifecycle API and quality protections', async () => {
  const scene = await read('../src/scripts/spaceScene.mjs')
  assert.match(scene, /createSpaceScene/)
  assert.match(scene, /setStoryState/)
  assert.match(scene, /setTheme/)
  assert.match(scene, /resize/)
  assert.match(scene, /destroy/)
  assert.match(scene, /setPixelRatio/)
  assert.match(scene, /webglcontextlost/)
  assert.match(scene, /onUnavailable/)
})
