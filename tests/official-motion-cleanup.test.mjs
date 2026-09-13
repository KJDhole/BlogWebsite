import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('ThemeTransition keeps only coordination surface and no duplicate full-screen wave DOM', async () => {
  const component = await read('../src/components/ThemeTransition.astro')
  assert.match(component, /data-theme-transition/)
  assert.doesNotMatch(component, /theme-solar-wave/)
  assert.doesNotMatch(component, /data-solar-wave/)
})

test('theme controller keeps toggle origin events but removes obsolete CSS wave geometry math', async () => {
  const controller = await read('../src/scripts/themeController.js')
  assert.match(controller, /originX:\s*origin\.x/)
  assert.match(controller, /originY:\s*origin\.y/)
  assert.doesNotMatch(controller, /getWaveScale/)
  assert.doesNotMatch(controller, /waveStartScale/)
  assert.doesNotMatch(controller, /--world-wave-/)
})

test('world morph only computes physical deltas for structural scene and toggle anchors', async () => {
  const morph = await read('../src/scripts/worldMorph.mjs')
  assert.match(morph, /PHYSICAL_MORPH_KEYS\s*=\s*new Set\(\[['"]scene-stage['"],\s*['"]world-toggle['"]\]\)/)
  assert.doesNotMatch(morph, /rowProgress/)
  assert.doesNotMatch(morph, /articleProgress/)
})

test('star field follows official dynamic BufferGeometry update pattern without render-loop allocation', async () => {
  const stars = await read('../src/scripts/starField.mjs')
  assert.match(stars, /DynamicDrawUsage/)
  assert.match(stars, /positionAttribute\.needsUpdate\s*=\s*true/)
  assert.match(stars, /basePositions\s*=\s*positions\.slice\(\)/)

  const updateBody = stars.match(/function update\([^)]*\)\s*\{([\s\S]*?)\n\s*\}\n\n\s*function destroy/ )?.[1] ?? ''
  assert.doesNotMatch(updateBody, /new Float32Array/)
  assert.doesNotMatch(updateBody, /new THREE\.BufferGeometry/)
  assert.doesNotMatch(updateBody, /new THREE\.BufferAttribute/)
})
