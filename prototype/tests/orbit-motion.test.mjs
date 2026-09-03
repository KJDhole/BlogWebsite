import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clamp01,
  advanceOrbitAngles,
  getOrbitTransitionState,
  cubicBezierPoint,
  nearestEquivalentAngle,
  RELEASE_ANGLE,
  buildTangentFlightPath,
  sampleTangentFlightPath,
  getLandingMotionState,
  freeFallProgress,
  landingProgressFromElapsed
} from '../orbitMotion.mjs'

test('orbit angles advance continuously instead of resetting at one revolution', () => {
  const next = advanceOrbitAngles({ a: 359, b: -359, c: 719 }, 1000)
  assert.ok(next.a > 359)
  assert.ok(next.b < -359)
  assert.ok(next.c > 719)
})

test('transition tells a four-stage story instead of a single shrink-and-fade', () => {
  const idle = getOrbitTransitionState(0)
  assert.equal(idle.phase, 'orbit')
  assert.equal(idle.flight, 0)
  assert.equal(idle.breakup, 0)
  assert.equal(idle.indicatorMorph, 0)
  assert.equal(idle.systemOpacity, 1)

  const prepare = getOrbitTransitionState(0.3)
  assert.equal(prepare.phase, 'prepare')
  assert.ok(prepare.focus > 0)
  assert.equal(prepare.flight, 0)
  assert.ok(Math.abs(prepare.systemX) > 0)

  const release = getOrbitTransitionState(0.55)
  assert.equal(release.phase, 'release')
  assert.ok(release.flight > 0 && release.flight < 1)
  assert.ok(release.breakup > 0)
  assert.ok(release.satelliteCollapse > 0)

  const bounce = getOrbitTransitionState(0.86)
  assert.equal(bounce.phase, 'bounce')
  assert.equal(bounce.indicatorMorph, 0)
  assert.ok(bounce.systemOpacity < 0.25)

  const complete = getOrbitTransitionState(1)
  assert.equal(complete.phase, 'settled')
  assert.equal(complete.flight, 1)
  assert.equal(complete.indicatorMorph, 1)
  assert.equal(complete.systemOpacity, 0)
})

test('mobile keeps the same story with less lateral drift and compression', () => {
  const desktop = getOrbitTransitionState(0.55, { mobile: false })
  const mobile = getOrbitTransitionState(0.55, { mobile: true })

  assert.ok(Math.abs(mobile.systemX) < Math.abs(desktop.systemX))
  assert.ok(Math.abs(mobile.systemRotate) < Math.abs(desktop.systemRotate))
  assert.ok(mobile.systemScale >= desktop.systemScale)
})

test('release point is the five o’clock direction and captures without a full-revolution snap', () => {
  assert.equal(RELEASE_ANGLE, 60)
  assert.equal(nearestEquivalentAngle(RELEASE_ANGLE, 50), 60)
  assert.equal(nearestEquivalentAngle(RELEASE_ANGLE, 410), 420)
  assert.equal(nearestEquivalentAngle(RELEASE_ANGLE, -310), -300)
})

test('cubic bezier flight starts and lands exactly while curving between them', () => {
  const start = { x: 100, y: 100 }
  const c1 = { x: 110, y: 170 }
  const c2 = { x: 70, y: 240 }
  const end = { x: 50, y: 300 }

  assert.deepEqual(cubicBezierPoint(start, c1, c2, end, 0), start)
  assert.deepEqual(cubicBezierPoint(start, c1, c2, end, 1), end)
  const mid = cubicBezierPoint(start, c1, c2, end, 0.5)
  assert.ok(mid.y > 100 && mid.y < 300)
  assert.notEqual(mid.x, 75)
})

test('clamp01 handles both ends', () => {
  assert.equal(clamp01(-10), 0)
  assert.equal(clamp01(0.4), 0.4)
  assert.equal(clamp01(10), 1)
})


test('released accent orb escapes tangentially and stays outside the outer orbit during the escape phase', () => {
  const center = { x: 500, y: 300 }
  const radius = 172
  const radians = RELEASE_ANGLE * Math.PI / 180
  const start = {
    x: center.x + Math.cos(radians) * radius,
    y: center.y + Math.sin(radians) * radius
  }
  const target = { x: 260, y: 720 }
  const path = buildTangentFlightPath(start, target, center, RELEASE_ANGLE, { mobile: false })

  // Clockwise tangent at 5 o'clock should initially travel down-left, never back through the rings.
  assert.ok(path.escape.x < start.x)
  assert.ok(path.escape.y > start.y)

  for (const t of [0.05, 0.1, 0.2, 0.3]) {
    const point = sampleTangentFlightPath(path, t)
    const distance = Math.hypot(point.x - center.x, point.y - center.y)
    assert.ok(distance >= radius, `t=${t} entered the outer orbit: ${distance}`)
  }
})

