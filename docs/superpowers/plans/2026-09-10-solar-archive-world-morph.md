# Solar Archive World Morph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Solar Archive into a genuinely different scientific-publication layout and make Observatory → Solar Archive visibly transform the same page: stars gravitationally fold into the world toggle, the button radiates the new world outward, and shared DOM elements physically move into their Solar positions.

**Architecture:** Keep one Astro content tree and one persistent Three.js renderer. Introduce `data-layout-world` for destination geometry, a focused FLIP module for shared DOM motion, and a focused scene-viewport controller so the one WebGL canvas can expand from its stable hero anchor to a transition stage and settle into the destination anchor. `themeController.js` remains the transition orchestrator; `starField.mjs` owns gravitational star deformation; `solarField.mjs` owns the cropped solar-limb transition state.

**Tech Stack:** Astro 7.3.1, vanilla ES modules, CSS, Three.js 0.180.0, Node test runner, Playwright visual QA in existing workflow.

**Spec:** `docs/superpowers/specs/2026-09-10-solar-archive-world-morph-design.md`

## Global Constraints

- Preserve one content tree and one set of semantic DOM content; no duplicate Solar homepage or duplicate article list.
- Preserve one persistent Three.js renderer/context; no second persistent renderer.
- World-toggle transition origin is always the toggle center; never pointer `clientX/clientY`.
- No detached black eclipse core or opaque white/black circular wipe.
- Solar wave starts at approximately the toggle diameter, not `scale(.001)`.
- Observatory and Solar Archive must end with materially different layout geometry.
- Mobile keeps current-or-lower particle counts and must not horizontally overflow at 360/390 px.
- `prefers-reduced-motion: reduce` bypasses gravitational travel, large FLIP motion, and expanding ring while preserving final layouts.
- Do not allocate star transition geometry every frame; base/transition buffers are allocated once and reused.
- Preserve existing visibility/context-loss/resize cleanup guards.
- Existing search, filters, links, archive, tags, RSS, article navigation, and article content remain functional.
- Master duration remains 1500 ms unless a task explicitly changes a phase boundary together with tests/spec.
- Required exact visual checkpoints: `0 / 60 / 120 / 180 / 300 / 450 / 520 / 650 / 820 / 950 / 1080 / 1320 / 1500 ms`.

---

## File Structure

### Create

- `src/scripts/worldMorph.mjs` — pure FLIP measurement/inversion/interpolation for shared DOM elements.
- `src/scripts/sceneViewport.mjs` — maps Observatory/Solar scene anchors and transition stage to one fixed scene viewport.
- `tests/world-morph.test.mjs` — pure geometry tests for FLIP transforms/progress.
- `tests/scene-viewport.test.mjs` — pure rectangle interpolation and anchor/stage tests.

### Modify

- `src/pages/index.astro` — add morph identifiers, stable scene anchors, Solar publication metadata, shared article-row index metadata.
- `src/components/ArticleRow.astro` — add stable morph IDs/index labels without duplicating content.
- `src/components/SpaceScene.astro` — separate persistent fixed scene viewport from document-flow scene anchors.
- `src/components/ThemeTransition.astro` — remove detached eclipse-core furniture; keep button-linked corona/radiation furniture only.
- `src/scripts/themeController.js` — exact toggle-center origin, layout-world lifecycle, master timeline dispatch.
- `src/scripts/home.js` — initialize `worldMorph`, scene viewport, and pass normalized transition state to one scene.
- `src/scripts/spaceScene.mjs` — forward normalized transition state to stars/solar field and avoid `worldMix` fading stars before fold completes.
- `src/scripts/starField.mjs` — immutable base positions, curved depth-dependent gravitational fold, near-star streak state.
- `src/scripts/solarField.mjs` — solar-limb entry/withdraw/settle motion tied to transition phases.
- `src/styles/solar.css` — full Solar Archive editorial layout rewrite.
- `src/styles/world-transition.css` — transparent button-origin radiation ring/refraction only.
- `src/styles/global.css` — stable shared hooks for fixed scene viewport and morph transforms only where needed.
- `src/scripts/themeWorld.mjs` — expose explicit phase boundaries/helpers if needed by controllers/tests while preserving 1500 ms contract.
- `tests/solar-archive-contract.test.mjs` — DOM/layout/world-transition contracts.
- `tests/deliver-qa.test.mjs` — dense checkpoint and integration contract.
- `tests/theme-world.test.mjs` — phase boundary contracts if helpers are exposed.
- `scripts/world-transition-qa.mjs` — exact early-frame screenshots, geometry assertions, same-DOM assertions, star-fold assertions.
- `scripts/deliver-qa.mjs` — stable Solar layout screenshots and mobile overflow checks.

---

