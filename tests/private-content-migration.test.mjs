import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

function assertPrivateContentCheckout(workflow) {
  assert.match(workflow, /repository:\s*KJDhole\/Blog/)
  assert.match(workflow, /token:\s*\$\{\{\s*secrets\.BLOG_CONTENT_TOKEN\s*\}\}/)
  assert.match(workflow, /src\/content\/posts/)
}

test('GitHub Pages deployment overlays articles from the private Blog repository', async () => {
  const workflow = await read('../.github/workflows/deploy.yml')
  assertPrivateContentCheckout(workflow)
})

test('CI validates builds against the private Blog repository content', async () => {
  const workflow = await read('../.github/workflows/ci.yml')
  assertPrivateContentCheckout(workflow)
})

test('all browser QA workflows build against private Blog content', async () => {
  const workflows = [
    '../.github/workflows/absorption-qa.yml',
    '../.github/workflows/deliver-qa.yml',
    '../.github/workflows/world-transition-qa.yml'
  ]

  for (const path of workflows) {
    assertPrivateContentCheckout(await read(path))
  }
})

test('article editor publishes to the private Blog repository and its posts directory', async () => {
  const config = await read('../editor-api/src/config.mjs')
  const envExample = await read('../editor-api/.env.example')
  const publishing = await read('../editor-api/src/publishing.mjs')

  assert.match(config, /GITHUB_CONTENT_REPO/)
  assert.match(config, /\?\? 'Blog'/)
  assert.match(envExample, /GITHUB_CONTENT_REPO=Blog/)
  assert.match(publishing, /return `posts\/\$\{slug\}\.md`/)
})
