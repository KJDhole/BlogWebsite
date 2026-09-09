import test from 'node:test'
import assert from 'node:assert/strict'
import {
  themeToWorld,
  worldToTheme,
  getTransitionDirection,
  getTransitionFrame
} from '../src/scripts/themeWorld.mjs'

test('light maps to Solar Archive and dark maps to Observatory', () => {
  assert.equal(themeToWorld('light'), 'solar')
  assert.equal(themeToWorld('dark'), 'observatory')
  assert.equal(worldToTheme('solar'), 'light')
  assert.equal(worldToTheme('observatory'), 'dark')
})

test('world transitions have fixed signature phases', () => {
  assert.equal(getTransitionFrame(0, 'to-solar').phase, 'eclipse')
  assert.equal(getTransitionFrame(180, 'to-solar').phase, 'totality')
  assert.equal(getTransitionFrame(450, 'to-solar').phase, 'solar-wave')
  assert.equal(getTransitionFrame(950, 'to-solar').phase, 'solar-reveal')
  assert.equal(getTransitionFrame(1250, 'to-solar').phase, 'archive-settle')
  assert.equal(getTransitionFrame(1500, 'to-solar').progress, 1)
})

test('direction follows personality destination', () => {
  assert.equal(getTransitionDirection('observatory', 'solar'), 'to-solar')
  assert.equal(getTransitionDirection('solar', 'observatory'), 'to-observatory')
  assert.equal(getTransitionDirection('solar', 'solar'), 'none')
})
