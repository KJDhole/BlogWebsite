import test from 'node:test'
import assert from 'node:assert/strict'
import { interpolateRect, createViewportStage, fitRectToViewport, getViewportStageProgress } from '../src/scripts/sceneViewport.mjs'

test('interpolateRect moves the one scene viewport continuously between anchors', () => {
  const from = { left: 820, top: 130, width: 430, height: 430 }
  const to = { left: 780, top: 80, width: 620, height: 520 }
  assert.deepEqual(interpolateRect(from, to, 0), from)
  assert.deepEqual(interpolateRect(from, to, 1), to)
  assert.deepEqual(interpolateRect(from, to, 0.5), {
    left: 800,
    top: 105,
    width: 525,
    height: 475
  })
})

test('viewport stage covers the viewport without changing renderer count', () => {
  assert.deepEqual(createViewportStage({ width: 1440, height: 1000 }), {
    left: 0,
    top: 0,
    width: 1440,
    height: 1000
  })
})

test('canvas reaches full-stage before official scene mixing begins', () => {
  assert.equal(getViewportStageProgress(0), 0)
  assert.ok(getViewportStageProgress(520 / 1500) < 1)
  assert.equal(getViewportStageProgress(650 / 1500), 1)
  assert.equal(getViewportStageProgress(1), 1)
})

test('interpolateRect clamps progress', () => {
  const from = { left: 10, top: 20, width: 30, height: 40 }
  const to = { left: 50, top: 60, width: 70, height: 80 }
  assert.deepEqual(interpolateRect(from, to, -1), from)
  assert.deepEqual(interpolateRect(from, to, 2), to)
})

test('fitRectToViewport keeps an intentionally cropped Solar scene from widening the document', () => {
  assert.deepEqual(
    fitRectToViewport(
      { left: 180, top: 96, width: 410, height: 390 },
      { width: 390, height: 844 }
    ),
    { left: 0, top: 96, width: 390, height: 390 }
  )

  assert.deepEqual(
    fitRectToViewport(
      { left: 980, top: 34, width: 620, height: 590 },
      { width: 1440, height: 1000 }
    ),
    { left: 820, top: 34, width: 620, height: 590 }
  )
})
