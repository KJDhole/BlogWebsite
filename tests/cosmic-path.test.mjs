import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getCosmicPath,
  getCosmicPathD,
  sampleCosmicPath
} from '../src/scripts/cosmicPath.mjs'

const samplePoints = path => [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]
  .map(progress => sampleCosmicPath(path, progress))

test('cosmic path sampler returns the exact endpoints', () => {
  const path = getCosmicPath({ width: 1000, height: 1000, mobile: false })
  assert.deepEqual(sampleCosmicPath(path, 0), path.start)
  assert.deepEqual(sampleCosmicPath(path, 1), path.end)
})

test('the same deterministic path object drives both visual trace and traveler samples', () => {
  const path = getCosmicPath({ width: 540, height: 540, mobile: false })
  const first = sampleCosmicPath(path, 0.57)
  const second = sampleCosmicPath(path, 0.57)
  assert.deepEqual(second, first)
  assert.notDeepEqual(first, path.start)
  assert.notDeepEqual(first, path.end)
  assert.equal(
    getCosmicPathD(path),
    `M ${path.start.x} ${path.start.y} C ${path.control1.x} ${path.control1.y} ${path.control2.x} ${path.control2.y} ${path.end.x} ${path.end.y}`
  )
})

test('desktop and mobile cosmic paths remain inside their supplied hero bounds', () => {
  for (const options of [
    { width: 540, height: 540, mobile: false },
    { width: 390, height: 430, mobile: true }
  ]) {
    const path = getCosmicPath(options)
    for (const point of samplePoints(path)) {
      assert.ok(point.x >= 0 && point.x <= options.width, `x ${point.x} is within ${options.width}`)
      assert.ok(point.y >= 0 && point.y <= options.height, `y ${point.y} is within ${options.height}`)
    }
  }
})

test('mobile path is materially tighter than the desktop flyby', () => {
  const desktop = getCosmicPath({ width: 1000, height: 1000, mobile: false })
  const mobile = getCosmicPath({ width: 1000, height: 1000, mobile: true })
  const desktopSpan = desktop.end.x - desktop.start.x
  const mobileSpan = mobile.end.x - mobile.start.x
  const desktopRise = desktop.start.y - Math.min(desktop.control1.y, desktop.control2.y)
  const mobileRise = mobile.start.y - Math.min(mobile.control1.y, mobile.control2.y)
  assert.ok(mobileSpan < desktopSpan)
  assert.ok(mobileRise < desktopRise)
})
