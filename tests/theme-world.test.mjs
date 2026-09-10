import test from 'node:test'
import assert from 'node:assert/strict'
import {
  themeToWorld,
  worldToTheme,
  getTransitionDirection,
  getTransitionFrame,
  getMorphProgress,
  getIndexProgress
} from '../src/scripts/themeWorld.mjs'

test('light maps to Solar Archive and dark maps to Observatory', () => {
  assert.equal(themeToWorld('light'), 'solar')
  assert.equal(themeToWorld('dark'), 'observatory')
  assert.equal(worldToTheme('solar'), 'light')
  assert.equal(worldToTheme('observatory'), 'dark')
})

test('world transitions have the approved seven-stage timeline', () => {
  assert.equal(getTransitionFrame(0, 'to-solar').phase, 'ignition')
  assert.equal(getTransitionFrame(120, 'to-solar').phase, 'convergence')
  assert.equal(getTransitionFrame(300, 'to-solar').phase, 'layout-release')
  assert.equal(getTransitionFrame(520, 'to-solar').phase, 'radiation')
  assert.equal(getTransitionFrame(820, 'to-solar').phase, 'solar-arrival')
  assert.equal(getTransitionFrame(1080, 'to-solar').phase, 'index-reconstruction')
  assert.equal(getTransitionFrame(1320, 'to-solar').phase, 'settle')
  assert.equal(getTransitionFrame(1500, 'to-solar').progress, 1)
})

test('DOM and index morph progress stay inside their intended windows', () => {
  assert.equal(getMorphProgress(299), 0)
  assert.equal(getMorphProgress(300), 0)
  assert.ok(getMorphProgress(650) > 0)
  assert.equal(getMorphProgress(1080), 1)
  assert.equal(getIndexProgress(1079), 0)
  assert.ok(getIndexProgress(1180) > 0)
  assert.equal(getIndexProgress(1320), 1)
})

test('direction follows personality destination', () => {
  assert.equal(getTransitionDirection('observatory', 'solar'), 'to-solar')
  assert.equal(getTransitionDirection('solar', 'observatory'), 'to-observatory')
  assert.equal(getTransitionDirection('solar', 'solar'), 'none')
})
