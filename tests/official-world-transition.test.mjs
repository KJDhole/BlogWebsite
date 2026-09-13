import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// RED contract: these tests describe the official Three.js transition architecture before implementation.
const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('project stays pinned to the Three.js release used by the official transition references', async () => {
  const pkg = JSON.parse(await read('../package.json'))
  assert.equal(pkg.dependencies.three, '0.180.0')
})

test('space scene delegates world mixing to an official transition adapter instead of one-scene worldMix', async () => {
  const source = await read('../src/scripts/spaceScene.mjs')
  assert.match(source, /createWorldTransitionRenderer/)
  assert.match(source, /const observatoryScene = new THREE\.Scene\(\)/)
  assert.match(source, /const solarScene = new THREE\.Scene\(\)/)
  assert.doesNotMatch(source, /function applyWorldMix\(/)
})

test('transition adapter reuses r180 RenderTransitionPass without creating another renderer', async () => {
  const source = await read('../src/scripts/worldTransitionRenderer.mjs').catch(() => '')
  assert.match(source, /EffectComposer/)
  assert.match(source, /RenderTransitionPass/)
  assert.match(source, /OutputPass/)
  assert.match(source, /setTextureThreshold\(0\.1\)/)
  assert.doesNotMatch(source, /new THREE\.WebGLRenderer/)
})

test('official transition direction maps Observatory scene A and Solar scene B correctly', async () => {
  const source = await read('../src/scripts/worldTransitionRenderer.mjs').catch(() => '')
  assert.match(source, /direction === 'to-solar' \? 1 - p : p/)
})

test('official transition mask is generated from the measured toggle origin rather than a fixed center', async () => {
  const source = await read('../src/scripts/worldTransitionRenderer.mjs').catch(() => '')
  assert.match(source, /originX/)
  assert.match(source, /originY/)
  assert.match(source, /createRadialGradient/)
  assert.match(source, /new THREE\.CanvasTexture/)
})

test('official post-processing starts after star convergence and completes by Solar arrival', async () => {
  const module = await import('../src/scripts/worldTransitionRenderer.mjs')
  assert.equal(typeof module.getOfficialSceneProgress, 'function')
  assert.equal(module.getOfficialSceneProgress(0), 0)
  assert.equal(module.getOfficialSceneProgress(299), 0)
  assert.equal(module.getOfficialSceneProgress(300), 0)
  assert.ok(module.getOfficialSceneProgress(520) > 0)
  assert.ok(module.getOfficialSceneProgress(820) > module.getOfficialSceneProgress(520))
  assert.equal(module.getOfficialSceneProgress(1080), 1)
  assert.equal(module.getOfficialSceneProgress(1500), 1)
})
