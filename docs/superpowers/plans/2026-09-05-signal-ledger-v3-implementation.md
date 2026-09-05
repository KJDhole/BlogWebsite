# Signal Ledger V3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Glenn's Astro blog as the Signal Ledger personal knowledge instrument, replacing the Research Folio/Orbit visual system with an asymmetric editorial ledger, Signal Rail orientation language, command search, a new long-form reading system, chronology archive, and topic index while preserving content, SEO, RSS, accessibility, theme persistence, and previous/next article behavior.

**Architecture:** Keep Astro as the rendering layer and split the redesign into focused presentation components, pure indexing helpers, two CSS layers (`signal-ledger.css` and `reading.css`) plus a minimal global foundation, and small native-JS enhancement modules. Remove the complete Three.js/Orbit runtime once the new homepage is live; no replacement animation library is introduced. Browser QA runs against the production Astro build and a temporary real-content stress fixture generated only inside QA.

**Tech Stack:** Astro 7.3.1, Astro content collections, CSS, native JavaScript, Node `node:test`, Playwright/Chromium only in QA workflows, existing `@astrojs/rss` and `@astrojs/sitemap`.

**Spec:** `docs/superpowers/specs/2026-09-05-signal-ledger-v3-design.md`

## Global Constraints

- Preserve article data, SEO, RSS, Tags, Archive, Search, previous/next article logic, responsive behavior, accessibility, and the Astro architecture.
- Remove the previous Research Folio visual system, Orbit, orange orb, black-hole animation, existing visual composition, and orange-first accent language.
- Sole primary visual signature: **Signal Rail**; it must encode real state/information and never become decorative random ticks.
- Light palette: warm paper, near-black warm ink, graphite metadata, low-contrast rules, sparing deep signal red/vermilion accent.
- Dark palette: charcoal/ink background, warm light-gray text, subdued rules, restrained brighter signal red; never pure inversion, neon, gradients, or glow.
- Typography roles are limited to Display, Body, and Mono; Chinese long-form reading is first priority.
- Desktop article body target: approximately 680–720px; wide media approximately 900–980px; full media up to approximately 1080–1120px where justified.
- Mobile is separately designed at 375×812, 390×844, and 430×932; persistent side rails disappear and signal language becomes horizontal registration marks.
- Default radius is `0`; no card system, generic shadow system, pill clouds, SaaS navbar, dashboard composition, or decorative elevation.
- Motion exists only for orientation/feedback: Signal Rail locator, search open/close, subtle state transitions, reading progress; respect `prefers-reduced-motion`.
- No UI framework and no heavy replacement dependency for Three.js.
- Use the saved article `如何榨出 AI 设计的 99% 创造力：一套三阶段工作流` as the real-content long-form stress fixture without rewriting its prose.
- Complete at least three screenshot-only Fresh Context Critic rounds before Deliver reduction.
- Do not merge to `main` until final browser QA, unit tests, build, accessibility checks, performance checks, Critic loop, and Deliver reduction all pass.

---

# File Structure

## Create

- `src/components/LedgerEntry.astro` — reusable homepage/tag-detail article ledger entry.
- `src/components/SearchOverlay.astro` — native `<dialog>` command search surface; loads real post metadata itself.
- `src/components/SignalFooter.astro` — restrained footer containing Archive/Tags/RSS/X/GitHub without duplicating the header.
- `src/lib/postIndex.mjs` — pure functions for search matching, archive grouping, and topic summaries.
- `src/scripts/siteShell.js` — theme toggle, command-search keyboard/open/close behavior, mobile navigation disclosure safety.
- `src/styles/signal-ledger.css` — site shell, header, homepage, ledger, search, archive, topics, footer, light/dark and responsive design.
- `src/styles/reading.css` — article header/grid, body typography, H2/H3 events, media, prompt, code, quote, table, TOC, previous/next, article mobile behavior.
- `tests/signal-ledger-contract.test.mjs` — structural design-contract tests for the new system and explicit absence of the old Orbit system.
- `tests/post-index.test.mjs` — pure unit tests for search/archive/topic indexing.
- `tests/signal-reading.test.mjs` — article system contract tests.
- `tests/fixtures/ai-design-99-workflow.md` — verbatim saved stress article source used only by QA.
- `scripts/prepare-signal-stress-fixture.mjs` — creates a temporary Astro content post from the verbatim fixture for QA; only prepends test frontmatter and translates archival `[image](url)` markers to Markdown image syntax in the generated temporary copy.
- `scripts/signal-ledger-qa.mjs` — Playwright browser matrix and screenshot collector.
- `.github/workflows/signal-ledger-qa.yml` — production-build browser QA workflow.
- `docs/design-critic/round-1.md`, `round-2.md`, `round-3.md` — screenshot-only critic outputs and the exact accepted change list for each round.
- `docs/design-critic/final-reduction.md` — Deliver subtraction audit.

## Modify

- `src/layouts/BaseLayout.astro` — import new CSS foundation, keep SEO/theme bootstrapping, load site shell.
- `src/components/SiteHeader.astro` — rebuild as publication header and include command search.
- `src/pages/index.astro` — remove traditional hero/filter controls/Orbit and render the Signal Ledger opening + writing index.
- `src/layouts/ArticleLayout.astro` — rebuild article header, meta rail, reading grid, TOC/context rail, and editorial previous/next.
- `src/scripts/articleEnhance.js` — retain copy/TOC/progress capabilities but orient them to new section states and prompt/code anatomy.
- `src/pages/archive.astro` — chronological year/month ledger.
- `src/pages/tags/index.astro` — topic index with real counts/latest activity.
- `src/pages/tags/[tag].astro` — topic detail ledger using the same article hierarchy without pills/cards.
- `src/styles/global.css` — reduce to reset/base/focus utilities and shared tokens that cannot live in the two page-specific stylesheets.
- `package.json` — remove `three` once all old scene imports are gone.
- `tests/ui-contract.test.mjs` — replace Orbit-specific homepage assertions with preserved product-utility assertions.
- `tests/editorial-v2.test.mjs` — retire Research Folio-specific assertions in favor of Signal Ledger contracts, or delete after equivalent coverage exists.
- `tests/deliver-qa.test.mjs` — point QA contract at Signal Ledger workflow/script and full viewport matrix.
- `.github/workflows/deliver-qa.yml` — remove or replace once `signal-ledger-qa.yml` is proven; only one final visual QA workflow should remain after Deliver.

