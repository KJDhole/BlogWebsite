# Blog V1 Content System Design

## Status

Approved direction, pending implementation-plan review.

## Goal

Turn the existing Glenn blog homepage prototype into a real, maintainable personal blog without changing its core visual identity or adding unnecessary product UI.

The V1 must do exactly three product-level things:

1. Store article content as Markdown files instead of hardcoded HTML/JavaScript data.
2. Generate a real article page for every published Markdown file.
3. Generate the homepage article list automatically from those Markdown files while preserving the existing search, category filtering, theme switch, mobile behavior, and orbital scroll animation.

## Non-goals

V1 does **not** add:

- CMS/admin UI
- login or authentication
- database-backed article storage
- comments
- Projects page
- About page
- a traditional HOME / WRITING / PROJECTS / ABOUT navigation bar
- RSS
- newsletter
- search service/backend
- analytics integration changes
- pagination
- tag archive pages
- MDX-only interactive article components

These can be reconsidered only after the Markdown publishing flow is working and actual content volume justifies them.

## Product Principle

The current homepage is the product surface. Do not redesign it into a conventional multi-page portfolio site.

The visible V1 surface is deliberately limited to:

- `/` — the existing Glenn homepage, fed by real content
- `/writing/<slug>/` — a restrained article reading page

The user should experience the same homepage they already approved, except article links now open real pages and the list is generated from content files.

## Technical Direction

Use Astro as a static-site build layer with local Markdown content collections.

Reasons:

- The site is content-first and does not require a runtime application server.
- Astro can generate one static HTML page per Markdown entry at build time.
- Existing native HTML/CSS/JavaScript and SVG animation logic can be retained without introducing React.
- GitHub remains the publishing backend: add/edit Markdown, commit, build, deploy.

No React, Vue, database, server API, or headless CMS is introduced in V1.

## Repository Shape

Target structure:

```text
BlogWebsite/
├── astro.config.mjs
├── package.json
├── src/
│   ├── content.config.ts
│   ├── content/
│   │   └── posts/
│   │       ├── commerce-agent-rules.md
│   │       ├── ai-native-development.md
│   │       ├── agent-memory-notes.md
│   │       ├── claude-code-workflow.md
│   │       └── building-in-public.md
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── ArticleLayout.astro
│   ├── components/
│   │   └── ArticleRow.astro
│   ├── pages/
│   │   ├── index.astro
│   │   └── writing/
│   │       └── [...slug].astro
│   ├── scripts/
│   │   ├── home.js
│   │   ├── orbitMotion.mjs
│   │   └── filterArticles.mjs
│   └── styles/
│       └── global.css
├── tests/
│   ├── filterArticles.test.mjs
│   ├── orbit-motion.test.mjs
│   └── ui-contract.test.mjs
└── docs/
```

The existing `prototype/` directory and standalone generated demo are migration sources, not permanent parallel implementations. Once the Astro version passes the same behavioral checks, duplicate prototype/build artifacts should be removed instead of maintained twice. Git history remains the archive.

## Content Model

Each article is one Markdown file in `src/content/posts/`.

Required frontmatter:

```yaml
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
```

Schema rules:

- `title`: non-empty string
- `description`: non-empty string
- `date`: date
- `category`: one of `AI | Agent | Development | Product | Thinking`
- `tags`: array of non-empty strings
- `visual`: optional decorative key matching the existing article visual styles
- `draft`: optional boolean, default `false`; drafts are excluded from production homepage and generated production routes

The URL slug comes from the Markdown entry ID / filename. No separate `slug` frontmatter is required in V1.

## Existing Five Articles

The five current homepage entries are already duplicated in `prototype/index.html` and `prototype/app.js`. They must be migrated into five Markdown files so there is one source of truth.

Do not invent substantive article content during migration. For each seed article:

- preserve the existing title, date, description, category, tags, and visual identity;
- use the existing description as the initial body paragraph where no full article text exists in the repository;
- make the URL real immediately;
- allow the body to be replaced later by editing only the Markdown file.

After migration, neither the homepage markup nor client JavaScript may contain a hardcoded article catalog.

## Homepage Rendering

`src/pages/index.astro` queries the published `posts` collection at build time and sorts entries by `date` descending.

Each entry renders through `ArticleRow.astro` using the existing row design.

The article title link points to:

```text
/writing/<entry-id>/
```

The row exposes its searchable/filterable metadata to the existing client interaction layer through `data-*` attributes. Example:

```html
<article
  class="article-row"
  data-title="..."
  data-description="..."
  data-category="Agent"
  data-tags="AI|Agent|Architecture"
>
```

The browser script reads already-rendered rows. It does not fetch article data and does not maintain a second JavaScript `articles` array.

