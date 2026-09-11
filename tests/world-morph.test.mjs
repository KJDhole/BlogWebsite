import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('legacy worldMorph module is retired from the homepage transition path', async () => {
  const home = await read('../src/scripts/home.js')
  assert.doesNotMatch(home, /worldMorph\.mjs/)
  assert.doesNotMatch(home, /createWorldMorph/)
})

test('legacy worldMorph implementation is removed rather than left as dead animation infrastructure', async () => {
  const url = new URL('../src/scripts/worldMorph.mjs', import.meta.url)
  await assert.rejects(access(url), { code: 'ENOENT' })
})