## Delete after migration is green

- `src/components/SpaceScene.astro`
- `src/scripts/blackHolePortal.mjs`
- `src/scripts/home.js`
- `src/scripts/navPortal.mjs`
- `src/scripts/orbitMotion.mjs`
- `src/scripts/scrollStory.mjs`
- `src/scripts/solarSystem3d.mjs`
- `src/scripts/spaceScene.mjs`
- `src/scripts/starField.mjs`
- `src/scripts/filterArticles.mjs`
- `src/styles/space.css`
- `src/styles/blog.css`
- `src/styles/editorial.css`
- `tests/orbit-motion.test.mjs`
- `tests/scroll-story.test.mjs`
- `tests/space-scene-contract.test.mjs`

The deletions occur only in Task 3 after the replacement homepage, header, search, theme, and ledger behavior are test-covered.

---

### Task 1: Pure Post Indexing Primitives

**Files:**
- Create: `src/lib/postIndex.mjs`
- Create: `tests/post-index.test.mjs`

**Interfaces:**
- Consumes: plain post-like objects with `{ id, title, description, date, category, tags }`.
- Produces:
  - `normalizeSearchItem(item) -> { id, title, description, date, category, tags, searchable }`
  - `filterSearchItems(items, query) -> item[]`
  - `groupPostsByYearMonth(posts) -> Array<{ year: number, months: Array<{ month: number, label: string, posts: post[] }> }>`
  - `summarizeTopics(posts) -> Array<{ name: string, count: number, latestDate: Date | string, posts: post[] }>`

- [ ] **Step 1: Write failing search/index tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  filterSearchItems,
  groupPostsByYearMonth,
  summarizeTopics
} from '../src/lib/postIndex.mjs'

const posts = [
  {
    id: 'commerce-agent-rules',
    title: 'Commerce Agent 的 24 条设计法则',
    description: '从 Agent 架构出发讨论产品设计。',
    date: new Date('2026-09-03T00:00:00Z'),
    category: 'Agent',
    tags: ['AI', 'Architecture']
  },
  {
    id: 'systems-note',
    title: 'Systems Note',
    description: 'A small development note.',
    date: new Date('2025-12-01T00:00:00Z'),
    category: 'Development',
    tags: ['Systems']
  }
]

test('search matches title description category and tags case-insensitively', () => {
  assert.equal(filterSearchItems(posts, 'architecture').length, 1)
  assert.equal(filterSearchItems(posts, 'AGENT').length, 1)
  assert.equal(filterSearchItems(posts, 'development').length, 1)
})

test('archive grouping is descending by year then month', () => {
  const groups = groupPostsByYearMonth(posts)
  assert.deepEqual(groups.map(group => group.year), [2026, 2025])
  assert.equal(groups[0].months[0].month, 9)
})