test('flight path docks exactly on the measured indicator geometry before morphing', () => {
  const center = { x: 500, y: 300 }
  const start = { x: 586, y: 449 }
  const target = { x: 218, y: 694 }
  const path = buildTangentFlightPath(start, target, center, RELEASE_ANGLE)

  assert.deepEqual(sampleTangentFlightPath(path, 1), target)
  const nearDock = sampleTangentFlightPath(path, 0.92)
  assert.ok(nearDock.y < target.y)
  assert.ok(Math.abs(nearDock.x - target.x) < 90)
})

test('landing story includes a visible dock interval before the indicator takes over', () => {
  const inFlight = getOrbitTransitionState(0.62)
  const docked = getOrbitTransitionState(0.76)
  const morphing = getOrbitTransitionState(0.94)

  assert.ok(inFlight.flight > 0 && inFlight.flight < 1)
  assert.equal(docked.flight, 1)
  assert.equal(docked.indicatorMorph, 0)
  assert.ok(morphing.indicatorMorph > 0)
})


test('landing is a continuous five-stage sequence: fall, impact, bounce, settle, then morph', () => {
  const above = getLandingMotionState(0.66)
  assert.equal(above.phase, 'drop-ready')
  assert.equal(above.fall, 0)
  assert.equal(above.impact, 0)
  assert.equal(above.bounce, 0)
  assert.equal(above.morph, 0)

  const falling = getLandingMotionState(0.72)
  assert.equal(falling.phase, 'fall')
  assert.ok(falling.fall > 0 && falling.fall < 1)
  assert.equal(falling.impact, 0)
  assert.equal(falling.morph, 0)

  const impact = getLandingMotionState(0.797)
  assert.equal(impact.phase, 'impact')
  assert.ok(impact.impact > 0.9)
  assert.ok(impact.scaleX > 1)
  assert.ok(impact.scaleY < 0.6)
  assert.ok(impact.yOffset > 0)

  const bounce = getLandingMotionState(0.852)
  assert.equal(bounce.phase, 'bounce')
  assert.ok(bounce.bounce > 0.8)
  assert.ok(bounce.yOffset < 0)
  assert.equal(bounce.morph, 0)

  const settled = getLandingMotionState(0.895)
  assert.equal(settled.phase, 'settle')
  assert.equal(settled.morph, 0)
  assert.ok(Math.abs(settled.yOffset) < 0.001)

  const morph = getLandingMotionState(0.94)
  assert.equal(morph.phase, 'morph')
  assert.ok(morph.morph > 0 && morph.morph < 1)
})

test('free fall accelerates instead of moving at constant speed', () => {
  assert.equal(freeFallProgress(0), 0)
  assert.equal(freeFallProgress(1), 1)
  assert.equal(freeFallProgress(0.25), 0.0625)
  assert.equal(freeFallProgress(0.5), 0.25)
  assert.equal(freeFallProgress(0.75), 0.5625)

  const firstQuarter = freeFallProgress(0.5) - freeFallProgress(0.25)
  const lastQuarter = freeFallProgress(1) - freeFallProgress(0.75)
  assert.ok(lastQuarter > firstQuarter)
})

test('mobile landing keeps the same physics with a smaller bounce and sink', () => {
  const desktopImpact = getLandingMotionState(0.797, { mobile: false })
  const mobileImpact = getLandingMotionState(0.797, { mobile: true })
  const desktopBounce = getLandingMotionState(0.852, { mobile: false })
  const mobileBounce = getLandingMotionState(0.852, { mobile: true })

  assert.ok(mobileImpact.yOffset < desktopImpact.yOffset)
  assert.ok(Math.abs(mobileBounce.yOffset) < Math.abs(desktopBounce.yOffset))
})

test('orbit transition does not start the navigation morph until after the bounce has settled', () => {
  const fall = getOrbitTransitionState(0.72)
  const impact = getOrbitTransitionState(0.797)
  const bounce = getOrbitTransitionState(0.852)
  const morph = getOrbitTransitionState(0.94)

  assert.equal(fall.indicatorMorph, 0)
  assert.equal(impact.indicatorMorph, 0)
  assert.equal(bounce.indicatorMorph, 0)
  assert.ok(morph.indicatorMorph > 0)
})


test('landing micro-sequence runs on its own timeline so wheel speed cannot skip impact or bounce', () => {
  const start = landingProgressFromElapsed(0, { mobile: false })
  const held = landingProgressFromElapsed(50, { mobile: false })
  const mid = landingProgressFromElapsed(430, { mobile: false })
  const done = landingProgressFromElapsed(1000, { mobile: false })

  assert.equal(start, 0.66)
  assert.equal(held, 0.66)
  assert.ok(mid > 0.78 && mid < 0.89)
  assert.equal(done, 0.97)
})

test('mobile keeps the landing timeline compact without changing the phase order', () => {
  const desktopAt760 = landingProgressFromElapsed(760, { mobile: false })
  const mobileAt760 = landingProgressFromElapsed(760, { mobile: true })
  assert.ok(mobileAt760 > desktopAt760)
  assert.ok(mobileAt760 <= 0.97)
})
