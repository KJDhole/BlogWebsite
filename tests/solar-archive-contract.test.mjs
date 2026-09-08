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
  assert.match(css, /radial-gradient\(circle,\s*transparent\s+0\s+6[5-9]%/)
  assert.doesNotMatch(css, /rgba\(244,\s*240,\s*230,\s*\.98\)\s*0\s*76%/)
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