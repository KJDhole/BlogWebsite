import test from 'node:test'
import assert from 'node:assert/strict'
import { interpolateRect, sampleSceneViewport } from '../src/scripts/sceneViewport.mjs'

test('interpolateRect moves the one scene viewport continuously between anchors', () => {
  const from = { left: 820, top: 130, width: 430, height: 430 }
  const to = { left: 780, top: 80, width: 620, height: 520 }
  assert.deepEqual(interpolateRect(from, to, 0), from)
  assert.deepEqual(interpolateRect(from, to, 1), to)
  assert.deepEqual(interpolateRect(from, to, 0.5), {
    left: 800,
    top: 105,
    width: 525,
    height: 475
  })
})

test('sampleSceneViewport expands through a full viewport stage before settling', () => {
  const from = { left: 800, top: 120, width: 440, height: 440 }
  const stage = { left: 0, top: 0, width: 1440, height: 1000 }
  const to = { left: 700, top: 90, width: 700, height: 560 }

  assert.deepEqual(sampleSceneViewport({ from, stage, to, progress: 0 }), from)
  assert.deepEqual(sampleSceneViewport({ from, stage, to, progress: 0.5 }), stage)
  assert.deepEqual(sampleSceneViewport({ from, stage, to, progress: 1 }), to)
})
