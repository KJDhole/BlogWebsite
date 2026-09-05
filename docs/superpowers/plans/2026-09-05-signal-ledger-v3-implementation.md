# Signal Ledger V3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Glenn's Astro blog as the Signal Ledger personal knowledge instrument, replacing Research Folio/Orbit with an asymmetric editorial ledger, Signal Rail orientation system, command search, long-form reading system, chronology archive, and topic index while preserving content, SEO, RSS, accessibility, theme persistence, and previous/next article behavior.

**Architecture:** Keep Astro as the rendering layer. Use focused Astro components, pure indexing helpers, a minimal global CSS base plus `signal-ledger.css` and `reading.css`, and small native-JS enhancement modules. Remove the complete Three.js/Orbit runtime and its dedicated QA after the replacement homepage is covered. Browser QA runs against the production Astro build and a temporary real-content stress post created only inside QA.

**Tech Stack:** Astro 7.3.1, Astro content collections, CSS, native JavaScript, Node `node:test`, Playwright/Chromium only in QA workflows, existing `@astrojs/rss` and `@astrojs/sitemap`.

**Spec:** `docs/superpowers/specs/2026-09-05-signal-ledger-v3-design.md`

## Global Constraints

- Preserve article data, SEO, RSS, Tags, Archive, Search, previous/next article logic, responsive behavior, accessibility, and Astro architecture.
- Remove Research Folio visual composition, Orbit, orange orb, black-hole animation, orange-first accent language, and all Three.js homepage runtime code.
- Sole primary visual signature: **Signal Rail**; every rail/locator must encode real navigation, chronology, topic, search, or reading state.
- Light palette: warm paper, warm near-black ink, graphite metadata, low-contrast rules, sparing deep signal red/vermilion accent.
- Dark palette: charcoal/ink background, warm light-gray text, subdued rules, restrained brighter signal red; no neon, gradients, glow, or simple inversion.
- Typography roles are limited to Display, Body, and Mono; Chinese long-form reading is first priority.
- Desktop article body target: approximately 680–720px; wide media approximately 900–980px; full media up to approximately 1080–1120px where justified.
- Mobile is separately designed at 375×812, 390×844, and 430×932; persistent side rails disappear and the signal language becomes horizontal registration marks.
- Default radius is `0`; no card system, generic shadows, pill clouds, SaaS navbar, dashboard composition, or decorative elevation.
- Motion is only orientation/feedback: Signal Rail locator, search open/close, subtle state transitions, reading progress; respect `prefers-reduced-motion`.
- Do not add a UI framework or heavy dependency.
- Use the saved article `如何榨出 AI 设计的 99% 创造力：一套三阶段工作流` verbatim as the long-form stress source; do not rewrite its prose to make layouts pass.
- Complete at least three screenshot-only Fresh Context Critic rounds before Deliver reduction.
- Do not merge to `main` until final browser QA, unit tests, build, accessibility checks, performance checks, Critic loop, and Deliver reduction pass.
- Do not change production hosting/DNS/deploy destination as part of this redesign.

---

# File Map

## Create

- `src/components/LedgerEntry.astro` — reusable article ledger entry for Home and tag detail.
- `src/components/SearchOverlay.astro` — native `<dialog>` command search; queries real published posts itself.
- `src/components/SignalFooter.astro` — restrained Archive/Tags/RSS/X/GitHub footer.
- `src/lib/postIndex.mjs` — pure search/archive/topic index helpers.
- `src/scripts/siteShell.js` — theme + command search + focus-return behavior.
- `src/styles/signal-ledger.css` — site shell, header, ledger, search, archive, topics, footer, light/dark, responsive layout.
- `src/styles/reading.css` — article opening/grid/body/H2/H3/media/code/prompt/quote/table/TOC/pagination/mobile.
- `tests/post-index.test.mjs` — pure indexing unit tests.
- `tests/signal-ledger-contract.test.mjs` — structural contracts for new design and absence of old Orbit system.
- `tests/signal-reading.test.mjs` — article contracts.
- `tests/fixtures/ai-design-99-workflow.md` — verbatim saved stress article source.
- `scripts/prepare-signal-stress-fixture.mjs` — writes temporary Astro QA post.
- `scripts/signal-ledger-qa.mjs` — Playwright matrix/screenshots/assertions.
- `.github/workflows/signal-ledger-qa.yml` — browser QA workflow.
- `docs/design-critic/round-1.md`, `round-2.md`, `round-3.md` — independent critic outputs + accepted changes.
- `docs/design-critic/final-reduction.md` — final subtraction audit.

