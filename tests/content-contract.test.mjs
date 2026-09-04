import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'

const postsDir = new URL('../src/content/posts/', import.meta.url)

test('only the real published article is stored as Markdown content', async () => {
  const names = (await readdir(postsDir)).filter(name => name.endsWith('.md')).sort()
  assert.deepEqual(names, ['commerce-agent-rules.md'])
})

test('published article preserves homepage metadata and contains exactly 24 laws', async () => {
  const source = await readFile(new URL('../src/content/posts/commerce-agent-rules.md', import.meta.url), 'utf8')
  assert.match(source, /^---\n/)
  assert.match(source, /title: "Commerce Agent 的 24 条设计法则"/)
  assert.match(source, /date: 2026-09-03/)
  assert.match(source, /category: Agent/)
  assert.match(source, /- Architecture/)
  assert.match(source, /visual: pearl/)
  assert.match(source, /sourceUrl: "https:\/\/claude\.com\/blog\/the-anatomy-of-effective-commerce-agents"/)
  assert.equal((source.match(/^### \d{2}｜/gm) ?? []).length, 24)
})
