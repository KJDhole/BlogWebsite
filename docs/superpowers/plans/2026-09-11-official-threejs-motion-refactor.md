# Official Three.js Motion Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the custom world-switch visual plumbing with official Three.js r180 transition primitives while keeping the existing Observatory and Solar Archive stable layouts unchanged.

**Architecture:** Keep one persistent `WebGLRenderer`, but split Observatory and Solar visuals into separate Three.js scenes. Use the official r180 `RenderTransitionPass` through `EffectComposer`/`OutputPass` during the middle of the 1500ms switch; render the active scene directly at stable endpoints. DOM content only exits/reveals locally, while the Three.js canvas expands to the viewport and owns the visible world change.

**Tech Stack:** Astro 7.3.1, Three.js 0.180.0, native JS modules, Node test runner, Playwright QA scripts.

**Spec:** `docs/superpowers/specs/2026-09-11-official-threejs-motion-refactor-design.md`

## Global Constraints

- Three.js stays at `0.180.0`; use r180 official source/examples.
- Exactly one persistent `THREE.WebGLRenderer` / WebGL context.
- No new animation dependency.
- No custom full-screen transition shader when `RenderTransitionPass` solves the scene mix.
- No cross-screen DOM text FLIP.
- Stable Observatory and Solar layouts must remain visually unchanged.
- Keep the master transition at 1500ms unless screenshot QA proves a concrete need to change it.
- Preserve `prefers-reduced-motion`, resize, visibility, WebGL context-loss, and dispose behavior.
- Preserve QA at 1440 / 1024 / 768 / 390 / 360.
- Do not touch article content, editor behavior, or private-content deployment.
- Each task group below ends in its own PR before the next group begins.

---

### Task 1: Official-first motion foundation

**Files:**
- Create: `.claude/skills/frontend-motion/SKILL.md`
- Create: `.claude/skills/frontend-motion/references/threejs-official-patterns.md`
- Create: `docs/superpowers/specs/2026-09-11-official-threejs-motion-refactor-design.md`
- Create: `docs/superpowers/plans/2026-09-11-official-threejs-motion-refactor.md`

**Interfaces:**
- Consumes: Anthropic official `frontend-design` guidance; Three.js r180 source/examples.
- Produces: repository-local rule set and implementation contract for Tasks 2–3.

- [x] **Step 1: Pin official sources**

Use only:

```text
https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md
https://github.com/mrdoob/three.js/blob/r180/examples/webgl_postprocessing_transition.html
https://github.com/mrdoob/three.js/blob/r180/examples/jsm/postprocessing/RenderTransitionPass.js
https://github.com/mrdoob/three.js/blob/r180/examples/webgl_points_dynamic.html
https://github.com/mrdoob/three.js/blob/r180/examples/jsm/postprocessing/UnrealBloomPass.js
```

- [x] **Step 2: Record project rules**

Require official primitive reuse, screenshot review, one renderer, no text flight, and reduced-motion coverage.

- [ ] **Step 3: Open Part 1 PR**

Expected scope: documentation/skill only; zero production behavior change.

---

### Task 2: Replace custom scene mixing with official `RenderTransitionPass`

**Files:**
- Create: `src/scripts/worldTransitionRenderer.mjs`
- Modify: `src/scripts/spaceScene.mjs`
- Modify: `src/scripts/home.js` only if event payload/transition ownership needs a minimal adapter
- Test: `tests/world-transition-renderer.test.mjs`
- Test: `tests/world-hardening.test.mjs`

**Interfaces:**
- Consumes: `direction`, `progress`, toggle origin, one existing renderer, Observatory/Solar scenes, shared camera.
- Produces:

```js
createWorldTransitionRenderer({ renderer, observatoryScene, solarScene, camera })
// => {
//   setMaskOrigin({ x, y, width, height }),
//   setTransition({ direction, progress }),
//   render({ world, transitioning }),
//   resize(width, height),
//   destroy()
// }
```

- [ ] **Step 1: Write RED tests for transition direction mapping**

Create `tests/world-transition-renderer.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { getOfficialTransitionMix } from '../src/scripts/worldTransitionRenderer.mjs'

test('official RenderTransitionPass mix maps Observatory A and Solar B correctly', () => {
  assert.equal(getOfficialTransitionMix('to-solar', 0), 1)
  assert.equal(getOfficialTransitionMix('to-solar', 1), 0)
  assert.equal(getOfficialTransitionMix('to-observatory', 0), 0)
  assert.equal(getOfficialTransitionMix('to-observatory', 1), 1)
})
```

- [ ] **Step 2: Run RED**

Run:

```bash
npm test
```

Expected: new test fails because `worldTransitionRenderer.mjs` does not exist.

- [ ] **Step 3: Write RED contract test for official addons and one-renderer ownership**

Add assertions that the new module imports:

```js
EffectComposer
RenderTransitionPass
OutputPass
```

and that `spaceScene.mjs` remains the only place creating `new THREE.WebGLRenderer`.

- [ ] **Step 4: Implement `worldTransitionRenderer.mjs` with official r180 addons**

