import test from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import { buildApp } from '../src/app.mjs'
import { createStore } from '../src/db.mjs'

const markdown = `---\ntitle: "Published"\ndescription: "Desc"\ndate: 2026-09-01\ncategory: Thinking\ntags:\n  - AI\nvisual: paper\ndraft: false\n---\n\nBody\n`

function githubFake(overrides = {}) {
  return {
    listDirectory: async () => [{ type: 'file', name: 'published.md' }],
    getContent: async path => path.endsWith('/published.md') ? { content: markdown, sha: 'source-sha' } : null,
    getMainHeadSha: async () => 'main-head',
    createBranch: async () => ({}),
    putContent: async () => ({ commitSha: 'publish-head' }),
    createPullRequest: async () => ({ number: 3, url: 'https://github.com/x/pull/3' }),
    getPullRequest: async () => ({ number: 3, url: 'x', state: 'open', mergeable: true, merged: false, headSha: 'publish-head' }),
    getCheckSummary: async () => ({ state: 'success', checks: [{ name: 'CI', status: 'completed', conclusion: 'success' }] }),
    mergePullRequest: async () => ({ merged: true, sha: 'merge-sha' }),
    ...overrides
  }
}

async function fixture(github = githubFake()) {
  const store = createStore({ filename: ':memory:' })
  const config = {
    nodeEnv: 'test',
    adminOrigin: 'https://blog.minglingyun.com',
    adminUsername: 'glenn',
    adminPasswordHash: await bcrypt.hash('secret-password', 4),
    sessionSecret: '12345678901234567890123456789012'
  }
  const app = await buildApp({ config, store, github, clock: () => new Date('2026-09-10T06:00:00Z') })
  return { app, store, config }
}

async function login(app) {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/login',
    headers: { origin: 'https://blog.minglingyun.com' },
    payload: { username: 'glenn', password: 'secret-password' }
  })
  const cookie = response.headers['set-cookie'].split(';')[0]
  return { response, cookie }
}

test('unauthenticated protected endpoints return 401', async () => {
  const { app, store } = await fixture()
  assert.equal((await app.inject({ method: 'GET', url: '/auth/session' })).statusCode, 401)
  assert.equal((await app.inject({ method: 'POST', url: '/drafts', headers: { origin: 'https://blog.minglingyun.com' }, payload: { slug: 'x' } })).statusCode, 401)
  await app.close(); store.close()
})

test('login is generic on failure and secure cookie attributes are set on success', async () => {
  const { app, store } = await fixture()
  const bad = await app.inject({
    method: 'POST', url: '/auth/login', headers: { origin: 'https://blog.minglingyun.com' },
    payload: { username: 'glenn', password: 'wrong' }
  })
  assert.equal(bad.statusCode, 401)
  assert.deepEqual(bad.json(), { error: 'Invalid credentials' })

  const { response } = await login(app)
  assert.equal(response.statusCode, 200)
  assert.match(response.headers['set-cookie'], /HttpOnly/i)
  assert.match(response.headers['set-cookie'], /SameSite=Lax/i)
  await app.close(); store.close()
})

test('wrong Origin blocks authenticated mutations', async () => {
  const { app, store } = await fixture()
  const { cookie } = await login(app)
  const response = await app.inject({
    method: 'POST', url: '/drafts', headers: { cookie, origin: 'https://evil.example' },
    payload: { slug: 'new-post', title: '', body: '' }
  })
  assert.equal(response.statusCode, 403)
  await app.close(); store.close()
})

test('posts list combines published and drafts and post detail prefers draft', async () => {
  const { app, store } = await fixture()
  const { cookie } = await login(app)
  store.saveDraft({
    article: { slug: 'published', title: 'Draft title', description: '', date: '2026-09-01', category: '', tags: [], body: 'draft body', extraFrontmatter: {} },
    sourceSha: 'source-sha'
  })
  const list = await app.inject({ method: 'GET', url: '/posts', headers: { cookie } })
  assert.equal(list.statusCode, 200)
  assert.equal(list.json()[0].status, 'draft')

  const detail = await app.inject({ method: 'GET', url: '/posts/published', headers: { cookie } })
  assert.equal(detail.json().title, 'Draft title')
  await app.close(); store.close()
})

test('first edit of a published article records current GitHub sha and locks slug', async () => {
  const { app, store } = await fixture()
  const { cookie } = await login(app)
  const article = { slug: 'published', title: 'Changed', description: '', date: '2026-09-01', category: '', tags: [], body: 'draft', extraFrontmatter: {} }
  const save = await app.inject({
    method: 'PUT', url: '/drafts/published', headers: { cookie, origin: 'https://blog.minglingyun.com' }, payload: { article }
  })
  assert.equal(save.statusCode, 200)
  assert.equal(store.getDraft('published').sourceSha, 'source-sha')

  const rename = await app.inject({
    method: 'PUT', url: '/drafts/published', headers: { cookie, origin: 'https://blog.minglingyun.com' },
    payload: { article: { ...article, slug: 'renamed' } }
  })
  assert.equal(rename.statusCode, 409)
  assert.equal(rename.json().code, 'SLUG_LOCKED')
  await app.close(); store.close()
})

test('publishing conflict maps to 409', async () => {
  const conflictGithub = githubFake({ getContent: async path => path.endsWith('/published.md') ? { content: markdown, sha: 'new-sha' } : null })
  const { app, store } = await fixture(conflictGithub)
  const { cookie } = await login(app)
  store.saveDraft({
    article: { slug: 'published', title: 'Ready', description: 'Desc', date: '2026-09-01', category: 'Thinking', tags: ['AI'], body: 'Body', extraFrontmatter: {} },
    sourceSha: 'old-sha'
  })
  const conflict = await app.inject({ method: 'POST', url: '/publish/published', headers: { cookie, origin: 'https://blog.minglingyun.com' } })
  assert.equal(conflict.statusCode, 409)
  assert.equal(conflict.json().code, 'SOURCE_CONFLICT')
  await app.close(); store.close()
})

test('login is limited to five attempts per minute per client', async () => {
  const { app, store } = await fixture()
  for (let i = 0; i < 5; i += 1) {
    const response = await app.inject({
      method: 'POST', url: '/auth/login', headers: { origin: 'https://blog.minglingyun.com' },
      payload: { username: 'glenn', password: 'wrong' }
    })
    assert.equal(response.statusCode, 401)
  }
  const blocked = await app.inject({
    method: 'POST', url: '/auth/login', headers: { origin: 'https://blog.minglingyun.com' },
    payload: { username: 'glenn', password: 'wrong' }
  })
  assert.equal(blocked.statusCode, 429)
  await app.close(); store.close()
})

test('merge endpoint maps CI_NOT_READY to 409', async () => {
  const pendingGithub = githubFake({ getCheckSummary: async () => ({ state: 'pending', checks: [] }) })
  const { app, store } = await fixture(pendingGithub)
  const { cookie } = await login(app)
  store.saveDraft({
    article: { slug: 'ready-post', title: 'Ready', description: 'Desc', date: '2026-09-01', category: 'Thinking', tags: ['AI'], body: 'Body', extraFrontmatter: {} },
    sourceSha: null
  })
  store.setPublishPending('ready-post', { prNumber: 3, branch: 'content/editor-ready-post', headSha: 'publish-head' })
  const response = await app.inject({
    method: 'POST', url: '/publish/ready-post/merge', headers: { cookie, origin: 'https://blog.minglingyun.com' }
  })
  assert.equal(response.statusCode, 409)
  assert.equal(response.json().code, 'CI_NOT_READY')
  await app.close(); store.close()
})