## Modify

- `src/layouts/BaseLayout.astro`
- `src/components/SiteHeader.astro`
- `src/pages/index.astro`
- `src/pages/404.astro`
- `src/layouts/ArticleLayout.astro`
- `src/scripts/articleEnhance.js`
- `src/pages/archive.astro`
- `src/pages/tags/index.astro`
- `src/pages/tags/[tag].astro`
- `src/styles/global.css`
- `public/favicon.svg`
- `public/site.webmanifest`
- `package.json`
- `tests/ui-contract.test.mjs`
- `tests/production-blog.test.mjs` only if it names retired visual files/classes
- `tests/deliver-qa.test.mjs`

## Delete after replacement coverage is green

```text
src/components/SpaceScene.astro
src/components/ArticleRow.astro
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
src/styles/blog.css
src/styles/editorial.css
tests/orbit-motion.test.mjs
tests/scroll-story.test.mjs
tests/space-scene-contract.test.mjs
tests/filterArticles.test.mjs
tests/editorial-v2.test.mjs
scripts/absorption-qa.mjs
.github/workflows/absorption-qa.yml
```

After the new QA workflow is proven, also retire the superseded pair:

```text
scripts/deliver-qa.mjs
.github/workflows/deliver-qa.yml
```

Keep `.github/workflows/ci.yml` and `.github/workflows/deploy.yml` functionally unchanged except for test/file-name maintenance required by deleted files. Do not repoint deployment.

---

### Task 1: Pure Post Indexing Primitives

**Files:**
- Create: `src/lib/postIndex.mjs`
- Create: `tests/post-index.test.mjs`

**Interfaces:**
- Consumes plain objects `{ id, title, description, date, category, tags }`.
- Produces:
  - `normalizeSearchItem(item)`
  - `filterSearchItems(items, query)`
  - `groupPostsByYearMonth(posts)`
  - `summarizeTopics(posts)`

- [ ] **Step 1: Write RED tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { filterSearchItems, groupPostsByYearMonth, summarizeTopics } from '../src/lib/postIndex.mjs'

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
    description: 'A development note.',
    date: new Date('2025-12-01T00:00:00Z'),
    category: 'Development',
    tags: ['Systems']
  }
]

test('search matches title description category and tags', () => {
  assert.equal(filterSearchItems(posts, 'architecture').length, 1)
  assert.equal(filterSearchItems(posts, 'AGENT').length, 1)
  assert.equal(filterSearchItems(posts, 'development').length, 1)
})

test('archive groups descending by year/month', () => {
  const groups = groupPostsByYearMonth(posts)
  assert.deepEqual(groups.map(group => group.year), [2026, 2025])
  assert.equal(groups[0].months[0].month, 9)
})

test('topic summary uses only real tags', () => {
  const topics = summarizeTopics(posts)
  assert.deepEqual(topics.map(topic => topic.name).sort(), ['AI', 'Architecture', 'Systems'])
  assert.equal(topics.find(topic => topic.name === 'AI').count, 1)
})
```

- [ ] **Step 2: Verify RED**

```bash
node --test tests/post-index.test.mjs
```

Expected: FAIL because `src/lib/postIndex.mjs` is missing.

- [ ] **Step 3: Implement**

```js
const clean = value => String(value ?? '').trim()

export function normalizeSearchItem(item) {
  const tags = Array.isArray(item.tags) ? item.tags.map(clean).filter(Boolean) : []
  return {
    ...item,
    tags,
    searchable: [item.title, item.description, item.category, ...tags]
      .map(clean)
      .join(' ')
      .toLocaleLowerCase()
  }
}

export function filterSearchItems(items, query) {
  const needle = clean(query).toLocaleLowerCase()
  const normalized = items.map(normalizeSearchItem)
  return needle ? normalized.filter(item => item.searchable.includes(needle)) : normalized
}

export function groupPostsByYearMonth(posts) {
  const years = new Map()
  for (const post of [...posts].sort((a, b) => new Date(b.date) - new Date(a.date))) {
    const date = new Date(post.date)
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth() + 1
    if (!years.has(year)) years.set(year, new Map())
    if (!years.get(year).has(month)) years.get(year).set(month, [])
    years.get(year).get(month).push(post)
  }
  return [...years.entries()].map(([year, months]) => ({
    year,
    months: [...months.entries()].map(([month, monthPosts]) => ({
      month,
      label: String(month).padStart(2, '0'),
      posts: monthPosts
    }))
  }))
}

