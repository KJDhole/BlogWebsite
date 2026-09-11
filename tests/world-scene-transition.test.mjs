import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const moduleUrl = new URL('../src/scripts/worldSceneTransition.mjs', import.meta.url)
const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('official scene transition maps both directions onto RenderTransitionPass mix', async () => {
  const { getOfficialTransitionMix } = await import(moduleUrl.href)

  assert.equal(getOfficialTransitionMix('to-solar', 0), 0)
  assert.equal(getOfficialTransitionMix('to-solar', 1), 1)
  assert.equal(getOfficialTransitionMix('to-observatory', 0), 1)
  assert.equal(getOfficialTransitionMix('to-observatory', 1), 0)
  assert.equal(getOfficialTransitionMix('to-solar', 2), 1)
  assert.equal(getOfficialTransitionMix('to-observatory', -1), 1)
})

test('official scene mixing waits until the canvas is full-stage, then completes before settle', async () => {
  const { getOfficialSceneMixProgress } = await import(moduleUrl.href)

  assert.equal(getOfficialSceneMixProgress(0), 0)
  assert.equal(getOfficialSceneMixProgress(520), 0)
  assert.equal(getOfficialSceneMixProgress(649), 0)
  assert.equal(getOfficialSceneMixProgress(650), 0)
  assert.equal(getOfficialSceneMixProgress(800), 0.5)
  assert.equal(getOfficialSceneMixProgress(950), 1)
  assert.equal(getOfficialSceneMixProgress(1500), 1)
})

test('world scene transition composes official Three.js post-processing addons', async () => {
  const source = await read('../src/scripts/worldSceneTransition.mjs')

  assert.match(source, /three\/addons\/postprocessing\/EffectComposer\.js/)
  assert.match(source, /three\/addons\/postprocessing\/RenderTransitionPass\.js/)
  assert.match(source, /three\/addons\/postprocessing\/UnrealBloomPass\.js/)
  assert.match(source, /three\/addons\/postprocessing\/OutputPass\.js/)
  assert.match(source, /new\s+RenderTransitionPass\(\s*solarScene\s*,\s*camera\s*,\s*observatoryScene\s*,\s*camera\s*\)/)
  assert.doesNotMatch(source, /new\s+THREE\.ShaderMaterial|new\s+ShaderMaterial/)
})

test('radial transition texture is project glue rather than a replacement blend shader', async () => {
  const source = await read('../src/scripts/worldSceneTransition.mjs')

  assert.match(source, /CanvasTexture/)
  assert.match(source, /createRadialGradient/)
  assert.match(source, /\.setTexture\(/)
  assert.match(source, /\.setTextureThreshold\(/)
  assert.match(source, /\.useTexture\(true\)/)
})
