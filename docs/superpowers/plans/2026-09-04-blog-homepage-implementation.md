# Blog Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable, responsive React personal-blog homepage with restrained premium typography, animated orbital Hero, search, category filters, article interactions, and theme switching.

**Architecture:** Vite + React + TypeScript hosts a single homepage composed from small components. Article data is local typed data; pure filtering logic is isolated and unit-tested. Motion handles spring/reveal/hover interactions while CSS variables own layout, typography, theme, and reduced-motion fallbacks.

**Tech Stack:** React 19, TypeScript, Vite, Motion, Lucide React, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-04-blog-homepage-design.md`

## Global Constraints
- No Writing / Notes / Projects / About top navigation.
- Homepage contains identity, search, category filtering, article list, and footer.
- Warm white / near-black palette with one warm orange accent.
- No large card shadows or decorative heavy parallax.
- Orbit animation stops under `prefers-reduced-motion`.
- Desktop and mobile must not horizontally overflow.
- Remotion is not used for runtime page interaction.

---

### Task 1: Project scaffold and typed article filtering

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/types.ts`
- Create: `src/data/articles.ts`
- Create: `src/lib/filterArticles.ts`
- Test: `src/lib/filterArticles.test.ts`

**Interfaces:**
- Produces: `Article`, `ArticleCategory`, `articles`, `filterArticles(articles, query, category): Article[]`.

- [ ] Write failing tests covering empty filters, query matching title/summary/tags, category filtering, and combined query+category.
- [ ] Run `npm test -- --run src/lib/filterArticles.test.ts` and verify failure before implementation.
- [ ] Implement types, data, and `filterArticles` minimal logic.
- [ ] Run the same test and verify all cases pass.

### Task 2: Hero, orbit visual, and theme state

**Files:**
- Create: `src/components/Hero.tsx`
- Create: `src/components/OrbitVisual.tsx`
- Create: `src/components/ThemeToggle.tsx`
- Create: `src/hooks/useTheme.ts`

**Interfaces:**
- `ThemeToggle` consumes `{ theme: 'light' | 'dark'; toggleTheme(): void }`.
- `OrbitVisual` renders decorative DOM/SVG rings and dots with Motion.
- `Hero` composes intro text, social links, and orbit visual.

- [ ] Implement persisted theme state with system-theme fallback.
- [ ] Implement theme toggle with accessible button text.
- [ ] Build orbit visual with three rings, independent directions/speeds, hover acceleration, and reduced-motion fallback.
- [ ] Build Hero without top navigation links.

### Task 3: Search/filter controls and article list interactions

**Files:**
- Create: `src/components/SearchAndFilters.tsx`
- Create: `src/components/ArticleList.tsx`
- Create: `src/components/ArticleRow.tsx`

**Interfaces:**
- `SearchAndFilters` consumes query/category and emits setters.
- `ArticleList` consumes `Article[]`.
- `ArticleRow` consumes one `Article`.

- [ ] Build search field with visible keyboard hint and accessible label.
- [ ] Build horizontally scrollable category controls with animated active underline.
- [ ] Build article list with AnimatePresence/layout transitions and empty state.
- [ ] Build article row with date, title, summary, read time, tags, abstract thumbnail, 4px title hover shift, and 1.03 image hover scale.

### Task 4: Page composition and premium responsive styling

**Files:**
- Create: `src/App.tsx`
- Create: `src/styles.css`

**Interfaces:**
- `App` owns query/category/theme and passes filtered articles to list.

- [ ] Compose brand marker, theme toggle, Hero, controls, article list, and footer.
- [ ] Define CSS variables for light/dark palette, spacing, typography, borders, and accent.
- [ ] Implement desktop layout matching the approved mockup: generous Hero, slim article rows, no card-wall styling.
- [ ] Implement mobile layout: one-column Hero, smaller orbit, full-width search, horizontally scrollable categories, stacked article metadata.
- [ ] Add visible keyboard focus states and reduced-motion CSS.

### Task 5: Verification and visual capture

**Files:**
- Modify as needed from Tasks 1–4 only.
- Create: `README.md`

**Interfaces:**
- Final project runs with `npm run dev` and builds with `npm run build`.

- [ ] Run unit tests with `npm test -- --run`.
- [ ] Run production build with `npm run build`.
- [ ] Start Vite locally and capture desktop and mobile screenshots with Playwright/Chromium if available.
- [ ] Inspect screenshots for overflow, layout hierarchy, and accidental top navigation.
- [ ] Write concise README with local run commands and implementation notes.
