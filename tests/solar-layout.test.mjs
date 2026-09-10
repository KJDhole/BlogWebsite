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

test('Solar layout keeps an ivory cobalt publication palette and cropped solar field', async () => {
  const css = await read('../src/styles/solar-layout.css')
  assert.match(css, /--solar-paper:/)
  assert.match(css, /--solar-cobalt:/)
  assert.match(css, /scene-anchor-solar/)
  assert.match(css, /overflow:\s*visible|overflow:\s*clip/)
})

test('Solar target geometry preserves Observatory palette until the semantic world swap', async () => {
  const css = await read('../src/styles/solar-layout.css')
  assert.match(css, /html\[data-layout-world=['"]solar['"]\]\[data-world=['"]observatory['"]\]/)
  assert.match(css, /--solar-paper:\s*var\(--bg\)/)
  assert.match(css, /--solar-ink:\s*var\(--text\)/)
  assert.match(css, /--solar-rule:\s*var\(--line\)/)
  assert.match(css, /color-scheme:\s*dark/)
})

test('Solar layout has explicit tablet and mobile editorial compositions', async () => {
  const css = await read('../src/styles/solar-layout.css')
  assert.match(css, /@media\s*\(max-width:\s*760px\)/)
  assert.match(css, /@media\s*\(max-width:\s*390px\)/)
  assert.match(css, /min-width:\s*0/)
})
