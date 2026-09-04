import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('article route statically generates pages and future previous-next navigation from the posts collection', async () => {
  const route = await read('../src/pages/writing/[...slug].astro')
  assert.match(route, /getStaticPaths/)
  assert.match(route, /getCollection\('posts'/)
  assert.match(route, /render\(post\)/)
  assert.match(route, /headings/)
  assert.match(route, /previousPost/)
  assert.match(route, /nextPost/)
  assert.match(route, /<ArticleLayout/)
})

test('article layout supports normal blog reading features without changing the homepage UI', async () => {
  const layout = await read('../src/layouts/ArticleLayout.astro')
  assert.match(layout, /article-toc/)
  assert.match(layout, /article-pagination/)
  assert.match(layout, /灵感来源/)
  assert.match(layout, /Back to home/)
})

test('home and article pages preserve one persisted theme key', async () => {
  const base = await read('../src/layouts/BaseLayout.astro')
  const home = await read('../src/scripts/home.js')
  assert.match(base, /glenn-blog-theme/)
  assert.match(home, /glenn-blog-theme/)
})