test('topic summaries use only real tags and expose counts', () => {
  const topics = summarizeTopics(posts)
  assert.deepEqual(topics.map(topic => topic.name).sort(), ['AI', 'Architecture', 'Systems'])
  assert.equal(topics.find(topic => topic.name === 'AI').count, 1)
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test tests/post-index.test.mjs
```

Expected: FAIL because `src/lib/postIndex.mjs` does not exist.

- [ ] **Step 3: Implement the pure helpers**

```js
const text = value => String(value ?? '').trim()

export function normalizeSearchItem(item) {
  const tags = Array.isArray(item.tags) ? item.tags.map(text).filter(Boolean) : []
  return {
    ...item,
    tags,
    searchable: [item.title, item.description, item.category, ...tags]
      .map(text)
      .join(' ')
      .toLocaleLowerCase()
  }
}

export function filterSearchItems(items, query) {
  const needle = text(query).toLocaleLowerCase()
  const normalized = items.map(normalizeSearchItem)
  if (!needle) return normalized
  return normalized.filter(item => item.searchable.includes(needle))
}

export function groupPostsByYearMonth(posts) {
  const buckets = new Map()
  for (const post of [...posts].sort((a, b) => new Date(b.date) - new Date(a.date))) {
    const date = new Date(post.date)
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth() + 1
    if (!buckets.has(year)) buckets.set(year, new Map())
    const yearBucket = buckets.get(year)
    if (!yearBucket.has(month)) yearBucket.set(month, [])
    yearBucket.get(month).push(post)
  }
  return [...buckets.entries()].map(([year, months]) => ({
    year,
    months: [...months.entries()].map(([month, monthPosts]) => ({
      month,
      label: String(month).padStart(2, '0'),
      posts: monthPosts
    }))
  }))
}

export function summarizeTopics(posts) {
  const topics = new Map()
  for (const post of posts) {
    for (const tag of Array.isArray(post.tags) ? post.tags : []) {
      const name = text(tag)
      if (!name) continue
      if (!topics.has(name)) topics.set(name, [])
      topics.get(name).push(post)
    }
  }
  return [...topics.entries()]
    .map(([name, topicPosts]) => ({
      name,
      count: topicPosts.length,
      posts: [...topicPosts].sort((a, b) => new Date(b.date) - new Date(a.date)),
      latestDate: [...topicPosts].sort((a, b) => new Date(b.date) - new Date(a.date))[0].date
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}
```

- [ ] **Step 4: Run focused and full tests**

```bash
node --test tests/post-index.test.mjs
npm test
```

Expected: focused test PASS; existing suite remains PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/postIndex.mjs tests/post-index.test.mjs
git commit -m "feat: add Signal Ledger post indexing primitives"
```

---

### Task 2: Shared Signal Ledger Foundation, Header, Theme, and Command Search

**Files:**
- Create: `src/components/SearchOverlay.astro`
- Create: `src/components/SignalFooter.astro`
- Create: `src/scripts/siteShell.js`
- Create: `src/styles/signal-ledger.css`
- Create: `tests/signal-ledger-contract.test.mjs`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/components/SiteHeader.astro`
- Modify: `src/styles/global.css`

**Interfaces:**
- `SiteHeader.astro` props: `{ active?: 'home' | 'archive' | 'tags' | 'article' }`.
- `SearchOverlay.astro` owns its own `getCollection('posts')` query and emits `[data-search-dialog]`, `[data-search-input]`, `[data-search-results]`, and a JSON `<script data-search-index type="application/json">`.
- `siteShell.js` initializes all present `[data-theme-toggle]`, `[data-search-open]`, and `[data-search-dialog]` nodes without requiring page-specific setup.
- Search uses `filterSearchItems()` from Task 1.
- Theme persistence key remains exactly `glenn-blog-theme`.

- [ ] **Step 1: Write structural contract tests**

Add assertions that:

```js
assert.match(headerSource, /GLENN/)
assert.match(headerSource, /data-search-open/)
assert.match(searchOverlaySource, /<dialog/)
assert.match(searchOverlaySource, /data-search-index/)
assert.match(siteShellSource, /glenn-blog-theme/)
assert.match(siteShellSource, /metaKey|ctrlKey/)
assert.match(signalCss, /--signal-accent:/)
assert.doesNotMatch(signalCss, /linear-gradient|radial-gradient|box-shadow:\s*0\s+0\s+\d+px/i)
```

Also assert the global focus treatment remains visible and `prefers-reduced-motion` exists.

- [ ] **Step 2: Run RED**

```bash
node --test tests/signal-ledger-contract.test.mjs
```

Expected: FAIL because the new files/markers do not exist.

- [ ] **Step 3: Build the design tokens and base layout**

Define tokens in `signal-ledger.css` using this starting set, then tune by screenshots later:

```css
:root {
  --paper: #f2efe8;
  --ink: #171512;
  --muted: #706c65;
  --rule: #cbc5ba;
  --signal-accent: #a8322d;
  --font-display: ui-serif, "Songti SC", "STSong", "Noto Serif CJK SC", Georgia, serif;
  --font-body: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --font-mono: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  --s1: 4px;
  --s2: 8px;
  --s3: 12px;
  --s4: 20px;
  --s5: 32px;
  --s6: 48px;
  --s7: 72px;
  --s8: 112px;
}

:root[data-theme='dark'] {
  --paper: #171715;
  --ink: #ece8df;
  --muted: #9a968f;
  --rule: #383633;
  --signal-accent: #d45a51;
}
```

`global.css` keeps only reset/body/focus/selection/base-link primitives; page composition moves out.

`BaseLayout.astro` imports only:

```astro
import '../styles/global.css'
import '../styles/signal-ledger.css'
import '../styles/reading.css'
```

`reading.css` may be created as an empty stylesheet in this task only if it contains a comment and is immediately populated in Task 4; alternatively defer the import until Task 4. Do not leave a broken import.

- [ ] **Step 4: Implement publication header and native command search**

Use a semantic header shape:

```astro
<header class:list={['signal-header', className]}>
  <a class="signal-brand" href="/" aria-label="Glenn 首页">GLENN <span>/ INDEX</span></a>
  <nav aria-label="主导航">
    <a href="/#writing">Writing</a>
    <a href="/archive/">Archive</a>
    <a href="/tags/">Tags</a>
    <button type="button" data-search-open>Search <kbd>⌘K</kbd></button>
    <button type="button" data-theme-toggle aria-label="切换深浅主题">◐</button>
  </nav>
  <SearchOverlay />
</header>
```

`SearchOverlay.astro` uses a native `<dialog>`; no modal library.

- [ ] **Step 5: Implement `siteShell.js`**

Required behavior:

```js
import { filterSearchItems } from '../lib/postIndex.mjs'

const THEME_KEY = 'glenn-blog-theme'

function setTheme(theme) {
  document.documentElement.dataset.theme = theme
  try { localStorage.setItem(THEME_KEY, theme) } catch {}
}

function initTheme() {
  document.querySelectorAll('[data-theme-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')
    })
  })
}

function initSearch() {
  const dialog = document.querySelector('[data-search-dialog]')
  if (!dialog) return
  const input = dialog.querySelector('[data-search-input]')
  const indexNode = dialog.querySelector('[data-search-index]')
  const items = JSON.parse(indexNode?.textContent || '[]')

  const open = () => {
    if (!dialog.open) dialog.showModal()
    input?.focus()
  }

  document.querySelectorAll('[data-search-open]').forEach(button => button.addEventListener('click', open))
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      open()
    }
  })

  // renderResults uses filterSearchItems(items, input.value), creates links,
  // and never injects untrusted HTML; use textContent/DOM nodes.
}

