# Official Three.js World Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace custom world-transition mechanics with official Three.js transition/bloom addons while keeping stable Observatory/Solar layouts and the existing semantic timeline.

**Architecture:** Keep one persistent WebGLRenderer. Add a thin post-processing adapter around `EffectComposer`, `RenderTransitionPass`, `UnrealBloomPass`, and `OutputPass`; keep `themeController.js` as the 1500ms semantic timeline; DOM content only fades out/in at final layouts.

**Tech Stack:** Astro 7, Three.js 0.180.0, Node test runner, Playwright QA.

**Spec:** `docs/superpowers/specs/2026-09-11-official-threejs-world-transition-design.md`

## Global Constraints
- One persistent WebGLRenderer only.
- Use official `RenderTransitionPass`; no project-owned full-screen transition shader.
- Use official `UnrealBloomPass`; no custom glow engine.
- DOM typography must never physically cross the viewport.
- Preserve stable Observatory and Solar layouts/content.
- Preserve 1500ms master timing, reduced motion, 1440/1024/768/390/360 QA, editor/private-content workflows.
- TDD: failing regression test before each behavior change.

---

### Task 1: Project skill — official-first frontend motion

**Files:**
- Create: `.claude/skills/frontend-motion/SKILL.md`
- Create: `.claude/skills/frontend-motion/references/threejs-official-patterns.md`
- Test: `tests/frontend-motion-skill.test.mjs`

**Interfaces:**
- Produces a project rule future agents can discover before WebGL/motion work.

- [ ] Write a failing test requiring the skill to exist, mention official docs/examples first, forbid reimplementing shipped addons, and name `RenderTransitionPass`/`UnrealBloomPass`.
- [ ] Run `npm test -- tests/frontend-motion-skill.test.mjs` and confirm failure.
- [ ] Add concise `SKILL.md` with trigger-focused frontmatter and official-first workflow.
- [ ] Add the Three.js reference with canonical official URLs and the current approved primitives.
- [ ] Run the test and full `npm test`.
- [ ] Commit `docs: add official-first frontend motion skill`.

### Task 2: Official transition adapter

**Files:**
- Create: `src/scripts/officialWorldTransition.mjs`
- Test: `tests/official-world-transition.test.mjs`

**Interfaces:**
- Produces `createOfficialWorldTransition(renderer, options)` returning `{ setScenes, setTransition, setBloom, setSize, render, dispose }`.
- Consumes Three.js official addons from `three/addons/postprocessing/*`.

- [ ] Write failing contract tests asserting imports of `EffectComposer`, `RenderTransitionPass`, `UnrealBloomPass`, and `OutputPass`; assert there is no custom fragment shader string.
- [ ] Run focused test and confirm RED.
- [ ] Implement the minimal adapter using the official addons.
- [ ] Configure tone mapping only as required by the bloom path; keep bloom restrained and disabled outside transition activity.
- [ ] Ensure `dispose()` frees composer passes/render targets and `setSize()` updates composer/transition pass.
- [ ] Run focused test and full `npm test`.
- [ ] Commit `refactor: add official Three.js transition adapter`.

### Task 3: Integrate with the persistent scene

**Files:**
- Modify: `src/scripts/spaceScene.mjs`
- Modify: `src/scripts/home.js`
- Test: `tests/world-hardening.test.mjs`
- Test: `tests/world-orchestration.test.mjs`

**Interfaces:**
- `spaceScene` exposes the renderable Observatory/Solar scene/camera pair needed by the adapter without creating another renderer.
- `home.js` drives transition ratio/bloom from existing `glenn:worldtransition` events.

- [ ] Add failing tests proving exactly one `new THREE.WebGLRenderer`, official adapter initialization once, and event-driven `setTransition`/`setBloom` calls.
- [ ] Run tests and confirm RED.
- [ ] Extend `spaceScene` with a narrow scene/camera accessor or transition binding; do not duplicate renderer or animation loop.
- [ ] Initialize `officialWorldTransition` once in `home.js` and drive it from existing transition events.
- [ ] Keep visibilitychange, resize, WebGL context loss and pagehide cleanup.
- [ ] Run focused tests and full `npm test`.
- [ ] Commit `refactor: drive world switch through Three.js postprocessing`.

### Task 4: Remove text FLIP and custom radiation ownership

**Files:**
- Modify: `src/scripts/worldMorph.mjs`
- Modify: `src/styles/world-transition.css`
- Modify: `src/styles/solar-transition-palette.css`
- Test: `tests/world-transition-clarity.test.mjs`
- Test: `tests/world-morph.test.mjs`

**Interfaces:**
- DOM transition contract becomes fade-out → hidden layout swap → fade-in.
- `worldMorph` may only handle structural non-text geometry if still required.

- [ ] Add failing tests that hero title, notes, social links, article titles and nav text never receive cross-screen morph deltas.
- [ ] Add a failing test that project CSS no longer contains the custom full-screen radiation implementation used as the primary world switch.
- [ ] Run tests and confirm RED.
- [ ] Restrict/remove text FLIP and simplify CSS to DOM opacity/short local offsets only.
- [ ] Preserve toggle UI feedback as lightweight CSS, but visual world blending belongs to the Three.js pass.
- [ ] Run focused tests and full `npm test`.
- [ ] Commit `refactor: keep DOM motion semantic and local`.

### Task 5: Exact-frame browser QA for the official transition

**Files:**
- Modify: `scripts/world-transition-qa.mjs`
- Modify: `tests/deliver-qa.test.mjs` if required by the new evidence contract
- Test: `tests/world-hardening.test.mjs`

**Interfaces:**
- QA records the same approved checkpoints and adds evidence that the official Three.js pass is visibly active during the middle of the transition.

- [ ] Add failing QA assertions for no clipped/moving typography, one renderer, no horizontal overflow, and visible mid-transition scene mix/bloom.
- [ ] Run unit/contract tests and confirm RED.
- [ ] Update browser QA instrumentation without coupling tests to shader internals.
- [ ] Run `npm test` and `npm run build`.
- [ ] Run World Transition QA across 1440/1024/768/390/360 and reduced motion.
- [ ] Manually review 300/450/520/650/820/950/1500ms in both directions.
- [ ] Commit `test: verify official Three.js world transition`.

### Task 6: Final integration gate

**Files:**
- Update PR body only; no feature changes unless verification finds a defect.

**Interfaces:**
- Produces a merge-ready PR with current-main identity and fresh evidence.

- [ ] Re-check `main`, branch HEAD, `behind_by`, changed-file scope and mergeability.
- [ ] Run/fetch fresh CI, Deliver QA, Cosmic Motion QA and World Transition QA on final HEAD.
- [ ] Confirm stable Observatory/Solar screenshots match pre-refactor stable layouts.
- [ ] Confirm PR documents which official Three.js primitives were reused and which project-specific glue remains.
- [ ] Stop for human merge approval; do not merge automatically.
