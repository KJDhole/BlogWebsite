import test from 'node:test'
import assert from 'node:assert/strict'
import { foldPoint } from '../src/scripts/starField.mjs'

test('foldPoint starts at the star and converges toward the attractor on a curved path', () => {
  const out = { x: 0, y: 0 }
  foldPoint(-2, 1, 3, -1, 0, 1, out)
  assert.deepEqual(out, { x: -2, y: 1 })

  foldPoint(-2, 1, 3, -1, 0.5, 1, out)
  assert.ok(out.x > -2 && out.x < 3)
  assert.notEqual(out.y, 0)

  foldPoint(-2, 1, 3, -1, 1, 1, out)
  assert.ok(Math.abs(out.x - 3) < 1e-9)
  assert.ok(Math.abs(out.y + 1) < 1e-9)
})

test('depth weight makes near stars fold farther than far stars at the same progress', () => {
  const far = { x: 0, y: 0 }
  const near = { x: 0, y: 0 }
  foldPoint(-3, 0.5, 2, -0.5, 0.55, 0.28, far)
  foldPoint(-3, 0.5, 2, -0.5, 0.55, 0.90, near)
  assert.ok(near.x > far.x)
})
