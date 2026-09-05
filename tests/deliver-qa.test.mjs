import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

const viewportPairs = [
  [1920, 1080],
  [1440, 1000],
  [1280, 800],
  [1024, 1366],
  [768, 1024],
  [430, 932],
  [390, 844],
  [375, 812]
]

test('Signal Ledger QA uses the saved long-form article across the full acceptance matrix', async () => {
  const qaSource = await read('../scripts/signal-ledger-qa.mjs')
  const fixture = await read('./fixtures/ai-design-99-workflow.md')

  for (const [width, height] of viewportPairs) {
    assert.match(qaSource, new RegExp(`width:\\s*${width}[\\s\\S]*height:\\s*${height}`))
  }

  assert.match(fixture, /^# 如何榨出 AI 设计的 99% 创造力：一套三阶段工作流/m)
  assert.match(fixture, /我以前总觉得，AI 在搞设计这块实在拿不出手/)
  assert.match(fixture, /阶段三：交付（Deliver）/)

  assert.match(qaSource, /__qa-ai-design-99/)
  assert.match(qaSource, /\/archive\//)
  assert.match(qaSource, /\/tags\//)
  assert.match(qaSource, /data-search-open/)
  assert.match(qaSource, /data-search-input/)
  assert.match(qaSource, /metaKey|ctrlKey/)
  assert.match(qaSource, /Escape/)
  assert.match(qaSource, /prefers-reduced-motion|reducedMotion/)
  assert.match(qaSource, /scrollWidth/)
  assert.match(qaSource, /article-toc-mobile/)
  assert.match(qaSource, /article-context-rail/)
  assert.match(qaSource, /console|pageerror/)
  assert.match(qaSource, /homepage-top-1440x1000/)
  assert.match(qaSource, /mobile-article-390x844/)
  assert.match(qaSource, /full-page/)
  assert.match(qaSource, /['"]light['"]/)
  assert.match(qaSource, /['"]dark['"]/)
})

test('stress fixture preparation writes only a temporary QA post and preserves body prose', async () => {
  const prepareSource = await read('../scripts/prepare-signal-stress-fixture.mjs')

  assert.match(prepareSource, /tests\/fixtures\/ai-design-99-workflow\.md/)
  assert.match(prepareSource, /src\/content\/posts\/__qa-ai-design-99\.md/)
  assert.match(prepareSource, /\^\\\[image\\\]/)
  assert.match(prepareSource, /Article figure/)
  assert.match(prepareSource, /Signal Ledger long-form stress fixture/)
  assert.match(prepareSource, /tags:\s*\["AI", "Design", "Workflow"\]/)
})

test('Signal Ledger QA workflow builds the temporary real-content post, runs Chromium, and uploads evidence', async () => {
  const workflow = await read('../.github/workflows/signal-ledger-qa.yml')

  assert.match(workflow, /npm install/)
  assert.match(workflow, /npm test/)
  assert.match(workflow, /prepare-signal-stress-fixture\.mjs/)
  assert.match(workflow, /npm run build/)
  assert.match(workflow, /playwright@1\.55\.0/)
  assert.match(workflow, /signal-ledger-qa\.mjs/)
  assert.match(workflow, /actions\/upload-artifact@v4/)
  assert.match(workflow, /artifacts\/signal-ledger-qa/)
  assert.match(workflow, /signal-ledger-qa/)
})

test('legacy Deliver QA infrastructure is retired after the new browser gate proves green', async () => {
  await assert.rejects(read('../scripts/deliver-qa.mjs'), /ENOENT/)
  await assert.rejects(read('../.github/workflows/deliver-qa.yml'), /ENOENT/)
})
