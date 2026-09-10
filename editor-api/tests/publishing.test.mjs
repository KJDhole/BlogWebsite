import test from 'node:test'
import assert from 'node:assert/strict'
import { createPublishingService } from '../src/publishing.mjs'

const validArticle = {
  slug: 'hello-world',
  title: 'Hello',
  description: 'Desc',
  date: '2026-09-01',
  updated: null,
  category: 'Thinking',
  tags: ['AI'],
  visual: 'paper',
  cover: null,
  sourceUrl: null,
  sourceLabel: null,
  body: '# Hello',
  extraFrontmatter: {},
  sourceSha: 'source-1',
  status: 'draft'
}

function fakeStore(article = validArticle) {
  let draft = article ? { ...article } : null
  return {
    getDraft: () => draft ? { ...draft } : null,
    setPublishPending: (slug, meta) => {
      draft = { ...draft, status: 'publish_pending', prNumber: meta.prNumber, branch: meta.branch, headSha: meta.headSha }
      return { ...draft }
    },
    deleteDraft: () => { draft = null; return true }
  }
}

function fakeGitHub(overrides = {}) {
  return {
    getContent: async () => ({ content: 'old', sha: 'source-1' }),
    getMainHeadSha: async () => 'main-head',
    createBranch: async () => ({ ref: 'refs/heads/content/editor', sha: 'main-head' }),
    putContent: async () => ({ commitSha: 'publish-head', contentSha: 'blob-2' }),
    createPullRequest: async () => ({ number: 9, url: 'https://github.com/x/pull/9', headSha: 'publish-head', state: 'open' }),
    getPullRequest: async () => ({ number: 9, url: 'https://github.com/x/pull/9', state: 'open', mergeable: true, merged: false, headSha: 'publish-head' }),
    getCheckSummary: async () => ({ state: 'success', checks: [{ name: 'CI', status: 'completed', conclusion: 'success' }] }),
    mergePullRequest: async () => ({ merged: true, sha: 'merge-sha', message: 'merged' }),
    ...overrides
  }
}

const clock = () => new Date('2026-09-10T06:00:00Z')

test('existing draft with matching source sha creates branch, content commit, and PR', async () => {
  const store = fakeStore()
  const calls = []
  const github = fakeGitHub({
    createBranch: async (...args) => { calls.push(['branch', ...args]); return {} },
    putContent: async args => { calls.push(['put', args]); return { commitSha: 'publish-head' } },
    createPullRequest: async args => { calls.push(['pr', args]); return { number: 9, url: 'https://github.com/x/pull/9' } }
  })
  const service = createPublishingService({ store, github, clock })
  const result = await service.submit('hello-world')

  assert.equal(result.branch, 'content/editor-hello-world-20260910060000')
  assert.equal(result.headSha, 'publish-head')
  assert.equal(store.getDraft().status, 'publish_pending')
  assert.equal(calls[0][0], 'branch')
  assert.equal(calls[1][1].sha, 'source-1')
  assert.equal(calls[2][1].base, 'main')
})

test('source sha mismatch blocks overwrite', async () => {
  const service = createPublishingService({
    store: fakeStore(),
    github: fakeGitHub({ getContent: async () => ({ content: 'new', sha: 'different' }) }),
    clock
  })
  await assert.rejects(() => service.submit('hello-world'), error => error.code === 'SOURCE_CONFLICT')
})

test('new draft conflicts when slug already exists on main', async () => {
  const store = fakeStore({ ...validArticle, sourceSha: null })
  const service = createPublishingService({ store, github: fakeGitHub(), clock })
  await assert.rejects(() => service.submit('hello-world'), error => error.code === 'SOURCE_CONFLICT')
})

test('GitHub failure leaves draft editable instead of publish pending', async () => {
  const store = fakeStore()
  const service = createPublishingService({
    store,
    github: fakeGitHub({ createPullRequest: async () => { throw new Error('GitHub down') } }),
    clock
  })
  await assert.rejects(() => service.submit('hello-world'))
  assert.equal(store.getDraft().status, 'draft')
})

test('status maps check and PR state to pending, failed, and ready', async () => {
  const pendingStore = fakeStore({ ...validArticle, status: 'publish_pending', prNumber: 9, headSha: 'publish-head' })
  const pending = createPublishingService({
    store: pendingStore,
    github: fakeGitHub({ getCheckSummary: async () => ({ state: 'pending', checks: [] }) }),
    clock
  })
  assert.equal((await pending.status('hello-world')).state, 'pending')

  const failed = createPublishingService({
    store: fakeStore({ ...validArticle, status: 'publish_pending', prNumber: 9, headSha: 'publish-head' }),
    github: fakeGitHub({ getCheckSummary: async () => ({ state: 'failure', checks: [] }) }),
    clock
  })
  assert.equal((await failed.status('hello-world')).state, 'failed')

  const ready = createPublishingService({
    store: fakeStore({ ...validArticle, status: 'publish_pending', prNumber: 9, headSha: 'publish-head' }),
    github: fakeGitHub(),
    clock
  })
  assert.equal((await ready.status('hello-world')).state, 'ready')
})

test('merge is blocked until ready and protects stored PR head', async () => {
  const notReady = createPublishingService({
    store: fakeStore({ ...validArticle, status: 'publish_pending', prNumber: 9, headSha: 'publish-head' }),
    github: fakeGitHub({ getCheckSummary: async () => ({ state: 'pending', checks: [] }) }),
    clock
  })
  await assert.rejects(() => notReady.merge('hello-world'), error => error.code === 'CI_NOT_READY')

  let prReads = 0
  const changedHead = createPublishingService({
    store: fakeStore({ ...validArticle, status: 'publish_pending', prNumber: 9, headSha: 'publish-head' }),
    github: fakeGitHub({
      getPullRequest: async () => {
        prReads += 1
        return { number: 9, url: 'x', state: 'open', mergeable: true, merged: false, headSha: prReads === 1 ? 'publish-head' : 'changed-head' }
      }
    }),
    clock
  })
  await assert.rejects(() => changedHead.merge('hello-world'), error => error.code === 'PR_HEAD_CHANGED')
})

test('successful merge deletes working draft', async () => {
  const store = fakeStore({ ...validArticle, status: 'publish_pending', prNumber: 9, headSha: 'publish-head' })
  const service = createPublishingService({ store, github: fakeGitHub(), clock })
  const result = await service.merge('hello-world')
  assert.deepEqual(result, { state: 'published', mergeCommitSha: 'merge-sha' })
  assert.equal(store.getDraft(), null)
})
