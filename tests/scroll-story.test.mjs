import test from 'node:test'
import assert from 'node:assert/strict'
import {
  STORY_LIMITS,
  getScrollStoryState,
  getStoryScrollDistance
} from '../src/scripts/scrollStory.mjs'

test('cosmic story follows drift charge flyby settle phases', () => {
  const samples = [0.12, 0.34, 0.58, 0.84]
    .map(progress => getScrollStoryState(progress).phase)
  assert.deepEqual(samples, ['drift', 'charge', 'flyby', 'settle'])
  assert.equal(STORY_LIMITS.driftEnd, 0.24)
  assert.equal(STORY_LIMITS.chargeEnd, 0.44)
  assert.equal(STORY_LIMITS.flybyEnd, 0.72)
})

test('story scroll distance still caps at available page scroll', () => {
  assert.equal(getStoryScrollDistance({ heroHeight: 577, mobile: false, maxScroll: 1200 }), 553.92)
  assert.equal(getStoryScrollDistance({ heroHeight: 577, mobile: false, maxScroll: 313 }), 313)
  assert.equal(getStoryScrollDistance({ heroHeight: 700, mobile: true, maxScroll: 400 }), 400)
  assert.equal(getStoryScrollDistance({ heroHeight: 700, mobile: true, maxScroll: 900 }), 644)
})

test('flyby state is deterministic and reversible from scroll progress alone', () => {
  const forward = getScrollStoryState(0.58, { mobile: false })
  getScrollStoryState(0.82, { mobile: false })
  const reverse = getScrollStoryState(0.58, { mobile: false })
  assert.deepEqual(reverse, forward)
  assert.equal(forward.phase, 'flyby')
  assert.ok(forward.pathProgress > 0 && forward.pathProgress < 1)
  assert.ok(forward.trail > 0)
})

test('charge brightens before flyby and settle quiets the scene', () => {
  const drift = getScrollStoryState(0.12)
  const charge = getScrollStoryState(0.34)
  const flyby = getScrollStoryState(0.58)
  const settle = getScrollStoryState(0.9)
  assert.ok(charge.charge > drift.charge)
  assert.ok(flyby.pathProgress > charge.pathProgress)
  assert.ok(settle.traveler.opacity < flyby.traveler.opacity)
  assert.ok(settle.field.energy < flyby.field.energy)
})

test('mobile uses the same story with restrained field motion', () => {
  const desktop = getScrollStoryState(0.58, { mobile: false })
  const mobile = getScrollStoryState(0.58, { mobile: true })
  assert.equal(mobile.phase, desktop.phase)
  assert.equal(mobile.pathProgress, desktop.pathProgress)
  assert.ok(mobile.field.parallax <= desktop.field.parallax)
  assert.ok(mobile.field.drift <= desktop.field.drift)
})

test('reduced motion keeps a stable atmospheric composition without traveler flyby', () => {
  const state = getScrollStoryState(0.58, { reducedMotion: true })
  assert.equal(state.phase, 'reduced')
  assert.equal(state.pathProgress, 0)
  assert.equal(state.trail, 0)
  assert.equal(state.traveler.visible, false)
  assert.equal(state.field.parallax, 0)
  assert.equal(state.reducedMotion, true)
})
