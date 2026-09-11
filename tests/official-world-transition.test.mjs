import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('official world transition adapter uses shipped Three.js postprocessing addons', async () => {
  const source = await read('../src/scripts/officialWorldTransition.mjs')

  assert.match(source, /EffectComposer\.js/)
  assert.match(source, /RenderTransitionPass\.js/)
  assert.match(source, /UnrealBloomPass\.js/)
  assert.match(source, /OutputPass\.js/)
  assert.match(source, /new\s+RenderTransitionPass\s*\(/)
  assert.match(source, /new\s+UnrealBloomPass\s*\(/)
  assert.match(source, /\.setTransition\s*\(/)
  assert.match(source, /\.setSize\s*\(/)
  assert.match(source, /\.dispose\s*\(/)

  assert.doesNotMatch(source, /fragmentShader\s*:/)
  assert.doesNotMatch(source, /gl_FragColor/)
})

test('official world transition adapter exposes a narrow lifecycle API', async () => {
  const source = await read('../src/scripts/officialWorldTransition.mjs')

  assert.match(source, /export function createOfficialWorldTransition/)
  for (const method of ['setScenes', 'setTransition', 'setBloom', 'setSize', 'render', 'dispose']) {
    assert.match(source, new RegExp(`\\b${method}\\b`))
  }
})
