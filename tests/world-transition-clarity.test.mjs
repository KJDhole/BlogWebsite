import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createWorldMorph } from '../src/scripts/worldMorph.mjs'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

function createStyleProbe() {
  const values = new Map()
  return {
    values,
    setProperty(name, value) { values.set(name, value) },
    removeProperty(name) { values.delete(name) }
  }
}

function createMorphNode(key, fromRect, toRect) {
  let reads = 0
  return {
    dataset: { worldMorph: key },
    hidden: false,
    style: createStyleProbe(),
    contains() { return false },
    getBoundingClientRect() {
      const rect = reads++ === 0 ? fromRect : toRect
      return { ...rect }
    }
  }
}

test('text content does not physically fly across the viewport during a world switch', () => {
  const heroTitle = createMorphNode(
    'hero-title',
    { left: 120, top: 160, width: 520, height: 180 },
    { left: 720, top: 220, width: 620, height: 220 }
  )
  const sceneStage = createMorphNode(
    'scene-stage',
    { left: 760, top: 180, width: 420, height: 420 },
    { left: 900, top: 120, width: 760, height: 560 }
  )
  const root = {
    dataset: { layoutWorld: 'observatory' },
    querySelectorAll() { return [heroTitle, sceneStage] }
  }

  const morph = createWorldMorph(root)
  morph.prepare('solar')

  assert.equal(heroTitle.style.values.has('--morph-x'), false)
  assert.equal(heroTitle.style.values.has('--morph-y'), false)
  assert.equal(sceneStage.style.values.has('--morph-x'), true)
})

test('DOM only fades locally while Three.js owns the visual world blend', async () => {
  const [css, adapter] = await Promise.all([
    read('../src/styles/world-transition.css'),
    read('../src/scripts/officialWorldTransition.mjs')
  ])

  assert.match(css, /data-world-transition-phase=['"]convergence['"][\s\S]*?data-world-morph=['"]hero-title['"][\s\S]*?opacity:/)
  assert.match(css, /data-world-transition-phase=['"]layout-release['"][\s\S]*?data-world-morph=['"]hero-title['"][\s\S]*?opacity:\s*0/)
  assert.match(css, /data-world-transition-phase=['"]radiation['"][\s\S]*?data-world-morph=['"]hero-title['"][\s\S]*?opacity:\s*0/)
  assert.match(css, /data-world-transition-phase=['"]solar-arrival['"][\s\S]*?data-world-morph=['"]hero-title['"][\s\S]*?opacity:\s*var\(--world-phase-progress/)
  assert.doesNotMatch(css, /data-world-morph=['"]hero-title['"][^{]*\{[^}]*translateX\(/)

  assert.match(adapter, /RenderTransitionPass/)
  assert.doesNotMatch(css, /\.theme-solar-wave/)
  assert.doesNotMatch(css, /--world-wave-radius/)
  assert.doesNotMatch(css, /--world-wave-scale/)
})
