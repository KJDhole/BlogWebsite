import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('Astro homepage keeps the approved hero orbit search and category controls', async () => {
  const page = await read('../src/pages/index.astro')
  assert.match(page, /class="hero/)
  assert.match(page, /orbit-svg/)
  assert.match(page, /id="article-search"/)
  assert.match(page, /data-category="All"/)
  assert.match(page, /getCollection\('posts'/)
  assert.match(page, /<ArticleRow/)
})

test('homepage client code filters generated rows instead of owning an article catalog', async () => {
  const script = await read('../src/scripts/home.js')
  assert.doesNotMatch(script, /const\s+articles\s*=\s*\[/)
  assert.match(script, /querySelectorAll\(['"]\.article-row['"]\)/)
  assert.match(script, /filterArticleMetadata/)
})

test('responsive and reduced-motion rules survive the migration', async () => {
  const styles = await read('../src/styles/global.css')
  assert.match(styles, /prefers-reduced-motion/)
  assert.match(styles, /max-width:\s*760px/)
})
