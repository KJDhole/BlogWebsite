import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('admin login and dashboard expose the expected private workflow surfaces', async () => {
  const login = await source('src/pages/admin/login.astro')
  const dashboard = await source('src/pages/admin/index.astro')
  assert.match(login, /name="username"/)
  assert.match(login, /name="password"/)
  assert.match(dashboard, /New Article/)
  assert.match(dashboard, /data-article-list/)
})

test('new and edit pages share one article editor contract', async () => {
  const newPage = await source('src/pages/admin/new.astro')
  const editPage = await source('src/pages/admin/editor.astro')
  const editor = await source('src/components/admin/ArticleEditor.astro')
  assert.match(newPage, /ArticleEditor/)
  assert.match(editPage, /ArticleEditor/)
  for (const field of ['title', 'slug', 'description', 'date', 'category', 'tags', 'cover', 'body']) {
    assert.match(editor, new RegExp(`name="${field}"`))
  }
  for (const label of ['Save Draft', 'Submit Publish', 'Merge &amp; Publish', 'Preview']) {
    assert.match(editor, new RegExp(label))
  }
})

test('browser API wrapper always sends credentialed requests and preview sanitizes marked output', async () => {
  const api = await source('src/scripts/admin/api.ts')
  const editor = await source('src/scripts/admin/editor.ts')
  assert.match(api, /credentials:\s*'include'/)
  assert.match(editor, /DOMPurify\.sanitize\(html\)/)
  assert.match(editor, /marked\.parse/)
  for (const preserved of ['visual: articleVisual', 'sourceUrl: articleSourceUrl', 'sourceLabel: articleSourceLabel']) {
    assert.match(editor, new RegExp(preserved))
  }
  assert.match(editor, /Open PR/)
  assert.match(editor, /const fallbackSlug =/)
  assert.match(editor, /status\.state === 'published'[\s\S]*setPendingMode\(false\)/)
})

test('static admin route uses URLSearchParams slug and contains no server secret names', async () => {
  const editorScript = await source('src/scripts/admin/editor.ts')
  assert.match(editorScript, /URLSearchParams/)

  const directories = ['src/pages/admin', 'src/scripts/admin']
  for (const directory of directories) {
    for (const name of await readdir(new URL(`../${directory}/`, import.meta.url))) {
      const text = await source(`${directory}/${name}`)
      assert.doesNotMatch(text, /GITHUB_TOKEN|ADMIN_PASSWORD_HASH|SESSION_SECRET/)
    }
  }
})

test('admin pages are noindex and excluded from the public sitemap', async () => {
  const shell = await source('src/components/admin/AdminShell.astro')
  const config = await source('astro.config.mjs')
  assert.match(shell, /noindex=\{true\}/)
  assert.match(config, /filter:\s*\(page\)/)
  assert.match(config, /pathname\.startsWith\('\/admin\/'\)/)
})
