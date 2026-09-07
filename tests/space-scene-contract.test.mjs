import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('space scene exposes a layered cosmic foreground instead of a solar-system fallback model', async () => {
  const component = await read('../src/components/SpaceScene.astro')
  assert.match(component, /data-space-scene/)
  assert.match(component, /data-space-canvas/)
  assert.match(component, /data-space-fallback/)
  assert.match(component, /data-cosmic-path/)
  assert.match(component, /data-cosmic-trail/)
  assert.match(component, /data-cosmic-traveler/)
  assert.doesNotMatch(component, /orbit-fallback-core|orbit-fallback-planet|orbit-fallback-ring/)
  assert.doesNotMatch(component, /react|ReactThreeFiber|@react-three/i)
})

test('homepage preserves publishing controls while mounting the cosmic scene', async () => {
  const page = await read('../src/pages/index.astro')
  assert.match(page, /<SpaceScene/)
  assert.match(page, /id="article-search"/)
  assert.match(page, /data-category="All"/)
  assert.match(page, /<ArticleRow/)
  assert.doesNotMatch(page, /class="nav-portal"|class="flight-orb"|flight-echo/)
})

test('active Three.js scene uses atmospheric cosmic field rather than solar-system or black-hole model modules', async () => {
  const scene = await read('../src/scripts/spaceScene.mjs')
  const stars = await read('../src/scripts/starField.mjs')
  assert.match(stars, /createStarField/)
  assert.match(scene, /createCosmicField/)
  assert.doesNotMatch(scene, /createSolarSystem|solarSystem3d/)
  assert.doesNotMatch(scene, /createBlackHolePortal|blackHolePortal/)
})

test('space scene keeps the lifecycle and performance protections', async () => {
  const scene = await read('../src/scripts/spaceScene.mjs')
  assert.match(scene, /createSpaceScene/)
  assert.match(scene, /setStoryState/)
  assert.match(scene, /setTheme/)
  assert.match(scene, /resize/)
  assert.match(scene, /destroy/)
  assert.match(scene, /setPixelRatio/)
  assert.match(scene, /webglcontextlost/)
  assert.match(scene, /visibilitychange/)
  assert.match(scene, /onUnavailable/)
})
