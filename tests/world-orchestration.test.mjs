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

test('homepage drives DOM morph scene viewport and WebGL scene from one worldtransition event', async () => {
  const home = await read('../src/scripts/home.js')
  assert.match(home, /createWorldMorph/)
  assert.match(home, /worldMorph\.prepare/)
  assert.match(home, /worldMorph\.setProgress/)
  assert.match(home, /worldMorph\.finish/)
  assert.match(home, /sceneViewport\?\.setTransition/)
  assert.match(home, /spaceScene\?\.setWorldTransition/)
})

test('layout target is prepared before the visible transition and settles to destination world', async () => {
  const controller = await read('../src/scripts/themeController.js')
  assert.match(controller, /glenn:worldtransitionstart/)
  assert.match(controller, /glenn:worldtransitionend/)
  assert.match(controller, /layoutWorld/)
  assert.match(controller, /toWorld/)
})
