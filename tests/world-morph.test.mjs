import test from 'node:test'
import assert from 'node:assert/strict'
import { createAspectSafeFlipDelta, createFlipDelta, sampleFlip, selectWorldMorphNodes } from '../src/scripts/worldMorph.mjs'

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

test('aspect-safe visual FLIP preserves glyph proportions while keeping the same translation', () => {
  const delta = { x: -520, y: -90, scaleX: 0.8, scaleY: 0.4 }
  const visual = createAspectSafeFlipDelta(delta)

  assert.equal(visual.x, delta.x)
  assert.equal(visual.y, delta.y)
  assert.equal(visual.scaleX, visual.scaleY)
  assert.equal(visual.scaleX, Math.sqrt(0.8 * 0.4))
})

test('sampleFlip starts fully inverted and settles to identity', () => {
  const delta = { x: -520, y: -90, scaleX: 0.5, scaleY: 0.75 }
  assert.deepEqual(sampleFlip(delta, 0), delta)
  assert.deepEqual(sampleFlip(delta, 1), { x: 0, y: 0, scaleX: 1, scaleY: 1 })
})

test('sampleFlip clamps progress outside the 0..1 interval', () => {
  const delta = { x: -20, y: 10, scaleX: 0.8, scaleY: 1.2 }
  assert.deepEqual(sampleFlip(delta, -1), delta)
  assert.deepEqual(sampleFlip(delta, 2), { x: 0, y: 0, scaleX: 1, scaleY: 1 })
})

test('nested morph wrappers are excluded so parent and child FLIP transforms do not compound', () => {
  const child = { contains: () => false }
  const parent = { contains: node => node === child }
  const sibling = { contains: () => false }
  const root = { querySelectorAll: () => [parent, child, sibling] }

  assert.deepEqual(selectWorldMorphNodes(root), [child, sibling])
})
