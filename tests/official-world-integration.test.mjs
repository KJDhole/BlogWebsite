import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('space scene keeps one renderer and delegates scene blending to the official transition adapter', async () => {
  const source = await read('../src/scripts/spaceScene.mjs')

  assert.equal((source.match(/new\s+THREE\.WebGLRenderer\s*\(/g) ?? []).length, 1)
  assert.match(source, /createOfficialWorldTransition/)
  assert.match(source, /observatoryScene/)
  assert.match(source, /solarScene/)
  assert.match(source, /officialTransition\.setTransition/)
  assert.match(source, /officialTransition\.setBloom/)
  assert.match(source, /officialTransition\.render/)
  assert.match(source, /officialTransition\.dispose/)
})

test('stable rendering selects one world scene while transition rendering uses postprocessing', async () => {
  const source = await read('../src/scripts/spaceScene.mjs')

  assert.match(source, /renderer\.render\(currentWorld === ['"]solar['"] \? solarScene : observatoryScene, camera\)/)
  assert.match(source, /transitionActive[\s\S]*?officialTransition\.render/)
  assert.doesNotMatch(source, /applyWorldMix\(progress/)
})

test('postprocessing gives each world a matching background only while the full-screen transition is active', async () => {
  const source = await read('../src/scripts/spaceScene.mjs')

  assert.match(source, /observatoryTransitionBackground\s*=\s*new THREE\.Color/)
  assert.match(source, /solarTransitionBackground\s*=\s*new THREE\.Color/)
  assert.match(source, /observatoryScene\.background\s*=\s*transitionActive\s*\?\s*observatoryTransitionBackground\s*:\s*null/)
  assert.match(source, /solarScene\.background\s*=\s*transitionActive\s*\?\s*solarTransitionBackground\s*:\s*null/)
})
