import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('article route statically generates pages from the posts collection', async () => {
  const route = await read('../src/pages/writing/[...slug].astro')
  assert.match(route, /getStaticPaths/)
  assert.match(route, /getCollection\('posts'/)
  assert.match(route, /render\(post\)/)
  assert.match(route, /<ArticleLayout/)
})

test('article layout stays restrained and returns to the homepage', async () => {
  const layout = await read('../src/layouts/ArticleLayout.astro')
  assert.match(layout, /Back to home/)
  assert.doesNotMatch(layout, /table of contents|related posts|comments/i)
})

test('home and article pages share one persisted theme key', async () => {
  const base = await read('../src/layouts/BaseLayout.astro')
  const home = await read('../src/scripts/home.js')
  assert.match(base, /glenn-theme/)
  assert.match(home, /glenn-theme/)
})
