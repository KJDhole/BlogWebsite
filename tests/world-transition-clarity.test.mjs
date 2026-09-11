import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('homepage transition no longer gives DOM text a physical FLIP path', async () => {
  const home = await read('../src/scripts/home.js')

  assert.doesNotMatch(home, /createWorldMorph/)
  assert.doesNotMatch(home, /worldMorph\.prepare/)
  assert.doesNotMatch(home, /worldMorph\.setProgress/)
  assert.doesNotMatch(home, /getMorphProgress|getIndexProgress/)
  assert.match(home, /sceneViewport\?\.setTransition/)
  assert.match(home, /spaceScene\?\.setWorldTransition/)
})

test('DOM only fades out, stays hidden through scene mixing, then reveals at destination', async () => {
  const css = await read('../src/styles/world-transition.css')

  assert.match(css, /data-world-transition-phase=['"]convergence['"][\s\S]*?data-world-morph=['"]hero-title['"][\s\S]*?opacity:/)
  assert.match(css, /data-world-transition-phase=['"]layout-release['"][\s\S]*?data-world-morph=['"]hero-title['"][\s\S]*?opacity:\s*0/)
  assert.match(css, /data-world-transition-phase=['"]radiation['"][\s\S]*?data-world-morph=['"]hero-title['"][\s\S]*?opacity:\s*0/)
  assert.match(css, /data-world-transition-phase=['"]solar-arrival['"][\s\S]*?data-world-morph=['"]hero-title['"][\s\S]*?opacity:\s*var\(--world-phase-progress/)
  assert.doesNotMatch(css, /data-world-morph=['"]hero-title['"][^{]*\{[^}]*translateX\(/)
})

test('full-screen world mixing is owned by Three.js instead of a CSS radiation renderer', async () => {
  const [component, css] = await Promise.all([
    read('../src/components/ThemeTransition.astro'),
    read('../src/styles/world-transition.css')
  ])

  assert.doesNotMatch(component, /theme-solar-wave/)
  assert.doesNotMatch(css, /\.theme-solar-wave/)
  assert.doesNotMatch(css, /theme-transition\[data-phase=['"]radiation['"]\]::before/)
  assert.match(css, /\.theme-toggle::after/)
})
