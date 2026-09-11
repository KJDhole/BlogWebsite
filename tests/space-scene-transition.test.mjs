import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('space scene owns two visual scenes but exactly one WebGLRenderer', async () => {
  const source = await read('../src/scripts/spaceScene.mjs')

  assert.match(source, /const\s+observatoryScene\s*=\s*new\s+THREE\.Scene\(\)/)
  assert.match(source, /const\s+solarScene\s*=\s*new\s+THREE\.Scene\(\)/)
  assert.equal((source.match(/new\s+THREE\.WebGLRenderer/g) ?? []).length, 1)
})

test('Observatory and Solar fields attach to their own scenes', async () => {
  const source = await read('../src/scripts/spaceScene.mjs')

  assert.match(source, /createStarField\(observatoryScene/)
  assert.match(source, /createCosmicField\(observatoryScene/)
  assert.match(source, /createSolarField\(solarScene/)
  assert.match(source, /createWorldSceneTransition\(renderer/)
})

test('stable rendering stays direct and composer rendering is transition-only', async () => {
  const source = await read('../src/scripts/spaceScene.mjs')

  assert.match(source, /worldTransition\.render\(deltaSeconds\)/)
  assert.match(source, /renderer\.render\(\s*currentWorld\s*===\s*['"]solar['"]\s*\?\s*solarScene\s*:\s*observatoryScene\s*,\s*camera\s*\)/)
  assert.doesNotMatch(source, /renderer\.render\(scene,\s*camera\)/)
})
