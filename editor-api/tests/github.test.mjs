import test from 'node:test'
import assert from 'node:assert/strict'
import { createGitHubClient } from '../src/github.mjs'

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' }
  })
}

function makeClient(handler) {
  const calls = []
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options })
    return handler(url, options, calls.length)
  }
  return {
    calls,
    client: createGitHubClient({ token: 'secret-token', owner: 'KJDhole', repo: 'BlogWebsite', fetchImpl })
  }
}

function assertHeaders(call) {
  assert.equal(call.options.headers.Accept, 'application/vnd.github+json')
  assert.equal(call.options.headers.Authorization, 'Bearer secret-token')
  assert.equal(call.options.headers['X-GitHub-Api-Version'], '2022-11-28')
}

test('reads main ref and content using required headers', async () => {
  const { client, calls } = makeClient((url) => {
    if (url.endsWith('/git/ref/heads/main')) return jsonResponse({ object: { sha: 'main-sha' } })
    return jsonResponse({ sha: 'blob-sha', content: Buffer.from('hello').toString('base64') })
  })

  assert.equal(await client.getMainHeadSha(), 'main-sha')
  assert.deepEqual(await client.getContent('src/content/posts/a.md', 'main'), { content: 'hello', sha: 'blob-sha' })
  calls.forEach(assertHeaders)
})

test('content lookup maps only 404 to null', async () => {
  const { client } = makeClient(() => jsonResponse({ message: 'Not Found' }, 404))
  assert.equal(await client.getContent('missing.md', 'main'), null)
})

test('creates branch, writes content, and opens pull request', async () => {
  const { client, calls } = makeClient((url) => {
    if (url.endsWith('/git/refs')) return jsonResponse({ ref: 'refs/heads/content/editor-a', object: { sha: 'base-sha' } }, 201)
    if (url.includes('/contents/')) return jsonResponse({ commit: { sha: 'commit-sha' }, content: { sha: 'new-blob' } }, 201)
    return jsonResponse({ number: 7, html_url: 'https://github.com/x/pull/7', state: 'open', head: { sha: 'commit-sha' } }, 201)
  })

  await client.createBranch('content/editor-a', 'base-sha')
  const written = await client.putContent({ path: 'src/content/posts/a.md', branch: 'content/editor-a', content: '你好', message: 'publish a' })
  const pr = await client.createPullRequest({ title: 'Publish a', body: 'Editor publish', head: 'content/editor-a', base: 'main' })

  assert.deepEqual(written, { commitSha: 'commit-sha', contentSha: 'new-blob' })
  assert.equal(pr.number, 7)
  assert.equal(JSON.parse(calls[1].options.body).content, Buffer.from('你好').toString('base64'))
  assert.deepEqual(JSON.parse(calls[0].options.body), { ref: 'refs/heads/content/editor-a', sha: 'base-sha' })
})

test('check summary is pending, failure, or success from check runs', async () => {
  const pending = makeClient(() => jsonResponse({ check_runs: [{ name: 'CI', status: 'in_progress', conclusion: null }] })).client
  assert.equal((await pending.getCheckSummary('sha')).state, 'pending')

  const failed = makeClient(() => jsonResponse({ check_runs: [{ name: 'CI', status: 'completed', conclusion: 'failure' }] })).client
  assert.equal((await failed.getCheckSummary('sha')).state, 'failure')

  const success = makeClient(() => jsonResponse({ check_runs: [
    { name: 'CI', status: 'completed', conclusion: 'success' },
    { name: 'Lint', status: 'completed', conclusion: 'neutral' }
  ] })).client
  assert.equal((await success.getCheckSummary('sha')).state, 'success')
})

test('merge sends expected head sha and errors never expose token', async () => {
  const { client, calls } = makeClient((url) => {
    if (url.endsWith('/merge')) return jsonResponse({ merged: true, sha: 'merge-sha', message: 'merged' })
    return jsonResponse({ message: 'bad request' }, 422)
  })

  const merged = await client.mergePullRequest({ number: 7, expectedHeadSha: 'head-sha' })
  assert.equal(merged.sha, 'merge-sha')
  assert.deepEqual(JSON.parse(calls[0].options.body), { merge_method: 'squash', sha: 'head-sha' })

  await assert.rejects(() => client.getPullRequest(9), error => {
    assert.doesNotMatch(error.message, /secret-token/)
    return error.status === 422
  })
})
