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

### Task 1: Shared DOM + stable morph hooks

**Files:** `src/pages/index.astro`, `src/components/ArticleRow.astro`, `tests/solar-archive-contract.test.mjs`

**Produces:** `data-world-morph` hooks, `data-scene-anchor="observatory|solar"`, stable row indexes; still one `posts.map(...)`, one hero title, one article list.

- [ ] Write failing contracts proving one shared DOM tree and presence of morph/scene anchors.
- [ ] Run `npm test` and confirm RED for missing hooks.
- [ ] Add morph hooks to brand/nav/toggle/eyebrow/title/principles/note/social/writing heading/tools/rows.
- [ ] Add two empty scene geometry anchors; keep exactly one `<SpaceScene />`.
- [ ] Pass row index to `ArticleRow`; add `data-entry-index` without duplicating title/summary.
- [ ] Run `npm test && npm run build` and confirm GREEN.
- [ ] Commit: `feat: add shared world morph layout hooks`.

### Task 2: Pure FLIP geometry engine

**Files:** create `src/scripts/worldMorph.mjs`, create `tests/world-morph.test.mjs`, modify `src/styles/global.css`.

**Produces:**

```js
createFlipDelta(fromRect, toRect)
sampleFlip(delta, progress)
createWorldMorph(root, { reducedMotion })
// -> { prepare(toWorld), setProgress(progress), finish(), refresh(), destroy() }
```

- [ ] Write failing geometry tests for exact source/destination endpoints.
- [ ] Run `node --test tests/world-morph.test.mjs` and confirm RED.
- [ ] Implement FLIP delta math and clamped interpolation.
- [ ] `prepare(toWorld)` measures source, sets `data-layout-world`, measures destination, then writes inverse CSS variables.
- [ ] `setProgress` moves inverse transforms to identity; `finish` removes transient vars/classes.
- [ ] Reduced motion sets destination layout without large transforms.
- [ ] Run focused test, full tests, build.
- [ ] Commit: `feat: add shared DOM FLIP world morph`.

### Task 3: One persistent scene viewport

**Files:** create `src/scripts/sceneViewport.mjs`, create `tests/scene-viewport.test.mjs`, modify `SpaceScene.astro`, `global.css`, `home.js`.

**Produces:**

```js
interpolateRect(from, to, progress)
createSceneViewport(sceneNode, { getAnchor, reducedMotion })
// -> { setWorld(world), setTransition(detail), refresh(), destroy() }
```

- [ ] Write failing interpolation endpoint/midpoint tests.
- [ ] Run focused test and confirm RED.
- [ ] Make the single scene node fixed-position during active transition, driven by CSS vars `--scene-left/top/width/height`.
- [ ] Stable Observatory uses Observatory anchor; stable Solar uses Solar anchor.
- [ ] Transition path is source anchor → temporary full viewport stage → destination anchor with continuous easing.
- [ ] Integrate once in `home.js`; reuse current renderer and `spaceScene.resize()`.
- [ ] Verify no second canvas/renderer.
- [ ] Run tests/build.
- [ ] Commit: `feat: add persistent scene viewport morph`.

### Task 4: Full Solar Archive static redesign

**Files:** `src/styles/solar.css`, `src/styles/global.css`, `tests/solar-archive-contract.test.mjs`, `scripts/deliver-qa.mjs`.

**Target:** Solar is not a palette swap. It becomes asymmetric scientific editorial composition: publication masthead, middle-right oversized hero title, left observation rail, cropped upper-right solar limb, issue-index writing grid, hairline cobalt rules, warm ivory field, minimal orange accent.

- [ ] Add failing contracts for materially different Solar geometry (`data-layout-world='solar'`).
- [ ] Confirm RED.
- [ ] Rewrite Solar masthead.
- [ ] Rewrite Solar hero grid; do not reuse Observatory `1.03fr .97fr` split.
- [ ] Place title middle-right, observation metadata upper-left, principles lower-left.
- [ ] Rewrite Writing into issue-index grid using same article rows.
- [ ] Reduce search/filter chrome into publication utilities.
- [ ] Add 760/640/390 responsive Solar layouts with no horizontal overflow.
- [ ] Add stable Solar screenshots to `deliver-qa.mjs`.
- [ ] Run tests/build/browser QA.
- [ ] Commit: `feat: rebuild Solar Archive editorial layout`.

### Task 5: Toggle-centered origin + remove black-hole overlay

**Files:** `themeController.js`, `ThemeTransition.astro`, `world-transition.css`, `solar.css`, `tests/solar-archive-contract.test.mjs`.

**Produces transition detail:**

```js
{ fromWorld, toWorld, world, theme, direction, progress, phase, phaseProgress, originX, originY, toggleRadius }
```

- [ ] Add failing assertions: no `clientX/clientY`, no detached `data-eclipse-core`, wave initial radius >= toggle radius.
- [ ] Confirm RED.
- [ ] Replace origin with exact `getBoundingClientRect()` button center.
- [ ] Remove detached eclipse-core markup/styles entirely.
- [ ] Apply ignition/corona to the actual toggle button.
- [ ] Set `--world-toggle-radius` and start wave at button diameter, never `.001`.
- [ ] Keep wave center transparent; only refraction/ring edge is visible.
- [ ] Run tests/build.
- [ ] Commit: `fix: radiate world transition from theme toggle`.

### Task 6: Gravitational star fold

**Files:** `starField.mjs`, `spaceScene.mjs`, `tests/solar-archive-contract.test.mjs`.

**Produces:** `starField.setTransitionState({ direction, progress, phase, phaseProgress, targetX, targetY })`.

