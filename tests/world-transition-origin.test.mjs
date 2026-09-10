import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('theme transition origin is always the world-toggle center', async () => {
  const controller = await read('../src/scripts/themeController.js')
  assert.match(controller, /rect\.left \+ rect\.width \/ 2/)
  assert.match(controller, /rect\.top \+ rect\.height \/ 2/)
  assert.doesNotMatch(controller, /clientX|clientY/)
})

test('transition furniture has no detached eclipse core and wave starts from toggle size', async () => {
  const component = await read('../src/components/ThemeTransition.astro')
  const solarCss = await read('../src/styles/solar.css')
  const transitionCss = await read('../src/styles/world-transition.css')
  const css = `${solarCss}\n${transitionCss}`

  assert.doesNotMatch(component, /data-eclipse-core/)
  assert.doesNotMatch(css, /\.theme-eclipse-core/)
  assert.match(css, /--world-toggle-diameter/)
  assert.match(css, /--world-wave-scale-start/)
  assert.doesNotMatch(css, /scale\(\.001\)|scale\(0\.001\)/)
})

test('controller publishes start, frame, and end events for shared DOM motion', async () => {
  const controller = await read('../src/scripts/themeController.js')
  assert.match(controller, /glenn:worldtransitionstart/)
  assert.match(controller, /glenn:worldtransition/)
  assert.match(controller, /glenn:worldtransitionend/)
  assert.match(controller, /toggleDiameter/)
  assert.match(controller, /waveRadius/)
})
