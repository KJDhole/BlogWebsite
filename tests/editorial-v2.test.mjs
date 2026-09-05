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

test('homepage still preserves the single existing motion language and core utilities', async () => {
  const page = await read('../src/pages/index.astro')
  const home = await read('../src/scripts/home.js')
  assert.match(page, /<SpaceScene/)
  assert.match(page, /id="article-search"/)
  assert.match(page, /data-category="All"/)
  assert.match(page, /Archive/)
  assert.match(page, /Tags/)
  assert.match(page, /RSS/)
  assert.match(home, /getScrollStoryState/)
  assert.match(home, /getLandingMotionState/)
})
