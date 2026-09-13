import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('BaseLayout mounts one coordination surface without duplicate full-screen wave DOM', async () => {
  const layout = await read('../src/layouts/BaseLayout.astro')
  const transition = await read('../src/components/ThemeTransition.astro')
  assert.match(layout, /ThemeTransition/)
  assert.match(transition, /data-theme-transition/)
  assert.match(transition, /world-transition\.css/)
  assert.match(transition, /Two modes of the same mind\./)
  assert.doesNotMatch(transition, /data-solar-wave|theme-solar-wave/)
  assert.doesNotMatch(transition, /data-eclipse-core|data-corona/)
})

test('theme controller always uses the toggle center instead of pointer coordinates', async () => {
  const controller = await read('../src/scripts/themeController.js')
  assert.match(controller, /getBoundingClientRect/)
  assert.match(controller, /rect\.left\s*\+\s*rect\.width\s*\/\s*2/)
  assert.match(controller, /rect\.top\s*\+\s*rect\.height\s*\/\s*2/)
  assert.doesNotMatch(controller, /clientX|clientY/)
  assert.match(controller, /toggleRadius/)
  assert.match(controller, /--world-origin-x/)
  assert.match(controller, /--world-origin-y/)
  assert.doesNotMatch(controller, /--world-wave-|getWaveScale|waveStartScale/)
  assert.match(controller, /startViewTransition/)
  assert.match(controller, /prefers-reduced-motion/)
  assert.match(controller, /glenn:worldtransition/)
  assert.match(controller, /glenn:worldchange/)
  assert.match(controller, /1500/)
  assert.match(controller, /520/)
})

test('Solar reveal uses the official toggle-origin Three.js transition pass', async () => {
  const transitionCss = await read('../src/styles/world-transition.css')
  const renderer = await read('../src/scripts/worldTransitionRenderer.mjs')

  assert.match(transitionCss, /\.theme-toggle::after/)
  assert.doesNotMatch(transitionCss, /theme-solar-wave/)
  assert.doesNotMatch(transitionCss, /\.theme-transition\[data-phase=['"]radiation['"]\]::before/)

  assert.match(renderer, /RenderTransitionPass/)
  assert.match(renderer, /EffectComposer/)
  assert.match(renderer, /CanvasTexture/)
  assert.match(renderer, /createRadialGradient/)
  assert.match(renderer, /originX/)
  assert.match(renderer, /originY/)
  assert.doesNotMatch(renderer, /new THREE\.WebGLRenderer/)
})

test('reverse Observatory switch reuses the same official transition pass', async () => {
  const renderer = await read('../src/scripts/worldTransitionRenderer.mjs')
  assert.match(renderer, /new RenderTransitionPass\(observatoryScene, camera, solarScene, camera\)/)
  assert.match(renderer, /direction === 'to-solar' \? 1 - p : p/)
  assert.match(renderer, /to-observatory/)
})

test('reduced motion bypasses the signature transition while preserving the world swap', async () => {
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

test('Solar Archive homepage is a second visual personality over the same content tree', async () => {
  const page = await read('../src/pages/index.astro')
  const solarCss = await read('../src/styles/solar.css')

  assert.match(page, /data-observatory-label="GLENN \/ RESEARCH FOLIO \/ 2026"/)
  assert.match(page, /data-solar-label="GLENN \/ SOLAR ARCHIVE \/ 2026"/)
  assert.match(page, /solar-observation-meta/)
  assert.match(page, /solar-marginalia/)
  assert.equal((page.match(/getCollection\('posts'/g) ?? []).length, 1)
  assert.equal((page.match(/posts\.map/g) ?? []).length, 1)
  assert.match(solarCss, /html\[data-world=['"]solar['"]\] \.hero/)
  assert.match(solarCss, /html\[data-world=['"]solar['"]\] \.article-row/)
  assert.match(solarCss, /ISSUE/)
  assert.match(solarCss, /FIELD NOTE/)
  assert.match(solarCss, /OBSERVATION/)
})

test('Solar mobile register keeps metadata and title on separate grid rows', async () => {
  const solarCss = await read('../src/styles/solar.css')
  assert.match(solarCss, /@media\s*\(max-width:\s*640px\)[\s\S]*html\[data-world=['"]solar['"]\] \.article-main\s*\{[\s\S]*grid-row:\s*2/)
  assert.match(solarCss, /@media\s*\(max-width:\s*640px\)[\s\S]*html\[data-world=['"]solar['"]\] \.article-index-meta\s*\{[\s\S]*grid-row:\s*1/)
})

test('Solar Archive styles supporting publication surfaces without duplicating article content', async () => {
  const solarCss = await read('../src/styles/solar.css')
  const articleLayout = await read('../src/layouts/ArticleLayout.astro')

  assert.match(solarCss, /html\[data-world=['"]solar['"]\] \.article-header/)
  assert.match(solarCss, /html\[data-world=['"]solar['"]\] \.article-body/)
  assert.match(solarCss, /html\[data-world=['"]solar['"]\] \.register-header/)
  assert.match(solarCss, /html\[data-world=['"]solar['"]\] \.taxonomy-index/)
  assert.match(solarCss, /html\[data-world=['"]solar['"]\] \.site-footer/)
  assert.equal((articleLayout.match(/<article class="article-body">/g) ?? []).length, 1)
})

test('dual-world motion keeps explicit mobile, reduced-motion, and renderer guardrails', async () => {
  const controller = await read('../src/scripts/themeController.js')
  const solar = await read('../src/scripts/solarField.mjs')
  const scene = await read('../src/scripts/spaceScene.mjs')
  const solarCss = await read('../src/styles/solar.css')

  assert.match(controller, /prefers-reduced-motion/)
  assert.match(solar, /uReducedMotion/)
  assert.match(solar, /uDetailOctaves/)
  assert.match(solar, /mobile\s*\?\s*3(?:\.0)?\s*:\s*4(?:\.0)?/)
  assert.match(solarCss, /@media\s*\(max-width:\s*760px\)/)
  assert.match(solarCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/)
  assert.match(scene, /mobile\s*\?\s*1\.2\s*:\s*1\.65/)
  assert.match(scene, /visibilitychange/)
  assert.match(scene, /webglcontextlost/)
  assert.match(scene, /ResizeObserver/)
  assert.match(scene, /renderer\.dispose\(\)/)
})

test('homepage exposes one shared morphable DOM tree for Observatory and Solar', async () => {
  const page = await read('../src/pages/index.astro')
  assert.equal((page.match(/posts\.map/g) ?? []).length, 1)
  assert.equal((page.match(/id="hero-title"/g) ?? []).length, 1)
  assert.match(page, /data-world-morph="hero-title"/)
  assert.match(page, /data-world-morph="hero-eyebrow"/)
  assert.match(page, /data-world-morph="primary-nav"/)
  assert.match(page, /data-world-morph="writing-heading"/)
  assert.match(page, /data-scene-anchor="observatory"/)
  assert.match(page, /data-scene-anchor="solar"/)
  assert.doesNotMatch(page, /solar-homepage-copy|duplicate-solar-list/)
})

test('article rows expose stable morph identity without duplicating title content', async () => {
  const row = await read('../src/components/ArticleRow.astro')
  assert.match(row, /data-world-morph=/)
  assert.match(row, /data-entry-index=/)
  assert.equal((row.match(/class="article-title"/g) ?? []).length, 1)
})
