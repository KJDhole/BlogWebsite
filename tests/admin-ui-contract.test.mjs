import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('admin login and dashboard use a simple Chinese writing workflow', async () => {
  const login = await source('src/pages/admin/login.astro')
  const dashboard = await source('src/pages/admin/index.astro')
  const shell = await source('src/components/admin/AdminShell.astro')
  assert.match(login, /name="username"/)
  assert.match(login, /name="password"/)
  assert.match(login, /登录/)
  assert.match(dashboard, /新建文章/)
  assert.match(dashboard, /data-article-list/)
  assert.match(shell, /写作后台/)
  assert.match(shell, /查看博客/)
  assert.match(shell, /退出/)
})

test('new and edit pages share one simplified Chinese article editor contract', async () => {
  const newPage = await source('src/pages/admin/new.astro')
  const editPage = await source('src/pages/admin/editor.astro')
  const editor = await source('src/components/admin/ArticleEditor.astro')
  assert.match(newPage, /ArticleEditor/)
  assert.match(editPage, /ArticleEditor/)
  assert.match(newPage, /新建文章/)
  assert.match(editPage, /编辑文章/)
  for (const field of ['title', 'slug', 'description', 'date', 'category', 'tags', 'cover', 'body']) {
    assert.match(editor, new RegExp(`name="${field}"`))
  }
  for (const label of ['保存草稿', '发布文章', '确认发布', '预览']) {
    assert.match(editor, new RegExp(label))
  }
  assert.match(editor, /文章标题/)
  assert.match(editor, /分类/)
  assert.match(editor, /标签/)
  assert.match(editor, /更多设置/)
})

test('editor offers preset selectable tags and lets the user add a custom tag', async () => {
  const editor = await source('src/components/admin/ArticleEditor.astro')
  const script = await source('src/scripts/admin/editor.ts')

  assert.match(editor, /data-tag-option="AI"/)
  assert.match(editor, /data-tag-option="Agent"/)
  assert.match(editor, /data-tag-option="Coding Agent"/)
  assert.match(editor, /data-tag-option="RAG"/)
  assert.match(editor, /data-tag-option="LangGraph"/)
  assert.match(editor, /data-new-tag/)
  assert.match(editor, /data-add-tag/)
  assert.match(editor, /新建标签/)

  assert.match(script, /selectedTags/)
  assert.match(script, /syncTagInput/)
  assert.match(script, /\[data-tag-option\]/)
  assert.match(script, /data-new-tag/)
  assert.match(script, /data-add-tag/)
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
