import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('BaseLayout mounts one global signature transition surface', async () => {
  const layout = await read('../src/layouts/BaseLayout.astro')
  const transition = await read('../src/components/ThemeTransition.astro')
  assert.match(layout, /ThemeTransition/)
  assert.match(transition, /data-eclipse-core/)
  assert.match(transition, /data-corona/)
  assert.match(transition, /data-solar-wave/)
  assert.match(transition, /Two modes of the same mind\./)
})

test('theme controller uses actual toggle origin and progressive enhancement', async () => {
  const controller = await read('../src/scripts/themeController.js')
  assert.match(controller, /getBoundingClientRect/)
  assert.match(controller, /startViewTransition/)
  assert.match(controller, /prefers-reduced-motion/)
  assert.match(controller, /glenn:worldtransition/)
  assert.match(controller, /glenn:worldchange/)
  assert.match(controller, /Math\.hypot/)
  assert.match(controller, /1500/)
  assert.match(controller, /450/)
})

test('Solar reveal is not implemented as a generic white wipe', async () => {
  const css = await read('../src/styles/solar.css')
  assert.match(css, /\.theme-eclipse-core/)
  assert.match(css, /\.theme-corona/)
  assert.match(css, /\.theme-solar-wave/)
  assert.match(css, /--world-origin-x/)
  assert.match(css, /--world-origin-y/)
  assert.match(css, /--world-wave-radius/)
  assert.doesNotMatch(css, /background:\s*white\s*;/i)
})

test('reduced motion bypasses the signature wave while preserving the world swap', async () => {
  const controller = await read('../src/scripts/themeController.js')
  assert.match(controller, /reducedMotion\.matches/)
  assert.match(controller, /applyWorld/)
  assert.match(controller, /dispatchWorldChange/)
})

test('Solar Archive hero field is a procedural cropped limb rather than a 3D sphere model', async () => {
  const solar = await read('../src/scripts/solarField.mjs')
  assert.match(solar, /PlaneGeometry/)
  assert.match(solar, /ShaderMaterial/)
  assert.match(solar, /cropped-solar-limb/)
  assert.doesNotMatch(solar, /SphereGeometry|VideoTexture/)
})
