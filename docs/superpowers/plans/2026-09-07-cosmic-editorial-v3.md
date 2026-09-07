# Cosmic Editorial V3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage solar-system-model Hero with a layered deep-space environment and one exact path-driven traveler while preserving Research Folio content, search/filter, theme, responsive behavior, SEO/RSS, and accessibility.

**Architecture:** Keep Three.js only for atmospheric depth (`starField.mjs` + a new `cosmicField.mjs`). Move the signature traveler to a foreground SVG/DOM layer whose visible path and position are driven by the same pure math in `cosmicPath.mjs`. Replace the old portal/absorption/ejection/landing story with a reversible scroll state (`drift → charge → flyby → settle`) and remove navigation-geometry coupling from the Hero.

**Tech Stack:** Astro 7.3.1, vanilla JavaScript, CSS, Three.js 0.180.0, Node built-in test runner, Playwright QA in GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-07-cosmic-editorial-v3-design.md`

## Global Constraints

- First impression must be “deep cosmic environment,” not “solar-system model.”
- No large central sphere or obvious multi-planet orbital model in the active Hero scene.
- The visible guide path and traveler position must share the exact same path definition.
- Core Hero motion must be reversible from scroll progress; no timer-driven landing state is required.
- Dark theme is the strongest cosmic expression; light theme remains editorial/paper-first with a restrained translucent cosmic field.
- Mobile uses materially fewer particles and a shorter traveler pass.
- `prefers-reduced-motion: reduce` disables flyby/parallax and leaves a complete static/near-static composition.
- No new heavy runtime dependency; keep `three` as the only 3D runtime dependency.
- Pause animation when the page is hidden; cap DPR; avoid per-frame DOM layout reads.
- Preserve article search/filter hooks, content collections, Archive, Tags, RSS, SEO/OG/JSON-LD, theme switching, and article rendering.

---

### Task 1: Lock the new cosmic motion contract

**Files:**
- Create: `tests/cosmic-path.test.mjs`
- Modify: `tests/space-scene-contract.test.mjs`
- Modify: `tests/ui-contract.test.mjs`

**Interfaces:**
- Produces: `getCosmicPath({ width, height, mobile })`, `sampleCosmicPath(path, progress)`, `getCosmicStoryState(progress, options)` expectations.
- Produces: DOM contract hooks `data-cosmic-path`, `data-cosmic-traveler`, `data-cosmic-trail`.

- [ ] **Step 1: Write failing path/state tests**

Use assertions equivalent to:

```js
const desktop = getCosmicPath({ width: 540, height: 540, mobile: false })
assert.deepEqual(sampleCosmicPath(desktop, 0), desktop.start)
assert.deepEqual(sampleCosmicPath(desktop, 1), desktop.end)
assert.deepEqual(sampleCosmicPath(desktop, 0.57), sampleCosmicPath(desktop, 0.57))
const reduced = getCosmicStoryState(0.6, { reducedMotion: true })
assert.equal(reduced.phase, 'reduced')
assert.equal(reduced.traveler.visible, false)
```

Also verify the mobile path stays inside the supplied width/height bounds at samples `0, .1, .25, .5, .75, .9, 1`.

- [ ] **Step 2: Update static contracts to reject the old active model**

Require `SpaceScene.astro` to expose cosmic foreground hooks and require `spaceScene.mjs` to import `createCosmicField`, not `createSolarSystem` or `createBlackHolePortal`.

- [ ] **Step 3: Run tests and confirm RED**

Run: `npm test`
Expected: FAIL because `cosmicPath.mjs`, foreground hooks, and `cosmicField.mjs` do not exist yet.

- [ ] **Step 4: Commit RED tests**

```bash
git add tests/cosmic-path.test.mjs tests/space-scene-contract.test.mjs tests/ui-contract.test.mjs
git commit -m "test: lock cosmic editorial v3 contract"
```

### Task 2: Implement pure reversible traveler path and scroll state

**Files:**
- Create: `src/scripts/cosmicPath.mjs`
- Replace behavior in: `src/scripts/scrollStory.mjs`
- Test: `tests/cosmic-path.test.mjs`
- Test: `tests/scroll-story.test.mjs`

**Interfaces:**
- `getCosmicPath({ width, height, mobile = false }) -> { start, control1, control2, end }`
- `sampleCosmicPath(path, progress) -> { x, y }`
- `getCosmicStoryState(progress, { mobile = false, reducedMotion = false }) -> { progress, phase, charge, pathProgress, trail, field, traveler, reducedMotion }`
- Preserve `getStoryScrollDistance(...)` for homepage scroll normalization.

- [ ] **Step 1: Implement one deterministic cubic path**

Use normalized control points so the path scales with the Hero scene. Desktop target proportions: start around `(0.19w, 0.63h)`, controls around `(0.36w, 0.34h)` and `(0.76w, 0.23h)`, end around `(0.88w, 0.56h)`. Mobile uses tighter proportions that remain fully contained.

- [ ] **Step 2: Implement four reversible phases**

Use exact boundaries:

```js
0.00–0.24 => 'drift'
0.24–0.44 => 'charge'
0.44–0.72 => 'flyby'
0.72–1.00 => 'settle'
```

Map flyby to deterministic `pathProgress`; derive opacity/trail/field intensity from progress only.

- [ ] **Step 3: Make reduced motion stable**

Return `phase: 'reduced'`, `traveler.visible: false`, `trail: 0`, no parallax, and a stable atmospheric field state.

- [ ] **Step 4: Replace old scroll-story assertions**

Remove tests that depend on portal absorption, nav ejection, landing morph, and `solarSystem3d.mjs`; assert the new four-phase state and reverse-scroll determinism instead.

- [ ] **Step 5: Run focused tests**

Run: `node --test tests/cosmic-path.test.mjs tests/scroll-story.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/scripts/cosmicPath.mjs src/scripts/scrollStory.mjs tests/cosmic-path.test.mjs tests/scroll-story.test.mjs
git commit -m "feat: add reversible cosmic traveler motion"
```

### Task 3: Replace the solar-system model with an ambient cosmic field

**Files:**
- Create: `src/scripts/cosmicField.mjs`
- Modify: `src/scripts/starField.mjs`
- Modify: `src/scripts/spaceScene.mjs`
- Remove from active scene only: `src/scripts/solarSystem3d.mjs`, `src/scripts/blackHolePortal.mjs`
- Test: `tests/space-scene-contract.test.mjs`

**Interfaces:**
- `createCosmicField(scene, { mobile }) -> { update(elapsedSeconds, storyState), setTheme(theme), destroy() }`
- `createSpaceScene` keeps lifecycle API: `setStoryState`, `setTheme`, `resize`, `destroy`.

- [ ] **Step 1: Create atmospheric field**

Build only low-cost atmospheric objects: sparse gravitational arc lines, two translucent nebula/halo sprites or meshes, and at most one distant planet silhouette positioned off-center. No central sun, no multiple orbiting planet meshes.

- [ ] **Step 2: Retune star layers**

Keep three layers but deepen parallax. Desktop keeps approximately current density; mobile remains materially lower. Motion amplitude responds to `storyState.field` and becomes near-static in reduced motion.

- [ ] **Step 3: Rewire `spaceScene.mjs`**

Instantiate `createStarField` + `createCosmicField`; remove active imports/instantiation of `createSolarSystem` and `createBlackHolePortal`; preserve WebGL fallback, visibility pause, DPR cap, theme, resize, and cleanup.

- [ ] **Step 4: Run contract tests**

Run: `node --test tests/space-scene-contract.test.mjs tests/ui-contract.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/cosmicField.mjs src/scripts/starField.mjs src/scripts/spaceScene.mjs tests/space-scene-contract.test.mjs tests/ui-contract.test.mjs
git commit -m "feat: replace solar model with ambient cosmic field"
```

### Task 4: Add the exact foreground traveler and remove navigation-flight coupling

**Files:**
- Modify: `src/components/SpaceScene.astro`
- Modify: `src/scripts/home.js`
- Modify: `src/styles/space.css`
- Modify: `src/styles/editorial.css`
- Modify: `tests/ui-contract.test.mjs`
- Modify: `tests/editorial-v2.test.mjs`

**Interfaces:**
- Foreground hooks: `data-cosmic-path`, `data-cosmic-path-glow`, `data-cosmic-trail`, `data-cosmic-traveler`.
- `home.js` computes scene geometry only on init/resize, uses `sampleCosmicPath` to set traveler coordinates, and writes CSS variables for charge/trail/path state.

- [ ] **Step 1: Replace SVG fallback model with cosmic trace/traveler markup**

Use a foreground `<svg viewBox="0 0 1000 1000">` for the visible path and trail plus a positioned traveler node. Keep the canvas beneath it and a simplified static fallback for WebGL failure.

- [ ] **Step 2: Rebuild `home.js` coordinator**

Delete Hero dependencies on `navPortal.mjs`, `orbitMotion.mjs`, ejection geometry, timer landing, flight echoes, and filter-story interruption. Search/filter behavior remains unchanged. On scroll, call `getCosmicStoryState`, update `spaceScene`, update the SVG path visual state, and position the traveler from the same sampled path used to construct the guide.

- [ ] **Step 3: Restyle the scene as a deep-space window, not a dark circular blob**

Remove the circular mask/heavy central radial mass. Use layered elliptical/radial gradients with irregular soft edges, low-opacity nebula color, faint arc strokes, restrained orange traveler glow, and no textbook orbit rings.

- [ ] **Step 4: Implement mobile and reduced-motion CSS**

At `max-width: 760px`, reduce scene visual density and trail length. Under `prefers-reduced-motion: reduce`, hide traveler/trail motion and keep the atmospheric scene stable.

- [ ] **Step 5: Run all unit/contract tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/SpaceScene.astro src/scripts/home.js src/styles/space.css src/styles/editorial.css tests/ui-contract.test.mjs tests/editorial-v2.test.mjs
git commit -m "feat: deliver path-driven cosmic hero"
```

