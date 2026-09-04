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