initTheme()
initSearch()
```

Implement `renderResults()` with DOM creation and `textContent`; do not use `innerHTML` for post content.

- [ ] **Step 6: Run tests and build**

```bash
node --test tests/post-index.test.mjs tests/signal-ledger-contract.test.mjs
npm test
npm run build
```

Expected: all PASS and Astro static build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/components/SearchOverlay.astro src/components/SignalFooter.astro src/components/SiteHeader.astro src/scripts/siteShell.js src/styles/global.css src/styles/signal-ledger.css src/layouts/BaseLayout.astro tests/signal-ledger-contract.test.mjs
git commit -m "feat: establish Signal Ledger shell and command search"
```

---

### Task 3: Homepage Writing Ledger and Complete Orbit/Three.js Removal

**Files:**
- Create: `src/components/LedgerEntry.astro`
- Modify: `src/pages/index.astro`
- Modify: `package.json`
- Modify: `tests/ui-contract.test.mjs`
- Modify: `tests/signal-ledger-contract.test.mjs`
- Delete: all Orbit/Three files listed in the File Structure section
- Delete: `tests/orbit-motion.test.mjs`, `tests/scroll-story.test.mjs`, `tests/space-scene-contract.test.mjs`

**Interfaces:**
- `LedgerEntry.astro` props: `{ post, readTime, index, compact?: boolean }`.
- Emits semantic `<article class="ledger-entry" data-ledger-entry>` with a visible zero-padded sequence derived from the supplied index, not persisted fake data.
- Homepage `Writing` anchor is `id="writing"` so the header's Writing link is real.
- No homepage category-tab/filter dependency remains; Search/Tags/Archive take over discovery.

- [ ] **Step 1: Extend the contract test to require the new homepage and reject the old system**

```js
assert.match(homeSource, /id="writing"/)
assert.match(homeSource, /LedgerEntry/)
assert.doesNotMatch(homeSource, /SpaceScene|orbit-wrap|nav-portal|flight-orb/)
assert.doesNotMatch(packageJson, /"three"/)
```

Assert the repository no longer contains active imports of `three`, `scrollStory`, or `spaceScene` after migration.

- [ ] **Step 2: Run RED**

```bash
node --test tests/signal-ledger-contract.test.mjs tests/ui-contract.test.mjs
```

Expected: FAIL while the old homepage and Three dependency remain.

- [ ] **Step 3: Implement `LedgerEntry.astro`**

Required hierarchy:

```astro
<article class:list={['ledger-entry', compact && 'is-compact']} data-ledger-entry>
  <span class="ledger-seq" aria-hidden="true">{String(index + 1).padStart(3, '0')}</span>
  <div class="ledger-main">
    <p class="ledger-meta"><time datetime={post.data.date.toISOString()}>{dateLabel}</time><span>{post.data.category}</span></p>
    <h3><a href={`/writing/${post.id}/`}>{post.data.title}</a></h3>
    {!compact && <p class="ledger-description">{post.data.description}</p>}
  </div>
  <p class="ledger-readtime">{readTime} MIN</p>
</article>
```

The CSS uses rules/spacing and the signal locator; no card background or rounded container.

- [ ] **Step 4: Rewrite homepage composition**

The first viewport order is:

```text
Publication header
Identity/state line
Short authored statement about writing/building/thinking
Writing ledger starts immediately
Archive / Topic pathways
Signal footer
```

Do not add a fake current project/status block because the repository does not yet contain a maintained source for it.

The homepage must not contain `Hi, I’m Glenn.`, `STUDY IN PUBLIC · 2026`, Orbit caption, large search field, or category pill/tab controls.

- [ ] **Step 5: Remove old animation/runtime files and Three dependency**

Delete exactly:

```text
src/components/SpaceScene.astro
src/scripts/blackHolePortal.mjs
src/scripts/home.js
src/scripts/navPortal.mjs
src/scripts/orbitMotion.mjs
src/scripts/scrollStory.mjs
src/scripts/solarSystem3d.mjs
src/scripts/spaceScene.mjs
src/scripts/starField.mjs
src/scripts/filterArticles.mjs
src/styles/space.css
tests/orbit-motion.test.mjs
tests/scroll-story.test.mjs
tests/space-scene-contract.test.mjs
```

Remove `three` from `package.json` dependencies. Run `npm install` in execution environment so lock state is regenerated if a lockfile is present; do not add a lockfile if the repository still intentionally has none.

- [ ] **Step 6: Remove old CSS imports and obsolete Research Folio test assertions**

`BaseLayout.astro` must no longer import `space.css`, `blog.css`, or `editorial.css` after their replacement rules are migrated. Keep `blog.css`/`editorial.css` temporarily only if Task 4 still needs a specific article rule; if so, delete them at the end of Task 4, not earlier.

Rewrite `tests/ui-contract.test.mjs` around enduring product behavior: GLENN identity, Search, theme control, Archive, Tags, RSS, article data, and the new ledger.

- [ ] **Step 7: Verify dependency and bundle removal**

```bash
npm test
npm run build
grep -R "from 'three'\|from \"three\"\|SpaceScene\|orbit-wrap\|nav-portal" src package.json || true
```