export function summarizeTopics(posts) {
  const topicMap = new Map()
  for (const post of posts) {
    for (const rawTag of Array.isArray(post.tags) ? post.tags : []) {
      const name = clean(rawTag)
      if (!name) continue
      if (!topicMap.has(name)) topicMap.set(name, [])
      topicMap.get(name).push(post)
    }
  }
  return [...topicMap.entries()]
    .map(([name, topicPosts]) => {
      const sorted = [...topicPosts].sort((a, b) => new Date(b.date) - new Date(a.date))
      return { name, count: sorted.length, latestDate: sorted[0].date, posts: sorted }
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}
```

- [ ] **Step 4: Verify GREEN**

```bash
node --test tests/post-index.test.mjs
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/postIndex.mjs tests/post-index.test.mjs
git commit -m "feat: add Signal Ledger post indexing primitives"
```

---

### Task 2: Shared Foundation, Publication Header, Theme, Search, Footer, and Branding

**Files:**
- Create: `src/components/SearchOverlay.astro`
- Create: `src/components/SignalFooter.astro`
- Create: `src/scripts/siteShell.js`
- Create: `src/styles/signal-ledger.css`
- Create: `tests/signal-ledger-contract.test.mjs`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/components/SiteHeader.astro`
- Modify: `src/pages/404.astro`
- Modify: `src/styles/global.css`
- Modify: `public/favicon.svg`
- Modify: `public/site.webmanifest`

**Interfaces:**
- `SiteHeader.astro` props: `{ active?: 'home' | 'archive' | 'tags' | 'article' }`.
- `SearchOverlay.astro` queries published posts with `getCollection('posts')` and emits `[data-search-dialog]`, `[data-search-input]`, `[data-search-results]`, `[data-search-index]`.
- `siteShell.js` initializes theme and search on every page; theme key remains exactly `glenn-blog-theme`.
- Search matching imports `filterSearchItems()` from Task 1.

- [ ] **Step 1: Write RED structural tests**

```js
assert.match(headerSource, /GLENN/)
assert.match(headerSource, /data-search-open/)
assert.match(searchSource, /<dialog/)
assert.match(searchSource, /data-search-index/)
assert.match(siteShellSource, /glenn-blog-theme/)
assert.match(siteShellSource, /metaKey|ctrlKey/)
assert.match(signalCss, /--signal-accent:/)
assert.match(signalCss, /prefers-reduced-motion/)
assert.doesNotMatch(signalCss, /linear-gradient|radial-gradient/)
```

Also assert `BaseLayout` keeps canonical/OG/RSS/JSON-LD and updates the light/dark `theme-color` values to the new palette.

- [ ] **Step 2: Verify RED**

```bash
node --test tests/signal-ledger-contract.test.mjs
```

Expected: FAIL.

- [ ] **Step 3: Establish tokens/base**

Use this screenshot-tunable starting set in `signal-ledger.css`:

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
  --s1: 4px; --s2: 8px; --s3: 12px; --s4: 20px;
  --s5: 32px; --s6: 48px; --s7: 72px; --s8: 112px;
  --page-gutter: clamp(20px, 4vw, 64px);
}
:root[data-theme='dark'] {
  --paper: #171715;
  --ink: #ece8df;
  --muted: #9a968f;
  --rule: #383633;
  --signal-accent: #d45a51;
}
```

`global.css` becomes reset/body/base links/selection/focus only. No page composition.

- [ ] **Step 4: Rebuild header/footer**

Header semantic shape:

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

`SignalFooter` contains real `Archive`, `Tags`, `RSS`, `X`, and `GitHub` links. No explanatory marketing copy.

- [ ] **Step 5: Implement command search and focus return**

```js
import { filterSearchItems } from '../lib/postIndex.mjs'
const THEME_KEY = 'glenn-blog-theme'
let searchOpener = null

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
  const results = dialog.querySelector('[data-search-results]')
  const indexNode = dialog.querySelector('[data-search-index]')
  const items = JSON.parse(indexNode?.textContent || '[]')

  const render = query => {
    results.replaceChildren()
    for (const item of filterSearchItems(items, query)) {
      const link = document.createElement('a')
      link.href = `/writing/${item.id}/`
      const title = document.createElement('strong')
      title.textContent = item.title
      const meta = document.createElement('span')
      meta.textContent = `${item.dateLabel} / ${item.category}`
      const excerpt = document.createElement('span')
      excerpt.textContent = item.description
      link.append(title, meta, excerpt)
      results.append(link)
    }
  }

  const open = opener => {
    searchOpener = opener || document.activeElement
    if (!dialog.open) dialog.showModal()
    render('')
    input.focus()
  }

  document.querySelectorAll('[data-search-open]').forEach(button => button.addEventListener('click', () => open(button)))
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      open(document.activeElement)
    }
  })
  input.addEventListener('input', () => render(input.value))
  dialog.addEventListener('close', () => searchOpener?.focus?.())
}