### Task 1: Establish the new Solar layout contract and shared morph hooks

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/components/ArticleRow.astro`
- Modify: `tests/solar-archive-contract.test.mjs`

**Interfaces:**
- Consumes: existing single `posts.map(...)`, existing `data-world-toggle`, existing `ArticleRow` props.
- Produces: DOM hooks `data-world-morph`, `data-scene-anchor="observatory|solar"`, `data-layout-role`, stable per-row `data-world-morph="article-row-<index>"` identifiers.

- [ ] **Step 1: Write failing DOM contract tests**

Add contracts equivalent to:

```js
test('homepage exposes one shared morphable DOM tree for Observatory and Solar', async () => {
  const page = await read('../src/pages/index.astro')
  assert.equal((page.match(/posts\.map/g) ?? []).length, 1)
  assert.equal((page.match(/id="hero-title"/g) ?? []).length, 1)
  assert.match(page, /data-world-morph="hero-title"/)
  assert.match(page, /data-world-morph="hero-eyebrow"/)
  assert.match(page, /data-world-morph="primary-nav"/)
  assert.match(page, /data-world-morph="writing-heading"/)
  assert.match(page, /data-scene-anchor="observatory"/)
  assert.match(page, /data-scene-anchor="solar"/)
  assert.doesNotMatch(page, /solar-homepage-copy|duplicate-solar-list/)
})

test('article rows expose stable morph identity without duplicating title content', async () => {
  const row = await read('../src/components/ArticleRow.astro')
  assert.match(row, /data-world-morph=/)
  assert.match(row, /data-entry-index=/)
  assert.equal((row.match(/class="article-title"/g) ?? []).length, 1)
})
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
npm test
```

Expected: the new morph/anchor contracts fail because current markup has no `data-world-morph` or scene anchors.

- [ ] **Step 3: Add shared morph hooks and Solar publication metadata**

Use one DOM tree. The relevant shape should become:

```astro
<header class="site-topbar folio-topbar" data-world-morph="masthead">
  <a class="brand" data-world-morph="brand" ...>...</a>
  <nav class="folio-nav" data-world-morph="primary-nav" ...>...</nav>
  <button data-world-toggle data-world-morph="world-toggle" ...>...</button>
</header>

<section class="hero cosmic-hero reveal-block" ...>
  <div class="hero-copy folio-intro" data-world-morph="hero-copy">
    <p class="eyebrow world-eyebrow" data-world-morph="hero-eyebrow" ...>...</p>
    <div class="solar-observation-meta" data-world-morph="observation-meta" aria-hidden="true">...</div>
    <h1 id="hero-title" data-world-morph="hero-title">...</h1>
    <p class="hero-intro" data-world-morph="principles">...</p>
    <p class="folio-note" data-world-morph="hero-note">...</p>
    <div class="social-row" data-world-morph="social-row">...</div>
  </div>

  <div class="scene-anchor scene-anchor-observatory" data-scene-anchor="observatory" aria-hidden="true"></div>
  <div class="scene-anchor scene-anchor-solar" data-scene-anchor="solar" aria-hidden="true"></div>
</section>

<header class="index-heading reveal-block" data-world-morph="writing-heading">...</header>
<div class="index-tools controls reveal-block" data-world-morph="writing-tools">...</div>
```

Pass row index into `ArticleRow`:

```astro
{posts.map((post, index) => (
  <ArticleRow post={post} index={index} readTime={estimateReadingTime(post.body ?? '')} />
))}
```

In `ArticleRow.astro`:

```astro
const { post, readTime, index = 0 } = Astro.props
const entryNumber = String(index + 1).padStart(2, '0')
```

and:

```astro
<article
  class="article-row reveal-item is-visible"
  data-world-morph={`article-row-${index}`}
  data-entry-index={entryNumber}
  ...
>
```

Do not duplicate the article title or summary.

- [ ] **Step 4: Run tests and verify GREEN**

Run:

```bash
npm test
npm run build
```

Expected: all unit/contract tests pass and Astro build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro src/components/ArticleRow.astro tests/solar-archive-contract.test.mjs
git commit -m "feat: add shared world morph layout hooks"
```

---

### Task 2: Build a pure FLIP geometry engine for same-DOM movement

**Files:**
- Create: `src/scripts/worldMorph.mjs`
- Create: `tests/world-morph.test.mjs`
- Modify: `src/styles/global.css`

**Interfaces:**
- Produces:
  - `createFlipDelta(fromRect, toRect) -> { x, y, scaleX, scaleY }`
  - `sampleFlip(delta, progress) -> { x, y, scaleX, scaleY }`
  - `createWorldMorph(root, { reducedMotion }) -> { prepare(toWorld), setProgress(progress), finish(), refresh(), destroy() }`
- Consumes: `[data-world-morph]` elements and `root.dataset.layoutWorld`.

- [ ] **Step 1: Write failing pure geometry tests**

