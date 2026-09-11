import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { getTransitionFrame } from '../src/scripts/themeWorld.mjs'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('master world transition uses the approved seven-stage 1500ms timeline', () => {
  assert.equal(getTransitionFrame(0, 'to-solar').phase, 'ignition')
  assert.equal(getTransitionFrame(120, 'to-solar').phase, 'convergence')
  assert.equal(getTransitionFrame(300, 'to-solar').phase, 'layout-release')
  assert.equal(getTransitionFrame(520, 'to-solar').phase, 'radiation')
  assert.equal(getTransitionFrame(820, 'to-solar').phase, 'solar-arrival')
  assert.equal(getTransitionFrame(1080, 'to-solar').phase, 'index-reconstruction')
  assert.equal(getTransitionFrame(1320, 'to-solar').phase, 'settle')
  assert.equal(getTransitionFrame(1500, 'to-solar').progress, 1)
})

test('homepage drives scene viewport and official WebGL transition from one worldtransition event', async () => {
  const home = await read('../src/scripts/home.js')
  assert.doesNotMatch(home, /createWorldMorph/)
  assert.doesNotMatch(home, /worldMorph/)
  assert.doesNotMatch(home, /getMorphProgress|getIndexProgress/)
  assert.match(home, /sceneViewport\?\.setTransition/)
  assert.match(home, /spaceScene\?\.setWorldTransition/)
})

test('semantic world swap still settles layout state at the destination', async () => {
  const controller = await read('../src/scripts/themeController.js')
  assert.match(controller, /glenn:worldtransitionstart/)
  assert.match(controller, /glenn:worldtransitionend/)
  assert.match(controller, /root\.dataset\.layoutWorld\s*=\s*toWorld/)
  assert.match(controller, /swapWorld\(toWorld\)/)
})
