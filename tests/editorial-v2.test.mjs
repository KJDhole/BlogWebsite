import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('writing index is editorial-first and does not force synthetic thumbnails or pill tags', async () => {
  const row = await read('../src/components/ArticleRow.astro')
  assert.match(row, /article-category/)
  assert.match(row, /read-time/)
  assert.doesNotMatch(row, /article-visual|visual-pearl|visual-rays/)
  assert.doesNotMatch(row, /class="tag"/)
})

test('article layout provides quiet desktop and mobile navigation without replacing the reading column', async () => {
  const layout = await read('../src/layouts/ArticleLayout.astro')
  assert.match(layout, /reading-progress/)
  assert.match(layout, /article-reading-grid/)
  assert.match(layout, /article-toc-desktop/)
  assert.match(layout, /article-toc-mobile/)
  assert.match(layout, /articleEnhance/)
})

test('article enhancement supports code copy, prompt blocks, active toc and reading progress with native browser APIs', async () => {
  const script = await read('../src/scripts/articleEnhance.js')
  assert.match(script, /navigator\.clipboard/)
  assert.match(script, /\[!PROMPT\]/)
  assert.match(script, /IntersectionObserver/)
  assert.match(script, /reading-progress/)
  assert.doesNotMatch(script, /gsap|anime|motion/)
})

test('editorial stylesheet includes Chinese-first reading, wide media, restrained tables and mobile-safe overflow', async () => {
  const styles = `${await read('../src/styles/global.css')}\n${await read('../src/styles/blog.css')}`
  assert.match(styles, /--reading:/)
  assert.match(styles, /\.media-wide/)
  assert.match(styles, /\.media-full/)
  assert.match(styles, /\.prompt-block/)
  assert.match(styles, /overflow-wrap:\s*anywhere/)
  assert.match(styles, /table[\s\S]*overflow-x:\s*auto/)
  assert.match(styles, /max-width:\s*760px/)
})

test('delivery stylesheet is consolidated and contains no critic-round override layers', async () => {
  const base = await read('../src/layouts/BaseLayout.astro')
  const editorial = await read('../src/styles/editorial.css')
  assert.doesNotMatch(base, /critic-r1\.css|identity-r2\.css/)
  assert.match(editorial, /--article-toc-width:/)
  assert.match(editorial, /\.article-body h2::before/)
  await assert.rejects(read('../src/styles/critic-r1.css'), /ENOENT/)
  await assert.rejects(read('../src/styles/identity-r2.css'), /ENOENT/)
})