initTheme()
initSearch()
```

Build results via DOM + `textContent`, never post-content `innerHTML`.

- [ ] **Step 6: Restyle 404 + identity assets**

`404.astro` uses `SiteHeader`, one strong error statement, one Home link, and `SignalFooter`; no old `inner-shell` dependency. Update favicon accent and webmanifest theme/background colors to the new Signal palette without changing URLs or PWA identity fields.

- [ ] **Step 7: Verify**

```bash
node --test tests/post-index.test.mjs tests/signal-ledger-contract.test.mjs
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/SearchOverlay.astro src/components/SignalFooter.astro src/components/SiteHeader.astro src/scripts/siteShell.js src/styles/global.css src/styles/signal-ledger.css src/layouts/BaseLayout.astro src/pages/404.astro public/favicon.svg public/site.webmanifest tests/signal-ledger-contract.test.mjs
git commit -m "feat: establish Signal Ledger shell and command search"
```

---

### Task 3: Homepage Writing Ledger + Complete Orbit/Three.js Removal

**Files:**
- Create: `src/components/LedgerEntry.astro`
- Modify: `src/pages/index.astro`
- Modify: `package.json`
- Modify: `tests/ui-contract.test.mjs`
- Modify: `tests/signal-ledger-contract.test.mjs`
- Modify: `tests/production-blog.test.mjs` only if retired Orbit filenames are asserted
- Delete: old Orbit scripts/component/styles/tests/absorption QA listed in File Map

**Interfaces:**
- `LedgerEntry.astro` props: `{ post, readTime, index, compact?: boolean }`.
- Emits `<article class="ledger-entry" data-ledger-entry>` with a derived zero-padded sequence; sequence is presentation, not stored fake content.
- Home Writing anchor: `id="writing"`.
- Home discovery uses Writing + Search + Archive + Tags; old category tab/filter system is removed.

- [ ] **Step 1: Add RED replacement/removal contracts**

```js
assert.match(homeSource, /id="writing"/)
assert.match(homeSource, /LedgerEntry/)
assert.doesNotMatch(homeSource, /SpaceScene|orbit-wrap|nav-portal|flight-orb/)
assert.doesNotMatch(packageJson, /"three"/)
```

Also assert no production source imports `three`, `scrollStory`, `spaceScene`, or `filterArticles` after migration.

- [ ] **Step 2: Verify RED**

```bash
node --test tests/signal-ledger-contract.test.mjs tests/ui-contract.test.mjs
```

Expected: FAIL.

- [ ] **Step 3: Implement ledger row**

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

No card background, pill, thumbnail placeholder, radius, or shadow.

- [ ] **Step 4: Rewrite homepage**

Required first-viewport order:

```text
Publication header
Short identity/state line
One authored sentence describing the writing/building/thinking space
Writing ledger begins immediately
Archive / Topic pathways
Signal footer
```

Do not include `Hi, I’m Glenn.`, `STUDY IN PUBLIC · 2026`, Orbit caption, a large inline Search field, old category tabs, or fake current-project status.

- [ ] **Step 5: Delete retired runtime and stale QA**

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
tests/filterArticles.test.mjs
scripts/absorption-qa.mjs
.github/workflows/absorption-qa.yml
```

Remove `three` from `package.json`. If a lockfile exists then regenerate it; do not introduce a new lockfile solely for this task if the repository intentionally has none.

- [ ] **Step 6: Verify removal**

```bash
npm test
npm run build
grep -R "from 'three'\|from \"three\"\|SpaceScene\|orbit-wrap\|nav-portal\|flight-orb\|filterArticles" src package.json tests .github scripts || true
```