Expected: tests/build PASS; grep prints no production references.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: replace Orbit homepage with Signal Ledger index"
```

---

### Task 4: Article Reading System, Meta Rail, TOC, Prompt, Code, and Media Rhythm

**Files:**
- Create: `src/styles/reading.css`
- Create: `tests/signal-reading.test.mjs`
- Modify: `src/layouts/ArticleLayout.astro`
- Modify: `src/scripts/articleEnhance.js`
- Modify: `src/layouts/BaseLayout.astro`
- Delete after migration: `src/styles/blog.css`, `src/styles/editorial.css`
- Modify/delete: `tests/editorial-v2.test.mjs` once equivalent Signal Ledger coverage exists

**Interfaces:**
- Article layout root: `.signal-article`.
- Left metadata rail: `.article-meta-rail`.
- Reading body: `.article-body`.
- Right desktop TOC: `.article-context-rail`.
- Mobile TOC: `.article-toc-mobile`.
- H2 active state: `data-section-index="01"` set by `articleEnhance.js` and corresponding TOC link gets `aria-current="location"`.
- Prompt enhancement continues to recognize existing `[!PROMPT]`-style rendered blocks and emits `.prompt-block`, `[data-copy-prompt]`.
- Code enhancement emits `.code-frame`, `.code-language`, `[data-copy-code]`.

- [ ] **Step 1: Write article contract tests**

Require:

```js
assert.match(layoutSource, /article-meta-rail/)
assert.match(layoutSource, /article-context-rail/)
assert.match(layoutSource, /article-toc-mobile/)
assert.match(enhanceSource, /IntersectionObserver/)
assert.match(enhanceSource, /data-section-index/)
assert.match(enhanceSource, /data-copy-code/)
assert.match(enhanceSource, /data-copy-prompt/)
assert.match(readingCss, /min\(720px/)
assert.match(readingCss, /overflow-x:\s*auto/)
assert.doesNotMatch(readingCss, /border-radius:\s*(1[2-9]|[2-9]\d)px/)
```

- [ ] **Step 2: Run RED**

```bash
node --test tests/signal-reading.test.mjs
```

Expected: FAIL because new article structure/CSS do not yet exist.

- [ ] **Step 3: Rebuild `ArticleLayout.astro` grid**

Desktop structure:

```astro
<main class="signal-article">
  <header class="article-opening">…title/dek…</header>
  <div class="article-frame">
    <aside class="article-meta-rail">…date/read time/updated/source…</aside>
    <article class="article-body"><slot /></article>
    <aside class="article-context-rail">…sticky TOC…</aside>
  </div>
  <footer class="article-end">…previous/next…</footer>
</main>
```

Tags remain links but use slash-separated text/typographic grouping, never pills.

- [ ] **Step 4: Implement reading CSS**

Start with these explicit invariants:

```css
.article-body {
  width: min(100%, 44rem);
  font-family: var(--font-body);
  font-size: clamp(1.0625rem, 0.99rem + 0.18vw, 1.125rem);
  line-height: 1.84;
}

.article-body :is(p, ul, ol, blockquote) + :is(p, ul, ol, blockquote) {
  margin-top: var(--s4);
}

.article-body h2 {
  margin-top: var(--s8);
  padding-top: var(--s3);
  border-top: 1px solid var(--rule);
  font-family: var(--font-display);
}

.article-body :is(pre, table) {
  max-width: 100%;
}

.article-body pre,
.article-table-scroll {
  overflow-x: auto;
  overscroll-behavior-inline: contain;
}

.media-wide {
  width: min(62rem, calc(100vw - 2 * var(--page-gutter)));
  max-width: none;
  margin-inline: 50%;
  transform: translateX(-50%);
}
```

Tune the exact values only from browser screenshots; preserve the 680–720px intent.

- [ ] **Step 5: Update `articleEnhance.js`**

Retain reading progress and copy behavior, but add section registration and active TOC state:

```js
const sections = [...document.querySelectorAll('.article-body h2')]
sections.forEach((heading, index) => {
  heading.dataset.sectionIndex = String(index + 1).padStart(2, '0')
})

const tocLinks = new Map(
  [...document.querySelectorAll('.article-context-rail a[href^="#"]')]
    .map(link => [decodeURIComponent(link.hash.slice(1)), link])
)

const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue
    tocLinks.forEach(link => link.removeAttribute('aria-current'))
    tocLinks.get(entry.target.id)?.setAttribute('aria-current', 'location')
  }
}, { rootMargin: '-18% 0px -68% 0px', threshold: 0 })

sections.forEach(section => observer.observe(section))
```

Keep copy buttons text-based and accessible; announce copy success without adding toast libraries.

- [ ] **Step 6: Remove old article CSS layers**

Once `reading.css` fully owns article rendering, delete `blog.css` and `editorial.css` and remove imports from `BaseLayout.astro`. Replace/delete `tests/editorial-v2.test.mjs` only after `signal-reading.test.mjs` covers the enduring functionality.

- [ ] **Step 7: Verify**

```bash
node --test tests/signal-reading.test.mjs tests/article-route.test.mjs
npm test
npm run build
```

Expected: all PASS; article static route and previous/next generation remain intact.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: rebuild Signal Ledger article reading system"
```

---

### Task 5: Chronological Archive Ledger

**Files:**
- Modify: `src/pages/archive.astro`
- Modify: `src/styles/signal-ledger.css`
- Modify: `tests/signal-ledger-contract.test.mjs`

**Interfaces:**
- Uses `groupPostsByYearMonth()` from Task 1.
- Archive DOM uses `.archive-ledger`, `.archive-year`, `.archive-month`, `.archive-entry`.
- Year/month markers are semantic chronology labels; the Signal Rail aligns to actual year/month groups.

- [ ] **Step 1: Add a failing archive contract**

```js
assert.match(archiveSource, /groupPostsByYearMonth/)
assert.match(archiveSource, /archive-ledger/)
assert.match(archiveSource, /archive-year/)
assert.doesNotMatch(archiveSource, /<ArticleRow/)
```

- [ ] **Step 2: Run RED**

```bash
node --test tests/signal-ledger-contract.test.mjs
```

Expected: FAIL against the current flat Archive list.

- [ ] **Step 3: Implement chronology page**

Map collection posts to plain index objects and group them:

```js
const groups = groupPostsByYearMonth(posts.map(post => ({
  post,
  id: post.id,
  title: post.data.title,
  description: post.data.description,
  date: post.data.date,
  category: post.data.category,
  tags: post.data.tags
})))
```