Core setup:

```js
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderTransitionPass } from 'three/addons/postprocessing/RenderTransitionPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

export function getOfficialTransitionMix(direction, progress) {
  const p = Math.min(1, Math.max(0, progress))
  return direction === 'to-solar' ? 1 - p : p
}
```

Create one composer, one transition pass, one output pass. Do not create another renderer.

- [ ] **Step 5: Generate the toggle-origin radial mask as a `CanvasTexture`**

Use a reusable canvas. On transition start/resize, draw a grayscale radial gradient centered on the measured toggle position and call:

```js
transitionPass.setTexture(maskTexture)
transitionPass.setTextureThreshold(0.1)
```

Do not write a replacement fragment shader.

- [ ] **Step 6: Split the existing visual fields into two scenes**

In `spaceScene.mjs`:

```js
const observatoryScene = new THREE.Scene()
const solarScene = new THREE.Scene()

const stars = createStarField(observatoryScene, { mobile, reducedMotion })
const cosmicField = createCosmicField(observatoryScene, { mobile })
const solarField = createSolarField(solarScene, { mobile, reducedMotion })
```

Keep one shared camera unless visual QA proves separate cameras are required.

- [ ] **Step 7: Route stable vs transition rendering like the official example**

Stable:

```js
renderer.render(currentWorld === 'solar' ? solarScene : observatoryScene, camera)
```

Transition:

```js
transitionRenderer.render({ world: currentWorld, transitioning: true })
```

The composer renders only while `0 < progress < 1`.

- [ ] **Step 8: Preserve lifecycle cleanup**

`destroy()` must dispose the composer/pass/mask texture and both scene resources while leaving exactly one renderer disposal path.

- [ ] **Step 9: Run GREEN tests and build**

```bash
npm test
npm run build
```

Expected: all pass.

- [ ] **Step 10: Run browser QA and inspect exact frames**

Run existing Deliver / Cosmic Motion / World Transition workflows. Inspect 300 / 450 / 520 / 650 / 820 / 950 / 1500ms both directions.

Acceptance:

- transition visibly belongs to WebGL in the middle;
- no title/text crosses the viewport;
- no horizontal overflow;
- stable endpoints are unchanged.

- [ ] **Step 11: Open Part 2 PR**

Base it on the Part 1 branch if Part 1 is not merged yet, so the PR is reviewable as a stack.

---

### Task 3: Simplify custom motion and align stars with official dynamic-buffer pattern

**Files:**
- Modify: `src/scripts/starField.mjs`
- Modify: `src/scripts/worldMorph.mjs`
- Modify: `src/styles/world-transition.css`
- Modify: `src/components/ThemeTransition.astro` if the CSS full-screen wave node becomes unused
- Modify: `scripts/world-transition-qa.mjs`
- Test: `tests/star-fold.test.mjs`
- Test: `tests/world-transition-clarity.test.mjs`
- Test: `tests/world-hardening.test.mjs`

**Interfaces:**
- Consumes: official scene transition from Task 2.
- Produces: simplified transition ownership with no duplicate CSS full-screen scene wipe.

- [ ] **Step 1: Write RED contract for no duplicate full-screen transition**

Add a test that fails while `.theme-solar-wave` remains responsible for the full-screen world reveal.

Desired contract:

```js
assert.doesNotMatch(worldTransitionCss, /full-screen custom world reveal marker/)
```

Use a concrete selector/comment marker introduced before deletion so the test verifies the actual ownership change, not a vague string.

- [ ] **Step 2: Confirm RED**

```bash
npm test
```

Expected: only the new ownership test fails.

- [ ] **Step 3: Keep stars on the official dynamic-buffer mechanism**

Verify/retain:

```js
positionAttribute.setUsage(THREE.DynamicDrawUsage)
// mutate existing Float32Array
positionAttribute.needsUpdate = true
```

Remove any redundant allocation or duplicate particle-update path found during review. Keep the product-specific curved fold toward the toggle.

- [ ] **Step 4: Remove obsolete CSS full-screen radiation ownership**

The toggle may retain a small DOM ignition/corona affordance, but the full viewport world reveal is owned by `RenderTransitionPass`.

- [ ] **Step 5: Reduce DOM morph to layout preparation + local exit/reveal**

`worldMorph.mjs` must not move text nodes across the page. Preserve only the minimum needed to prepare destination geometry and structural scene anchoring.

- [ ] **Step 6: Strengthen browser QA around visual clarity**

At 520–820ms assert/record:

- transition canvas is viewport-sized;
- content opacity is low enough that the world change is visually dominant;
- destination text appears only at destination geometry;
- same DOM node identity is preserved;
- stable layouts have no overflow.

- [ ] **Step 7: Full verification**

```bash
npm test
npm run build
```

Then run all browser QA workflows and manually inspect screenshots at all exact checkpoints for desktop and 390px mobile.

- [ ] **Step 8: Open Part 3 PR**

This is the final cleanup/hardening PR. Do not merge automatically; stop for human approval.