Expected: tests/build PASS; no active old-system references except historical design docs.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: replace Orbit homepage with Signal Ledger index"
```

---

### Task 4: Article Reading System

**Files:**
- Create: `src/styles/reading.css`
- Create: `tests/signal-reading.test.mjs`
- Modify: `src/layouts/ArticleLayout.astro`
- Modify: `src/scripts/articleEnhance.js`
- Modify: `src/layouts/BaseLayout.astro`
- Delete after GREEN: `src/styles/blog.css`, `src/styles/editorial.css`, `tests/editorial-v2.test.mjs`

**Interfaces:**
- Root `.signal-article`.
- Left `.article-meta-rail`, center `.article-body`, right `.article-context-rail`.
- Mobile `.article-toc-mobile`.
- H2 receives `data-section-index="01"`; active TOC link receives `aria-current="location"`.
- Prompt emits `.prompt-block`, `[data-copy-prompt]`; Code emits `.code-frame`, `.code-language`, `[data-copy-code]`.

- [ ] **Step 1: Write RED contracts**

```js
assert.match(layoutSource, /article-meta-rail/)
assert.match(layoutSource, /article-context-rail/)
assert.match(layoutSource, /article-toc-mobile/)
assert.match(enhanceSource, /IntersectionObserver/)
assert.match(enhanceSource, /data-section-index/)
assert.match(enhanceSource, /data-copy-code/)
assert.match(enhanceSource, /data-copy-prompt/)
assert.match(readingCss, /overflow-x:\s*auto/)
assert.doesNotMatch(readingCss, /border-radius:\s*(1[2-9]|[2-9]\d)px/)
```

- [ ] **Step 2: Verify RED**

```bash
node --test tests/signal-reading.test.mjs
```

Expected: FAIL.

- [ ] **Step 3: Rebuild article layout**

```astro
<main class="signal-article">
  <header class="article-opening">…category/title/dek/tags…</header>
  <div class="article-frame">
    <aside class="article-meta-rail">…published/read time/updated/source…</aside>
    <article class="article-body"><slot /></article>
    <aside class="article-context-rail">…sticky TOC…</aside>
  </div>
  <footer class="article-end">…previous/next…</footer>
