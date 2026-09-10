# Article Editor Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single-user browser article editor that saves unfinished private drafts, edits existing Markdown posts, creates GitHub PRs, waits for CI, and merges approved content without changing the public Astro/GitHub Pages architecture.

**Architecture:** Keep the public site fully static. Add static `/admin` pages that call a separate Fastify Editor API over HTTPS. The API owns authentication, SQLite drafts/sessions, Markdown parsing/serialization, GitHub credentials, conflict checks, PR creation, CI status, and merge actions. Published content remains `src/content/posts/*.md` on GitHub `main`.

**Tech Stack:** Astro 7, browser TypeScript, `marked`, `dompurify`, Node.js 22, Fastify 5, `@fastify/cookie`, `@fastify/cors`, `@fastify/rate-limit`, `bcryptjs`, `better-sqlite3`, `gray-matter`, `yaml`, native `fetch`, Node test runner, Docker, Nginx, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-10-article-editor-admin-design.md`

## Global Constraints

- Public blog remains `output: 'static'`; do not move public routes to SSR.
- Published article truth remains `src/content/posts/*.md` on `main`.
- Draft bodies never enter `src/content/posts/` before publish submission.
- Unfinished drafts must be savable even when title/description/body are incomplete; full validation runs only on publish.
- Publishing is always `temporary branch -> PR -> CI success -> explicit merge -> main`; Editor API never writes directly to `main`.
- GitHub token, password hash, session secret, raw session token, and cookies never appear in static HTML or browser JavaScript.
- Category values remain exactly `AI | Agent | Development | Product | Thinking`.
- Unknown existing frontmatter keys survive parse/edit/serialize round trips.
- Published slug is immutable in V1; an unpublished draft may be renamed only when `sourceSha === null` and status is `draft`.
- Browser API calls always use `credentials: 'include'`.
- Every mutation requires authenticated session plus exact allowed `Origin`.
- Login rate limit is 5 attempts per minute per IP.
- Session lifetime is 7 days; cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- Editor API logs redact authorization, cookie, password, and secret-bearing values.
- Existing `npm test` and `npm run build` must continue passing.

---

## File Map

### Static admin client

```text
src/config/admin.ts
src/components/admin/AdminShell.astro
src/components/admin/ArticleEditor.astro
src/pages/admin/login.astro
src/pages/admin/index.astro
src/pages/admin/new.astro
src/pages/admin/editor.astro
src/scripts/admin/api.ts
src/scripts/admin/login.ts
src/scripts/admin/dashboard.ts
src/scripts/admin/editor.ts
src/styles/admin.css
tests/admin-ui-contract.test.mjs
```

### Editor API

```text
editor-api/package.json
editor-api/package-lock.json
editor-api/.env.example
editor-api/src/config.mjs
editor-api/src/article.mjs
editor-api/src/db.mjs
editor-api/src/auth.mjs
editor-api/src/github.mjs
editor-api/src/publishing.mjs
editor-api/src/app.mjs
editor-api/src/server.mjs
editor-api/tests/article.test.mjs
editor-api/tests/db-auth.test.mjs
editor-api/tests/github.test.mjs
editor-api/tests/publishing.test.mjs
editor-api/tests/app.test.mjs
editor-api/Dockerfile
editor-api/README.md
```

### Integration

```text
.github/workflows/ci.yml
```

---

### Task 1: Article Contract and Markdown Round Trip

**Files:**
- Create: `editor-api/package.json`
- Generate: `editor-api/package-lock.json`
- Create: `editor-api/src/article.mjs`
- Create: `editor-api/tests/article.test.mjs`

**Interfaces:**
- Produces: `CATEGORIES`
- Produces: `validateSlug(slug): string[]`
- Produces: `validateDraftArticle(article): string[]`
- Produces: `validatePublishArticle(article): string[]`
- Produces: `parseArticleMarkdown({ slug, source, sourceSha }): ArticleRecord`
- Produces: `serializePublishedArticleMarkdown(article, { mode, now }): string`
- `ArticleRecord`: `{ slug, title, description, date, updated, category, tags, visual, cover, sourceUrl, sourceLabel, body, extraFrontmatter, sourceSha }`.

- [ ] **Step 1: Create the Editor API package**

Create `editor-api/package.json` exactly:

```json
{
  "name": "glenn-blog-editor-api",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "start": "node src/server.mjs",
    "test": "node --test tests/*.test.mjs"
  },
  "dependencies": {
    "@fastify/cookie": "^11.0.0",
    "@fastify/cors": "^11.0.0",
    "@fastify/rate-limit": "^10.0.0",
    "bcryptjs": "^3.0.0",
    "better-sqlite3": "^12.0.0",
    "fastify": "^5.0.0",
    "gray-matter": "^4.0.3",
    "yaml": "^2.0.0"
  }
}
```

Run:

```bash
npm install --prefix editor-api
```

Expected: install exits 0 and creates `editor-api/package-lock.json`.

- [ ] **Step 2: Write failing article tests**

Create `editor-api/tests/article.test.mjs` with these complete cases:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parseArticleMarkdown,
  serializePublishedArticleMarkdown,
  validateDraftArticle,
  validatePublishArticle,
  validateSlug
} from '../src/article.mjs'

const existingSource = `---\ntitle: "Existing"\ndescription: "Desc"\ndate: 2026-09-01\ncategory: Thinking\ntags:\n  - AI\nvisual: paper\nsourceUrl: "https://example.com/source"\ncustomField: keep-me\ndraft: false\n---\n\n# Body\n`

test('draft validation allows unfinished content but still protects slug/category shape', () => {
  const errors = validateDraftArticle({
    slug: 'unfinished-draft', title: '', description: '', category: '', tags: [], body: ''
  })
  assert.deepEqual(errors, [])
  assert.ok(validateDraftArticle({ slug: '../bad', category: '', tags: [], body: '' }).length > 0)
  assert.ok(validateDraftArticle({ slug: 'ok', category: 'Other', tags: [], body: '' }).length > 0)
})

test('publish validation requires complete content', () => {
  const errors = validatePublishArticle({
    slug: 'unfinished-draft', title: '', description: '', category: 'Thinking', tags: [], body: ''
  })
  assert.ok(errors.length >= 4)
})

test('parse and serialize preserves unknown frontmatter and existing date', () => {
  const article = parseArticleMarkdown({ slug: 'existing', source: existingSource, sourceSha: 'sha-1' })
  assert.equal(article.extraFrontmatter.customField, 'keep-me')
  assert.equal(article.visual, 'paper')
  assert.equal(article.sourceUrl, 'https://example.com/source')
  const out = serializePublishedArticleMarkdown(article, {
    mode: 'update', now: new Date('2026-09-10T00:00:00Z')
  })
  assert.match(out, /customField: keep-me/)
  assert.match(out, /visual: paper/)
  assert.match(out, /date: 2026-09-01/)
  assert.match(out, /updated: 2026-09-10/)
  assert.match(out, /draft: false/)
  assert.match(out, /# Body/)
})

test('new publish gets date and omits updated', () => {
  const article = {
    slug: 'new-post', title: 'New', description: 'Desc', date: '', updated: null,
    category: 'Agent', tags: ['AI'], visual: null, cover: null,
    sourceUrl: null, sourceLabel: null, body: 'Hello', extraFrontmatter: {}, sourceSha: null
  }
  const out = serializePublishedArticleMarkdown(article, {
    mode: 'create', now: new Date('2026-09-10T00:00:00Z')
  })
  assert.match(out, /date: 2026-09-10/)
  assert.doesNotMatch(out, /^updated:/m)
})

test('slug format is lower-kebab-case only', () => {
  assert.deepEqual(validateSlug('valid-slug-2'), [])
  assert.ok(validateSlug('../bad').length > 0)
  assert.ok(validateSlug('HasCaps').length > 0)
})
```

- [ ] **Step 3: Run the test and verify RED**

```bash
node --test editor-api/tests/article.test.mjs
```

Expected: FAIL because `editor-api/src/article.mjs` does not exist.

- [ ] **Step 4: Implement the article module**

`editor-api/src/article.mjs` must:

```js
export const CATEGORIES = ['AI', 'Agent', 'Development', 'Product', 'Thinking']

export function validateSlug(slug) {
  const errors = []
  if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) {
    errors.push('slug must be lower-kebab-case and at most 120 characters')
  }
  return errors
}

export function validateDraftArticle(article) {
  const errors = [...validateSlug(article.slug)]
  if (article.category && !CATEGORIES.includes(article.category)) errors.push('invalid category')
  if (article.tags !== undefined && !Array.isArray(article.tags)) errors.push('tags must be an array')
  return errors
}

export function validatePublishArticle(article) {
  const errors = [...validateDraftArticle(article)]
  if (!article.title?.trim()) errors.push('title is required')
  if (!article.description?.trim()) errors.push('description is required')
  if (!CATEGORIES.includes(article.category)) errors.push('category is required')
  if (!Array.isArray(article.tags) || article.tags.length === 0 || article.tags.some(tag => typeof tag !== 'string' || !tag.trim())) errors.push('at least one tag is required')
  if (!article.body?.trim()) errors.push('body is required')
  return errors
}
```

For parse/serialize, use `gray-matter` plus `yaml`. Known keys are `title`, `description`, `date`, `updated`, `category`, `tags`, `visual`, `cover`, `sourceUrl`, `sourceLabel`, `draft`; all other keys go into `extraFrontmatter`. Serialization merges `extraFrontmatter` back, then known fields, and forces `draft: false`. Convert dates to `YYYY-MM-DD` deterministically.

- [ ] **Step 5: Run GREEN and commit**

```bash
npm test --prefix editor-api
git add editor-api/package.json editor-api/package-lock.json editor-api/src/article.mjs editor-api/tests/article.test.mjs
git commit -m "feat: add editor article contract"
```

Expected: tests PASS.

---

### Task 2: SQLite Draft and Session Store

**Files:**
- Create: `editor-api/src/db.mjs`
- Create: `editor-api/src/auth.mjs`
- Create: `editor-api/tests/db-auth.test.mjs`

**Interfaces:**
- Produces: `createStore({ filename })`
- Store methods: `getDraft`, `listDrafts`, `saveDraft`, `renameDraft`, `setPublishPending`, `deleteDraft`, `createSession`, `getSession`, `deleteSession`, `deleteExpiredSessions`, `close`.
- Produces: `hashSessionToken(token)`
- Produces: `verifyAdminPassword({ username, password, config })`.

- [ ] **Step 1: Write failing persistence/auth tests**

Create `editor-api/tests/db-auth.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createStore } from '../src/db.mjs'
import { hashSessionToken } from '../src/auth.mjs'

const article = {
  slug: 'draft-one', title: '', description: '', category: '', tags: [], body: '',
  date: '', updated: null, visual: null, cover: null, sourceUrl: null, sourceLabel: null,
  extraFrontmatter: {}, sourceSha: null
}

test('draft persists across store reopen and remains unfinished', () => {
  const dir = mkdtempSync(join(tmpdir(), 'glenn-editor-'))
  const filename = join(dir, 'editor.sqlite')
  let store = createStore({ filename })
  store.saveDraft({ article, sourceSha: null })
  store.close()
  store = createStore({ filename })
  const loaded = store.getDraft('draft-one')
  assert.equal(loaded.article.title, '')
  assert.equal(loaded.sourceSha, null)
  assert.equal(loaded.status, 'draft')
  store.close()
  rmSync(dir, { recursive: true, force: true })
})

test('unpublished draft can rename and source-backed draft cannot', () => {
  const store = createStore({ filename: ':memory:' })
  store.saveDraft({ article, sourceSha: null })
  store.renameDraft('draft-one', 'draft-renamed')
  assert.equal(store.getDraft('draft-renamed').article.slug, 'draft-renamed')
  store.saveDraft({ article: { ...article, slug: 'published-one' }, sourceSha: 'sha-1' })
  assert.throws(() => store.renameDraft('published-one', 'published-two'), error => error.code === 'SLUG_LOCKED')
  store.close()
})

test('publish metadata is persisted', () => {
  const store = createStore({ filename: ':memory:' })
  store.saveDraft({ article, sourceSha: null })
  store.setPublishPending('draft-one', { prNumber: 12, branch: 'content/editor-draft-one-1', headSha: 'head-1' })
  const loaded = store.getDraft('draft-one')
  assert.equal(loaded.status, 'publish_pending')
  assert.equal(loaded.prNumber, 12)
  assert.equal(loaded.publishHeadSha, 'head-1')
  store.close()
})

test('session token is stored/queried by hash', () => {
  assert.notEqual(hashSessionToken('raw-token'), 'raw-token')
  const store = createStore({ filename: ':memory:' })
  const tokenHash = hashSessionToken('raw-token')
  store.createSession({ tokenHash, expiresAt: '2099-01-01T00:00:00.000Z' })
  assert.equal(store.getSession(tokenHash).tokenHash, tokenHash)
  store.close()
})
```

- [ ] **Step 2: Verify RED**

```bash
node --test editor-api/tests/db-auth.test.mjs
```

Expected: FAIL because modules do not exist.

- [ ] **Step 3: Implement SQLite schema and store**

Use `better-sqlite3` and execute:

```sql
CREATE TABLE IF NOT EXISTS drafts (
  slug TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  source_sha TEXT,
  status TEXT NOT NULL CHECK(status IN ('draft','publish_pending')),
  pr_number INTEGER,
  publish_branch TEXT,
  publish_head_sha TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

`saveDraft` validates only with `validateDraftArticle`, never `validatePublishArticle`. `renameDraft` runs in a transaction, rejects `source_sha IS NOT NULL`, rejects status other than `draft`, and rewrites both row key and `article.slug` inside `payload_json`.

- [ ] **Step 4: Implement auth helpers**

Create `editor-api/src/auth.mjs`:

```js
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'

export function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function verifyAdminPassword({ username, password, config }) {
  if (username !== config.adminUsername) return false
  return bcrypt.compare(password, config.adminPasswordHash)
}
```

- [ ] **Step 5: Run GREEN and commit**

```bash
npm test --prefix editor-api
git add editor-api/src/db.mjs editor-api/src/auth.mjs editor-api/tests/db-auth.test.mjs
git commit -m "feat: add editor draft and session storage"
```

Expected: tests PASS.

---

### Task 3: GitHub REST Client

**Files:**
- Create: `editor-api/src/github.mjs`
- Create: `editor-api/tests/github.test.mjs`

**Interfaces:**
- Produces `createGitHubClient({ token, owner, repo, fetchImpl })`.
- Methods: `getMainHeadSha`, `listDirectory`, `getContent`, `createBranch`, `putContent`, `createPullRequest`, `getPullRequest`, `getCheckSummary`, `mergePullRequest`.

- [ ] **Step 1: Write failing request-contract tests**

Use an injected fake fetch and assert requests never need real GitHub access:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { createGitHubClient } from '../src/github.mjs'

test('GitHub client sends versioned authenticated requests', async () => {
  const calls = []
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options })
    return new Response(JSON.stringify({ ref: 'refs/heads/main', object: { sha: 'main-sha' } }), {
      status: 200, headers: { 'content-type': 'application/json' }
    })
  }
  const github = createGitHubClient({ token: 'secret-token', owner: 'KJDhole', repo: 'BlogWebsite', fetchImpl })
  const sha = await github.getMainHeadSha()
  assert.equal(sha, 'main-sha')
  assert.match(calls[0].url, /repos\/KJDhole\/BlogWebsite\/git\/ref\/heads\/main$/)
  assert.equal(calls[0].options.headers.Authorization, 'Bearer secret-token')
  assert.equal(calls[0].options.headers['X-GitHub-Api-Version'], '2022-11-28')
})

test('content 404 maps to null', async () => {
  const github = createGitHubClient({
    token: 'x', owner: 'KJDhole', repo: 'BlogWebsite',
    fetchImpl: async () => new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 })
  })
  assert.equal(await github.getContent('src/content/posts/missing.md', 'main'), null)
})
```

Add tests that inspect request bodies for `createBranch`, `putContent`, `createPullRequest`, and `mergePullRequest({ number, expectedHeadSha })`. Add a check-summary test where queued checks => `pending`, failed check => `failure`, and all completed successful/neutral/skipped checks => `success`.

- [ ] **Step 2: Verify RED**

```bash
node --test editor-api/tests/github.test.mjs
```

Expected: FAIL because `github.mjs` does not exist.

- [ ] **Step 3: Implement the narrow client**

Use a single internal request helper:

```js
const API = 'https://api.github.com'

async function request(path, { method = 'GET', body, allow404 = false } = {}) {
  const response = await fetchImpl(`${API}/repos/${owner}/${repo}${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  if (allow404 && response.status === 404) return null
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.message || `GitHub request failed: ${response.status}`)
    error.status = response.status
    throw error
  }
  return payload
}
```

`putContent` Base64-encodes UTF-8. `createBranch` posts `refs/heads/<branch>`. `mergePullRequest` sends `{ merge_method: 'squash', sha: expectedHeadSha }`. `getCheckSummary` returns `pending` when there are zero checks, because CI has not appeared yet.

- [ ] **Step 4: Run GREEN and commit**

```bash
npm test --prefix editor-api
git add editor-api/src/github.mjs editor-api/tests/github.test.mjs
git commit -m "feat: add editor GitHub client"
```

Expected: tests PASS.

---

### Task 4: Conflict-Safe Publishing Service

**Files:**
- Create: `editor-api/src/publishing.mjs`
- Create: `editor-api/tests/publishing.test.mjs`

**Interfaces:**
- Produces: `createPublishingService({ store, github, clock })`.
- Methods: `submit(slug)`, `status(slug)`, `merge(slug)`.
- States: `draft | pending | failed | ready | published`.

- [ ] **Step 1: Write failing publishing tests**

Use fixed fakes:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { createPublishingService } from '../src/publishing.mjs'

function makeStore(draft) {
  let current = structuredClone(draft)
  return {
    getDraft: () => current,
    setPublishPending: (_slug, meta) => { current = { ...current, status: 'publish_pending', prNumber: meta.prNumber, publishBranch: meta.branch, publishHeadSha: meta.headSha } },
    deleteDraft: () => { current = null }
  }
}

test('source SHA mismatch blocks existing article publish', async () => {
  const store = makeStore({
    article: { slug: 'existing', title: 'T', description: 'D', category: 'Thinking', tags: ['AI'], body: 'Body', date: '2026-09-01', extraFrontmatter: {} },
    sourceSha: 'old-sha', status: 'draft'
  })
  const github = { getContent: async () => ({ sha: 'new-sha', content: '' }) }
  const service = createPublishingService({ store, github, clock: () => new Date('2026-09-10T06:00:00Z') })
  await assert.rejects(() => service.submit('existing'), error => error.code === 'SOURCE_CONFLICT')
})

test('new draft cannot overwrite an existing main file', async () => {
  const store = makeStore({
    article: { slug: 'new-post', title: 'T', description: 'D', category: 'Thinking', tags: ['AI'], body: 'Body', extraFrontmatter: {} },
    sourceSha: null, status: 'draft'
  })
  const github = { getContent: async () => ({ sha: 'already-exists', content: '' }) }
  const service = createPublishingService({ store, github, clock: () => new Date('2026-09-10T06:00:00Z') })
  await assert.rejects(() => service.submit('new-post'), error => error.code === 'SOURCE_CONFLICT')
})
```

Add complete tests for successful submit ordering, no-check => pending, failed checks => failed, successful checks + open mergeable PR => ready, merge-before-ready => `CI_NOT_READY`, changed PR head => `PR_HEAD_CHANGED`, and successful merge deletes the draft.

- [ ] **Step 2: Verify RED**

```bash
node --test editor-api/tests/publishing.test.mjs
```

Expected: FAIL because `publishing.mjs` does not exist.

- [ ] **Step 3: Implement submit**

`submit(slug)` order is fixed:

```text
1. load draft
2. validatePublishArticle(article)
3. read main target path src/content/posts/<slug>.md
4. existing: require current sha === sourceSha
5. new: require target path missing
6. read main HEAD
7. create content/editor-<slug>-<UTC timestamp> branch
8. serialize published Markdown in create/update mode
9. write file on temporary branch
10. create PR to main
11. persist publish_pending metadata
12. return PR metadata
```

If validation or GitHub operations fail before PR creation, keep the draft as `draft` and never delete its body.

- [ ] **Step 4: Implement status and merge**

`status(slug)` re-fetches PR and checks every time. `ready` requires: PR open, PR head SHA equals stored `publishHeadSha`, GitHub reports mergeable `true`, and check summary is `success`.

`merge(slug)` calls `status(slug)` first, rejects anything except `ready`, calls `mergePullRequest` with the stored expected head SHA, verifies GitHub returns merged success, then deletes the draft.

- [ ] **Step 5: Run GREEN and commit**

```bash
npm test --prefix editor-api
git add editor-api/src/publishing.mjs editor-api/tests/publishing.test.mjs
git commit -m "feat: add conflict-safe article publishing"
```

Expected: tests PASS.

---

### Task 5: Secured Fastify API

**Files:**
- Create: `editor-api/.env.example`
- Create: `editor-api/src/config.mjs`
- Create: `editor-api/src/app.mjs`
- Create: `editor-api/src/server.mjs`
- Create: `editor-api/tests/app.test.mjs`

**Interfaces:**

```text
POST   /auth/login
POST   /auth/logout
GET    /auth/session
GET    /posts
GET    /posts/:slug
POST   /drafts
PUT    /drafts/:slug
DELETE /drafts/:slug
POST   /publish/:slug
GET    /publish/:slug/status
POST   /publish/:slug/merge
```

- [ ] **Step 1: Create safe environment contract**

Create `editor-api/.env.example` exactly:

```dotenv
NODE_ENV=production
PORT=8787
ADMIN_ORIGIN=https://blog.minglingyun.com
ADMIN_USERNAME=glenn
ADMIN_PASSWORD_HASH=replace-with-bcrypt-hash
SESSION_SECRET=replace-with-at-least-32-random-characters
GITHUB_TOKEN=github_pat_replace_with_fine_grained_token
GITHUB_OWNER=KJDhole
GITHUB_REPO=BlogWebsite
SQLITE_PATH=/app/data/editor.sqlite
```

No real password/token/hash is committed.

- [ ] **Step 2: Write failing HTTP/security tests**

`editor-api/tests/app.test.mjs` uses `app.inject()` and asserts:

```js
assert.equal((await app.inject({ method: 'GET', url: '/auth/session' })).statusCode, 401)
assert.equal((await app.inject({ method: 'POST', url: '/drafts', payload: {} })).statusCode, 401)
```

Then log in with a test bcrypt hash, capture the signed cookie, and assert:

```text
Set-Cookie includes HttpOnly
Set-Cookie includes SameSite=Lax
wrong Origin on authenticated mutation => 403
GET /posts requires auth
GET /posts/:slug prefers SQLite draft over main content
unfinished draft POST/PUT is accepted when slug is valid
publish maps incomplete article validation to 400
publish maps SOURCE_CONFLICT to 409
merge maps CI_NOT_READY to 409
```

- [ ] **Step 3: Verify RED**

```bash
node --test editor-api/tests/app.test.mjs
```

Expected: FAIL because app/config/server do not exist.

- [ ] **Step 4: Implement strict config**

`loadConfig(env = process.env)` returns:

```js
{
  port: Number(env.PORT ?? 8787),
  nodeEnv: env.NODE_ENV ?? 'development',
  adminOrigin: env.ADMIN_ORIGIN,
  adminUsername: env.ADMIN_USERNAME,
  adminPasswordHash: env.ADMIN_PASSWORD_HASH,
  sessionSecret: env.SESSION_SECRET,
  githubToken: env.GITHUB_TOKEN,
  githubOwner: env.GITHUB_OWNER ?? 'KJDhole',
  githubRepo: env.GITHUB_REPO ?? 'BlogWebsite',
  sqlitePath: env.SQLITE_PATH ?? './data/editor.sqlite'
}
```

Reject missing required values and `SESSION_SECRET.length < 32` before server startup.

- [ ] **Step 5: Implement Fastify app security boundary**

Register:

```js
await app.register(cookie, { secret: config.sessionSecret })
await app.register(cors, { origin: config.adminOrigin, credentials: true })
await app.register(rateLimit, { global: false })
```

Login route config:

```js
config: { rateLimit: { max: 5, timeWindow: '1 minute' } }
```

On successful login:

```js
const rawToken = crypto.randomBytes(32).toString('base64url')
store.createSession({
  tokenHash: hashSessionToken(rawToken),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
})
reply.setCookie('glenn_editor_session', rawToken, {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60,
  signed: true
})
```

All data routes require a valid non-expired session. Mutation routes additionally require `request.headers.origin === config.adminOrigin`.

Fastify logger redact paths:

```js
[
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers.set-cookie',
  'body.password'
]
```

`POST /drafts` and `PUT /drafts/:slug` use draft validation only. `POST /publish/:slug` triggers publish validation inside the publishing service.

- [ ] **Step 6: Implement post/draft aggregation**

`GET /posts` lists `src/content/posts` from GitHub `main`, parses each Markdown file, overlays any SQLite draft by slug, and returns only non-secret fields plus status.

`GET /posts/:slug` returns SQLite draft first. If no draft exists, read GitHub `main`, parse Markdown, and return `sourceSha` so the first save can pin conflict detection.

For a first save of an existing article, the server obtains/preserves the GitHub SHA itself; never trust a browser-supplied SHA as authoritative.

- [ ] **Step 7: Run GREEN and commit**

```bash
npm test --prefix editor-api
git add editor-api/.env.example editor-api/src/config.mjs editor-api/src/app.mjs editor-api/src/server.mjs editor-api/tests/app.test.mjs
git commit -m "feat: expose secured editor API"
```

Expected: tests PASS.

---

### Task 6: Static Admin UI and Sanitized Preview

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create all static admin client files from File Map.

**Interfaces:**
- Produces routes `/admin/login/`, `/admin/`, `/admin/new/`, `/admin/editor/`.
- Existing article edit link is `/admin/editor/?slug=<encoded-slug>`.
- `apiFetch(path, options)` always sends `credentials: 'include'`.

- [ ] **Step 1: Install preview dependencies**

```bash
npm install marked dompurify
```

Expected: only `marked` and `dompurify` are added; no React/Vue framework.

- [ ] **Step 2: Write failing UI contract tests**

Create `tests/admin-ui-contract.test.mjs` using `readFile`/`readdir` and assert:

```text
login page has username/password form
admin index has New Article action and article-list mount point
new/editor both render ArticleEditor
ArticleEditor has title, slug, description, date, category, tags, cover, body fields
buttons exist: Save Draft, Submit Publish, Merge & Publish, Preview
api.ts contains credentials: 'include'
editor.ts uses URLSearchParams for slug
no src/pages/admin or src/scripts/admin file contains GITHUB_TOKEN or ADMIN_PASSWORD_HASH
```

- [ ] **Step 3: Verify RED**

```bash
node --test tests/admin-ui-contract.test.mjs
```

Expected: FAIL because admin files do not exist.

- [ ] **Step 4: Implement API wrapper and session gate**

`src/config/admin.ts`:

```ts
export const EDITOR_API_BASE = import.meta.env.PUBLIC_EDITOR_API_BASE ?? 'https://editor-api.minglingyun.com'
```

`src/scripts/admin/api.ts`:

```ts
import { EDITOR_API_BASE } from '../../config/admin'

export async function apiFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`${EDITOR_API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) }
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(data?.error ?? `Request failed: ${response.status}`)
    ;(error as Error & { status?: number; code?: string }).status = response.status
    ;(error as Error & { status?: number; code?: string }).code = data?.code
    throw error
  }
  return data
}
```

Dashboard/editor call `/auth/session` on startup and redirect to `/admin/login/` on 401 before loading article data.

- [ ] **Step 5: Implement editor flow**

Behavior is fixed:

```text
/admin/new/ -> blank editor
slug auto-generates from title but can be manually edited
first new save -> POST /drafts
subsequent save -> PUT /drafts/:slug
/admin/editor/?slug=x -> GET /posts/x
sourceSha != null -> slug disabled
sourceSha == null + status draft -> rename allowed through PUT with changed article.slug
Submit Publish -> POST /publish/:slug
publish_pending -> poll status every 10s only while page is visible
ready -> enable Merge & Publish
pending/failed -> merge disabled
Merge & Publish -> POST /publish/:slug/merge
successful merge -> show public `/writing/<slug>/` link
```

Do not auto-publish on autosave. V1 uses an explicit `Save Draft` button; browser text remains untouched if the network save fails.

- [ ] **Step 6: Implement sanitized Markdown preview**

`src/scripts/admin/editor.ts` imports:

```ts
import { marked } from 'marked'
import DOMPurify from 'dompurify'
```

Render only:

```ts
const html = DOMPurify.sanitize(marked.parse(markdown) as string)
preview.innerHTML = html
```

Never insert raw `marked.parse()` output directly.

- [ ] **Step 7: Implement restrained admin layout**

Desktop: metadata header + editor/preview two-column workbench. Mobile: edit/preview toggle. Reuse existing type/color tokens where practical, but do not include homepage orbit/space animation. Labels, focus outlines, disabled states, errors, and keyboard controls are required.

- [ ] **Step 8: Run GREEN/build and commit**

```bash
npm test
npm run build
test -f dist/admin/index.html
test -f dist/admin/login/index.html
test -f dist/admin/new/index.html
test -f dist/admin/editor/index.html
git add package.json package-lock.json src/config/admin.ts src/components/admin src/pages/admin src/scripts/admin src/styles/admin.css tests/admin-ui-contract.test.mjs
git commit -m "feat: add static article editor UI"
```

Expected: all commands PASS.

---

### Task 7: CI and Production Container

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `editor-api/Dockerfile`
- Create: `editor-api/README.md`

- [ ] **Step 1: Extend PR CI only**

Add after root build verification:

```yaml
- name: Install editor API dependencies
  run: npm ci --prefix editor-api
- name: Test editor API
  run: npm test --prefix editor-api
```

Do not modify `.github/workflows/deploy.yml` to deploy the API; GitHub Pages continues deploying only `dist`.

- [ ] **Step 2: Create Dockerfile**

Create `editor-api/Dockerfile` exactly:

```dockerfile
FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
RUN mkdir -p /app/data && chown -R node:node /app
USER node
ENV NODE_ENV=production
ENV PORT=8787
EXPOSE 8787
CMD ["node", "src/server.mjs"]
```

- [ ] **Step 3: Write deployment runbook**

`editor-api/README.md` must document:

```text
DNS: editor-api.minglingyun.com -> existing server
Nginx HTTPS reverse proxy -> 127.0.0.1:8787
ADMIN_ORIGIN=https://blog.minglingyun.com
SQLITE_PATH=/app/data/editor.sqlite
persist /app/data as a Docker volume
fine-grained PAT restricted to KJDhole/BlogWebsite
PAT: Contents read/write, Pull requests read/write, read access needed for checks/status
never expose PAT/password/session secret as PUBLIC_* variables
backup SQLite before replacing the container/volume
```

Include Nginx example:

```nginx
server {
    listen 443 ssl http2;
    server_name editor-api.minglingyun.com;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

Secret generation commands:

```bash
node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 12))" 'CHOOSE_PASSWORD_INTERACTIVELY'
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

The repository never stores the generated values.

- [ ] **Step 4: Run full verification and commit**

```bash
npm ci
npm test
npm run build
npm ci --prefix editor-api
npm test --prefix editor-api
docker build -t glenn-blog-editor-api ./editor-api
git add .github/workflows/ci.yml editor-api/Dockerfile editor-api/README.md
git commit -m "chore: verify and package editor API"
```

Expected: every command exits 0.

---

### Task 8: End-to-End Acceptance and Pull Request

**Files:**
- Modify only defects discovered in Tasks 1-7.
- Do not add product scope.

- [ ] **Step 1: Identity/cleanliness hard check**

```bash
git rev-parse --show-toplevel
git branch --show-current
git status --short
git remote -v
git log -1 --oneline
```

Expected: `BlogWebsite`, branch `feature/article-editor-admin`, no unexpected files.

- [ ] **Step 2: Automated acceptance**

```bash
npm test
npm run build
npm test --prefix editor-api
```

Expected: PASS.

- [ ] **Step 3: Browser/API smoke acceptance**

Use local API plus mocked/fake GitHub boundary; do not touch production `main` during smoke testing.

Verify:

```text
login
create unfinished article
save unfinished draft
reload and recover draft
finish metadata/body
preview sanitized Markdown
submit publish
observe pending -> ready
merge only after ready
existing article loads with slug locked
existing visual/sourceUrl/sourceLabel/custom frontmatter survive edit/publish serialization
network save failure leaves current editor text visible
source SHA conflict blocks overwrite
```

- [ ] **Step 4: Static secret scan**

```bash
grep -R "github_pat_\|GITHUB_TOKEN\|ADMIN_PASSWORD_HASH\|SESSION_SECRET" dist src || true
grep -R "Authorization: Bearer" dist src || true
```

Expected: no real secrets and no browser-side secret-bearing code. Environment variable names may exist only in server-side files/docs, not as populated values in `dist`.

- [ ] **Step 5: Diff check and PR**

```bash
git diff --stat origin/main...HEAD
git diff --check origin/main...HEAD
```

Expected: only editor/admin/API/CI/docs changes and no whitespace errors.

Create PR:

```text
Title: feat: add browser article editor and safe publishing flow

Body:
- static /admin editor with sanitized Markdown preview
- unfinished private SQLite drafts + single-user session auth
- conflict-safe GitHub branch/PR publishing
- CI-gated explicit merge
- public Astro/GitHub Pages architecture unchanged
- test/build/deployment verification included
```

Do not merge automatically. Final merge remains an explicit user/reviewer action.

---

## Self-Review Result

- Spec coverage: login, list, new/edit, unfinished drafts, preview, publish PR, CI status, guarded merge, conflict handling, deployment, and tests all map to Tasks 1-8.
- Draft/publish validation split is explicit: unfinished drafts save; publish is strict.
- Interface names are consistent across tasks: `validateDraftArticle`, `validatePublishArticle`, `serializePublishedArticleMarkdown`, `createStore`, `createGitHubClient`, `createPublishingService`, `buildApp`.
- No runtime dynamic Astro slug route is used for admin editing; existing edit uses `/admin/editor/?slug=`.
- Public deployment workflow remains static and independent of Editor API availability.