- [ ] Add failing contracts for immutable `basePositions`, transition API and scene-space target.
- [ ] Confirm RED.
- [ ] Clone base star buffers once at creation.
- [ ] Add deterministic curved fold; no straight rectangle/div scaling.
- [ ] Depth strengths: far slight/early fade, mid medium bend, near strongest bend.
- [ ] Add reusable near-layer streak buffer only for late convergence; disabled/reduced on mobile/reduced motion.
- [ ] Reverse transition re-expands stars from button along curved trajectories back to base positions; not literal frame reversal.
- [ ] No per-frame BufferGeometry/Float32Array allocation.
- [ ] Run tests/build.
- [ ] Commit: `feat: add gravitational star-field fold`.

### Task 7: Solar limb arrival/withdrawal choreography

**Files:** `solarField.mjs`, `spaceScene.mjs`, tests.

- [ ] Write failing contracts that transition state controls both directions while preserving `cropped-solar-limb`.
- [ ] Confirm RED.
- [ ] Observatory → Solar: limb starts outside upper-right, enters during 820–1080 ms, spectral grid/arcs lag slightly behind.
- [ ] Solar → Observatory: limb withdraws before stars become dominant.
- [ ] Stable Solar returns to quiet procedural surface motion only.
- [ ] Run tests/build.
- [ ] Commit: `feat: choreograph Solar field arrival`.

### Task 8: Master 1500 ms orchestration

**Files:** `themeController.js`, `home.js`, `worldMorph.mjs`, `sceneViewport.mjs`, optionally `themeWorld.mjs` + tests if phase helpers are exposed.

**Master timeline:**

```txt
0–120     button ignition
120–300   gravitational convergence
300–520   DOM layout release / title starts moving
520–820   radiation wave + strongest world crossover
820–1080  Solar limb/title arrival
1080–1320 issue-index reconstruction
1320–1500 settle/cleanup
```

- [ ] Prepare destination layout before first visible morph frame.
- [ ] On each `glenn:worldtransition`, drive `worldMorph`, `sceneViewport`, and `spaceScene` from the same normalized detail.
- [ ] Hero/nav/eyebrow move as same DOM nodes; no fade-copy swap.
- [ ] Article rows use capped stagger within 1080–1320; hidden filtered rows are excluded from measurement.
- [ ] Reverse timing follows solar contraction → structure loosening → light folds to button → stars expand → Observatory settles.
- [ ] On finish: remove transient transforms/classes/CSS vars, settle scene anchor, set `data-world === data-layout-world`.
- [ ] Run tests/build.
- [ ] Commit: `feat: orchestrate Solar Archive world morph`.

### Task 9: Dense exact-frame QA

**Files:** `scripts/world-transition-qa.mjs`, `tests/deliver-qa.test.mjs`, workflow only if artifact naming changes.

- [ ] Set checkpoints to `0, 60, 120, 180, 300, 450, 520, 650, 820, 950, 1080, 1320, 1500`.
- [ ] Assert live transition origin stays toggle center within 2 px even when clicking different button edges.
- [ ] Assert hero title node identity before/after (`sameHeroNode`).
- [ ] Assert article row node identity (`sameArticleNodes`).
- [ ] Assert first visible wave radius >= toggle radius.
- [ ] Expose read-only QA fold metrics; assert near/mid fold > far during convergence.
- [ ] Capture all checkpoints desktop both directions; mobile Observatory → Solar plus reverse final stable state.
- [ ] Fail on horizontal overflow, console errors, detached black core, opaque wipe, wrong world/layout state.
- [ ] Run `npm run build` and world-transition QA.
- [ ] Commit: `test: inspect Solar world morph frame by frame`.

### Task 10: Responsive, reduced-motion, performance hardening

**Files:** only previously touched files as evidence requires.

- [ ] Verify stable + transition states at 1440 / 1024 / 768 / 390 / 360.
- [ ] Verify reduced motion: no gravitational travel, no large FLIP movement, no expanding ring; correct final layouts.
- [ ] Verify exactly one `new THREE.WebGLRenderer` remains.
- [ ] Preserve `visibilitychange`, `webglcontextlost`, `ResizeObserver`, `renderer.dispose()` protections.
- [ ] Search update loops for per-frame geometry/array allocations and move any to reusable initialization state.
- [ ] Run full unit/build/browser/world-transition QA.
- [ ] Commit only evidence-driven hardening changes.

### Task 11: Independent review + merge-ready gate

- [ ] Verify repo/branch/HEAD/base identity and `behind_by = 0` before final review.
- [ ] Inspect changed-files scope: only Solar world-morph files plus tests/docs.
- [ ] Run clean `npm test` + `npm run build` + all browser QA.
- [ ] Review exact-frame artifact especially 0–820 ms for black-hole, hard scene shrink, opaque wipe, or abrupt layout teleport.
- [ ] Review final Solar composition separately: it must read as a different publication layout, not recolored Observatory.
- [ ] Update PR with final HEAD, changed files, CI/QA run numbers and artifact evidence.
- [ ] Stop for human merge approval; do not merge automatically.

---

## Self-Review

- Spec coverage: static Solar composition, shared-DOM FLIP, one scene viewport, gravitational fold, button-origin radiation, reverse story, mobile, reduced motion, performance and exact-frame QA all map to Tasks 1–10.
- Placeholder scan: no TBD/TODO/"implement later" steps remain.
- Interface consistency: `data-layout-world`, `createWorldMorph`, `createSceneViewport`, normalized transition detail and `setTransitionState` names are consistent across tasks.
- Scope: one coherent feature; partial states must not merge independently.
