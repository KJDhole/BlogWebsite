import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('Solar Archive uses a materially different editorial grid', async () => {
  const css = await read('../src/styles/solar-layout.css')
  assert.match(css, /data-layout-world=['"]solar['"]/)
  assert.match(css, /grid-template-areas:/)
  assert.match(css, /hero-title/)
  assert.match(css, /scene-anchor-solar/)
  assert.match(css, /publication-index/)
  assert.match(css, /article-row::before/)
  assert.doesNotMatch(css, /grid-template-columns:\s*1\.03fr\s+\.97fr/)
})

test('Solar layout keeps an ivory cobalt publication palette and clips intentional off-canvas geometry', async () => {
  const css = await read('../src/styles/solar-layout.css')
  assert.match(css, /--solar-paper:/)
  assert.match(css, /--solar-cobalt:/)
  assert.match(css, /scene-anchor-solar/)
  assert.match(css, /html\[data-layout-world=['"]solar['"]\]\s*\{[\s\S]*?overflow-x:\s*clip/)
})

test('Solar target geometry preserves Observatory palette and typography during layout release', async () => {
  const [paletteCss, baseLayout] = await Promise.all([
    read('../src/styles/solar-transition-palette.css'),
    read('../src/layouts/BaseLayout.astro')
  ])

  assert.match(baseLayout, /import ['"]\.\.\/styles\/solar-transition-palette\.css['"]/)
  assert.match(paletteCss, /html\[data-layout-world=['"]solar['"]\]\[data-world=['"]observatory['"]\]/)
  assert.match(paletteCss, /--solar-paper:\s*var\(--bg\)/)
  assert.match(paletteCss, /--solar-ink:\s*var\(--text\)/)
  assert.match(paletteCss, /--solar-rule:\s*var\(--line\)/)
  assert.match(paletteCss, /color-scheme:\s*dark/)
  assert.match(paletteCss, /#hero-title[\s\S]*?font-family:\s*var\(--serif\)/)
  assert.match(paletteCss, /#hero-title[\s\S]*?font-size:\s*clamp\(50px,\s*5\.1vw,\s*76px\)/)
  assert.match(paletteCss, /\.world-eyebrow::after[\s\S]*?content:\s*none/)
  assert.match(paletteCss, /\.solar-observation-meta[\s\S]*?display:\s*none/)
})

test('Solar layout has explicit tablet and mobile editorial compositions', async () => {
  const css = await read('../src/styles/solar-layout.css')
  assert.match(css, /@media\s*\(max-width:\s*760px\)/)
  assert.match(css, /@media\s*\(max-width:\s*390px\)/)
  assert.match(css, /min-width:\s*0/)
})
