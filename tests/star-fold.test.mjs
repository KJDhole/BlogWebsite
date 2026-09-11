import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getLayerFoldStrength,
  sampleFoldPoint,
  getStarTransitionFrame
} from '../src/scripts/starField.mjs'

test('near stars bend more strongly than mid and far stars', () => {
  assert.ok(getLayerFoldStrength('far') < getLayerFoldStrength('mid'))
  assert.ok(getLayerFoldStrength('mid') < getLayerFoldStrength('near'))
})

test('gravitational fold keeps exact endpoints but follows a curved midpoint', () => {
  const base = { x: -2, y: 1, z: 0.5 }
  const target = { x: 4, y: 3, z: 0 }
  const start = sampleFoldPoint(base, target, 0, { strength: 1, bend: 0.6, direction: 'to-solar' })
  const middle = sampleFoldPoint(base, target, 0.5, { strength: 1, bend: 0.6, direction: 'to-solar' })
  const end = sampleFoldPoint(base, target, 1, { strength: 1, bend: 0.6, direction: 'to-solar' })

  assert.deepEqual(start, base)
  assert.deepEqual(end, target)
  const linearMiddle = { x: 1, y: 2 }
  assert.ok(Math.abs(middle.x - linearMiddle.x) > 0.05 || Math.abs(middle.y - linearMiddle.y) > 0.05)
})

test('to-solar converges before radiation while far stars fade earlier', () => {
  const frame = getStarTransitionFrame({ direction: 'to-solar', progress: 0.34 })
  assert.ok(frame.fold > 0.8)
  assert.ok(frame.visibility.near > frame.visibility.mid)
  assert.ok(frame.visibility.mid > frame.visibility.far)
})

test('to-observatory re-expands on a distinct later curve', () => {
  const early = getStarTransitionFrame({ direction: 'to-observatory', progress: 0.2 })
  const middle = getStarTransitionFrame({ direction: 'to-observatory', progress: 0.55 })
  const late = getStarTransitionFrame({ direction: 'to-observatory', progress: 0.9 })
  assert.ok(early.fold > middle.fold)
  assert.ok(middle.fold > late.fold)
  assert.ok(late.visibility.near > early.visibility.near)
})
