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

test('world transitions follow the approved seven-stage 1500ms story', () => {
  assert.equal(getTransitionFrame(0, 'to-solar').phase, 'ignition')
  assert.equal(getTransitionFrame(120, 'to-solar').phase, 'fold')
  assert.equal(getTransitionFrame(300, 'to-solar').phase, 'layout-release')
  assert.equal(getTransitionFrame(520, 'to-solar').phase, 'radiation')
  assert.equal(getTransitionFrame(820, 'to-solar').phase, 'solar-arrival')
  assert.equal(getTransitionFrame(1080, 'to-solar').phase, 'index-rebuild')
  assert.equal(getTransitionFrame(1320, 'to-solar').phase, 'settle')
  assert.equal(getTransitionFrame(1500, 'to-solar').progress, 1)
})

test('direction follows personality destination', () => {
  assert.equal(getTransitionDirection('observatory', 'solar'), 'to-solar')
  assert.equal(getTransitionDirection('solar', 'observatory'), 'to-observatory')
  assert.equal(getTransitionDirection('solar', 'solar'), 'none')
})
