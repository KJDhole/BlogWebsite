import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('homepage is a Signal Ledger index rather than a landing-page hero', async () => {
  const page = await read('../src/pages/index.astro')
  assert.match(page, /<SiteHeader/)
  assert.match(page, /id="writing"/)
  assert.match(page, /<LedgerEntry/)
  assert.match(page, /<SignalFooter/)
  assert.match(page, /getCollection\('posts'/)
  assert.doesNotMatch(page, /SpaceScene|orbit-wrap|nav-portal|flight-orb/)
  assert.doesNotMatch(page, /id="article-search"|data-category="All"/)
  assert.doesNotMatch(page, /Hi, I[’']m Glenn|STUDY IN PUBLIC · 2026/)
})

test('homepage discovery stays content-first and keeps core blog pathways', async () => {
  const page = await read('../src/pages/index.astro')
  assert.match(page, /Writing/)
  assert.match(page, /Archive/)
  assert.match(page, /Tags/)
  assert.match(page, /estimateReadingTime/)
  assert.doesNotMatch(page, /const\s+articles\s*=\s*\[/)
})

test('Signal Ledger responsive and reduced-motion rules replace deep-space containment', async () => {
  const styles = await read('../src/styles/signal-ledger.css')
  assert.match(styles, /prefers-reduced-motion/)
  assert.match(styles, /max-width:\s*760px/)
  assert.match(styles, /ledger-entry/)
  assert.match(styles, /signal-rail/)
  assert.doesNotMatch(styles, /space-scene|nav-portal|flight-orb/)
})