</main>
```

Place `SignalFooter` after the article end. Metadata is not collapsed into one line. Tags are typographic links separated by `/`, not pills.

- [ ] **Step 4: Implement reading CSS**

```css
.article-body {
  width: min(100%, 44rem);
  font-family: var(--font-body);
  font-size: clamp(1.0625rem, 0.99rem + 0.18vw, 1.125rem);
  line-height: 1.84;
}
.article-body :is(p, ul, ol, blockquote) + :is(p, ul, ol, blockquote) { margin-top: var(--s4); }
.article-body h2 {
  margin-top: var(--s8);
  padding-top: var(--s3);
  border-top: 1px solid var(--rule);
  font-family: var(--font-display);
}
.article-body pre,
.article-table-scroll { overflow-x: auto; overscroll-behavior-inline: contain; }
.media-wide {
  width: min(62rem, calc(100vw - 2 * var(--page-gutter)));
  max-width: none;
  margin-inline: 50%;
  transform: translateX(-50%);
}
```

Tune exact typography/spacing from browser screenshots, not by adding arbitrary one-off margins.

- [ ] **Step 5: Update article enhancement**

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

Keep current reading-progress and copy capabilities; copy feedback is text/ARIA state, not a toast library.

- [ ] **Step 6: Remove old article style layers**

Once `reading.css` owns every article primitive, delete `blog.css`, `editorial.css`, and `tests/editorial-v2.test.mjs`; update `BaseLayout` imports to exactly `global.css`, `signal-ledger.css`, `reading.css`.

- [ ] **Step 7: Verify**

```bash
node --test tests/signal-reading.test.mjs tests/article-route.test.mjs
npm test
npm run build
```

Expected: PASS; previous/next route generation remains intact.

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

**Interfaces:** uses `groupPostsByYearMonth()`; DOM classes `.archive-ledger`, `.archive-year`, `.archive-month`, `.archive-entry`.

- [ ] **Step 1: Add RED archive contract**

```js
assert.match(archiveSource, /groupPostsByYearMonth/)
assert.match(archiveSource, /archive-ledger/)
assert.match(archiveSource, /archive-year/)
assert.doesNotMatch(archiveSource, /<ArticleRow/)
```

- [ ] **Step 2: Verify RED**

```bash
node --test tests/signal-ledger-contract.test.mjs
```

- [ ] **Step 3: Implement real chronology**

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

Render actual years/months only; year is major registration, month secondary, posts compact. Use `SiteHeader active="archive"` and `SignalFooter`.

- [ ] **Step 4: Add responsive chronology CSS**

Desktop: narrow year zone + month rail + content field. At ≤760px collapse to one flow and replace vertical rail with short horizontal registration marks.

- [ ] **Step 5: Verify and commit**

```bash
node --test tests/post-index.test.mjs tests/signal-ledger-contract.test.mjs
npm run build
git add src/pages/archive.astro src/styles/signal-ledger.css tests/signal-ledger-contract.test.mjs
git commit -m "feat: turn archive into chronological Signal Ledger"
```

---

### Task 6: Topic Index + Tag Detail + Retire Old ArticleRow

**Files:**
- Modify: `src/pages/tags/index.astro`
- Modify: `src/pages/tags/[tag].astro`
- Modify: `src/styles/signal-ledger.css`
- Modify: `tests/signal-ledger-contract.test.mjs`
- Delete after no imports remain: `src/components/ArticleRow.astro`

**Interfaces:** uses `summarizeTopics()`; Tags index classes `.topic-index`, `.topic-row`, `.topic-count`, `.topic-latest`; tag detail uses `<LedgerEntry compact={true}>`.

- [ ] **Step 1: Add RED topic contracts**

```js
assert.match(tagsIndexSource, /summarizeTopics/)
assert.match(tagsIndexSource, /topic-index/)
assert.match(tagDetailSource, /LedgerEntry/)
assert.doesNotMatch(tagsIndexSource, /pill|chip|badge/i)
```

- [ ] **Step 2: Verify RED**

```bash
node --test tests/signal-ledger-contract.test.mjs
```

- [ ] **Step 3: Build topic index from real content**

Each row shows name, real count, and latest activity when present. Do not hard-code empty groups such as Systems/Cloud if content has none.

- [ ] **Step 4: Rebuild tag detail**

Use `SiteHeader active="tags"`, actual count, compact ledger entries, and `SignalFooter`. Preserve tag slug/static route behavior.

- [ ] **Step 5: Delete old ArticleRow when unused**

```bash
grep -R "ArticleRow" src || true
```

Expected before deletion: no imports/usages. Then delete `src/components/ArticleRow.astro`.

- [ ] **Step 6: Verify and commit**

```bash
node --test tests/post-index.test.mjs tests/signal-ledger-contract.test.mjs
npm test
npm run build
git add -A
git commit -m "feat: rebuild tags as Signal Ledger topic index"
```

---

### Task 7: Real Long-Form Stress Fixture + Production-Build Browser QA

**Files:**
- Create: `tests/fixtures/ai-design-99-workflow.md`
- Create: `scripts/prepare-signal-stress-fixture.mjs`
- Create: `scripts/signal-ledger-qa.mjs`
- Create: `.github/workflows/signal-ledger-qa.yml`
- Modify: `tests/deliver-qa.test.mjs`
- Delete after new workflow proves green: `scripts/deliver-qa.mjs`, `.github/workflows/deliver-qa.yml`

**Interfaces:** fixture is verbatim source; preparation writes only temporary `src/content/posts/__qa-ai-design-99.md`; QA artifact goes to `artifacts/signal-ledger-qa/`.

- [ ] **Step 1: Copy the saved stress article verbatim**

Use the saved user source already identified by title. Verify the heading and several representative Chinese body lines against the source before commit. Do not summarize/rewrite.

- [ ] **Step 2: Write RED QA contract**

Require all viewport pairs:

```js
for (const [w, h] of [
  [1920, 1080], [1440, 1000], [1280, 800], [1024, 1366],
  [768, 1024], [430, 932], [390, 844], [375, 812]
]) {
  assert.match(qaSource, new RegExp(`${w}.*${h}`, 's'))
}
```

Also require Home, Article, Archive, Tags, Search, Light, Dark, and `__qa-ai-design-99`.

- [ ] **Step 3: Verify RED**

```bash
node --test tests/deliver-qa.test.mjs
```

- [ ] **Step 4: Implement temporary stress post preparation**

The test fixture stays verbatim. Only generated QA copy is normalized:

```js
const converted = source.replace(
  /^\[image\]\((https?:\/\/[^)]+)\)$/gm,
  '![Article figure]($1)'
)
const frontmatter = `---\ntitle: "QA · 如何榨出 AI 设计的 99% 创造力：一套三阶段工作流"\ndescription: "Signal Ledger long-form stress fixture"\ndate: 2026-09-04\ncategory: "AI"\ntags: ["AI", "Design", "Workflow"]\ndraft: false\n---\n\n`
```

No prose transformation beyond the archival image-marker normalization above.

- [ ] **Step 5: Implement browser assertions**

For each target surface measure document overflow:

```js
const metrics = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth
}))
assert(metrics.scrollWidth <= metrics.innerWidth + 1, 'global horizontal overflow')
```

Also verify:

- Search opens by click and keyboard; Escape closes; opener regains focus.
- Dark/Light both render.
- 375px H1 is not clipped.
- Code/table scroll locally without widening document.
- Long URL does not create page overflow.
- Mobile TOC collapses and desktop TOC is sticky.
- Previous/Next reachable.
- Archive and Tags contain no invented empty groups.
- `prefers-reduced-motion: reduce` preserves functionality.
- no console/page errors.

Capture at least:

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

Plus final full-page screenshots for all eight acceptance viewports.

- [ ] **Step 6: Implement QA workflow**

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

`signal-ledger-qa.mjs` must poll `http://127.0.0.1:4321/` until ready before launching assertions; do not rely on fixed sleep alone.

