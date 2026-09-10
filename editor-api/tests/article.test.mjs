import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parseArticleMarkdown,
  serializeArticleMarkdown,
  validateArticle,
  validateSlug
} from '../src/article.mjs'

const source = `---\ntitle: "Existing"\ndescription: "Desc"\ndate: 2026-09-01\ncategory: Thinking\ntags:\n  - AI\nvisual: paper\ncustomField: keep-me\ndraft: false\n---\n\n# Body\n`

test('parse and serialize preserves unknown frontmatter', () => {
  const article = parseArticleMarkdown({ slug: 'existing', source, sourceSha: 'sha-1' })
  assert.equal(article.extraFrontmatter.customField, 'keep-me')
  assert.equal(article.visual, 'paper')
  const out = serializeArticleMarkdown(article, { mode: 'update', now: new Date('2026-09-10T00:00:00Z') })
  assert.match(out, /customField: keep-me/)
  assert.match(out, /date: 2026-09-01/)
  assert.match(out, /updated: 2026-09-10/)
  assert.match(out, /draft: false/)
  assert.match(out, /visual: paper/)
  assert.match(out, /# Body/)
})

test('new article gets date but no updated field', () => {
  const article = {
    slug: 'new-post', title: 'New', description: 'Desc', date: '', updated: null,
    category: 'Agent', tags: ['AI'], visual: null, cover: null,
    sourceUrl: null, sourceLabel: null, body: 'Hello', extraFrontmatter: {}, sourceSha: null
  }
  const out = serializeArticleMarkdown(article, { mode: 'create', now: new Date('2026-09-10T00:00:00Z') })
  assert.match(out, /date: 2026-09-10/)
  assert.doesNotMatch(out, /^updated:/m)
})

test('update preserves original date and refreshes updated date', () => {
  const article = parseArticleMarkdown({ slug: 'existing', source, sourceSha: 'sha-1' })
  const out = serializeArticleMarkdown(article, { mode: 'update', now: new Date('2026-09-12T00:00:00Z') })
  assert.match(out, /date: 2026-09-01/)
  assert.match(out, /updated: 2026-09-12/)
})

test('validation rejects bad slug, incomplete publish data, and bad source url', () => {
  assert.ok(validateSlug('../bad').length > 0)
  const errors = validateArticle({
    slug: 'ok', title: '', description: '', category: 'Other', tags: [], body: '', sourceUrl: 'not-a-url'
  })
  assert.ok(errors.length >= 6)
})
