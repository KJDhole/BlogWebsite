import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'

const postsDir = new URL('../src/content/posts/', import.meta.url)

test('draft Markdown may coexist without changing the published article set', async () => {
  const names = (await readdir(postsDir)).filter(name => name.endsWith('.md')).sort()
  const entries = await Promise.all(names.map(async name => ({
    name,
    source: await readFile(new URL(`../src/content/posts/${name}`, import.meta.url), 'utf8')
  })))
  const published = entries
    .filter(({ source }) => !/^draft:\s*true\s*$/m.test(source))
    .map(({ name }) => name)
    .sort()

  assert.deepEqual(published, ['commerce-agent-rules.md'])
  const secondEssay = entries.find(({ name }) => name === 'personal-ip-real-work.md')
  assert.ok(secondEssay)
  assert.match(secondEssay.source, /^draft:\s*true\s*$/m)
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