Create `tests/world-morph.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { createFlipDelta, sampleFlip } from '../src/scripts/worldMorph.mjs'

test('createFlipDelta maps destination geometry back to source geometry', () => {
  const from = { left: 100, top: 80, width: 400, height: 120 }
  const to = { left: 620, top: 170, width: 620, height: 180 }
  assert.deepEqual(createFlipDelta(from, to), {
    x: -520,
    y: -90,
    scaleX: 400 / 620,
    scaleY: 120 / 180
  })
})

test('sampleFlip starts fully inverted and settles to identity', () => {
  const delta = { x: -520, y: -90, scaleX: 0.5, scaleY: 0.75 }
  assert.deepEqual(sampleFlip(delta, 0), delta)
  assert.deepEqual(sampleFlip(delta, 1), { x: 0, y: 0, scaleX: 1, scaleY: 1 })
})
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```bash
node --test tests/world-morph.test.mjs
```

Expected: module/function-not-found failure.

- [ ] **Step 3: Implement pure helpers and controller**

Implement helpers:

```js
export function createFlipDelta(fromRect, toRect) {
  return {
    x: fromRect.left - toRect.left,
    y: fromRect.top - toRect.top,
    scaleX: fromRect.width / Math.max(1, toRect.width),
    scaleY: fromRect.height / Math.max(1, toRect.height)
  }
}

export function sampleFlip(delta, progress) {
  const t = Math.min(1, Math.max(0, progress))
  return {
    x: delta.x * (1 - t),
    y: delta.y * (1 - t),
    scaleX: 1 + (delta.scaleX - 1) * (1 - t),
    scaleY: 1 + (delta.scaleY - 1) * (1 - t)
  }
}
```

The DOM controller must:

```js
const nodes = [...root.querySelectorAll('[data-world-morph]')]
```

Measure source rectangles, set `root.dataset.layoutWorld = toWorld`, measure destination rectangles on the next layout read, store deltas by `data-world-morph`, and during `setProgress(progress)` write only CSS variables:

```js
node.style.setProperty('--morph-x', `${frame.x}px`)
node.style.setProperty('--morph-y', `${frame.y}px`)
node.style.setProperty('--morph-scale-x', String(frame.scaleX))
node.style.setProperty('--morph-scale-y', String(frame.scaleY))
```

In `global.css`, shared morph nodes use:

```css
[data-world-morph] {
  transform-origin: 0 0;
}
html[data-world-morphing='true'] [data-world-morph] {
  transform:
    translate3d(var(--morph-x, 0px), var(--morph-y, 0px), 0)
    scale(var(--morph-scale-x, 1), var(--morph-scale-y, 1));
  will-change: transform;
}
```

`finish()` removes inline morph variables and `data-world-morphing`; stable `data-layout-world` remains equal to final world.

For `reducedMotion`, `prepare()` sets destination layout but stores no deltas, and `setProgress()` is a no-op.

- [ ] **Step 4: Run geometry and full tests**

```bash
node --test tests/world-morph.test.mjs
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/worldMorph.mjs src/styles/global.css tests/world-morph.test.mjs
git commit -m "feat: add shared DOM FLIP world morph"
```

---

### Task 3: Decouple the one WebGL scene from the old right-side hero box

**Files:**
- Create: `src/scripts/sceneViewport.mjs`
- Create: `tests/scene-viewport.test.mjs`
- Modify: `src/components/SpaceScene.astro`
- Modify: `src/styles/global.css`
- Modify: `src/scripts/home.js`

**Interfaces:**
- Produces:
  - `interpolateRect(from, to, progress) -> rect`
  - `createSceneViewport(sceneNode, { getAnchor, reducedMotion }) -> { setWorld(world), setTransition(detail), refresh(), destroy() }`
- Consumes: `[data-scene-anchor="observatory"]`, `[data-scene-anchor="solar"]`, existing `[data-space-scene]` node.

- [ ] **Step 1: Write failing viewport math tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { interpolateRect } from '../src/scripts/sceneViewport.mjs'

test('interpolateRect moves the one scene viewport continuously between anchors', () => {
  const from = { left: 820, top: 130, width: 430, height: 430 }
  const to = { left: 780, top: 80, width: 620, height: 520 }
  assert.deepEqual(interpolateRect(from, to, 0), from)
  assert.deepEqual(interpolateRect(from, to, 1), to)
  assert.deepEqual(interpolateRect(from, to, 0.5), {
    left: 800,
    top: 105,
    width: 525,
    height: 475
  })
})
```

- [ ] **Step 2: Verify RED**

```bash
node --test tests/scene-viewport.test.mjs
```

Expected: module/function-not-found.

- [ ] **Step 3: Implement fixed viewport and transition stage**

`SpaceScene.astro` should keep the same one canvas but the root scene node becomes a fixed visual viewport:

