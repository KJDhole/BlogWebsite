# Official Three.js World Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the custom page-wide world-morph transition with Three.js `RenderTransitionPass` while keeping the two stable visual worlds unchanged.

**Architecture:** Split the existing shared WebGL scene into Observatory and Solar scenes that share one renderer and camera. During transition only, an `EffectComposer` runs `RenderTransitionPass` with a toggle-centered radial mask and a restrained `UnrealBloomPass`; stable rendering remains direct. DOM content only fades out/in around the hidden layout swap.

**Tech Stack:** Astro 7.3.1, Three.js 0.180.0, vanilla JS/CSS, Node test runner, Playwright QA.

**Spec:** `docs/superpowers/specs/2026-09-11-threejs-official-world-transition-design.md`

## Global Constraints

- Keep Three.js pinned at `0.180.0`.
- Keep exactly one `WebGLRenderer`.
- Do not change stable Observatory/Solar page layout or content.
- Do not touch editor/admin/editor-api/private-content behavior.
- Do not add a custom transition shader.
- Use `RenderTransitionPass` for scene mixing.
- Use official Three.js post-processing addons only.
- Text must never physically FLIP across the viewport.
- Preserve reduced motion and 1440 / 1024 / 768 / 390 / 360 coverage.
- Preserve lifecycle cleanup and zero per-frame geometry allocation.

---

### Task 1: Add the official-first frontend motion skill

**Files:**
- Create: `.claude/skills/frontend-motion/SKILL.md`
- Create: `.claude/skills/frontend-motion/references/threejs-official-patterns.md`
- Create: `tests/frontend-motion-skill.test.mjs`

**Interfaces:**
- Consumes: Anthropic skill folder convention and Three.js official docs/examples.
- Produces: repo-local guidance future coding agents can load before frontend motion work.

- [ ] **Step 1: Write the failing skill contract test**

Assert that `SKILL.md` exists, contains valid `name`/`description` frontmatter, requires official docs/examples lookup, and links the Three.js reference file.

- [ ] **Step 2: Run the contract test and verify RED**

Run: `node --test tests/frontend-motion-skill.test.mjs`
Expected: FAIL because the skill files do not exist.

- [ ] **Step 3: Create the minimal skill**

`SKILL.md` must include:

```yaml
---
name: frontend-motion
description: Use when building or refactoring frontend animation, WebGL, Three.js, scene transitions, particle motion, or post-processing effects.
---
```

Core rule: official framework example/addon first; custom shader/render pass/particle engine only when official patterns cannot satisfy the requirement.

- [ ] **Step 4: Add Three.js official pattern references**

Document `RenderTransitionPass`, `UnrealBloomPass`, `EffectComposer`, `OutputPass`, and BufferGeometry update guidance with the official URLs from the spec.

- [ ] **Step 5: Run the skill test and full unit suite**

Run: `node --test tests/frontend-motion-skill.test.mjs && npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `docs: add official-first frontend motion skill`

---

### Task 2: Introduce an official Three.js transition controller

**Files:**
- Create: `src/scripts/worldSceneTransition.mjs`
- Create: `tests/world-scene-transition.test.mjs`

**Interfaces:**
- Consumes: `renderer`, `observatoryScene`, `solarScene`, shared `camera`.
- Produces:
  - `createWorldSceneTransition(renderer, { observatoryScene, solarScene, camera, mobile })`
  - methods: `setTransition(detail)`, `setSize(width, height)`, `render(deltaSeconds)`, `isActive()`, `destroy()`.

- [ ] **Step 1: Write failing tests for transition mapping**

Pure helpers must prove:

```js
getOfficialTransitionMix('to-solar', 0) === 0
getOfficialTransitionMix('to-solar', 1) === 1
getOfficialTransitionMix('to-observatory', 0) === 1
getOfficialTransitionMix('to-observatory', 1) === 0
```

Also contract-test that the module imports `RenderTransitionPass`, `EffectComposer`, `UnrealBloomPass`, and `OutputPass` from `three/addons/...`, and contains no custom transition `ShaderMaterial`.

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/world-scene-transition.test.mjs`
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the official pass chain**

Use:

```js
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderTransitionPass } from 'three/addons/postprocessing/RenderTransitionPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
```

Construct `RenderTransitionPass(solarScene, camera, observatoryScene, camera)` so transition 0 is Observatory and 1 is Solar.

- [ ] **Step 4: Generate only the radial mask texture as glue**

Create a small `CanvasTexture` using a radial grayscale gradient. Rebuild only when transition origin or viewport size changes. Do not implement a custom blend shader.

- [ ] **Step 5: Add restrained transition bloom**

Bloom exists only in composer mode. Peak strength is bounded and driven by transition progress; stable direct rendering never uses the composer.

- [ ] **Step 6: Verify GREEN**

