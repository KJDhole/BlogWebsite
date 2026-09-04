# Blog V1 Content System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the approved Glenn homepage prototype into a real static personal blog whose article list and article routes are generated from Markdown content while preserving the existing visual and interaction contract.

**Architecture:** Astro becomes the static build layer. Local Markdown files in a typed `posts` content collection are the single source of truth; the homepage renders collection entries at build time and the browser script only filters already-rendered DOM rows. A static dynamic route generates `/writing/<slug>/` pages, while the existing native SVG/CSS/JavaScript motion model is migrated with minimal semantic changes.

**Tech Stack:** Astro static output, Astro Content Collections, Markdown, native JavaScript, native CSS/SVG, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-04-blog-v1-content-system-design.md`

## Global Constraints

- Preserve the approved homepage visual design and orbital scroll animation; this is not a redesign.
- V1 visible routes are `/` and `/writing/<slug>/` only.
- No CMS/admin UI, login, database, React, Vue, server API, comments, Projects page, About page, RSS, newsletter, pagination, tag archive, or new top navigation.
- Markdown files are the only article source of truth after migration.
- The browser must not contain a second hardcoded `articles` catalog.
- Keep search, category filtering, `Ctrl/Cmd + K`, theme switching, mobile behavior, and `prefers-reduced-motion`.
- Use production-static output; a successful `npm run build` is mandatory acceptance evidence.
- Do not invent substantive body text for the five seed articles; use the existing summary as the initial Markdown body where no full article exists.

---

## File Structure

### Create

- `astro.config.mjs` — Astro static-site configuration.
- `src/content.config.ts` — typed `posts` collection schema and local glob loader.
- `src/content/posts/*.md` — five migrated seed articles.
- `src/lib/readingTime.mjs` — deterministic CJK/Latin reading-time calculation.
- `src/layouts/BaseLayout.astro` — shared document head, theme bootstrap, top-level shell primitives.
- `src/layouts/ArticleLayout.astro` — restrained article reading layout.
- `src/components/ArticleRow.astro` — homepage article row sourced from collection metadata.
- `src/pages/index.astro` — collection-driven homepage.
- `src/pages/writing/[...slug].astro` — static generated article routes.
- `src/scripts/home.js` — homepage DOM interactions without article registry.
- `src/scripts/orbitMotion.mjs` — migrated pure animation math.
- `src/scripts/filterArticles.mjs` — DOM-metadata filtering helper.
- `src/styles/global.css` — migrated homepage styles plus article typography.
- `tests/reading-time.test.mjs` — reading-time unit tests.
- `tests/content-contract.test.mjs` — content-source/route contract tests.
- `tests/filterArticles.test.mjs` — migrated filtering tests.
- `tests/orbit-motion.test.mjs` — migrated animation tests.
- `tests/ui-contract.test.mjs` — Astro source/build contract tests.

### Modify

- `package.json` — add Astro dependency and replace prototype scripts with Astro build/dev plus Node tests.
- `README.md` — document Markdown publishing workflow and real route structure.

### Remove after parity verification

- `prototype/`
- `dist/index.html`
- `glenn-blog-demo.html`

The removals happen only after the Astro version passes behavior tests and production build verification.

---

### Task 1: Astro foundation, typed content, and reading time

**Files:**
- Modify: `package.json`
- Create: `astro.config.mjs`
- Create: `src/content.config.ts`
- Create: `src/content/posts/commerce-agent-rules.md`
- Create: `src/content/posts/ai-native-development.md`
- Create: `src/content/posts/agent-memory-notes.md`
- Create: `src/content/posts/claude-code-workflow.md`
- Create: `src/content/posts/building-in-public.md`
- Create: `src/lib/readingTime.mjs`
- Create: `tests/reading-time.test.mjs`
- Create: `tests/content-contract.test.mjs`

**Interfaces:**
- Consumes: existing seed article metadata from `prototype/index.html` and `prototype/app.js`.
- Produces: `posts` collection entries with `{ title, description, date, category, tags, visual?, draft? }`; `estimateReadingTime(text) -> integer minutes`.

- [ ] **Step 1: Write the failing reading-time unit test**

```js
// tests/reading-time.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { estimateReadingTime } from '../src/lib/readingTime.mjs'

test('reading time has a one-minute floor', () => {
  assert.equal(estimateReadingTime('short note'), 1)
})

test('reading time counts mixed CJK and Latin units deterministically', () => {
  const chinese = '中'.repeat(300)
  const latin = Array.from({ length: 300 }, () => 'word').join(' ')
  assert.equal(estimateReadingTime(chinese), 1)
  assert.equal(estimateReadingTime(latin), 1)
  assert.equal(estimateReadingTime(`${chinese}${latin}`), 2)
})
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```bash
node --test tests/reading-time.test.mjs
```

Expected: FAIL because `src/lib/readingTime.mjs` does not exist.

- [ ] **Step 3: Implement the minimal reading-time utility**

```js
// src/lib/readingTime.mjs
export function estimateReadingTime(text) {
  const source = String(text ?? '')
  const cjkUnits = (source.match(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g) ?? []).length
  const latinText = source.replace(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g, ' ')
  const latinUnits = (latinText.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) ?? []).length
  return Math.max(1, Math.ceil((cjkUnits + latinUnits) / 300))
}
```

- [ ] **Step 4: Re-run reading-time tests and verify GREEN**

Run:

```bash
node --test tests/reading-time.test.mjs
```

Expected: PASS, 3 tests, 0 failures.

- [ ] **Step 5: Add Astro dependency and scripts**

Replace `package.json` with the Astro static-site scripts while keeping the project ESM:

```json
{
  "name": "glenn-blog",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "node --test tests/*.test.mjs"
  },
  "dependencies": {
    "astro": "latest"
  }
}
```

Create:

```js
// astro.config.mjs
import { defineConfig } from 'astro/config'

export default defineConfig({
  output: 'static'
})
```

- [ ] **Step 6: Define the typed local content collection**

Create `src/content.config.ts` using Astro's current local loader API:

```ts
import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    date: z.coerce.date(),
    category: z.enum(['AI', 'Agent', 'Development', 'Product', 'Thinking']),
    tags: z.array(z.string().min(1)),
    visual: z.string().optional(),
    draft: z.boolean().default(false)
  })
})

export const collections = { posts }
```

- [ ] **Step 7: Migrate the five seed article metadata into Markdown files**

Use the exact existing metadata. Example first file:

```md
---
title: "Commerce Agent 的 24 条设计法则"
description: "从 Anthropic 的 Commerce Agent 架构出发，重新理解 Agent 应该负责什么，不应该负责什么。"
date: 2026-09-03
category: Agent
tags:
  - AI
  - Agent
  - Architecture
visual: pearl
---

从 Anthropic 的 Commerce Agent 架构出发，重新理解 Agent 应该负责什么，不应该负责什么。
```

Create the other four with the exact existing title/date/description/category/tags/visual values from the prototype and use each description as the initial body paragraph.

- [ ] **Step 8: Add a content contract test**

```js
// tests/content-contract.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'

const postsDir = new URL('../src/content/posts/', import.meta.url)

test('five seed posts are stored as Markdown content', async () => {
  const names = (await readdir(postsDir)).filter(name => name.endsWith('.md')).sort()
  assert.deepEqual(names, [
    'agent-memory-notes.md',
    'ai-native-development.md',
    'building-in-public.md',
    'claude-code-workflow.md',
    'commerce-agent-rules.md'
  ])
})

test('seed post files contain frontmatter instead of an external registry', async () => {
  const source = await readFile(new URL('../src/content/posts/commerce-agent-rules.md', import.meta.url), 'utf8')
  assert.match(source, /^---\n/)
  assert.match(source, /title: "Commerce Agent 的 24 条设计法则"/)
  assert.match(source, /category: Agent/)
})
```

- [ ] **Step 9: Install and run focused tests**

Run:

```bash
npm install
npm test -- --test-name-pattern="reading time|seed posts"
```

Expected: focused tests pass.

- [ ] **Step 10: Commit Task 1**

```bash
git add package.json package-lock.json astro.config.mjs src/content.config.ts src/content/posts src/lib/readingTime.mjs tests/reading-time.test.mjs tests/content-contract.test.mjs
git commit -m "feat: add Astro content foundation"
```

---

### Task 2: Port the approved homepage and remove the JavaScript article registry

**Files:**
- Create: `src/components/ArticleRow.astro`
- Create: `src/pages/index.astro`
- Create: `src/scripts/home.js`
- Create: `src/scripts/orbitMotion.mjs`
- Create: `src/scripts/filterArticles.mjs`
- Create: `src/styles/global.css`
- Create: `tests/filterArticles.test.mjs`
- Create: `tests/orbit-motion.test.mjs`
- Create: `tests/ui-contract.test.mjs`

**Interfaces:**
- Consumes: `posts` collection entries from Task 1; `estimateReadingTime()`; existing homepage markup/styles/motion implementation from `prototype/`.
- Produces: homepage rows whose searchable metadata is encoded as `data-title`, `data-description`, `data-category`, `data-tags`; `filterArticleRows(rows, { query, category })` returns matching row elements.

- [ ] **Step 1: Write a failing filter helper test against row-shaped metadata**

```js
// tests/filterArticles.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { filterArticleMetadata } from '../src/scripts/filterArticles.mjs'

const items = [
  { title: 'Agent Memory', description: 'long term memory', category: 'Agent', tags: ['AI', 'Memory'] },
  { title: 'AI Native 开发', description: 'delivery', category: 'Development', tags: ['AI', 'Tools'] }
]

test('filters by category and text without a second article registry', () => {
  assert.deepEqual(
    filterArticleMetadata(items, { query: 'memory', category: 'Agent' }).map(item => item.title),
    ['Agent Memory']
  )
  assert.deepEqual(
    filterArticleMetadata(items, { query: 'tools', category: 'All' }).map(item => item.title),
    ['AI Native 开发']
  )
})
```

- [ ] **Step 2: Run filter test and verify RED**

Run:

```bash
node --test tests/filterArticles.test.mjs
```

Expected: FAIL because `src/scripts/filterArticles.mjs` does not exist.

- [ ] **Step 3: Implement metadata filtering**

```js
// src/scripts/filterArticles.mjs
export function filterArticleMetadata(items, { query = '', category = 'All' } = {}) {
  const needle = query.trim().toLocaleLowerCase()
  return items.filter(item => {
    const categoryMatch = category === 'All' || item.category === category
    const haystack = [item.title, item.description, ...(item.tags ?? [])]
      .join(' ')
      .toLocaleLowerCase()
    return categoryMatch && (!needle || haystack.includes(needle))
  })
}
```

- [ ] **Step 4: Re-run filter test and verify GREEN**

Run:

```bash
node --test tests/filterArticles.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Move pure orbit math and its tests with import-path-only changes**

Copy `prototype/orbitMotion.mjs` to `src/scripts/orbitMotion.mjs` without changing constants or formulas. Copy `prototype/tests/orbit-motion.test.mjs` to `tests/orbit-motion.test.mjs` and update only its import path from the prototype file to `../src/scripts/orbitMotion.mjs`.

Run:

```bash
node --test tests/orbit-motion.test.mjs
```

Expected: same passing assertions as the current prototype suite.

- [ ] **Step 6: Create collection-driven `ArticleRow.astro`**

The component receives the collection entry and precomputed reading time. It must render the existing DOM/class contract and real route:

```astro
---
const { post, readTime } = Astro.props
const { title, description, date, category, tags, visual = 'paper' } = post.data
const href = `/writing/${post.id}/`
const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()
---
<article
  class="article-row reveal-item is-visible"
  data-title={title}
  data-description={description}
  data-category={category}
  data-tags={tags.join('|')}
>
  <div class="article-date">{dateLabel}</div>
  <div class="article-main">
    <a class="article-title" href={href}>{title}</a>
    <p class="article-summary">{description}</p>
    <div class="article-meta">
      <span class="read-time">{readTime} min read</span>
      <span class="meta-separator">·</span>
      <div class="tag-list">{tags.map(tag => <span class="tag">{tag}</span>)}</div>
    </div>
  </div>
  <div class={`article-visual visual-${visual}`} aria-hidden="true"><span></span></div>
</article>
```

- [ ] **Step 7: Port `prototype/index.html` into `src/pages/index.astro` without redesigning it**

Use `getCollection('posts', ({ data }) => import.meta.env.PROD ? data.draft !== true : true)` and explicit date-descending sorting. Render rows with `ArticleRow`.

The frontmatter must include:

```astro
---
import { getCollection } from 'astro:content'
import ArticleRow from '../components/ArticleRow.astro'
import { estimateReadingTime } from '../lib/readingTime.mjs'

const posts = (await getCollection('posts', ({ data }) => import.meta.env.PROD ? data.draft !== true : true))
  .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
---
```

Do not create a hardcoded `articles` array anywhere in the page.

- [ ] **Step 8: Port `prototype/styles.css` to `src/styles/global.css`**

Preserve existing selectors and responsive animation rules. Only add styles required by Astro page wrapping; do not restyle the homepage.

- [ ] **Step 9: Port `prototype/app.js` into `src/scripts/home.js` and replace registry-based rendering with DOM-row filtering**

Delete the entire `const articles = [...]` block and the template-based row creation path. Build metadata from existing article rows:

```js
const rows = [...document.querySelectorAll('.article-row')]

function rowMetadata(row) {
  return {
    row,
    title: row.dataset.title ?? '',
    description: row.dataset.description ?? '',
    category: row.dataset.category ?? '',
    tags: (row.dataset.tags ?? '').split('|').filter(Boolean)
  }
}
```

Use `filterArticleMetadata(rows.map(rowMetadata), state)` and toggle each element's visibility while retaining the existing filter-indicator animation, empty state, keyboard shortcut, theme logic, and orbital scroll narrative.

- [ ] **Step 10: Write/port the homepage UI contract test**

`tests/ui-contract.test.mjs` must assert source-level invariants:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const page = await readFile(new URL('../src/pages/index.astro', import.meta.url), 'utf8')
const script = await readFile(new URL('../src/scripts/home.js', import.meta.url), 'utf8')
const styles = await readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8')

test('homepage keeps the approved hero and orbit controls', () => {
  assert.match(page, /class="hero/)
  assert.match(page, /orbit-svg/)
  assert.match(page, /id="article-search"/)
  assert.match(page, /data-category="All"/)
})

test('homepage has no JavaScript article catalog', () => {
  assert.doesNotMatch(script, /const\s+articles\s*=\s*\[/)
  assert.match(script, /document\.querySelectorAll\('\.article-row'\)/)
})

test('responsive and reduced-motion contracts remain', () => {
  assert.match(styles, /prefers-reduced-motion/)
  assert.match(styles, /max-width:\s*760px/)
})
```

- [ ] **Step 11: Run Task 2 test suite**

Run:

```bash
npm test
```

Expected: reading-time, content-contract, filtering, orbit-motion, and UI-contract tests pass.

- [ ] **Step 12: Commit Task 2**

```bash
git add src/components src/pages/index.astro src/scripts src/styles tests

git commit -m "feat: render homepage from Markdown posts"
```

---

### Task 3: Real article routes, shared layout, and theme parity

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/layouts/ArticleLayout.astro`
- Create: `src/pages/writing/[...slug].astro`
- Modify: `src/pages/index.astro`
- Modify: `src/styles/global.css`
- Modify: `tests/ui-contract.test.mjs`
- Modify: `tests/content-contract.test.mjs`

**Interfaces:**
- Consumes: `posts` content collection and `estimateReadingTime()`.
- Produces: a static route for every non-draft entry; shared theme key `glenn-theme`; readable Markdown body via Astro `render(post)`.

- [ ] **Step 1: Add failing article-route contract assertions**

Append to `tests/content-contract.test.mjs`:

```js
import { readFile as readText } from 'node:fs/promises'

test('article route is generated from the posts collection', async () => {
  const route = await readText(new URL('../src/pages/writing/[...slug].astro', import.meta.url), 'utf8')
  assert.match(route, /getStaticPaths/)
  assert.match(route, /getCollection\('posts'/)
  assert.match(route, /render\(post\)/)
})
```

- [ ] **Step 2: Run the route contract and verify RED**

Run:

```bash
node --test tests/content-contract.test.mjs
```

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Create `BaseLayout.astro` with shared metadata and early theme bootstrap**

Use a single local-storage key on every page:

```astro
---
import '../styles/global.css'
const {
  title = 'GLENN — Personal Blog',
  description = "Glenn's personal writing on AI, Agents, software and ideas.",
  canonical,
  ogTitle = title,
  ogDescription = description
} = Astro.props
---
<!doctype html>
<html lang="zh-CN" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content={description} />
    <title>{title}</title>
    {canonical && <link rel="canonical" href={canonical} />}
    <meta property="og:title" content={ogTitle} />
    <meta property="og:description" content={ogDescription} />
    <script is:inline>
      (() => {
        try {
          const saved = localStorage.getItem('glenn-theme')
          if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved
        } catch {}
      })()
    </script>
  </head>
  <body><slot /></body>
</html>
```

- [ ] **Step 4: Wrap the homepage in `BaseLayout` and keep its existing theme toggle**

Move only document/head responsibility into `BaseLayout`; keep the visible homepage markup unchanged. Ensure `home.js` writes `glenn-theme` when toggling.

- [ ] **Step 5: Create the restrained `ArticleLayout.astro`**

Render:

```text
GLENN                                      theme toggle

CATEGORY
Title
Description
DATE · N min read
Tags

Markdown body

← Back to home
```

Use the same brand, color tokens, theme button classes, and responsive spacing. Do not add sidebar/TOC/share/comments/related posts.

- [ ] **Step 6: Implement static `/writing/<slug>/` generation**

```astro
---
import { getCollection, render } from 'astro:content'
import ArticleLayout from '../../layouts/ArticleLayout.astro'
import { estimateReadingTime } from '../../lib/readingTime.mjs'

export async function getStaticPaths() {
  const posts = await getCollection('posts', ({ data }) => import.meta.env.PROD ? data.draft !== true : true)
  return posts.map(post => ({
    params: { slug: post.id },
    props: { post }
  }))
}

const { post } = Astro.props
const { Content } = await render(post)
const readTime = estimateReadingTime(post.body ?? '')
---
<ArticleLayout post={post} readTime={readTime}>
  <Content />
</ArticleLayout>
```

- [ ] **Step 7: Add article typography to `global.css`**

Create a narrow readable content column and explicit styles for headings, paragraphs, lists, links, blockquotes, inline code, fenced code, images, and horizontal rules. Maintain horizontal scrolling for code blocks on mobile rather than shrinking code.

- [ ] **Step 8: Extend UI contract tests for article simplicity and shared theme**

Assert:

```js
assert.match(articleLayout, /Back to home/)
assert.doesNotMatch(articleLayout, /table of contents|related posts|comments/i)
assert.match(baseLayout, /glenn-theme/)
```

- [ ] **Step 9: Run all tests**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 10: Run production build and verify generated routes**

Run:

```bash
npm run build
```

Expected: exit 0 and generated files include:

```text
dist/index.html
dist/writing/commerce-agent-rules/index.html
dist/writing/ai-native-development/index.html
dist/writing/agent-memory-notes/index.html
dist/writing/claude-code-workflow/index.html
dist/writing/building-in-public/index.html
```

- [ ] **Step 11: Commit Task 3**

```bash
git add src/layouts src/pages src/styles tests

git commit -m "feat: add real Markdown article pages"
```

---

### Task 4: Sixth-post proof, cleanup, documentation, and final verification

**Files:**
- Modify temporarily then restore: `src/content/posts/verification-sixth-post.md`
- Remove: `prototype/`
- Remove: `glenn-blog-demo.html`
- Do not commit generated `dist/` if `.gitignore` excludes it; remove previously tracked standalone build artifact from version control.
- Modify: `.gitignore`
- Modify: `README.md`

**Interfaces:**
- Consumes: complete Astro site from Tasks 1–3.
- Produces: one maintainable source tree with Markdown publishing instructions and no parallel prototype implementation.

- [ ] **Step 1: Prove a sixth Markdown file requires no registry edits**

Create temporary `src/content/posts/verification-sixth-post.md`:

```md
---
title: "Verification Sixth Post"
description: "Temporary acceptance fixture proving Markdown-only publishing."
date: 2026-09-04
category: Thinking
tags:
  - Verification
visual: paper
draft: false
---

Temporary acceptance fixture proving Markdown-only publishing.
```

Run:

```bash
npm run build
```

Verify:

```bash
test -f dist/writing/verification-sixth-post/index.html
grep -q "Verification Sixth Post" dist/index.html
```

Expected: both commands exit 0 without modifying `src/pages/index.astro` or `src/scripts/home.js`.

- [ ] **Step 2: Remove the temporary sixth post and rebuild**

Run:

```bash
rm src/content/posts/verification-sixth-post.md
npm run build
```

Expected: build succeeds and the temporary route is absent after clean rebuild.

- [ ] **Step 3: Remove the old duplicate implementation only after parity evidence exists**

Delete:

```text
prototype/
glenn-blog-demo.html
```

Ensure `.gitignore` contains at least:

```gitignore
node_modules/
dist/
.astro/
```

If `dist/index.html` is currently tracked from the prototype era, remove it from Git tracking as part of the migration; production `dist/` becomes build output only.

- [ ] **Step 4: Update README to the real authoring workflow**

Document exactly:

```text
npm install
npm run dev
npm test
npm run build
```

Document publishing:

```text
1. Create src/content/posts/<slug>.md
2. Add required frontmatter
3. Write Markdown body
4. Run npm test && npm run build
5. Commit and push
```

State explicitly that there is no CMS/admin UI/database in V1 and that article URLs are `/writing/<filename-without-extension>/`.

- [ ] **Step 5: Run fresh final verification**

Run all of these from a clean dependency install:

```bash
rm -rf node_modules dist .astro
npm install
npm test
npm run build
```

Acceptance checks:

```bash
test -f dist/index.html
test -f dist/writing/commerce-agent-rules/index.html
test -f dist/writing/ai-native-development/index.html
test -f dist/writing/agent-memory-notes/index.html
test -f dist/writing/claude-code-workflow/index.html
test -f dist/writing/building-in-public/index.html
! grep -R "const articles = \[" src
```

Expected: every command exits 0.

- [ ] **Step 6: Manually inspect desktop and mobile critical behaviors**

Using the built site or local dev server, verify:

- homepage retains approved Hero composition and article-row visual hierarchy;
- scrolling still performs orbital release → tangent flight → landing on the real `All` indicator;
- search and category filtering hide/show collection-generated rows correctly;
- `Ctrl/Cmd + K` focuses search;
- light/dark toggle persists when navigating home ↔ article;
- article page is readable on desktop and mobile;
- fenced code blocks horizontally scroll on narrow screens;
- reduced-motion mode avoids the animated scroll narrative.

Record any regression as a failing contract/test before fixing it.

- [ ] **Step 7: Commit cleanup and docs**

```bash
git add -A

git commit -m "chore: finish blog v1 migration"
```

---

## Plan Self-Review

- Spec coverage: every V1 requirement is assigned to Tasks 1–4; deferred features are absent.
- Placeholder scan: no implementation step contains TBD/TODO or an unspecified "handle appropriately" instruction.
- Interface consistency: `posts`, `post.id`, `estimateReadingTime()`, `filterArticleMetadata()`, `glenn-theme`, and `/writing/<slug>/` are used consistently across tasks.
- Source-of-truth check: the final tree contains Markdown entries only; no JS article registry or parallel prototype remains.
- YAGNI check: no CMS, DB, React/Vue, search backend, RSS, tag pages, Projects/About UI, comments, or social-image pipeline is introduced.
