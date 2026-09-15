import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'

test('public repository does not track article Markdown sources', () => {
  const tracked = execFileSync('git', ['ls-files', 'src/content/posts/*.md'], { encoding: 'utf8' }).trim()
  assert.equal(tracked, '')
})
