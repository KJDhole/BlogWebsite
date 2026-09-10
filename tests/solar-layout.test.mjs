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

test('Solar layout has explicit tablet and mobile editorial compositions', async () => {
  const css = await read('../src/styles/solar-layout.css')
  assert.match(css, /@media\s*\(max-width:\s*760px\)/)
  assert.match(css, /@media\s*\(max-width:\s*390px\)/)
  assert.match(css, /min-width:\s*0/)
})
