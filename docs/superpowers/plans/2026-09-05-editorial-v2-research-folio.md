# Editorial V2 Research Folio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the partially implemented Editorial V2 redesign so the entire site reads as one coherent Research Folio across home, article, archive, tags, light/dark, desktop, and mobile while preserving the existing Orbit motion contract and production blog features.

**Architecture:** Keep Astro content collections, routing, SEO, RSS, search/filter logic, and the Three.js Orbit intact. Replace residual template UI with semantic editorial markup and consolidate visual language through existing `global.css`, `blog.css`, and `editorial.css`; the homepage remains the only large kinetic surface, while inner pages use typographic hierarchy and state-only interaction.

**Tech Stack:** Astro 7.3.1, vanilla JavaScript, CSS, Three.js 0.180.0, Node built-in test runner.

**Spec:** `docs/design/editorial-v2-discover.md`

## Global Constraints

- No new major visual object beyond Orbit.
- Do not change Orbit/orb motion thresholds, trajectories, handoff, landing, or navigation destination.
- Remove template chrome before adding visual treatments.
- Chinese reading quality outranks English display styling.
- Homepage list is an index, never a card grid.
- Article media width is semantic: body / wide / full.
- Prompt and code are different content types and must look different.
- Desktop TOC is marginal and quiet; mobile TOC is collapsible.
- One top hairline is enough for reading progress.
- Any new border/background/radius must justify an information role.
- Preserve Astro content collections, SEO/OG/JSON-LD, RSS, Archive, Tags, search/filtering, theme switch, responsive behavior, and accessibility.
- Preserve selectors required by `src/scripts/home.js` unless the script and regression tests are updated in the same task.

---

### Task 1: Lock the Editorial V2 contract

**Files:**
- Modify: `tests/editorial-v2.test.mjs`
- Test: `tests/editorial-v2.test.mjs`

**Interfaces:**
- Consumes: existing Astro page/component source files as static contract fixtures.
- Produces: regression assertions for semantic homepage navigation, editorial search/filter controls, archive/tag consistency, and article reading system.

- [ ] **Step 1: Add failing homepage contract assertions**

Require `src/pages/index.astro` to expose a quiet masthead/nav, a Research Folio statement, `id="article-search"`, category controls, an editorial index heading, and Archive/Tags/RSS utilities without adding card-thumbnail markup.

- [ ] **Step 2: Add failing inner-page contract assertions**

Require `archive.astro`, `tags/index.astro`, and `tags/[tag].astro` to use shared `SiteHeader`, the editorial index row component, and typographic page headers rather than pill/card class names.

- [ ] **Step 3: Run the focused test**

Run: `node --test tests/editorial-v2.test.mjs`
Expected: FAIL until the homepage/inner-page markup is updated.

- [ ] **Step 4: Commit the test contract**

```bash
git add tests/editorial-v2.test.mjs
git commit -m "test: lock research folio ui contract"
```

### Task 2: Rebuild the homepage as a Research Folio index

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/components/ArticleRow.astro`
- Modify only if selector compatibility requires it: `src/scripts/home.js`
- Test: `tests/editorial-v2.test.mjs`
- Test: `tests/orbit-motion.test.mjs`
- Test: `tests/scroll-story.test.mjs`

**Interfaces:**
- Consumes: `ArticleRow(post, readTime)`, `SpaceScene`, `SITE`, existing `#article-search`, `.filter-button`, `.filter-indicator`, `#article-list`, `#result-count`, `#empty-state`, `#clear-filters`, and Orbit portal selectors.
- Produces: an editorial homepage with the same functional hooks and unchanged Orbit motion semantics.

- [ ] **Step 1: Replace marketing-style hero copy with authored folio identity**

Use a compact author statement and one-sentence positioning focused on building, analysing, and thinking in public; retain GLENN, X, GitHub, theme toggle, and Orbit.

- [ ] **Step 2: Convert search/filter chrome into typographic utilities**

Keep the IDs/data attributes required by `home.js`, but remove the rounded input-card/pill visual language in markup. Categories remain buttons for accessibility and keyboard behavior.

- [ ] **Step 3: Convert Writing into a chronological publication index**

Keep `ArticleRow` semantic `<article>` rows with date, title, summary, category, and read time. No synthetic thumbnail slot, tag chips, or article cards.

- [ ] **Step 4: Preserve footer utilities and Orbit portal anchors**

Keep Archive, Tags, RSS, `nav-portal`, flight echoes, and flight orb hooks exactly available to existing animation code.

- [ ] **Step 5: Run homepage and motion regressions**

Run: `node --test tests/editorial-v2.test.mjs tests/orbit-motion.test.mjs tests/scroll-story.test.mjs tests/ui-contract.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro src/components/ArticleRow.astro src/scripts/home.js tests/editorial-v2.test.mjs
git commit -m "feat: rebuild homepage as research folio index"
```