- [ ] **Step 7: Verify locally/CI**

```bash
npm test
node scripts/prepare-signal-stress-fixture.mjs
npm run build
rm -f src/content/posts/__qa-ai-design-99.md
```

Expected: PASS; temporary QA post is absent from committed tree.

- [ ] **Step 8: Run new QA workflow once; then retire old Deliver QA pair**

Only after `signal-ledger-qa` succeeds on the branch, delete `scripts/deliver-qa.mjs` and `.github/workflows/deliver-qa.yml`; update `tests/deliver-qa.test.mjs` to forbid those retired paths.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "test: add Signal Ledger real-content browser QA"
```

---

### Task 8: Screenshot Gate + Fresh Critic Round 1

**Files:**
- Create: `docs/design-critic/round-1.md`
- Modify: only files justified by accepted Round-1 screenshot findings.

**Interfaces:** Critic input is screenshots only. No source/CSS/history/implementation rationale. Output sections: visual-language diagnosis, 3 serious problems, 3 strengths, 5 next actions, 0–10 score.

- [ ] Run Signal Ledger QA on current HEAD and download screenshot artifact.
- [ ] Send only the ten required screenshots to a Fresh Context critic using the approved rubric.
- [ ] Save its independent output to `docs/design-critic/round-1.md`.
- [ ] Select exactly the five highest-value screenshot-grounded changes that do not introduce a second signature element.
- [ ] For structural/behavior changes, write focused RED tests before implementation; for purely optical CSS changes, use before/after browser screenshots rather than meaningless string tests.
- [ ] Run `npm test`, `npm run build`, and full Signal Ledger QA.
- [ ] Commit:

```bash
git add -A
git commit -m "design: apply Signal Ledger critic round 1"
```

---

### Task 9: Fresh Critic Round 2

**Files:**
- Create: `docs/design-critic/round-2.md`
- Modify: only files justified by Round-2 screenshots.

- [ ] Generate fresh screenshots from Round-1 HEAD.
- [ ] Start a new Fresh Context critic; do not give it Round-1 output.
- [ ] Save diagnosis/3 problems/3 strengths/5 actions/score to `round-2.md`.
- [ ] Apply the five highest-value screenshot-grounded corrections that preserve Signal Ledger restraint/readability.
- [ ] Run `npm test`, `npm run build`, and full Signal Ledger QA.
- [ ] Commit:

```bash
git add -A
git commit -m "design: apply Signal Ledger critic round 2"
```

Round 2 never grants permission to skip Round 3.

---

### Task 10: Fresh Critic Round 3 + Stability Decision

**Files:**
- Create: `docs/design-critic/round-3.md`
- Modify: only files justified by Round-3 screenshots.

- [ ] Generate fresh screenshots from Round-2 HEAD.
- [ ] Start a third Fresh Context critic; expose neither prior critique.
- [ ] Save independent output to `round-3.md`.
- [ ] Apply the five highest-value corrections that remain consistent with the approved thesis.
- [ ] Run `npm test`, `npm run build`, and full Signal Ledger QA.
- [ ] If strong template/AI/SaaS influence, poor Chinese reading, or material mobile defects remain, repeat the same fresh-context process as Round 4 before Deliver.
- [ ] Commit:

```bash
git add -A
git commit -m "design: apply Signal Ledger critic round 3"
```

---

### Task 11: Deliver Reduction + Accessibility + Performance

**Files:**
- Create: `docs/design-critic/final-reduction.md`
- Modify: final production CSS/components/scripts only where subtraction requires it.
- Delete: any dead CSS/JS/component/QA residue discovered by inventory.

**Interfaces:** final CSS layers are `global.css`, `signal-ledger.css`, `reading.css`; no critic-round override sheets.

- [ ] **Step 1: Inventory every visual primitive**

`final-reduction.md` must audit every instance/category:

```text
Border / Shadow / Gradient / Background / Label / Tag / Icon / Button /
Container / Card / Animation / Decoration / Copy / Divider / Badge
```

Mark `keep` or `delete` with one sentence explaining information/orientation/interaction value. If removal loses nothing, delete it.

- [ ] **Step 2: Remove residue**

```bash
grep -R "orbit\|SpaceScene\|blackHole\|nav-portal\|flight-orb\|linear-gradient\|radial-gradient" src || true
grep -R "border-radius\|box-shadow" src/styles || true
```

Expected: no old Orbit/space system; no gradients; radius/shadow only if explicitly justified in `final-reduction.md`.

- [ ] **Step 3: Accessibility browser gate**

Verify:

```text
Tab reaches Search/nav/theme/article/copy controls
Ctrl/Cmd+K opens Search
Escape closes Search
Dialog returns focus to opener
Focus is visibly styled
Active TOC uses aria-current plus a non-color cue
Reduced motion preserves state/function
Heading hierarchy remains semantic
Body links are distinguishable
No document-level horizontal overflow
Light and Dark maintain readable contrast
```

- [ ] **Step 4: Performance gate**

```bash
npm ls --depth=0
npm run build
find dist/_astro -maxdepth 1 -type f -printf '%f %s\n' | sort -k2 -n
```

Expected: no `three`, no UI framework, and the old >500k Three homepage chunk warning is gone. Any new >500k script chunk is a failure to investigate before completion.

- [ ] **Step 5: Final acceptance matrix**

Viewports:

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

Surfaces/content:

```text
Home / Article / Archive / Tags / Search / Light / Dark /
Stress article / Long title / Long Chinese text / English title /
Code / Prompt / Image / Table / Quote / Long URL
```

- [ ] **Step 6: Final tests/build/QA**

```bash
npm test
npm run build
```

Then run `signal-ledger-qa` on the exact final HEAD.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "design: finish Signal Ledger V3 reduction pass"
```

