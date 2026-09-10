import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('Solar homepage has its own publication layout geometry instead of a recolored Observatory grid', async () => {
  const page = await read('../src/pages/index.astro')
  const css = await read('../src/styles/solar-home.css')

  assert.match(page, /class="page-shell home-shell"/)
  assert.match(css, /html\[data-layout-world=['"]solar['"]\] \.home-shell/)
  assert.match(css, /html\[data-layout-world=['"]solar['"]\] \.home-shell \.folio-topbar/)
  assert.match(css, /grid-template-columns:/)
  assert.match(css, /html\[data-layout-world=['"]solar['"]\] \.home-shell \.cosmic-hero/)
  assert.match(css, /min-height:\s*6[2-9]0px/)
  assert.match(css, /html\[data-layout-world=['"]solar['"]\] \.home-shell #hero-title/)
  assert.match(css, /font-size:\s*clamp\(7[0-9]px,[^,]+,\s*1(?:0[0-9]|1[0-9])px\)/)
  assert.doesNotMatch(css, /\.folio-intro\s*\{[^}]*display:\s*contents/s)
})

test('Solar scene anchor is a cropped upper-right field materially different from Observatory', async () => {
  const css = await read('../src/styles/solar-home.css')
  assert.match(css, /\.scene-anchor-observatory/)
  assert.match(css, /\.scene-anchor-solar/)
  assert.match(css, /right:\s*-[0-9]+%/)
  assert.match(css, /top:\s*-[0-9]+%/)
})

test('Solar Writing becomes an Issue Index grid while reusing the same article rows', async () => {
  const page = await read('../src/pages/index.astro')
  const css = await read('../src/styles/solar-home.css')

  assert.equal((page.match(/posts\.map/g) ?? []).length, 1)
  assert.match(css, /html\[data-layout-world=['"]solar['"]\] \.home-shell \.publication-register \.article-row/)
  assert.match(css, /grid-template-columns:\s*1[0-3]0px\s+minmax\(0,\s*1fr\)\s+1[5-9]0px/)
  assert.match(css, /content:\s*attr\(data-entry-index\)/)
  assert.match(css, /border-top:\s*1px solid var\(--solar-rule\)/)
})

test('Solar mobile layout stacks the publication without horizontal overflow primitives', async () => {
  const css = await read('../src/styles/solar-home.css')
  assert.match(css, /@media\s*\(max-width:\s*760px\)/)
  assert.match(css, /grid-template-columns:\s*1fr/)
  assert.match(css, /font-size:\s*clamp\(5[0-9]px,[^,]+,\s*7[0-9]px\)/)
  assert.match(css, /min-width:\s*0/)
  assert.match(css, /overflow-wrap:\s*anywhere/)
})