```html
<div class="space-scene world-scene-viewport" data-space-scene aria-hidden="true">
  <canvas class="space-canvas" data-space-canvas tabindex="-1"></canvas>
  ...
</div>
```

Add CSS:

```css
.world-scene-viewport {
  position: fixed;
  left: 0;
  top: 0;
  width: 1px;
  height: 1px;
  pointer-events: none;
  overflow: visible;
  transform: translate3d(var(--scene-x, 0px), var(--scene-y, 0px), 0);
  z-index: 0;
}
```

`sceneViewport.mjs` reads anchor rectangles and a full-screen transition rect:

```js
const stageRect = () => ({ left: 0, top: 0, width: innerWidth, height: innerHeight })
```

For Observatory → Solar:

- progress `0..0.35`: Observatory anchor → full viewport.
- progress `0.35..0.72`: hold near full viewport while star fold/radiation occurs.
- progress `0.72..1`: full viewport → Solar anchor.

For reverse, mirror the semantic stages without blindly reversing visual effects.

Write rectangle values to CSS variables and call `spaceScene.resize()` after meaningful size changes, throttled through `requestAnimationFrame`.

- [ ] **Step 4: Integrate with `home.js`**

Initialize once after scene creation:

```js
sceneViewport = createSceneViewport(spaceSceneNode, {
  reducedMotion: reducedMotion.matches,
  getAnchor(world) {
    return document.querySelector(`[data-scene-anchor="${world}"]`)?.getBoundingClientRect()
  }
})
```

On `glenn:worldtransition`, call `sceneViewport.setTransition(event.detail)` before `spaceScene.setWorldTransition(event.detail)`.

On `glenn:worldchange`, call `sceneViewport.setWorld(world)`.

On resize, call `sceneViewport.refresh()` before `spaceScene.resize()`.

- [ ] **Step 5: Verify GREEN**

```bash
node --test tests/scene-viewport.test.mjs
npm test
npm run build
```

Expected: PASS; one scene/canvas still exists.

- [ ] **Step 6: Commit**

```bash
git add src/scripts/sceneViewport.mjs tests/scene-viewport.test.mjs src/components/SpaceScene.astro src/styles/global.css src/scripts/home.js
git commit -m "feat: let one scene viewport follow world layout"
```

---

### Task 4: Implement depth-dependent gravitational star folding

**Files:**
- Modify: `src/scripts/starField.mjs`
- Modify: `src/scripts/spaceScene.mjs`
- Modify: `tests/solar-archive-contract.test.mjs`

**Interfaces:**
- `starField.setTransitionState(detail)` consumes:

```ts
{
  direction: 'to-solar' | 'to-observatory',
  progress: number,
  phase: string,
  phaseProgress: number,
  sceneOriginX: number,
  sceneOriginY: number
}
```

- `spaceScene.setWorldTransition(detail)` forwards transition detail to stars and solar field.

- [ ] **Step 1: Write failing star-fold contracts**

Add assertions that production code contains immutable base position storage, a transition-state API, no per-frame `new Float32Array`, and curved/depth-dependent deformation:

```js
test('star field owns deterministic depth-dependent gravitational fold state', async () => {
  const stars = await read('../src/scripts/starField.mjs')
  assert.match(stars, /basePositions/)
  assert.match(stars, /setTransitionState/)
  assert.match(stars, /foldStrength/)
  assert.match(stars, /curve|bend|tangent/i)
  assert.match(stars, /far[\s\S]*mid[\s\S]*near/)
})
```

- [ ] **Step 2: Verify RED**

```bash
npm test
```

Expected: the new star-fold contract fails.

- [ ] **Step 3: Preserve immutable base positions**

In `createLayer`, retain a clone once:

```js
const basePositions = positions.slice()
return { points, geometry, material, basePositions, baseOpacity: opacity }
```

Do not allocate inside `update()`.

- [ ] **Step 4: Add deterministic curved fold sampling**

Add a module-local helper:

```js
function foldPoint(x, y, targetX, targetY, progress, depthWeight) {
  const t = clamp01(progress) * depthWeight
  const dx = targetX - x
  const dy = targetY - y
  const distance = Math.hypot(dx, dy) || 1
  const nx = -dy / distance
  const ny = dx / distance
  const bend = Math.sin(Math.PI * t) * distance * 0.08 * depthWeight
  const eased = 1 - Math.pow(1 - t, 3)
  return {
    x: x + dx * eased + nx * bend,
    y: y + dy * eased + ny * bend
  }
}
```

Layer weights:

```js
const DEPTH_WEIGHT = { far: 0.28, mid: 0.58, near: 0.90 }
```

During Observatory → Solar fold window (`120..520 ms` expressed through normalized transition progress/phase), update each position attribute from immutable base positions. Far fades earlier; mid bends visibly; near bends strongest.

Near stars may temporarily increase `PointsMaterial.size` and reduce opacity to create restrained streak impression; do not create line geometry per star.