---

### Task 12: Final Review + Merge-Readiness Gate

**Files:** no planned production changes unless review finds a concrete defect.

- [ ] Compare branch to main:

```bash
git diff --stat main...HEAD
git diff --name-status main...HEAD
```

Confirm only approved redesign/QA/docs changed; article source data, SEO model, RSS semantics, and deployment destination were not rewritten.

- [ ] Run exact-HEAD clean verification:

```bash
npm install
npm test
npm run build
```

Then run final Signal Ledger QA on that exact SHA.

- [ ] Manually inspect representative Light/Dark Desktop/Tablet/Mobile screenshots for Home, Article, Archive, Tags, Search, and stress article. Do not infer visual quality from numeric QA alone.

- [ ] Verify `.github/workflows/deploy.yml` was not repointed. Report deployment target precisely; never claim `blog.minglingyun.com` was verified when only a preview/Pages build was tested.

- [ ] Produce the user's required final report containing: Before screenshots; 10 Discover worlds; 3 finalists; selection rationale; Design Thesis/System/Typography/Grid/Color/Motion; Home/Article/Archive/Tags/Search/Mobile changes; Critic Rounds 1–3 and corresponding changes; final Desktop/Mobile screenshots; deleted old UI; new components; modified files; Build/Test/Accessibility/Performance results; Remaining Issues.

- [ ] Stop before merge. Merge only after explicit user approval.