Run: `node --test tests/world-scene-transition.test.mjs && npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

Commit message: `feat: add official Three.js scene transition pass`

---

### Task 3: Split the WebGL worlds and switch stable rendering to direct mode

**Files:**
- Modify: `src/scripts/spaceScene.mjs`
- Modify: `src/scripts/starField.mjs`
- Modify: `src/scripts/solarField.mjs`
- Modify: `tests/world-hardening.test.mjs`
- Modify/Create: `tests/space-scene-transition.test.mjs`

**Interfaces:**
- Consumes: `createWorldSceneTransition` from Task 2.
- Produces: the existing `createSpaceScene()` public API unchanged.

- [ ] **Step 1: Write failing structural tests**

Require:

- two `THREE.Scene()` instances inside `spaceScene.mjs`;
- Observatory fields attach only to `observatoryScene`;
- Solar field attaches only to `solarScene`;
- exactly one `new THREE.WebGLRenderer` remains;
- stable render path calls `renderer.render(activeScene, camera)` rather than composer rendering both scenes.

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/space-scene-transition.test.mjs tests/world-hardening.test.mjs`
Expected: FAIL on the one-scene architecture.

- [ ] **Step 3: Split scenes**

Create `observatoryScene` and `solarScene`; keep the existing shared camera.

- [ ] **Step 4: Preserve the official BufferGeometry particle pattern**

Keep preallocated arrays and `DynamicDrawUsage`. Remove only world-crossfade responsibilities that are now owned by `RenderTransitionPass`; retain the project-specific gravitational fold.

- [ ] **Step 5: Make Solar a stable scene**

Keep the solar visual itself, but stop using `worldMix` as the scene-crossfade mechanism. Transition mixing belongs to the official pass.

- [ ] **Step 6: Route render mode**

Pseudo-code:

```js
if (worldTransition.isActive()) {
  worldTransition.render(deltaSeconds)
} else {
  renderer.render(currentWorld === 'solar' ? solarScene : observatoryScene, camera)
}
```

- [ ] **Step 7: Verify GREEN**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 8: Commit**

Commit message: `refactor: split Observatory and Solar WebGL scenes`

---

### Task 4: Remove DOM FLIP and custom CSS world-wave rendering

**Files:**
- Modify: `src/scripts/home.js`
- Delete: `src/scripts/worldMorph.mjs`
- Modify: `src/components/ThemeTransition.astro`
- Modify: `src/styles/world-transition.css`
- Modify: `tests/world-orchestration.test.mjs`
- Modify: `tests/world-morph.test.mjs` (delete or replace with no-FLIP contract)
- Modify: `tests/world-transition-clarity.test.mjs`

**Interfaces:**
- Consumes: existing `glenn:worldtransition*` events and `sceneViewport`.
- Produces: DOM exit/hide/reveal plus WebGL transition only.

- [ ] **Step 1: Write failing no-FLIP/no-wave tests**

Require:

- `home.js` no longer imports or initializes `worldMorph.mjs`;
- `ThemeTransition.astro` no longer contains `theme-solar-wave`;
- `world-transition.css` contains no `.theme-solar-wave` full-screen renderer;
- text exit/reveal selectors remain phase-driven.

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/world-transition-clarity.test.mjs tests/world-orchestration.test.mjs`
Expected: FAIL while old FLIP/wave infrastructure remains.

- [ ] **Step 3: Remove homepage FLIP lifecycle**

Delete `createWorldMorph`, `getMorphProgress`, and `getIndexProgress` usage from `home.js`. Keep `sceneViewport.setTransition(detail)` and `spaceScene.setWorldTransition(detail)`.

- [ ] **Step 4: Remove custom full-screen wave**

The transition component keeps only the script hook/caption if needed. The full-screen visual transition comes from the expanded WebGL canvas + `RenderTransitionPass`.

- [ ] **Step 5: Keep small DOM micro-interactions**

Retain the toggle halo and content fade/lift rules. Do not add a replacement custom wipe.

- [ ] **Step 6: Run full tests and build**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

Commit message: `refactor: remove custom DOM world morph renderer`

---

### Task 5: Update browser QA for the official transition and perform final visual review

**Files:**
- Modify: `scripts/world-transition-qa.mjs`
- Modify: `tests/deliver-qa.test.mjs` if required by contract changes.

**Interfaces:**
- Consumes: final transition implementation.
- Produces: frame artifacts and merge evidence.

- [ ] **Step 1: Add browser assertions for official transition behavior**

At 300/450/520/650/820 ms assert:

- no horizontal overflow;
- title stays within viewport when visible;
- content is hidden during radiation;
- canvas expands toward full viewport during the middle phase;
- final stable state has correct world/layout state.

- [ ] **Step 2: Keep all existing viewport/reduced-motion coverage**

Viewports: 1440, 1024, 768, 390, 360.

- [ ] **Step 3: Run all project verification**

Run through GitHub Actions:

- CI
- Deliver QA
- Cosmic Motion QA
- World Transition QA

Expected: all PASS on the same feature HEAD.

- [ ] **Step 4: Download World Transition artifact and manually inspect**

Review both directions at 300 / 450 / 520 / 650 / 820 / 1080 / 1500 ms.

Reject merge for:

- text crossing the screen;
- clipped title;
- blank/white frame;
- opaque CSS wipe;
- sudden renderer resize;
- stable-layout regression.

- [ ] **Step 5: Re-check integration gate**

Require `behind_by = 0`, expected changed-file scope, same verified HEAD, and `mergeable = true`.

- [ ] **Step 6: Update Draft PR with evidence and stop for human merge approval**

Do not merge automatically.
