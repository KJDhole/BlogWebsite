# Article Editor Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single-user browser article editor that saves private drafts, edits existing Markdown posts, creates reviewed GitHub PRs, and merges approved content without changing the public Astro/GitHub Pages architecture.

**Architecture:** Keep the public site fully static. Add static `/admin` pages that talk to a separate Fastify Editor API over HTTPS; the API owns authentication, SQLite drafts/sessions, Markdown serialization, GitHub write credentials, PR creation, CI status checks, and merge actions. Published content remains `src/content/posts/*.md` on GitHub `main`.

**Tech Stack:** Astro 7, browser TypeScript, `marked`, `dompurify`, Node.js 22, Fastify, `@fastify/cookie`, `@fastify/cors`, `@fastify/rate-limit`, `bcryptjs`, `better-sqlite3`, `gray-matter`, `yaml`, native `fetch`, Node test runner, Docker, Nginx, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-10-article-editor-admin-design.md`

## Global Constraints

- Public blog remains `output: 'static'`; do not move public routes to SSR.
- Published article truth remains `src/content/posts/*.md` on `main`.
- Draft bodies must not be written into `src/content/posts/` before publish submission.
- Publishing must be `temporary branch -> PR -> CI success -> explicit merge -> main`; never write directly to `main` from the Editor API.
- GitHub credentials, password hash, session secret, and cookies must never be rendered into static HTML or sent to browser JavaScript.
- Existing content schema remains `AI | Agent | Development | Product | Thinking`.
- Existing unknown frontmatter keys must survive parse/edit/serialize round trips.
- Existing published slug is immutable in V1; an unpublished new draft may be renamed only while `sourceSha === null` and status is `draft`.
- All browser API calls use `credentials: 'include'`; all mutation endpoints require authenticated session plus exact allowed Origin.
- Login rate limit: 5 attempts per minute per IP.
- Session lifetime: 7 days; cookie is `HttpOnly`, `Secure` in production, `SameSite=Lax`.
- Editor API logs must redact authorization, cookies, password fields, `GITHUB_TOKEN`, and `SESSION_SECRET`.
- Main repository tests (`npm test`, `npm run build`) must continue passing.

---

## File Map

### Public/static admin client

- `src/config/admin.ts` — compile-time Editor API base URL only.
- `src/components/admin/AdminShell.astro` — shared admin page frame.
- `src/components/admin/ArticleEditor.astro` — shared editor form/preview markup for new and edit pages.
- `src/pages/admin/login.astro` — login surface.
- `src/pages/admin/index.astro` — article/draft list.
- `src/pages/admin/new.astro` — new article editor.
- `src/pages/admin/editor.astro` — existing article editor; reads `?slug=` in browser.
- `src/scripts/admin/api.ts` — credentialed API wrapper.
- `src/scripts/admin/login.ts` — login/session behavior.
- `src/scripts/admin/dashboard.ts` — article list loading/actions.
- `src/scripts/admin/editor.ts` — editor state, autosafe manual save, preview, publish/status/merge.
- `src/styles/admin.css` — isolated admin styling.
- `tests/admin-ui-contract.test.mjs` — static admin route/UI contract.

### Editor API

- `editor-api/package.json` / `editor-api/package-lock.json` — isolated runtime dependencies and scripts.
- `editor-api/.env.example` — required environment variables without secrets.
- `editor-api/src/config.mjs` — validated config loader.
- `editor-api/src/article.mjs` — article types-by-contract, validation, parse/serialize.
- `editor-api/src/db.mjs` — SQLite schema and draft/session stores.
- `editor-api/src/auth.mjs` — password verification, session token hashing, auth hooks.
- `editor-api/src/github.mjs` — narrow GitHub REST client.
- `editor-api/src/publishing.mjs` — conflict check, branch/file/PR/status/merge orchestration.
- `editor-api/src/app.mjs` — Fastify app and routes.
- `editor-api/src/server.mjs` — production entrypoint.
- `editor-api/tests/article.test.mjs` — Markdown contract tests.
- `editor-api/tests/db-auth.test.mjs` — draft/session/auth tests.
- `editor-api/tests/github.test.mjs` — GitHub request contract tests.
- `editor-api/tests/publishing.test.mjs` — publish state-machine tests.
- `editor-api/tests/app.test.mjs` — HTTP/auth/origin route tests.
- `editor-api/Dockerfile` — production container.
- `editor-api/README.md` — deployment/configuration runbook.

### Integration

- `.github/workflows/ci.yml` — install/test Editor API in PR CI while leaving GitHub Pages deployment static.

---

### Task 1: Markdown Article Contract

**Files:**
- Create: `editor-api/package.json`
- Create: `editor-api/src/article.mjs`
- Create: `editor-api/tests/article.test.mjs`
- Create: `editor-api/.env.example`
- Generate: `editor-api/package-lock.json`

**Interfaces:**
- Produces: `CATEGORIES: readonly string[]`
- Produces: `validateArticle(article): string[]`
- Produces: `validateSlug(slug): string[]`
- Produces: `parseArticleMarkdown({ slug, source, sourceSha }): ArticleRecord`
- Produces: `serializeArticleMarkdown(article, { mode, now }): string`
- `ArticleRecord` shape: `{ slug, title, description, date, updated, category, tags, visual, cover, sourceUrl, sourceLabel, body, extraFrontmatter, sourceSha }`.

- [ ] **Step 1: Create the isolated API package and install only required V1 dependencies**

Create `editor-api/package.json`:

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

Expected: `editor-api/package-lock.json` is created and install exits 0.

- [ ] **Step 2: Write failing parse/serialize/validation tests**

Create `editor-api/tests/article.test.mjs` with cases equivalent to:

```js
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
  const out = serializeArticleMarkdown(article, { mode: 'update', now: new Date('2026-09-10T00:00:00Z') })
  assert.match(out, /customField: keep-me/)
  assert.match(out, /date: 2026-09-01/)
  assert.match(out, /updated: 2026-09-10/)
  assert.match(out, /draft: false/)
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

test('validation rejects bad slug and category', () => {
  assert.ok(validateSlug('../bad').length > 0)
  assert.ok(validateArticle({ slug: 'ok', title: '', description: '', category: 'Other', tags: [], body: '' }).length > 0)
})
```

- [ ] **Step 3: Run the tests and prove they fail before implementation**

Run:

```bash
npm test --prefix editor-api
```

Expected: FAIL because `../src/article.mjs` does not exist.

- [ ] **Step 4: Implement validation and deterministic Markdown conversion**

In `editor-api/src/article.mjs`:

- use `gray-matter` to split frontmatter/body;
- keep known keys separate and collect all unknown keys into `extraFrontmatter`;
- validate slug with `^[a-z0-9]+(?:-[a-z0-9]+)*$` and max length 120;
- reject empty title/description/body, unsupported category, empty/non-string tags;
- on create set `date` to `YYYY-MM-DD` when absent and omit `updated`;
- on update preserve original `date` and set `updated` to `YYYY-MM-DD`;
- always emit `draft: false` only in publish serialization;
- merge `extraFrontmatter` back before YAML serialization so fields such as `visual`, future metadata, or custom fields are not silently lost.

The exported function signatures must exactly match the Interfaces block above.

- [ ] **Step 5: Run focused tests, then commit**

Run:

```bash
npm test --prefix editor-api
```

Expected: PASS.

Commit:

```bash
git add editor-api/package.json editor-api/package-lock.json editor-api/.env.example editor-api/src/article.mjs editor-api/tests/article.test.mjs
git commit -m "feat: add editor article contract"
```

---

### Task 2: SQLite Drafts, Sessions, and Authentication

**Files:**
- Create: `editor-api/src/db.mjs`
- Create: `editor-api/src/auth.mjs`
- Create: `editor-api/tests/db-auth.test.mjs`

**Interfaces:**
- Consumes: `validateArticle`, `validateSlug` from Task 1.
- Produces: `createStore({ filename }): EditorStore`
- `EditorStore` methods: `getDraft(slug)`, `listDrafts()`, `saveDraft({ article, sourceSha })`, `renameDraft(oldSlug, newSlug)`, `setPublishPending(slug, meta)`, `deleteDraft(slug)`, `createSession({ tokenHash, expiresAt })`, `getSession(tokenHash)`, `deleteSession(tokenHash)`, `deleteExpiredSessions(now)`.
- Produces: `hashSessionToken(token): string`
- Produces: `verifyAdminPassword({ username, password, config }): Promise<boolean>`

- [ ] **Step 1: Write failing persistence and auth tests**

Cover these exact behaviors in `editor-api/tests/db-auth.test.mjs` using a temporary SQLite file:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { createStore } from '../src/db.mjs'
import { hashSessionToken } from '../src/auth.mjs'

test('draft survives store reopen and keeps source sha', () => {
  // create temp DB, save a draft, close store, reopen same file
  // assert title/body/sourceSha/status === draft
})

test('unpublished draft can rename but published-source draft cannot', () => {
  // sourceSha null -> rename succeeds
  // sourceSha sha-1 -> rename throws code SLUG_LOCKED
})

test('session lookup uses a hash rather than raw cookie token', () => {
  assert.notEqual(hashSessionToken('raw-token'), 'raw-token')
})
```

Also assert `setPublishPending` stores `prNumber`, `branch`, and `headSha` and changes status to `publish_pending`.

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
node --test editor-api/tests/db-auth.test.mjs
```

Expected: FAIL because store/auth modules do not exist.

- [ ] **Step 3: Implement the SQLite schema and store**

Create these tables in `editor-api/src/db.mjs`:

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

Use parameterized statements only. Parse/stringify `payload_json` at the store boundary. `renameDraft` must run inside a transaction and reject a rename when `source_sha IS NOT NULL` or status is not `draft`.

- [ ] **Step 4: Implement password/session helpers**

In `editor-api/src/auth.mjs`:

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

Do not log `password`, hash input, raw session tokens, or bcrypt hash.

- [ ] **Step 5: Run tests and commit**

Run:

```bash
node --test editor-api/tests/db-auth.test.mjs
npm test --prefix editor-api
```

Expected: PASS.

Commit:

```bash
git add editor-api/src/db.mjs editor-api/src/auth.mjs editor-api/tests/db-auth.test.mjs
git commit -m "feat: add editor draft and session storage"
```

---

### Task 3: Narrow GitHub REST Client

**Files:**
- Create: `editor-api/src/github.mjs`
- Create: `editor-api/tests/github.test.mjs`

**Interfaces:**
- Produces: `createGitHubClient({ token, owner, repo, fetchImpl }): GitHubClient`
- Methods: `getMainHeadSha()`, `listDirectory(path, ref)`, `getContent(path, ref)`, `createBranch(name, sha)`, `putContent({ path, branch, content, message, sha })`, `createPullRequest({ title, body, head, base })`, `getPullRequest(number)`, `getCheckSummary(headSha)`, `mergePullRequest({ number, expectedHeadSha })`.
- `getContent` returns `{ content, sha } | null` and maps GitHub 404 to `null` only for content lookup.
- `getCheckSummary` returns `{ state: 'pending' | 'success' | 'failure', checks: Array<{name,status,conclusion}> }`.

- [ ] **Step 1: Write request-contract tests using an injected fake fetch**

Test exact paths/methods without real network calls:

```js
const calls = []
const fetchImpl = async (url, options = {}) => {
  calls.push({ url, options })
  return new Response(JSON.stringify({ sha: 'abc', content: Buffer.from('hello').toString('base64') }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  })
}
```

Assert every request sets:

```text
Accept: application/vnd.github+json
Authorization: Bearer <token>
X-GitHub-Api-Version: 2022-11-28
```

Cover `GET /git/ref/heads/main`, contents read/write, refs creation, PR creation/read, check-runs/status read, and merge with expected head SHA.

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
node --test editor-api/tests/github.test.mjs
```

Expected: FAIL because `github.mjs` does not exist.

- [ ] **Step 3: Implement only the GitHub endpoints required by V1**

Implement a shared `request(path, { method, body, allow404 })` helper. For non-2xx responses throw an error containing status plus GitHub `message`, but never include the Authorization header/token.

`putContent` must Base64-encode UTF-8 content and send `sha` only for an update. `createBranch` must create `refs/heads/<branch>`. `mergePullRequest` must send:

```json
{
  "merge_method": "squash",
  "sha": "<expected-head-sha>"
}
```

For CI state, combine check-runs so any completed failing/cancelled/timed_out/action_required check yields `failure`, any queued/in_progress/missing check yields `pending`, and all completed successful/skipped/neutral checks yields `success` only when at least one check exists.

- [ ] **Step 4: Run tests and commit**

Run:

```bash
node --test editor-api/tests/github.test.mjs
npm test --prefix editor-api
```

Expected: PASS.

Commit:

```bash
git add editor-api/src/github.mjs editor-api/tests/github.test.mjs
git commit -m "feat: add editor GitHub client"
```

---

### Task 4: Publishing State Machine

**Files:**
- Create: `editor-api/src/publishing.mjs`
- Create: `editor-api/tests/publishing.test.mjs`

**Interfaces:**
- Consumes: article serializer from Task 1, store from Task 2, GitHub client from Task 3.
- Produces: `createPublishingService({ store, github, clock }): PublishingService`
- Methods: `submit(slug)`, `status(slug)`, `merge(slug)`.
- `submit` returns `{ prNumber, prUrl, branch, headSha }`.
- `status` returns `{ state: 'draft'|'pending'|'failed'|'ready'|'published', prNumber, prUrl, checks }`.
- `merge` returns `{ state: 'published', mergeCommitSha }`.

- [ ] **Step 1: Write failing state-machine tests with fake store/GitHub objects**

Cover at least these scenarios:

```text
existing draft sourceSha == current main file sha -> submit allowed
existing draft sourceSha != current main file sha -> throw SOURCE_CONFLICT
new draft and main file already exists -> throw SOURCE_CONFLICT
submit -> branch content/editor-<slug>-<timestamp>, put file, create PR, store publish_pending
status with no/computing checks -> pending
status with failed check -> failed
status with all successful checks and open mergeable PR -> ready
merge before ready -> throw CI_NOT_READY
merge when head SHA changed from stored publish_head_sha -> throw PR_HEAD_CHANGED
successful merge -> delete draft and return published
```

Use a fixed clock `new Date('2026-09-10T06:00:00Z')` so branch names are deterministic.

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
node --test editor-api/tests/publishing.test.mjs
```

Expected: FAIL because publishing service does not exist.

- [ ] **Step 3: Implement conflict-safe submission**

`submit(slug)` must perform this order exactly:

```text
load draft
validate article
read main target file
compare target SHA against draft sourceSha
read main HEAD SHA
create timestamped content branch
serialize Markdown in create/update mode
create/update src/content/posts/<slug>.md on branch
create PR to main
persist publish_pending metadata
return PR metadata
```

Do not set `publish_pending` until PR creation succeeds. On any GitHub failure leave the draft body intact and status `draft`.

- [ ] **Step 4: Implement status and guarded merge**

`status(slug)` must re-read the PR and checks every call; do not trust stale browser state. `merge(slug)` must call `status(slug)` first and proceed only for `ready`, re-check the PR head SHA against the stored head SHA, call GitHub merge with expected SHA, then delete the draft.

- [ ] **Step 5: Run tests and commit**

Run:

```bash
node --test editor-api/tests/publishing.test.mjs
npm test --prefix editor-api
```

Expected: PASS.

Commit:

```bash
git add editor-api/src/publishing.mjs editor-api/tests/publishing.test.mjs
git commit -m "feat: add conflict-safe article publishing"
```

---

### Task 5: Fastify Editor API Routes and Security Boundary

**Files:**
- Create: `editor-api/src/config.mjs`
- Create: `editor-api/src/app.mjs`
- Create: `editor-api/src/server.mjs`
- Create: `editor-api/tests/app.test.mjs`
- Modify: `editor-api/.env.example`

**Interfaces:**
- Consumes: Tasks 1-4.
- Produces: `buildApp({ config, store, github, clock }): FastifyInstance` for tests.
- HTTP contract:
  - `POST /auth/login`
  - `POST /auth/logout`
  - `GET /auth/session`
  - `GET /posts`
  - `GET /posts/:slug`
  - `POST /drafts`
  - `PUT /drafts/:slug`
  - `DELETE /drafts/:slug`
  - `POST /publish/:slug`
  - `GET /publish/:slug/status`
  - `POST /publish/:slug/merge`

- [ ] **Step 1: Write failing HTTP tests with `app.inject()`**

Tests must prove:

```text
GET /auth/session unauthenticated -> 401
POST /drafts unauthenticated -> 401
wrong Origin on authenticated POST/PUT/DELETE -> 403
bad login -> 401 with generic { error: 'Invalid credentials' }
valid login -> Set-Cookie contains HttpOnly and SameSite=Lax
GET /posts after login -> published + draft statuses without secrets
GET /posts/:slug prefers SQLite draft over GitHub main
PUT published article draft records current GitHub SHA on first save
rename of sourceSha != null article -> 409 SLUG_LOCKED
POST publish maps SOURCE_CONFLICT -> 409
POST merge maps CI_NOT_READY -> 409
```

Use dependency injection for store/GitHub and bcrypt hash generated inside the test fixture.

- [ ] **Step 2: Run the HTTP test and verify failure**

Run:

```bash
node --test editor-api/tests/app.test.mjs
```

Expected: FAIL because app/config/server modules do not exist.

- [ ] **Step 3: Implement strict configuration validation**

`editor-api/src/config.mjs` must require:

```text
PORT (default 8787)
NODE_ENV
ADMIN_ORIGIN
ADMIN_USERNAME
ADMIN_PASSWORD_HASH
SESSION_SECRET (minimum 32 characters)
GITHUB_TOKEN
GITHUB_OWNER (default KJDhole)
GITHUB_REPO (default BlogWebsite)
SQLITE_PATH (default ./data/editor.sqlite)
```

`editor-api/.env.example` lists names and safe examples only; never include a real PAT, real password, or real password hash.

- [ ] **Step 4: Implement auth, CORS, Origin checks, and routes**

Register:

```js
await app.register(cookie, { secret: config.sessionSecret })
await app.register(cors, { origin: config.adminOrigin, credentials: true })
await app.register(rateLimit, { global: false })
```

The login route uses route-level `rateLimit: { max: 5, timeWindow: '1 minute' }`. On success generate `crypto.randomBytes(32).toString('base64url')`, store only `hashSessionToken(rawToken)`, and set cookie `glenn_editor_session` for 7 days.

All non-auth data routes require a valid, non-expired session. Every mutation also requires `request.headers.origin === config.adminOrigin`.

Configure Fastify logging redaction for:

```text
req.headers.authorization
req.headers.cookie
res.headers.set-cookie
body.password
```

`server.mjs` builds real store/GitHub dependencies and listens on `0.0.0.0`.

- [ ] **Step 5: Run API tests and commit**

Run:

```bash
npm test --prefix editor-api
```

Expected: PASS.

Commit:

```bash
git add editor-api/src/config.mjs editor-api/src/app.mjs editor-api/src/server.mjs editor-api/tests/app.test.mjs editor-api/.env.example
git commit -m "feat: expose secured editor API"
```

---

### Task 6: Static Admin UI and Markdown Preview

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/config/admin.ts`
- Create: `src/components/admin/AdminShell.astro`
- Create: `src/components/admin/ArticleEditor.astro`
- Create: `src/pages/admin/login.astro`
- Create: `src/pages/admin/index.astro`
- Create: `src/pages/admin/new.astro`
- Create: `src/pages/admin/editor.astro`
- Create: `src/scripts/admin/api.ts`
- Create: `src/scripts/admin/login.ts`
- Create: `src/scripts/admin/dashboard.ts`
- Create: `src/scripts/admin/editor.ts`
- Create: `src/styles/admin.css`
- Create: `tests/admin-ui-contract.test.mjs`

**Interfaces:**
- Consumes HTTP contract from Task 5.
- Produces public static routes `/admin/login/`, `/admin/`, `/admin/new/`, `/admin/editor/`.
- `src/scripts/admin/api.ts` exports `apiFetch(path, options)` and always uses `credentials: 'include'`.
- Existing article edit URL is `/admin/editor/?slug=<encoded-slug>`.

- [ ] **Step 1: Add preview dependencies**

Run:

```bash
npm install marked dompurify
```

Expected: root `package.json` and `package-lock.json` change; no React/Vue framework is added.

- [ ] **Step 2: Write failing static admin contract tests**

Create `tests/admin-ui-contract.test.mjs` that reads source files and asserts:

```text
login page contains username/password form
admin index contains New Article action and article-list mount point
new/editor pages both render ArticleEditor
ArticleEditor contains title, slug, description, date, category, tags, cover, body fields
buttons exist for Save Draft, Submit Publish, Merge & Publish, Preview
API wrapper includes credentials: 'include'
no source file under src/pages/admin or src/scripts/admin contains GITHUB_TOKEN or ADMIN_PASSWORD_HASH
editor route uses URLSearchParams for slug instead of a dynamic Astro [...slug] route
```

- [ ] **Step 3: Run root tests and verify the new test fails**

Run:

```bash
node --test tests/admin-ui-contract.test.mjs
```

Expected: FAIL because admin files do not exist.

- [ ] **Step 4: Implement shared admin shell and authentication flow**

`src/config/admin.ts`:

```ts
export const EDITOR_API_BASE = import.meta.env.PUBLIC_EDITOR_API_BASE ?? 'https://editor-api.minglingyun.com'
```

`apiFetch` prefixes this base and throws a typed error for non-2xx JSON responses. Login submits username/password, then navigates to `/admin/`. Dashboard/editor pages call `GET /auth/session` during startup; on 401 they redirect to `/admin/login/` before requesting article data.

Static HTML may be publicly downloadable because GitHub Pages is static, but it must contain no article data or secrets; protected content is loaded only after authenticated API access.

- [ ] **Step 5: Implement dashboard and editor behavior**

Dashboard renders rows with status `Published`, `Draft`, or `Publish Pending` and links existing articles to `/admin/editor/?slug=...`.

Editor state rules:

```text
/admin/new/ -> blank article; slug generated from title but remains manually editable until first draft save
/admin/editor/?slug=x -> GET /posts/x, load draft first if API returns one
Save Draft -> POST /drafts for first new save; otherwise PUT /drafts/:slug
Published source (sourceSha != null) -> slug input disabled
Unpublished draft rename -> PUT /drafts/:oldSlug with new article.slug, then update current slug in client state
Submit Publish -> POST /publish/:slug
Publish Pending -> poll only when user is on page, at 10-second intervals, GET /publish/:slug/status
ready -> enable Merge & Publish
failed/pending -> merge button disabled
Merge & Publish -> POST /publish/:slug/merge, then show published confirmation + public article link
```

For preview:

```ts
const html = DOMPurify.sanitize(marked.parse(markdown) as string)
preview.innerHTML = html
```

Never insert unsanitized Markdown output into `innerHTML`.

- [ ] **Step 6: Implement restrained admin styling**

Use a clean writing-workbench layout that borrows existing typography/tokens but does not reuse homepage space animation. Desktop: metadata strip + editor/preview two-column area. Mobile: editor/preview tabs. Keep focus outlines, labels, readable contrast, and keyboard-accessible buttons.

- [ ] **Step 7: Run root tests/build and commit**

Run:

```bash
npm test
npm run build
```

Expected: PASS, with generated `dist/admin/index.html`, `dist/admin/login/index.html`, `dist/admin/new/index.html`, and `dist/admin/editor/index.html`.

Commit:

```bash
git add package.json package-lock.json src/config/admin.ts src/components/admin src/pages/admin src/scripts/admin src/styles/admin.css tests/admin-ui-contract.test.mjs
git commit -m "feat: add static article editor UI"
```

---

### Task 7: CI, Container, and Deployment Contract

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `editor-api/Dockerfile`
- Create: `editor-api/README.md`

**Interfaces:**
- Existing GitHub Pages deployment stays unchanged.
- PR CI verifies both the static site and Editor API.
- Production API container listens on port `8787` and persists `/app/data`.

- [ ] **Step 1: Extend PR CI without touching the Pages deploy workflow**

After the existing root install/test/build steps in `.github/workflows/ci.yml`, add:

```yaml
- name: Install editor API dependencies
  run: npm ci --prefix editor-api
- name: Test editor API
  run: npm test --prefix editor-api
```

Do not add Editor API startup/deployment to `.github/workflows/deploy.yml`; that workflow must continue deploying only `./dist` to GitHub Pages.

- [ ] **Step 2: Create a production Dockerfile**

`editor-api/Dockerfile` must use Node 22, install with `npm ci --omit=dev`, copy only the API package, create `/app/data`, expose 8787, and start `node src/server.mjs` as a non-root user.

Expected container contract:

```bash
docker build -t glenn-blog-editor-api ./editor-api
docker run --rm -p 8787:8787 --env-file ./editor-api/.env -v glenn-editor-data:/app/data glenn-blog-editor-api
```

- [ ] **Step 3: Write the deployment runbook**

`editor-api/README.md` must include these exact production concepts:

```text
DNS: editor-api.minglingyun.com -> existing server
Nginx HTTPS reverse proxy -> 127.0.0.1:8787
ADMIN_ORIGIN=https://blog.minglingyun.com
SQLITE_PATH=/app/data/editor.sqlite
GitHub fine-grained PAT restricted to KJDhole/BlogWebsite
PAT permissions: Contents read/write, Pull requests read/write, Checks/commit status read as required by CI status endpoint
never put PAT/password/session secret in GitHub Pages PUBLIC_* variables
persist /app/data volume
backup SQLite file before container replacement
```

Also give commands to generate secrets:

```bash
node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 12))" 'YOUR_PASSWORD'
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Do not include a real password in the repository.

- [ ] **Step 4: Run full verification**

Run:

```bash
npm ci
npm test
npm run build
npm ci --prefix editor-api
npm test --prefix editor-api
docker build -t glenn-blog-editor-api ./editor-api
```

Expected: every command exits 0.

- [ ] **Step 5: Commit integration/deployment files**

```bash
git add .github/workflows/ci.yml editor-api/Dockerfile editor-api/README.md
git commit -m "chore: verify and package editor API"
```

---

### Task 8: End-to-End Acceptance and PR

**Files:**
- Modify only if verification finds defects in files owned by Tasks 1-7.
- No new product scope.

**Interfaces:**
- Consumes the complete V1 system.
- Produces one reviewable PR from `feature/article-editor-admin` to `main`.

- [ ] **Step 1: Run repository identity and cleanliness checks**

Run:

```bash
git rev-parse --show-toplevel
git branch --show-current
git status --short
git remote -v
git log -1 --oneline
```

Expected: repository is `BlogWebsite`, branch is `feature/article-editor-admin`, no unexpected changes exist.

- [ ] **Step 2: Run all automated acceptance checks**

Run:

```bash
npm test
npm run build
npm test --prefix editor-api
```

Expected: PASS.

- [ ] **Step 3: Perform a local browser/API smoke test with a throwaway GitHub client fixture or test repository mode**

Verify this user flow without touching production `main`:

```text
login
new article
Markdown preview
save draft
reload page and draft survives
edit title/body/tags
submit publish using mocked/test GitHub boundary
observe pending -> ready
merge action calls guarded merge path
```

Also verify an existing post loads with immutable slug and preserves `visual`, `sourceUrl`, `sourceLabel`, or any extra frontmatter after save/serialize.

- [ ] **Step 4: Security smoke checks**

Search built/static output and source:

```bash
grep -R "GITHUB_TOKEN\|ADMIN_PASSWORD_HASH\|SESSION_SECRET" dist src || true
grep -R "Authorization: Bearer" dist src || true
```

Expected: no secret values or secret-bearing code paths exist in browser output. Literal environment-variable names may appear only in server-side docs/config, never as values in `dist`.

- [ ] **Step 5: Compare branch to main and create PR**

Run:

```bash
git diff --stat origin/main...HEAD
git diff --check origin/main...HEAD
```

Expected: only article-editor/admin/API/CI/docs changes, and `git diff --check` exits 0.

Create PR title:

```text
feat: add browser article editor and safe publishing flow
```

PR body must summarize:

```text
- static /admin editor with sanitized Markdown preview
- private SQLite drafts + single-user session auth
- conflict-safe GitHub branch/PR publishing
- CI-gated explicit merge
- public Astro/GitHub Pages architecture unchanged
- test/build commands and deployment notes
```

Do not merge the PR automatically. Final merge remains an explicit user/reviewer action.