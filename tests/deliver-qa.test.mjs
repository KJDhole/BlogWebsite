import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('deliver QA covers routes, themes, viewport matrix and editorial stress fixtures', async () => {
  const script = await read('../scripts/deliver-qa.mjs')
  for (const width of ['1440', '1024', '768', '390', '360']) assert.match(script, new RegExp(`width:\\s*${width}`))
  assert.match(script, /['"]light['"]/)
  assert.match(script, /['"]dark['"]/)
  assert.match(script, /\/archive\//)
  assert.match(script, /\/tags\//)
  assert.match(script, /\/writing\/commerce-agent-rules\//)
  assert.match(script, /scrollWidth/)
  assert.match(script, /article-search/)
  assert.match(script, /code-block/)
  assert.match(script, /prompt-block/)
  assert.match(script, /<table/)
  assert.match(script, /<blockquote/)
  assert.match(script, /long-url/)
})

test('deliver QA workflow builds, runs browser checks and preserves screenshots as an artifact', async () => {
  const workflow = await read('../.github/workflows/deliver-qa.yml')
  assert.match(workflow, /npm run build/)
  assert.match(workflow, /playwright@1\.55\.0/)
  assert.match(workflow, /node scripts\/deliver-qa\.mjs/)
  assert.match(workflow, /actions\/upload-artifact@v4/)
})
