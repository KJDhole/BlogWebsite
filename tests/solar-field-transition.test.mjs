import test from 'node:test'
import assert from 'node:assert/strict'
import { getSolarTransitionFrame } from '../src/scripts/solarField.mjs'

const p = ms => ms / 1500

test('Solar limb stays fully hidden before the 820ms arrival window', () => {
  for (const ms of [0, 180, 450, 650, 819]) {
    const frame = getSolarTransitionFrame({ direction: 'to-solar', progress: p(ms) })
    assert.equal(frame.limb, 0, `limb visible too early at ${ms}ms`)
    assert.equal(frame.structure, 0, `Solar structure visible too early at ${ms}ms`)
  }
})

test('Solar limb enters from 820 to 1080ms and publication structure lags behind', () => {
  const start = getSolarTransitionFrame({ direction: 'to-solar', progress: p(820) })
  const middle = getSolarTransitionFrame({ direction: 'to-solar', progress: p(950) })
  const end = getSolarTransitionFrame({ direction: 'to-solar', progress: p(1080) })
  const structureEnd = getSolarTransitionFrame({ direction: 'to-solar', progress: p(1180) })

  assert.equal(start.limb, 0)
  assert.ok(middle.limb > 0 && middle.limb < 1)
  assert.ok(middle.structure < middle.limb)
  assert.equal(end.limb, 1)
  assert.equal(structureEnd.structure, 1)
})

test('Solar to Observatory withdraws the limb before star re-expansion becomes dominant', () => {
  const early = getSolarTransitionFrame({ direction: 'to-observatory', progress: 0.08 })
  const middle = getSolarTransitionFrame({ direction: 'to-observatory', progress: 0.22 })
  const gone = getSolarTransitionFrame({ direction: 'to-observatory', progress: 0.36 })

  assert.equal(early.limb, 1)
  assert.ok(middle.limb > 0 && middle.limb < 1)
  assert.ok(middle.structure < middle.limb)
  assert.equal(gone.limb, 0)
  assert.equal(gone.structure, 0)
})

test('arrival offset starts outside upper-right and settles to zero', () => {
  const hidden = getSolarTransitionFrame({ direction: 'to-solar', progress: p(650) })
  const middle = getSolarTransitionFrame({ direction: 'to-solar', progress: p(950) })
  const settled = getSolarTransitionFrame({ direction: 'to-solar', progress: p(1080) })

  assert.ok(hidden.offsetX > middle.offsetX)
  assert.ok(hidden.offsetY > middle.offsetY)
  assert.deepEqual({ x: settled.offsetX, y: settled.offsetY }, { x: 0, y: 0 })
})