Render year as the major event, month as a secondary registration, and each post as a single-line/compact ledger entry. Keep actual article count and RSS link; do not invent empty years.

- [ ] **Step 4: Add desktop/mobile chronology CSS**

Desktop can use a narrow year column + month rail + content field. At `max-width: 760px`, collapse to single flow with short horizontal registration marks before each year/month.

- [ ] **Step 5: Verify**

```bash
node --test tests/post-index.test.mjs tests/signal-ledger-contract.test.mjs
npm run build
```

Expected: PASS; `/archive/index.html` is generated.

- [ ] **Step 6: Commit**

```bash
git add src/pages/archive.astro src/styles/signal-ledger.css tests/signal-ledger-contract.test.mjs
git commit -m "feat: turn archive into chronological Signal Ledger"
```

---

### Task 6: Topic Index and Tag Detail Pages

**Files:**
- Modify: `src/pages/tags/index.astro`
- Modify: `src/pages/tags/[tag].astro`
- Modify: `src/styles/signal-ledger.css`
- Modify: `tests/signal-ledger-contract.test.mjs`

**Interfaces:**
- Uses `summarizeTopics()` from Task 1.
- Tags index uses only tags present in real content; no hard-coded empty taxonomy groups.
- DOM: `.topic-index`, `.topic-row`, `.topic-count`, `.topic-latest`.
- Tag detail page reuses `LedgerEntry.astro` with `compact={true}`.

- [ ] **Step 1: Add failing topic contracts**

```js
assert.match(tagsIndexSource, /summarizeTopics/)
assert.match(tagsIndexSource, /topic-index/)
assert.match(tagDetailSource, /LedgerEntry/)
assert.doesNotMatch(tagsIndexSource, /pill|chip|badge/i)
```

- [ ] **Step 2: Run RED**

```bash
node --test tests/signal-ledger-contract.test.mjs
```

Expected: FAIL until the topic index is rebuilt.

- [ ] **Step 3: Implement real topic summaries**

Show per topic:

```text
AI                         03
Latest 03 SEP 2026
────────────────────────────
```

The exact count/date comes from `summarizeTopics(posts)`. Do not create visual groups that have zero articles.

- [ ] **Step 4: Rebuild tag detail**

Use one authored opening line, actual article count, and compact ledger entries. Keep canonical/static routes and slug behavior unchanged.

- [ ] **Step 5: Verify**

```bash
node --test tests/post-index.test.mjs tests/signal-ledger-contract.test.mjs
npm run build
```

Expected: PASS; existing tag routes continue to generate.

- [ ] **Step 6: Commit**

```bash
git add src/pages/tags src/styles/signal-ledger.css tests/signal-ledger-contract.test.mjs
git commit -m "feat: rebuild tags as Signal Ledger topic index"
```

---

### Task 7: Real Long-Form Stress Fixture and Production-Build Browser QA Harness

**Files:**
- Create: `tests/fixtures/ai-design-99-workflow.md`
- Create: `scripts/prepare-signal-stress-fixture.mjs`
- Create: `scripts/signal-ledger-qa.mjs`
- Create: `.github/workflows/signal-ledger-qa.yml`
- Modify: `tests/deliver-qa.test.mjs`

**Interfaces:**
- `tests/fixtures/ai-design-99-workflow.md` is copied verbatim from the saved user file titled `如何榨出 AI 设计的 99% 创造力：一套三阶段工作流`.
- `prepare-signal-stress-fixture.mjs` writes temporary `src/content/posts/__qa-ai-design-99.md` only in the QA runner.
- Generated temporary frontmatter sets `draft: false`, a QA-only slug/title marker, real prose below unchanged, and translates only archival `[image](URL)` marker lines to `![image](URL)` in the temporary generated copy so the existing image references render as media.
- `signal-ledger-qa.mjs` writes screenshots/report under `artifacts/signal-ledger-qa/` and exits non-zero on failures.

- [ ] **Step 1: Materialize/copy the saved article verbatim into the test fixture**

At execution time use the attached/saved file source already identified in conversation/library. Verify the first heading and representative body lines match before committing. Do not summarize or rewrite.

- [ ] **Step 2: Write QA contract assertions before the script exists**

`tests/deliver-qa.test.mjs` must assert the browser script contains all required viewports:

```js
for (const size of [
  [1920, 1080],
  [1440, 1000],
  [1280, 800],
  [1024, 1366],
  [768, 1024],
  [430, 932],
  [390, 844],
  [375, 812]
]) {
  assert.match(qaSource, new RegExp(`${size[0]}.*${size[1]}`, 's'))
}
```

Also require routes `/`, `/writing/commerce-agent-rules/`, `/archive/`, `/tags/`, search dialog, light/dark, and `__qa-ai-design-99` stress route.

- [ ] **Step 3: Run RED**

```bash
node --test tests/deliver-qa.test.mjs
```

Expected: FAIL until the new QA script/workflow exists.

- [ ] **Step 4: Implement stress-fixture preparation**

Core transformation:

```js
const converted = source.replace(
  /^\[image\]\((https?:\/\/[^)]+)\)$/gm,
  '![$1]($1)'
)

const frontmatter = `---\ntitle: "QA · 如何榨出 AI 设计的 99% 创造力：一套三阶段工作流"\ndescription: "Signal Ledger long-form stress fixture"\ndate: 2026-09-04\ncategory: "AI"\ntags: ["AI", "Design", "Workflow"]\ndraft: false\n---\n\n`
```

Keep the fixture source itself verbatim; only the temporary generated copy receives frontmatter/image-marker normalization.

- [ ] **Step 5: Implement browser matrix**

For every target viewport, assert:

```js
const metrics = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
  bodyFont: getComputedStyle(document.querySelector('.article-body') || document.body).fontSize,
  bodyLineHeight: getComputedStyle(document.querySelector('.article-body') || document.body).lineHeight
}))
assert(metrics.scrollWidth <= metrics.innerWidth + 1, 'global horizontal overflow')
```

Additional checks:

- light and dark homepage/article screenshots;
- Search opens by click and `Control+K`/`Meta+K` path;
- Escape closes search;
- mobile Search is viewport-safe;
- code/table scroll container is locally scrollable but does not widen document;
- long URL wraps or remains locally scrollable without page overflow;
- mobile article side margins are within the approved 19–22px neighborhood after optical tuning;
- H1 does not clip at 375px;
- previous/next links remain reachable;
- Archive and Tags render without empty fake groups;
- `prefers-reduced-motion: reduce` does not hide functionality;
- no console/page errors.

Capture at minimum the ten Critic-required screenshots plus full-page screenshots for all final acceptance viewports.

- [ ] **Step 6: Implement QA workflow**

Workflow steps:

```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version: 22
- run: npm install
- run: npm test
- run: node scripts/prepare-signal-stress-fixture.mjs
- run: npm run build
- run: npx --yes playwright@1.55.0 install --with-deps chromium
- run: npm run preview -- --host 127.0.0.1 &
- run: npx --yes -p playwright@1.55.0 node scripts/signal-ledger-qa.mjs
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: signal-ledger-qa
    path: artifacts/signal-ledger-qa
```

Use a readiness loop before browser QA; do not rely on a fixed sleep only.

- [ ] **Step 7: Run unit/build verification**

```bash
npm test
node scripts/prepare-signal-stress-fixture.mjs
npm run build
rm -f src/content/posts/__qa-ai-design-99.md
```

Expected: PASS; normal repository remains free of the temporary content file.

- [ ] **Step 8: Commit**

```bash
git add tests/fixtures/ai-design-99-workflow.md scripts/prepare-signal-stress-fixture.mjs scripts/signal-ledger-qa.mjs .github/workflows/signal-ledger-qa.yml tests/deliver-qa.test.mjs
git commit -m "test: add Signal Ledger real-content browser QA"
```

---

### Task 8: Define V1 Screenshot Gate and Fresh Critic Round 1

**Files:**
- Create: `docs/design-critic/round-1.md`
- Modify: only files directly justified by the accepted five Round-1 actions.

**Interfaces:**
- Input to Critic: screenshots only from the QA artifact.
- Critic receives no source, CSS, implementation rationale, history, or prior commentary.
- Output saved verbatim/faithfully summarized into `round-1.md` with exactly: visual-language diagnosis, 3 most serious problems, 3 strengths to preserve, 5 next actions, 0–10 score.

- [ ] **Step 1: Trigger full QA on the current branch and download the screenshot artifact**

Required screenshot set:

```text
homepage-top-1440x1000
homepage-writing-1440x1000
article-header-1440x1000
article-body-1440x1000
article-media-1440x1000
archive-1440x1000
search-1440x1000
dark-mode-1440x1000
mobile-home-390x844
mobile-article-390x844
```

- [ ] **Step 2: Send only those screenshots to a Fresh Context critic using the exact Critic rubric from the approved spec**

Do not include branch name, code snippets, CSS, previous design history, Builder rationale, or implementation difficulty.

- [ ] **Step 3: Save Round 1 critique and choose only five concrete changes**

`docs/design-critic/round-1.md` structure:

```markdown
# Round 1
## Visual language diagnosis
...
## Three most serious problems
1. ...
2. ...
3. ...
## Three strengths to preserve
1. ...
2. ...
3. ...
## Five accepted changes
1. ...
2. ...
3. ...
4. ...
5. ...
## Score
N/10
```

The five accepted changes must be directly traceable to screenshot evidence and may not introduce a second signature element.

- [ ] **Step 4: Implement Round 1 changes with focused tests first**

For every behavior/structure change, add or update the smallest relevant Node contract test before production changes. Purely optical CSS changes require browser screenshot regression evidence rather than meaningless string tests.

- [ ] **Step 5: Re-run unit tests, build, and full browser QA**

```bash
npm test
npm run build
```