This keeps the site static and makes search/filtering instant.

## Existing Homepage Behavior to Preserve

The migration must preserve the current visible/interaction contract:

- Glenn brand/header
- Hero copy
- SVG orbital system
- continuous multi-speed orbit motion
- scroll release → tangent flight → landing → category-indicator morph
- mobile-specific motion tuning
- `prefers-reduced-motion`
- article search and `Ctrl/Cmd + K`
- category filters
- animated active filter indicator
- empty state / clear filters
- light/dark theme switching
- article hover behavior
- responsive/mobile layout

The animation math in `prototype/orbitMotion.mjs` should be moved with minimal semantic changes. This migration is not an animation redesign.

## Article Page

The article page is intentionally restrained.

Visible structure:

```text
GLENN                                      theme toggle

ARTICLE CATEGORY
Article title
Description
DATE · READ TIME
Tags

Markdown body

← Back to home
```

No sidebar, floating table of contents, comments panel, share toolbar, author card, or related-post carousel in V1.

The article page reuses the same typography, color tokens, light/dark theme behavior, width rhythm, and responsive rules as the homepage.

Markdown rendering must support at minimum:

- headings
- paragraphs
- ordered/unordered lists
- links
- blockquotes
- inline code
- fenced code blocks
- images
- horizontal rules

## Reading Time

Reading time is derived at build time rather than required in frontmatter.

Use a small local utility with deterministic rules:

- count CJK characters as readable units;
- count whitespace-delimited Latin words as readable units;
- estimate one minute per 300 units;
- minimum displayed value is `1 min read`.

The same computed value is used on the homepage and article page so metadata cannot drift.

## Theme Behavior

Theme remains client-side and lightweight.

- Keep the existing light/dark toggle.
- Persist the selected theme in `localStorage`.
- Apply the saved theme before visible content settles to avoid a noticeable theme flash.
- Article pages and homepage must use the same theme key and token system.

No user account or server persistence is needed.

## Metadata / SEO Minimum

V1 includes only metadata required for a correct public article site:

Homepage:

- title
- description
- viewport / charset

Article page:

- unique `<title>`
- article description
- canonical path derived from the site configuration when a production site URL is configured
- Open Graph title/description using the same article metadata

Do not add a larger SEO subsystem, sitemap customization, structured-data generator, or social-image pipeline in this V1.

## Publishing Flow

The authoring workflow is intentionally Git-native:

```text
create/edit src/content/posts/<slug>.md
        ↓
git commit / push
        ↓
static build
        ↓
new homepage row + /writing/<slug>/ page
```

No UI editor is required.

A new article must not require editing `index.astro`, `home.js`, or any article registry.

## Build and Runtime

The production output is static HTML/CSS/JS.

Expected scripts:

```text
npm run dev     # Astro local development server
npm run build   # production static build
npm test        # pure behavior / contract tests
```

A successful `npm run build` is part of acceptance because it verifies collection schema and generated routes.

## Testing Strategy

Retain the existing pure motion and filtering tests wherever behavior is unchanged.

Update UI contract tests so they assert the Astro source contract instead of the old standalone prototype contract.

Required verification:

1. Orbit motion unit tests pass unchanged or with import-path-only updates.
2. Filtering tests verify query + category combinations.
3. UI contract tests verify:
   - homepage has the existing hero/orbit controls;
   - there is no hardcoded JavaScript article catalog;
   - article rows are generated from collection data;
   - article links target `/writing/.../`;
   - mobile and reduced-motion rules remain present.
4. `npm run build` succeeds.
5. Generated output contains one article page for each non-draft Markdown entry.
6. Homepage output contains the five migrated seed entries in descending date order.

## Acceptance Criteria

V1 is complete when all of the following are true:

- Opening `/` looks and behaves like the approved prototype, not a redesigned site.
- The five existing rows come from Markdown files.
- Adding a sixth Markdown file automatically adds a sixth homepage entry after build.
- Clicking an article title opens a real `/writing/<slug>/` page.
- Article pages render Markdown with readable desktop and mobile typography.
- Search and category filters work against generated rows.
- The orbital scroll animation still lands on the real `All` category indicator.
- Theme switching works consistently on home and article pages.
- No CMS, database, login, or extra top-level product pages have been added.
- The old duplicate hardcoded article catalog is gone.
- Tests pass and the static production build succeeds.

## Deferred After V1

Only evaluate these after the core publishing loop is in real use:

- richer About/Projects surfaces
- RSS
- sitemap enhancements
- analytics changes
- generated OG images
- full-text indexing beyond client-side homepage search
- pagination/archive pages
- tag pages
- comments
- CMS/editor