### Task 3: Consolidate the visual system

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/styles/blog.css`
- Modify: `src/styles/editorial.css`
- Preserve unless a bug is found: `src/styles/space.css`
- Test: `tests/editorial-v2.test.mjs`
- Test: `tests/ui-contract.test.mjs`

**Interfaces:**
- Consumes: existing CSS variables and class names from homepage, article layout, inner pages, and SpaceScene.
- Produces: one Research Folio design language with paper/ink surfaces, editorial serif/sans hierarchy, hairline rules, orange proof marks, mobile-safe overflow, and dark-mode parity.

- [ ] **Step 1: Normalize tokens and reading measures**

Define/retain surface, ink, muted, rule, accent, reading-width, wide-media, toc-width, and spacing tokens. Avoid duplicated competing token definitions across the three stylesheets.

- [ ] **Step 2: Remove template chrome**

Restyle search, filters, index rows, empty state, inner page headers, tags, and navigation as typographic/rule-based UI. Remove unnecessary rounded panels, shadows, elevated cards, and decorative gradients outside Orbit.

- [ ] **Step 3: Tune Chinese-first article typography**

Keep body around an 18px-class desktop rhythm with CJK-aware serif fallback, stable line-height, restrained heading scale, readable links, blockquotes, ordered/unordered lists, and `overflow-wrap: anywhere` for long technical content.

- [ ] **Step 4: Separate code, prompts, tables, and media by information role**

Maintain `.prompt-block`, code copy affordances, horizontal table/code overflow, `.media-wide`, and `.media-full`; code should read as technical material, prompts as authored instruction blocks, and images as unforced evidence plates.

- [ ] **Step 5: Tune desktop and mobile independently**

At mobile widths preserve 18–22px safe margins, horizontally scrollable categories, readable long titles, code/table horizontal scroll, collapsible TOC, and no thumbnail tax. At desktop keep a narrow reading core and quiet marginal TOC.

- [ ] **Step 6: Run stylesheet contracts**

Run: `node --test tests/editorial-v2.test.mjs tests/ui-contract.test.mjs`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/styles/global.css src/styles/blog.css src/styles/editorial.css
git commit -m "style: unify research folio visual system"
```

### Task 4: Unify Archive and Tags with the publication index

**Files:**
- Modify: `src/pages/archive.astro`
- Modify: `src/pages/tags/index.astro`
- Modify: `src/pages/tags/[tag].astro`
- Modify if needed for shared semantics: `src/components/SiteHeader.astro`
- Test: `tests/editorial-v2.test.mjs`
- Test: `tests/production-blog.test.mjs`

**Interfaces:**
- Consumes: `SiteHeader`, `ArticleRow`, tag slug utilities, Astro content collection.
- Produces: Archive and Tags pages that visually and semantically belong to the same folio as home and article pages.

- [ ] **Step 1: Make Archive a full chronological register**

Use the same article index row treatment as home with a restrained title/count header and simple Home/RSS utilities.

- [ ] **Step 2: Make Tags a textual taxonomy index**

Render tag names/counts as a publication taxonomy list or register rather than chips/cards; keep actual links and accessible hit areas.

- [ ] **Step 3: Make individual tag pages use the same article register**

Keep filtered content behavior while matching Archive/home hierarchy.

- [ ] **Step 4: Run blog-feature regressions**

Run: `node --test tests/editorial-v2.test.mjs tests/production-blog.test.mjs tests/article-route.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/archive.astro src/pages/tags/index.astro src/pages/tags/[tag].astro src/components/SiteHeader.astro
git commit -m "feat: unify archive and tags editorial surfaces"
```

### Task 5: Finish the article reading system

**Files:**
- Modify only where necessary: `src/layouts/ArticleLayout.astro`
- Modify only where necessary: `src/scripts/articleEnhance.js`
- Modify: `src/styles/blog.css`
- Modify: `src/styles/editorial.css`
- Test: `tests/editorial-v2.test.mjs`
- Test: `tests/article-route.test.mjs`

**Interfaces:**
- Consumes: rendered Astro headings, post metadata, previous/next posts, `articleEnhance.js` enhancement hooks.
- Produces: a Chinese-first reading page with marginal desktop TOC, collapsible mobile TOC, one-line progress indicator, semantic wide/full media, prompt/code differentiation, source attribution, and publication navigation.

- [ ] **Step 1: Audit article header density and metadata**

Keep category, title, description, date, read time, and tags but ensure they read as publication metadata rather than badges.

- [ ] **Step 2: Audit TOC behavior and active states**

Preserve desktop marginal TOC and mobile `<details>` TOC, with `IntersectionObserver` active-state enhancement and no new animation library.

- [ ] **Step 3: Audit code/prompt enhancements**

Preserve native `navigator.clipboard` copy behavior and `[!PROMPT]` transformation. Ensure failed clipboard access degrades to readable code without breaking the article.

- [ ] **Step 4: Audit source and previous/next navigation**

Keep source provenance, Archive/Home return paths, and previous/next post links while reducing visual chrome.

- [ ] **Step 5: Run article regressions**

Run: `node --test tests/editorial-v2.test.mjs tests/article-route.test.mjs tests/content-contract.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/layouts/ArticleLayout.astro src/scripts/articleEnhance.js src/styles/blog.css src/styles/editorial.css
git commit -m "style: finish research folio reading system"
```

### Task 6: Full verification and delivery hardening

**Files:**
- Modify only if verification exposes a regression: `tests/*.test.mjs`, relevant source file
- Verify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: complete implementation from Tasks 1–5.
- Produces: buildable, test-passing Editorial V2 branch ready for PR/merge.

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: all Node tests PASS.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: Astro build exits 0 with all static routes generated.

- [ ] **Step 3: Verify preserved production features**

Check generated routes include home, article pages, Archive, Tags, RSS, sitemap/robots where configured; confirm no Orbit contract test changed to accommodate regressions.

- [ ] **Step 4: Review diff for scope drift**

Confirm no backend/CMS addition, no new animation system, no synthetic thumbnail requirement, no removal of SEO/RSS/Archive/Tags/search/theme/accessibility features.

- [ ] **Step 5: Commit any final verified fixes**

```bash
git add -A
git commit -m "chore: harden editorial v2 delivery"
```

- [ ] **Step 6: Open a pull request**

Title: `feat: finish Editorial V2 Research Folio redesign`

Body must summarize the homepage editorial index, inner-page unification, article reading polish, mobile behavior, preserved Orbit semantics, and test/build results.
