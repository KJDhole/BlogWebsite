import test from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import { buildApp } from '../src/app.mjs'
import { createStore } from '../src/db.mjs'

const markdown = `---\ntitle: "Published"\ndescription: "Desc"\ndate: 2026-09-01\ncategory: Thinking\ntags:\n  - AI\ndraft: false\n---\n\nBody\n`

async function fixture(github) {
  const store = createStore({ filename: ':memory:' })
  const config = {
    nodeEnv: 'test',
    adminOrigin: 'https://blog.minglingyun.com',
    adminUsername: 'glenn',
    adminPasswordHash: await bcrypt.hash('secret-password', 4),
    sessionSecret: '12345678901234567890123456789012'
  }
  const app = await buildApp({ config, store, github })
  return { app, store }
}

async function login(app) {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/login',
    headers: { origin: 'https://blog.minglingyun.com' },
    payload: { username: 'glenn', password: 'secret-password' }
  })
  return response.headers['set-cookie'].split(';')[0]
}

test('editor reads published articles from private repository posts directory', async () => {
  const calls = []
  const github = {
    listDirectory: async path => {
      calls.push(['listDirectory', path])
      return [{ type: 'file', name: 'published.md' }]
    },
    getContent: async path => {
      calls.push(['getContent', path])
      return path === 'posts/published.md' ? { content: markdown, sha: 'source-sha' } : null
    }
  }
  const { app, store } = await fixture(github)
  const cookie = await login(app)
  const response = await app.inject({ method: 'GET', url: '/posts', headers: { cookie } })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(calls.filter(([name]) => name === 'listDirectory'), [['listDirectory', 'posts']])
  assert.ok(calls.some(([name, path]) => name === 'getContent' && path === 'posts/published.md'))

  await app.close()
  store.close()
})

test('CORS preflight allows draft update and delete methods', async () => {
  const github = {
    listDirectory: async () => [],
    getContent: async () => null
  }
  const { app, store } = await fixture(github)
  const response = await app.inject({
    method: 'OPTIONS',
    url: '/drafts/example',
    headers: {
      origin: 'https://blog.minglingyun.com',
      'access-control-request-method': 'PUT'
    }
  })

  assert.equal(response.statusCode, 204)
  const methods = String(response.headers['access-control-allow-methods'] ?? '')
  assert.match(methods, /\bPUT\b/)
  assert.match(methods, /\bDELETE\b/)

  await app.close()
  store.close()
})
