import test from 'node:test'
import assert from 'node:assert/strict'
import { createFlipDelta, sampleFlip } from '../src/scripts/worldMorph.mjs'

test('createFlipDelta maps destination geometry back to source geometry', () => {
  const from = { left: 100, top: 80, width: 400, height: 120 }
  const to = { left: 620, top: 170, width: 620, height: 180 }
  assert.deepEqual(createFlipDelta(from, to), {
    x: -520,
    y: -90,
    scaleX: 400 / 620,
    scaleY: 120 / 180
  })
})

test('sampleFlip starts fully inverted and settles to identity', () => {
  const delta = { x: -520, y: -90, scaleX: 0.5, scaleY: 0.75 }
  assert.deepEqual(sampleFlip(delta, 0), delta)
  assert.deepEqual(sampleFlip(delta, 1), { x: 0, y: 0, scaleX: 1, scaleY: 1 })
})

test('sampleFlip clamps out-of-range progress', () => {
  const delta = { x: 30, y: -20, scaleX: 0.8, scaleY: 1.2 }
  assert.deepEqual(sampleFlip(delta, -1), delta)
  assert.deepEqual(sampleFlip(delta, 2), { x: 0, y: 0, scaleX: 1, scaleY: 1 })
})