When transition ends, restore position buffers exactly to base positions before stable world visibility logic takes over.

- [ ] **Step 5: Stop `worldMix` from prematurely erasing stars**

Current `spaceScene.mjs` fades stars directly with global `worldMix`. Change world-transition handling so stars own their transition visibility:

```js
stars.setTransitionState(detail)
solarField.setTransitionState(detail)
```

Stable `setWorld()` can still call `stars.setWorldMix(...)`; active transitions must not overwrite star fold opacity each frame through `setWorldMix(progress)`.

- [ ] **Step 6: Verify**

```bash
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/scripts/starField.mjs src/scripts/spaceScene.mjs tests/solar-archive-contract.test.mjs
git commit -m "feat: fold star field into the world toggle"
```

---

### Task 5: Replace pointer-origin eclipse with button-origin radiation orchestration

**Files:**
- Modify: `src/scripts/themeController.js`
- Modify: `src/components/ThemeTransition.astro`
- Modify: `src/styles/world-transition.css`
- Modify: `src/styles/solar.css`
- Modify: `tests/solar-archive-contract.test.mjs`
- Modify: `tests/theme-world.test.mjs`

**Interfaces:**
- `themeController` dispatches normalized detail including:

```ts
{
  fromWorld,
  toWorld,
  direction,
  progress,
  phase,
  phaseProgress,
  originX,
  originY,
  toggleDiameter,
  waveRadius
}
```

- [ ] **Step 1: Write failing transition-origin tests**

Contracts:

```js
test('theme transition origin is always the world-toggle center', async () => {
  const controller = await read('../src/scripts/themeController.js')
  assert.match(controller, /rect\.left \+ rect\.width \/ 2/)
  assert.match(controller, /rect\.top \+ rect\.height \/ 2/)
  assert.doesNotMatch(controller, /clientX|clientY/)
})

test('transition furniture has no detached eclipse core and wave starts from toggle size', async () => {
  const component = await read('../src/components/ThemeTransition.astro')
  const css = `${await read('../src/styles/solar.css')}\n${await read('../src/styles/world-transition.css')}`
  assert.doesNotMatch(component, /data-eclipse-core/)
  assert.doesNotMatch(css, /\.theme-eclipse-core/)
  assert.match(css, /--world-toggle-diameter/)
  assert.doesNotMatch(css, /scale\(\.001\)|scale\(0\.001\)/)
})
```

- [ ] **Step 2: Verify RED**

```bash
npm test
```

Expected: failures show existing pointer coordinates and eclipse core.

- [ ] **Step 3: Simplify transition component**

`ThemeTransition.astro` becomes:

```astro
<div class="theme-transition" data-theme-transition aria-hidden="true">
  <span class="theme-corona" data-corona></span>
  <span class="theme-solar-wave" data-solar-wave></span>
  <span class="theme-transition-caption" data-transition-caption>Two modes of the same mind.</span>
</div>
```

No eclipse core.

- [ ] **Step 4: Make geometry derive only from the button**

Replace `getOrigin(button, event)` with:

```js
function getToggleGeometry(button) {
  const rect = button.getBoundingClientRect()
  const origin = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  }
  const radius = Math.hypot(
    Math.max(origin.x, innerWidth - origin.x),
    Math.max(origin.y, innerHeight - origin.y)
  )
  return {
    origin,
    toggleDiameter: Math.max(rect.width, rect.height),
    waveRadius: radius
  }
}
```

Click and keyboard both call the same `requestWorldToggle(button)`; event coordinates are never passed.

Set CSS variables:

```js
root.style.setProperty('--world-origin-x', `${origin.x}px`)
root.style.setProperty('--world-origin-y', `${origin.y}px`)
root.style.setProperty('--world-toggle-diameter', `${toggleDiameter}px`)
root.style.setProperty('--world-wave-radius', `${waveRadius}px`)
```

- [ ] **Step 5: Tie layout morph into transition lifecycle**

`themeController` should not implement FLIP itself. It dispatches phases; `home.js/worldMorph` responds. Add stable `data-layout-world` initialization and ensure destination layout is selected at transition start, while `data-world` swaps only at the radiation boundary.

Use phase boundaries consistent with spec:

```js
const DURATION_MS = 1500
const WORLD_SWAP_AT_MS = 650
```

The visible destination should emerge inside the wave; do not switch at 120/300 ms.

If `themeWorld.mjs` phase names are revised, use semantic phases:

```txt
ignition      0–120
fold          120–300
layout-release 300–520
radiation     520–820
solar-arrival 820–1080
index-rebuild 1080–1320
settle        1320–1500
```

Update tests in the same commit so phase names/boundaries are explicit and stable.

- [ ] **Step 6: Rewrite wave CSS as a transparent refraction ring**

The wave element keeps full radius dimensions but starts at toggle diameter through a computed scale:

```css
.theme-solar-wave {
  width: calc(var(--world-wave-radius) * 2);
  height: calc(var(--world-wave-radius) * 2);
  transform: translate(-50%, -50%) scale(var(--world-wave-scale-start));
  background:
    radial-gradient(circle,
      transparent 0 72%,
      rgba(198, 218, 236, .10) 76%,
      rgba(91, 139, 202, .45) 78.5%,
      rgba(255, 248, 220, .72) 80.5%,
      rgba(214, 99, 61, .18) 81.3%,
      transparent 85.8%);
}
```

Set:

```js
const waveScaleStart = toggleDiameter / Math.max(1, waveRadius * 2)
root.style.setProperty('--world-wave-scale-start', String(waveScaleStart))
```

Radiation phase interpolates scale from `waveScaleStart` to `1.02`. The center remains transparent, so destination content is visible inside the wave.

- [ ] **Step 7: Verify**

```bash
npm test
npm run build
```

Expected: PASS, no `clientX/clientY`, no eclipse core, no `.001` wave start.

- [ ] **Step 8: Commit**

```bash
git add src/scripts/themeController.js src/components/ThemeTransition.astro src/styles/world-transition.css src/styles/solar.css src/scripts/themeWorld.mjs tests/solar-archive-contract.test.mjs tests/theme-world.test.mjs
git commit -m "feat: radiate world switch from the toggle"
```

---

### Task 6: Rebuild Solar Archive as a materially different scientific publication

**Files:**
- Modify: `src/styles/solar.css`
- Modify: `src/pages/index.astro`
- Modify: `src/components/ArticleRow.astro`
- Modify: `tests/solar-archive-contract.test.mjs`

**Interfaces:**
- Consumes: `html[data-layout-world='solar']` for destination geometry and `html[data-world='solar']` for stable palette/render world.
- Produces: materially different Solar geometry for header, hero, scene anchor, writing heading, tools, and article rows.

- [ ] **Step 1: Write failing layout distinction contracts**

Add exact selectors/contracts:

```js
test('Solar Archive uses a materially different editorial grid from Observatory', async () => {
  const css = await read('../src/styles/solar.css')
  assert.match(css, /html\[data-layout-world=['"]solar['"]\] \.cosmic-hero/)
  assert.match(css, /grid-template-columns:\s*minmax\([^)]*\)\s+minmax\([^)]*\)/)
  assert.match(css, /html\[data-layout-world=['"]solar['"]\] #hero-title/)
  assert.match(css, /html\[data-layout-world=['"]solar['"]\] \.publication-register \.article-row/)
  assert.match(css, /grid-template-columns:[^;]*\bdate|ENTRY|FIELD/i)
})
```

The test should assert actual changed grid areas/columns, not just changed colors.

- [ ] **Step 2: Verify RED**

```bash
npm test
```

Expected: current Solar CSS fails the stronger geometry contract.

- [ ] **Step 3: Rewrite Solar header and hero geometry**

Use `data-layout-world` selectors for geometry so FLIP can measure Solar targets before the color world changes.

Desktop target:

```css
html[data-layout-world='solar'] .page-shell {
  width: min(1320px, calc(100% - 72px));
}

html[data-layout-world='solar'] .folio-topbar {
  height: 82px;
  display: grid;
  grid-template-columns: 1fr auto auto;
  border-bottom: 1px solid var(--solar-rule);
}

html[data-layout-world='solar'] .cosmic-hero {
  min-height: 650px;
  display: grid;
  grid-template-columns: minmax(220px, .72fr) minmax(560px, 1.55fr);
  grid-template-rows: auto 1fr auto;
  column-gap: clamp(48px, 7vw, 120px);
  align-items: stretch;
}

html[data-layout-world='solar'] .folio-intro {
  display: contents;
}

html[data-layout-world='solar'] .world-eyebrow,
html[data-layout-world='solar'] .solar-observation-meta {
  grid-column: 1;
}

html[data-layout-world='solar'] #hero-title {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: center;
  max-width: 760px;
  font-size: clamp(72px, 7.2vw, 118px);
  line-height: .88;
}

html[data-layout-world='solar'] .hero-intro,
html[data-layout-world='solar'] .folio-note,
html[data-layout-world='solar'] .social-row {
  grid-column: 1;
}
```

The Solar scene anchor occupies the upper-right/cropped solar-limb region and must not match the Observatory right-box dimensions.

- [ ] **Step 4: Rewrite Writing as Issue Index**

Target row geometry:

```css
html[data-layout-world='solar'] .publication-register .article-row {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr) 170px;
  grid-template-areas: "date entry meta";
  align-items: start;
  min-height: 154px;
  border-top: 1px solid var(--solar-rule);
}
```

Add a visible entry number via pseudo-element using existing `data-entry-index`:

```css
html[data-layout-world='solar'] .publication-register .article-row::before {
  content: attr(data-entry-index);
  position: absolute;
  right: 0;
  top: 16px;
  font: 600 10px/1 var(--sans);
  letter-spacing: .16em;
  color: var(--solar-cobalt);
}
```

Do not duplicate article title or summary.

- [ ] **Step 5: Add restrained scientific publication details**

Use hairline cobalt rules, mono metadata, observation labels, and cropped solar edge. No dashboard cards. Keep orange/red only for small solar marks.

- [ ] **Step 6: Add mobile Solar target**

At `max-width: 760px`:

```css
html[data-layout-world='solar'] .cosmic-hero {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto auto auto;
  min-height: 680px;
}

html[data-layout-world='solar'] #hero-title {
  grid-column: 1;
  font-size: clamp(52px, 14vw, 76px);
}

html[data-layout-world='solar'] .publication-register .article-row {
  grid-template-columns: 1fr auto;
  grid-template-areas:
    "date meta"
    "entry entry";
}
```

No horizontal overflow.

- [ ] **Step 7: Verify**

```bash
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/styles/solar.css src/pages/index.astro src/components/ArticleRow.astro tests/solar-archive-contract.test.mjs
git commit -m "feat: rebuild Solar Archive editorial layout"
```

---

### Task 7: Animate solar-limb arrival and complete two-way orchestration

**Files:**
- Modify: `src/scripts/solarField.mjs`
- Modify: `src/scripts/home.js`
- Modify: `src/scripts/themeController.js`
- Modify: `src/scripts/worldMorph.mjs`
- Modify: `src/scripts/sceneViewport.mjs`
- Modify: `tests/solar-archive-contract.test.mjs`

**Interfaces:**
- `solarField.setTransitionState(detail)` drives entry/withdraw transforms.
- `worldMorph.prepare(toWorld)` runs once at transition start.
- `worldMorph.setProgress(progress)` runs during layout-release through settle.
- `worldMorph.finish()` runs at stable destination.
- `sceneViewport.setTransition(detail)` and `starField.setTransitionState(detail)` share the same normalized detail.

- [ ] **Step 1: Write failing integration contracts**

```js
test('home coordinates one shared world transition across DOM and scene', async () => {
  const home = await read('../src/scripts/home.js')
  assert.match(home, /createWorldMorph/)
  assert.match(home, /createSceneViewport/)
  assert.match(home, /glenn:worldtransition/)
  assert.match(home, /setTransition/)
})

test('Solar limb has explicit transition arrival and reverse withdrawal', async () => {
  const solar = await read('../src/scripts/solarField.mjs')
  assert.match(solar, /to-solar/)
  assert.match(solar, /to-observatory/)
  assert.match(solar, /setTransitionState/)
  assert.match(solar, /position|scale/)
})
```

- [ ] **Step 2: Verify RED**

```bash
npm test
```

Expected: integration contract fails until orchestration is wired.

- [ ] **Step 3: Drive DOM morph from normalized transition detail**

In `home.js`:

```js
window.addEventListener('glenn:worldtransitionstart', event => {
  worldMorph?.prepare(event.detail.toWorld)
})

window.addEventListener('glenn:worldtransition', event => {
  const detail = event.detail ?? {}
  worldMorph?.setProgress(detail.layoutProgress ?? detail.progress ?? 0)
  sceneViewport?.setTransition(detail)
  spaceScene?.setWorldTransition?.(detail)
})

window.addEventListener('glenn:worldtransitionend', event => {
  worldMorph?.finish()
  sceneViewport?.setWorld(event.detail.world)
})
```

If new start/end events are added, `themeController.js` dispatches them exactly once per run.

- [ ] **Step 4: Give solar field semantic arrival/withdraw transforms**

At stable Solar, retain existing cropped limb target. During Observatory → Solar:

- before 520 ms: hidden/very low mix;
- 520–820: enter from upper-right with scale around `1.08 → 1.00` and `x +0.7 → 0` relative to target;
- 820–1080: settle overshoot no more than `0.03` scene units;
- after 1080: stable quiet motion.

During Solar → Observatory:

- withdraw before stars dominate;
- decrease opacity/mix while moving slightly further upper-right;
- do not simply reverse all time samples.

Reuse group transform; do not recreate mesh/shader.

- [ ] **Step 5: Implement semantic reverse transition**

Reverse order:

1. Solar limb withdraws.
2. Cobalt publication structure loses contrast.
3. Shared DOM FLIP begins toward Observatory geometry.
4. Light/radiation contracts into the button.
5. Stars re-expand from the button along curved paths.
6. Observatory left-column title and right-side scene settle.

The same APIs are used; phase-specific progress mapping differs by direction inside the owning modules.

- [ ] **Step 6: Reduced-motion path**

When reduced motion matches:

```js
worldMorph.prepare(toWorld)
applyWorld(toWorld)
worldMorph.finish()
sceneViewport.setWorld(toWorld)
```

No gravitational travel, no expanding ring, no large transform sequence.

- [ ] **Step 7: Verify**

```bash
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/scripts/solarField.mjs src/scripts/home.js src/scripts/themeController.js src/scripts/worldMorph.mjs src/scripts/sceneViewport.mjs tests/solar-archive-contract.test.mjs
git commit -m "feat: orchestrate reversible world morph"
```

---

### Task 8: Expand exact visual QA and verify every acceptance criterion

**Files:**
- Modify: `scripts/world-transition-qa.mjs`
- Modify: `scripts/deliver-qa.mjs`
- Modify: `tests/deliver-qa.test.mjs`
- Modify: `tests/solar-archive-contract.test.mjs`

**Interfaces:**
- QA consumes production `glenn:worldtransition*` events and the live DOM/scene state.
- QA produces screenshots/artifact and `report.json` with explicit failures.

- [ ] **Step 1: Write failing dense-checkpoint QA contract**

Update `tests/deliver-qa.test.mjs` to require:

```js
assert.match(
  qa,
  /0,\s*60,\s*120,\s*180,\s*300,\s*450,\s*520,\s*650,\s*820,\s*950,\s*1080,\s*1320,\s*1500/
)
assert.match(qa, /toggleDiameter/)
assert.match(qa, /same DOM|heroTitleNode|articleRowNodes/)
assert.match(qa, /star.*fold|fold.*star/i)
```

- [ ] **Step 2: Verify RED**

```bash
npm test
```

Expected: dense QA contract fails until script is updated.

- [ ] **Step 3: Capture exact frames**

Set:

```js
const CHECKPOINTS = [0, 60, 120, 180, 300, 450, 520, 650, 820, 950, 1080, 1320, 1500]
```

Capture both desktop directions. Capture mobile Observatory → Solar at all checkpoints and stable Solar → Observatory final state.

- [ ] **Step 4: Add live geometry assertions**

Before clicking, store:

```js
const heroTitleHandle = await page.locator('#hero-title').elementHandle()
const articleHandles = await page.locator('.article-row').elementHandles()
```

After transition, verify the same nodes remain connected and no duplicate title/list exists. Assert:

- origin within 2 px of toggle center;
- CSS has no pointer-origin coordinates;
- first active wave scale corresponds to at least toggle radius;
- hero title final rect differs materially between Observatory and Solar;
- Solar scene anchor rect differs materially from Observatory anchor;
- no horizontal overflow;
- no browser console/page errors.

- [ ] **Step 5: Add star-fold observability for QA**

Expose non-sensitive deterministic transition diagnostics on the scene root, updated only during transition:

```js
spaceSceneNode.dataset.starFold = String(detail.starFoldProgress ?? 0)
spaceSceneNode.dataset.scenePhase = detail.phase ?? ''
```

The QA script asserts fold progress becomes `> 0` before stable star visibility reaches zero.

Do not expose per-star arrays to DOM.

- [ ] **Step 6: Run full local/CI-equivalent verification**

Run:

```bash
npm test
npm run build
```

Then run the existing browser scripts using the same sequence as workflows:

```bash
npx astro preview --host 127.0.0.1 --port 4321 &
node scripts/world-transition-qa.mjs
node scripts/deliver-qa.mjs
```

Expected:

- all unit/contract tests pass;
- build passes;
- world-transition report has zero failures;
- deliver QA report has zero failures;
- screenshots exist for every required checkpoint.

- [ ] **Step 7: Manually inspect the critical early and layout frames**

Review at minimum:

```txt
0 / 60 / 120 / 180 / 300 / 450 / 520 / 650 / 820 / 1080 / 1500
```

Reject the implementation if any frame shows:

- detached black circle;
- rectangular scene shrink/teleport;
- full-screen opaque white disc;
- title disappearing and being replaced rather than moving;
- stars moving as one rigid rectangle;
- Solar final layout reading as Observatory with recolored CSS.

- [ ] **Step 8: Commit QA changes**

```bash
git add scripts/world-transition-qa.mjs scripts/deliver-qa.mjs tests/deliver-qa.test.mjs tests/solar-archive-contract.test.mjs
git commit -m "test: verify Solar Archive world morph frame by frame"
```

---

## Final Verification Gate

Before marking the implementation ready for review:

```bash
npm test
npm run build
```

Then confirm GitHub Actions on the implementation PR:

```txt
CI ✅
Cosmic Motion QA ✅
Deliver QA ✅
World Transition QA ✅
```

Final reviewer must inspect generated transition screenshots, especially `0–650 ms`, and compare stable Observatory/Solar homepage captures side-by-side.

Do not merge if only automated tests are green but the Solar page still reads as a recolored Observatory layout.