### Task 5: Convert animation QA into frame-by-frame cosmic QA

**Files:**
- Modify: `scripts/absorption-qa.mjs`
- Modify: `.github/workflows/absorption-qa.yml`
- Modify: `tests/deliver-qa.test.mjs` or add `tests/cosmic-qa.test.mjs`

**Interfaces:**
- QA frames capture progress values across all four phases, desktop and mobile.
- Report includes requested progress, actual scroll progress, traveler center, and nearest point sampled from its SVG path.

- [ ] **Step 1: Rename the conceptual QA from absorption boundaries to cosmic motion frames**

Capture at least progress values:

```js
[0, 0.12, 0.24, 0.34, 0.44, 0.52, 0.60, 0.72, 0.84, 1]
```

for desktop `1440×1000` and mobile `390×844`.

- [ ] **Step 2: Add geometric path adherence measurement**

For each frame, record traveler center and the SVG path point returned by `getPointAtLength(pathLength * pathProgress)`. Fail if the distance exceeds a small rendering tolerance (target <= 2 px outside endpoint/settled states).

- [ ] **Step 3: Preserve Deliver QA regression matrix**

Keep existing route/theme/viewport/search/stress checks intact.

- [ ] **Step 4: Commit**

```bash
git add scripts/absorption-qa.mjs .github/workflows/absorption-qa.yml tests/deliver-qa.test.mjs
git commit -m "test: capture cosmic motion frame sequence"
```

### Task 6: PR verification and visual review

**Files:**
- No product code unless QA exposes a defect.

- [ ] **Step 1: Open a Draft PR against `main`**

This triggers CI, animation-frame QA, and Deliver QA.

- [ ] **Step 2: Verify workflows**

Require CI, animation-frame QA, and Deliver QA to conclude `success` on the final HEAD.

- [ ] **Step 3: Download QA artifacts**

Inspect desktop and mobile frame sequences plus light/dark Deliver QA screenshots.

- [ ] **Step 4: Review exact visual acceptance**

Confirm: no central solar-model object; deep background reads before model geometry; traveler is visibly centered on its path in every sampled frame; reverse/resize has no jump; mobile remains legible and contained; reduced-motion screenshots are complete.

- [ ] **Step 5: Request code review / inspect final diff**

Reject any accidental change to content schema, article routes, Archive/Tags/RSS/SEO, or unrelated editorial UI.

- [ ] **Step 6: Keep PR ready for the user's merge instruction**
