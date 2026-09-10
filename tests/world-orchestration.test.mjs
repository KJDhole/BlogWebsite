import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { getLayoutMorphProgress } from '../src/scripts/worldMorph.mjs'
import { sampleSolarTransition } from '../src/scripts/solarField.mjs'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('layout morph waits for release, then reaches the destination before settle', () => {
  assert.equal(getLayoutMorphProgress(0, 'to-solar'), 0)
  assert.equal(getLayoutMorphProgress(299, 'to-solar'), 0)
  assert.ok(getLayoutMorphProgress(650, 'to-solar') > 0)
  assert.equal(getLayoutMorphProgress(1320, 'to-solar'), 1)

  assert.equal(getLayoutMorphProgress(0, 'to-observatory'), 0)
  assert.ok(getLayoutMorphProgress(300, 'to-observatory') > 0)
  assert.equal(getLayoutMorphProgress(1200, 'to-observatory'), 1)
})

test('solar limb arrives after radiation begins and withdraws before Observatory stars dominate', () => {
  const hidden = sampleSolarTransition(0, 'to-solar')
  const entering = sampleSolarTransition(0.5, 'to-solar')
  const settled = sampleSolarTransition(1, 'to-solar')
  assert.equal(hidden.mix, 0)
  assert.ok(hidden.offsetX > entering.offsetX)
  assert.ok(entering.mix > 0 && entering.mix < 1)
  assert.deepEqual(settled, { mix: 1, offsetX: 0, offsetY: 0, scale: 1 })

  const reverseStart = sampleSolarTransition(0, 'to-observatory')
  const reverseGone = sampleSolarTransition(0.35, 'to-observatory')
  assert.equal(reverseStart.mix, 1)
  assert.equal(reverseGone.mix, 0)
  assert.ok(reverseGone.offsetX > reverseStart.offsetX)
})

test('home orchestrates FLIP, cached scene anchors, and defers stable scene commit until transition end', async () => {
  const home = await read('../src/scripts/home.js')
  const viewport = await read('../src/scripts/sceneViewport.mjs')

  assert.match(home, /createWorldMorph/)
  assert.match(home, /glenn:worldtransitionstart/)
  assert.match(home, /glenn:worldtransitionend/)
  assert.match(home, /transitionActive/)
  assert.match(home, /worldMorph\?\.prepare/)
  assert.match(home, /worldMorph\?\.setProgress/)
  assert.match(home, /worldMorph\?\.finish/)
  assert.match(home, /sceneViewport\?\.beginTransition/)
  assert.match(home, /sceneViewport\?\.captureTarget/)
  assert.match(home, /sceneViewport\?\.finishTransition/)
  assert.match(viewport, /transitionRects/)
  assert.match(viewport, /beginTransition/)
  assert.match(viewport, /captureTarget/)
  assert.match(viewport, /finishTransition/)
})

test('article date, content, and metadata are independently morphable without nested row transforms', async () => {
  const row = await read('../src/components/ArticleRow.astro')
  assert.doesNotMatch(row, /<article[\s\S]*?data-world-morph=/)
  assert.match(row, /data-world-morph={`article-date-\$\{index\}`}/)
  assert.match(row, /data-world-morph={`article-main-\$\{index\}`}/)
  assert.match(row, /data-world-morph={`article-meta-\$\{index\}`}/)
})
