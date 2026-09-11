import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('world transition browser QA covers the full responsive hardening matrix', async () => {
  const qa = await read('../scripts/world-transition-qa.mjs')
  for (const width of [1440, 1024, 768, 390, 360]) {
    assert.match(qa, new RegExp(`width:\\s*${width}`))
  }
  assert.match(qa, /hardeningRuns/)
})

test('world transition browser QA verifies reduced motion settles without animated transition surfaces', async () => {
  const qa = await read('../scripts/world-transition-qa.mjs')
  assert.match(qa, /emulateMedia\(\{\s*reducedMotion:\s*['"]reduce['"]/)
  assert.match(qa, /worldTransitioning/)
  assert.match(qa, /reducedMotion/)
  assert.doesNotMatch(qa, /worldMorphing/)
})

test('world transition browser QA validates official scene mixing instead of the removed CSS wave', async () => {
  const qa = await read('../scripts/world-transition-qa.mjs')
  assert.doesNotMatch(qa, /data-solar-wave|waveRadius|waveScale/)
  assert.match(qa, /data-space-scene/)
  assert.match(qa, /canvasCoverage/)
  assert.match(qa, /heroOpacity/)
  assert.match(qa, /frame\.phase\s*===\s*['"]radiation['"]/)
  assert.match(qa, /title stayed outside viewport|title left viewport|hero.*viewport/i)
})

test('world transition hardening preserves one renderer, lifecycle cleanup, and preallocated star buffers', async () => {
  const scene = await read('../src/scripts/spaceScene.mjs')
  const stars = await read('../src/scripts/starField.mjs')

  assert.equal((scene.match(/new THREE\.WebGLRenderer/g) ?? []).length, 1)
  assert.match(scene, /visibilitychange/)
  assert.match(scene, /webglcontextlost/)
  assert.match(scene, /ResizeObserver/)
  assert.match(scene, /renderer\.dispose\(\)/)

  assert.match(stars, /basePositions\s*=\s*positions\.slice\(\)/)
  assert.match(stars, /new Float32Array\(count \* 6\)/)
  assert.match(stars, /DynamicDrawUsage/)
})
