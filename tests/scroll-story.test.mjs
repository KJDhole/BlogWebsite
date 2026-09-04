import test from 'node:test'
import assert from 'node:assert/strict'
import {
  STORY_LIMITS,
  getScrollStoryState,
  buildEjectionPath,
  sampleEjectionPath
} from '../src/scripts/scrollStory.mjs'
import { getIndicatorGeometry, getDropGeometry } from '../src/scripts/navPortal.mjs'

test('scroll story keeps the approved phase order', () => {
  const samples = [0.05, 0.24, 0.38, 0.52, 0.62, 0.71, 0.84]
    .map(progress => getScrollStoryState(progress).phase)
  assert.deepEqual(samples, [
    'stable-orbit',
    'portal-emerge',
    'absorb',
    'compact',
    'nav-portal',
    'eject',
    'landing'
  ])
})

test('absorption finishes before ejection begins', () => {
  const captured = getScrollStoryState(STORY_LIMITS.absorbEnd)
  const beforeEject = getScrollStoryState(STORY_LIMITS.navPortalEnd - 0.001)
  const eject = getScrollStoryState(STORY_LIMITS.navPortalEnd + 0.001)
  assert.equal(captured.accent.absorption, 1)
  assert.equal(beforeEject.ejection.progress, 0)
  assert.ok(eject.ejection.progress > 0)
})

test('hero and navigation portals are never simultaneously dominant', () => {
  for (let i = 0; i <= 100; i += 1) {
    const state = getScrollStoryState(i / 100)
    assert.ok(!(state.heroPortal.opacity > 0.5 && state.navPortal.opacity > 0.5))
  }
})

test('compact scale never falls below the configured floor', () => {
  for (let i = 0; i <= 100; i += 1) {
    assert.ok(getScrollStoryState(i / 100).system.scale >= STORY_LIMITS.desktopMinScale)
    assert.ok(getScrollStoryState(i / 100, { mobile: true }).system.scale >= STORY_LIMITS.mobileMinScale)
  }
})

test('reduced motion skips portal travel and keeps a stable system', () => {
  const state = getScrollStoryState(0.72, { reducedMotion: true })
  assert.equal(state.phase, 'reduced')
  assert.equal(state.heroPortal.opacity, 0)
  assert.equal(state.navPortal.opacity, 0)
  assert.equal(state.ejection.progress, 0)
  assert.equal(state.landingReady, false)
  assert.equal(state.system.scale, 1)
})

test('ejection curve starts at the portal and ends exactly at drop start', () => {
  const portal = { x: 400, y: 700 }
  const dropStart = { x: 400, y: 608 }
  const path = buildEjectionPath(portal, dropStart, { mobile: false })
  assert.deepEqual(sampleEjectionPath(path, 0), portal)
  assert.deepEqual(sampleEjectionPath(path, 1), dropStart)
  const middle = sampleEjectionPath(path, 0.5)
  assert.ok(middle.y < portal.y)
  assert.notEqual(middle.x, portal.x)
})

test('navigation portal anchors to the measured All indicator center', () => {
  const track = { left: 100, bottom: 720 }
  const button = { left: 220, width: 46 }
  const geometry = getIndicatorGeometry(track, button)
  assert.equal(geometry.centerX, 243)
  assert.equal(geometry.centerY, 714.25)
  assert.equal(geometry.width, 46)
})

test('drop geometry keeps exact target and uses smaller mobile drop height', () => {
  const indicator = { centerX: 243, centerY: 714.25, width: 46, height: 1.5, offsetX: 120 }
  const desktop = getDropGeometry(indicator, { mobile: false })
  const mobile = getDropGeometry(indicator, { mobile: true })
  assert.deepEqual(desktop.target, { x: 243, y: 714.25 })
  assert.equal(desktop.dropStart.y, 622.25)
  assert.equal(mobile.dropStart.y, 648.25)
})