Then run the Signal Ledger QA workflow. Expected: all PASS and new screenshots produced.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "design: apply Signal Ledger critic round 1"
```

---

### Task 9: Fresh Critic Round 2

**Files:**
- Create: `docs/design-critic/round-2.md`
- Modify: only files justified by Round-2 screenshots.

**Interfaces:** same output schema as Round 1; Round-2 Critic must not receive Round-1 output.

- [ ] **Step 1: Generate a fresh screenshot artifact from the Round-1 HEAD.**
- [ ] **Step 2: Start a new Fresh Context Critic with screenshots only and the approved rubric.**
- [ ] **Step 3: Save the independent critique to `docs/design-critic/round-2.md`; do not reveal Round 1 to it.**
- [ ] **Step 4: Implement only the five highest-value screenshot-grounded changes; reject suggestions that violate restraint, readability, or the single-Signal-Rail signature.**
- [ ] **Step 5: Run `npm test`, `npm run build`, and full Signal Ledger QA.**
- [ ] **Step 6: Commit with `git commit -m "design: apply Signal Ledger critic round 2"`.**

If Round 2 still identifies strong template/AI/SaaS influence, continue; this task never grants permission to skip Round 3.

---

### Task 10: Fresh Critic Round 3 and Stability Decision

**Files:**
- Create: `docs/design-critic/round-3.md`
- Modify: only files justified by Round-3 screenshots.

**Interfaces:** same screenshot-only critic contract; Critic sees neither Round 1 nor Round 2.

- [ ] **Step 1: Generate fresh Round-2 HEAD screenshots.**
- [ ] **Step 2: Run a new Fresh Context Critic with screenshots only.**
- [ ] **Step 3: Save the independent output in `docs/design-critic/round-3.md`.**
- [ ] **Step 4: Apply the five highest-value corrections that preserve the approved Signal Ledger thesis.**
- [ ] **Step 5: Run `npm test`, `npm run build`, and browser QA.**
- [ ] **Step 6: Decide stability from evidence:** if strong template/AI/SaaS influence, poor Chinese reading, or material mobile defects remain, repeat the exact fresh-context loop as Round 4 rather than entering Deliver.
- [ ] **Step 7: Commit with `git commit -m "design: apply Signal Ledger critic round 3"`.**

---

### Task 11: Deliver Reduction, CSS Consolidation, Accessibility, and Performance

**Files:**
- Create: `docs/design-critic/final-reduction.md`
- Modify: `src/styles/global.css`
- Modify: `src/styles/signal-ledger.css`
- Modify: `src/styles/reading.css`
- Modify: `src/components/SiteHeader.astro`
- Modify: `src/components/SearchOverlay.astro`
- Modify: `src/scripts/siteShell.js`
- Modify: `src/scripts/articleEnhance.js`
- Modify: tests/QA only where the final reduced implementation legitimately changes contracts
- Delete: dead CSS/JS/components and duplicate QA workflow left from prior redesigns

**Interfaces:** final production styles are exactly the minimal global foundation + Signal Ledger site layer + reading layer; no critic-round override stylesheets.

- [ ] **Step 1: Inventory every visual primitive**

Write `docs/design-critic/final-reduction.md` with a table covering:

```text
Border / Shadow / Gradient / Background / Label / Tag / Icon / Button /
Container / Card / Animation / Decoration / Copy / Divider / Badge
```

For each occurrence record `keep` or `delete` and one sentence explaining the information/interaction value. Any element that can be deleted without losing information, orientation, interaction, or authored identity is deleted.

- [ ] **Step 2: Remove obsolete CSS and duplicate rules**

Run:

```bash
grep -R "orbit\|SpaceScene\|blackHole\|nav-portal\|flight-orb\|linear-gradient\|radial-gradient" src || true
```

Expected: no obsolete Orbit/space visual system and no gradients in production styling.

Search for large-radius/card residue and remove unless a documented control affordance requires it:

```bash
grep -R "border-radius\|box-shadow" src/styles
```

- [ ] **Step 3: Accessibility browser checks**

QA must verify:

- tab order reaches Search, navigation, theme, article links, copy controls;
- `⌘/Ctrl+K` opens search and Escape closes it;
- dialog returns focus to the opener;
- visible focus is not removed;
- active TOC uses `aria-current="location"` plus a non-color cue;
- reduced motion removes locator animation but preserves state;
- headings remain ordered;
- no horizontal document overflow;
- links inside body are distinguishable from surrounding text;
- theme contrast remains readable in Light and Dark.

- [ ] **Step 4: Performance checks**

Verify dependency tree and built assets:

```bash
npm ls --depth=0
npm run build
find dist/_astro -type f -maxdepth 1 -printf '%f %s\n' | sort -k2 -n
```

Expected: no `three`, no heavy UI framework, and the previous >500k Three.js homepage chunk warning is gone. If a new >500k script chunk appears, treat it as failure and trace the import before completion.

- [ ] **Step 5: Run final viewport/theme/route matrix**

Must pass all combinations required by the spec:

```text
1920×1080
1440×1000
1280×800
1024×1366
768×1024
430×932
390×844
375×812
```

Routes/surfaces:

```text
Home
Article
Archive
Tags
Search
Light
Dark
Stress article
Long title
Long Chinese text
English title
Code
Prompt
Image
Table
Quote
Long URL
```

- [ ] **Step 6: Final tests/build**

```bash
npm test
npm run build
```

Expected: all tests PASS, build PASS, QA PASS.

- [ ] **Step 7: Commit reduction**

```bash
git add -A
git commit -m "design: finish Signal Ledger V3 reduction pass"
```

---

### Task 12: Final Review and Merge-Readiness Gate

**Files:**
- No planned production changes unless review finds a concrete defect.

**Interfaces:** final comparison is `main...design/signal-ledger-v3`.

- [ ] **Step 1: Compare branch to main**

```bash
git diff --stat main...HEAD
git diff --name-status main...HEAD
```

Confirm changes are limited to the approved redesign, QA, and design documentation; content/SEO/RSS data is not rewritten.

- [ ] **Step 2: Run one final clean verification on the exact HEAD**

```bash
npm install
npm test
npm run build
```

Then run the final Signal Ledger QA workflow on that exact commit SHA.

- [ ] **Step 3: Review final screenshots manually**

Do not infer visual quality from assertions alone. Inspect representative Light/Dark Desktop/Tablet/Mobile homepage, article, Archive, Tags, Search, and stress-article screenshots.

- [ ] **Step 4: Verify deployment configuration was not silently repointed**

The redesign must not change production hosting/DNS behavior unless the user separately asks for deployment changes. Report the current deployment target accurately rather than claiming `blog.minglingyun.com` was verified when only a preview/Pages build was tested.

- [ ] **Step 5: Produce the 30-item final report required by the brief**

Include Before screenshots, 10 Discover directions, 3 finalists, selection rationale, thesis/system/type/grid/color/motion, Home/Article/Archive/Tags/Search/Mobile changes, all Critic rounds and resulting modifications, final screenshots, removed UI, new components, modified files, build/test/accessibility/performance results, and remaining issues.

- [ ] **Step 6: Stop before merge**

Leave the branch/PR merge-ready. Merge only after explicit user approval.
