import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'

const postsDir = new URL('../src/content/posts/', import.meta.url)

test('five seed posts are stored as Markdown content', async () => {
  const names = (await readdir(postsDir)).filter(name => name.endsWith('.md')).sort()
  assert.deepEqual(names, [
    'agent-memory-notes.md',
    'ai-native-development.md',
    'building-in-public.md',
    'claude-code-workflow.md',
    'commerce-agent-rules.md'
  ])
})

test('seed post frontmatter preserves the approved homepage metadata', async () => {
  const source = await readFile(new URL('../src/content/posts/commerce-agent-rules.md', import.meta.url), 'utf8')
  assert.match(source, /^---\n/)
  assert.match(source, /title: "Commerce Agent 的 24 条设计法则"/)
  assert.match(source, /date: 2026-09-03/)
  assert.match(source, /category: Agent/)
  assert.match(source, /- Architecture/)
  assert.match(source, /visual: pearl/)
})
