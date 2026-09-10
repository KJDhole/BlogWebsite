import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import bcrypt from 'bcryptjs'
import { createStore } from '../src/db.mjs'
import { hashSessionToken, verifyAdminPassword } from '../src/auth.mjs'

async function withTempDb(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'glenn-editor-'))
  const filename = join(dir, 'editor.sqlite')
  try {
    await fn(filename)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

const draftArticle = {
  slug: 'draft-post',
  title: '',
  description: '',
  date: '',
  category: '',
  tags: [],
  body: 'unfinished',
  extraFrontmatter: {}
}

test('draft survives store reopen and keeps source sha', async () => {
  await withTempDb(async filename => {
    let store = createStore({ filename })
    store.saveDraft({ article: draftArticle, sourceSha: 'sha-1' })
    store.close()

    store = createStore({ filename })
    const saved = store.getDraft('draft-post')
    assert.equal(saved.body, 'unfinished')
    assert.equal(saved.sourceSha, 'sha-1')
    assert.equal(saved.status, 'draft')
    store.close()
  })
})

test('unpublished draft can rename but published-source draft cannot', () => {
  const store = createStore({ filename: ':memory:' })
  store.saveDraft({ article: draftArticle, sourceSha: null })
  const renamed = store.renameDraft('draft-post', 'renamed-post')
  assert.equal(renamed.slug, 'renamed-post')

  store.saveDraft({ article: { ...draftArticle, slug: 'published-post' }, sourceSha: 'sha-1' })
  assert.throws(() => store.renameDraft('published-post', 'other-post'), error => error.code === 'SLUG_LOCKED')
  store.close()
})

test('publish pending metadata is persisted', () => {
  const store = createStore({ filename: ':memory:' })
  store.saveDraft({ article: draftArticle, sourceSha: null })
  const pending = store.setPublishPending('draft-post', {
    prNumber: 42,
    branch: 'content/editor-draft-post-1',
    headSha: 'head-1'
  })
  assert.equal(pending.status, 'publish_pending')
  assert.equal(pending.prNumber, 42)
  assert.equal(pending.branch, 'content/editor-draft-post-1')
  assert.equal(pending.headSha, 'head-1')
  store.close()
})

test('session lookup uses a hash rather than raw cookie token and expires can be purged', () => {
  const store = createStore({ filename: ':memory:' })
  const hash = hashSessionToken('raw-token')
  assert.notEqual(hash, 'raw-token')
  store.createSession({ tokenHash: hash, expiresAt: new Date('2026-09-10T00:00:00Z') })
  assert.equal(store.getSession(hash).tokenHash, hash)
  assert.equal(store.deleteExpiredSessions(new Date('2026-09-11T00:00:00Z')), 1)
  assert.equal(store.getSession(hash), null)
  store.close()
})

test('admin password verification requires configured username and bcrypt hash', async () => {
  const config = {
    adminUsername: 'glenn',
    adminPasswordHash: await bcrypt.hash('secret-password', 4)
  }
  assert.equal(await verifyAdminPassword({ username: 'glenn', password: 'secret-password', config }), true)
  assert.equal(await verifyAdminPassword({ username: 'other', password: 'secret-password', config }), false)
  assert.equal(await verifyAdminPassword({ username: 'glenn', password: 'wrong', config }), false)
})
