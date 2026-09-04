# 3D Black Hole Scroll Story Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage’s flat SVG orbit transition with a larger 3D solar-system scene in deep space where the orange accent planet is swallowed by a temporary hero black-hole portal, re-emitted from a second portal anchored to the `All` filter indicator, then continues into the existing free-fall → squash → bounce → settle → morph sequence.

**Architecture:** Keep Astro and the existing DOM UI as the page shell. Add Three.js only for the decorative hero scene, isolate rendering into small modules, keep scroll choreography in a pure `scrollStory.mjs` state mapper, keep the navigation portal as a lightweight DOM overlay, and reuse the existing landing functions from `orbitMotion.mjs` unchanged. `home.js` becomes the coordinator between DOM measurements, scroll state, Three.js scene state, the nav portal, and the existing article/search/theme logic.

**Tech Stack:** Astro 7.3.1, native JavaScript ES modules, Three.js, CSS, SVG fallback, Node.js 22 built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-04-3d-black-hole-scroll-story-design.md`

## Global Constraints

- Implement on `feat/3d-black-hole-scroll-story`, not `main`.
- The solar system remains a solar system; the sun is never replaced by a black hole.
- The hero black hole appears temporarily behind the orange accent planet only after sufficient scroll.
- The orange planet must be swallowed continuously, not hidden with a teleport cut.
- The compact solar system remains visible while shrinking/rotating but must never visually enter the article section.
- The second portal is anchored to the measured center of the real `All` filter indicator.
- The existing `getLandingMotionState`, `landingProgressFromElapsed`, free-fall, squash, bounce, settle, and final morph semantics remain intact.
- Existing typography, search, categories, buttons, article list, footer, content model, theme persistence, RSS, archive, and tag behavior are unchanged.
- Use direct Three.js; do not add React or React Three Fiber.
- Reuse no third-party implementation code or assets unless the repository has an explicit compatible license. The implementation in this plan should be original and use only Three.js as a runtime dependency.
- Cap renderer pixel ratio; mobile gets a lower cap and lower particle count.
- `prefers-reduced-motion: reduce` skips swallow/eject travel and leaves the filter indicator usable.
- WebGL failure/context loss falls back to the existing/static SVG solar-system visual; page controls must remain usable.
- The WebGL canvas is decorative, `aria-hidden`, non-focusable, and must not intercept pointer events.
- `npm test` and `npm run build` must pass before merge.

## File Structure

### Create

- `src/components/SpaceScene.astro` — hero visual shell, canvas, and SVG fallback markup.
- `src/scripts/scrollStory.mjs` — pure normalized-scroll-to-semantic-state mapping and ejection curve helpers.
- `src/scripts/spaceScene.mjs` — Three.js renderer/camera/scene orchestrator and lifecycle.
- `src/scripts/starField.mjs` — three depth-layer particle star field and subtle drift.
- `src/scripts/solarSystem3d.mjs` — sun, three orbital planes, normal planets, orange accent planet, absorption trajectory, whole-system transform.
- `src/scripts/blackHolePortal.mjs` — hero portal Three.js group/materials and state application.
- `src/scripts/navPortal.mjs` — measured `All` indicator anchor, lightweight DOM portal, and drop-start geometry.
- `tests/scroll-story.test.mjs` — pure phase, overlap, scale, reduced-motion, and ejection-path tests.
- `tests/space-scene-contract.test.mjs` — static architectural/runtime contract tests for Three.js, fallback, and module boundaries.

### Modify

- `package.json` — add `three` as the only new runtime dependency.
- `src/pages/index.astro` — replace inline orbit SVG with `<SpaceScene />`, add nav-portal node, retain flight orb/echo nodes and all existing UI.
- `src/scripts/home.js` — remove old SVG-flight orchestration; coordinate scroll story, Three.js scene, nav portal, ejection, existing landing physics, and existing UI behavior.
- `src/styles/global.css` — 3D scene container, deep-space treatment, fallback visibility, portal styling, containment, mobile, reduced-motion.
- `tests/ui-contract.test.mjs` — assert the new scene exists while search/categories/article collection remain unchanged.
- `tests/orbit-motion.test.mjs` — keep landing regressions; remove only assertions tied exclusively to the retired SVG transition if they no longer describe production behavior.

### Do Not Modify

- `src/content/**`
- article routes/layouts
- `src/scripts/filterArticles.mjs`
- RSS/archive/tag implementation
- deployment workflow as part of this visual feature

---

### Task 1: Define the scroll-story state contract with tests first

**Files:**
- Create: `src/scripts/scrollStory.mjs`
- Create: `tests/scroll-story.test.mjs`

**Interfaces:**
- Produces: `STORY_PHASES: readonly string[]`.
- Produces: `STORY_LIMITS` containing exact phase thresholds and desktop/mobile minimum system scale.
- Produces: `getScrollStoryState(progress, { mobile = false, reducedMotion = false } = {})`.
- Produces: `buildEjectionPath(start, end, { mobile = false } = {})`.
- Produces: `sampleEjectionPath(path, progress)`.
- Consumes later: `home.js` and `spaceScene.mjs` use the semantic state object; no renderer-specific values are read directly from scroll position elsewhere.

Use these exact normalized thresholds initially:

```js
export const STORY_LIMITS = Object.freeze({
  stableEnd: 0.18,
  portalEnd: 0.32,
  absorbEnd: 0.46,
  compactEnd: 0.58,
  navPortalEnd: 0.66,
  ejectEnd: 0.76,
  desktopMinScale: 0.58,
  mobileMinScale: 0.52
})
```

The state shape is:

```js
{
  progress,
  phase,
  system: { scale, rotationX, rotationY, lift },
  heroPortal: { opacity, scale, distortion, pulse },
  accent: { mode, absorption },
  navPortal: { opacity, scale, pulse },
  ejection: { progress },
  landingReady,
  reducedMotion
}
```

- [ ] **Step 1: Write failing phase-order and overlap tests**

Create `tests/scroll-story.test.mjs` with these cases:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  STORY_LIMITS,
  getScrollStoryState,
  buildEjectionPath,
  sampleEjectionPath
} from '../src/scripts/scrollStory.mjs'

test('scroll story keeps the approved phase order', () => {
  const samples = [0.05, 0.24, 0.38, 0.52, 0.62, 0.71, 0.84]
    .map(progress => getScrollStoryState(progress).phase)
  assert.deepEqual(samples, [
    'stable-orbit',
    'portal-emerge',
    'absorb',
    'compact',
    'nav-portal',
    'eject',
    'landing'
  ])
})

test('absorption finishes before ejection begins', () => {
  const captured = getScrollStoryState(STORY_LIMITS.absorbEnd)
  const beforeEject = getScrollStoryState(STORY_LIMITS.navPortalEnd - 0.001)
  const eject = getScrollStoryState(STORY_LIMITS.navPortalEnd + 0.001)
  assert.equal(captured.accent.absorption, 1)
  assert.equal(beforeEject.ejection.progress, 0)
  assert.ok(eject.ejection.progress > 0)
})

test('hero and navigation portals are never simultaneously dominant', () => {
  for (let i = 0; i <= 100; i += 1) {
    const state = getScrollStoryState(i / 100)
    assert.ok(!(state.heroPortal.opacity > 0.5 && state.navPortal.opacity > 0.5))
  }
})

test('compact scale never falls below the configured floor', () => {
  for (let i = 0; i <= 100; i += 1) {
    assert.ok(getScrollStoryState(i / 100).system.scale >= STORY_LIMITS.desktopMinScale)
    assert.ok(getScrollStoryState(i / 100, { mobile: true }).system.scale >= STORY_LIMITS.mobileMinScale)
  }
})
```

- [ ] **Step 2: Add failing reduced-motion and ejection-contract tests**

Append:

```js
test('reduced motion skips portal travel and keeps a stable system', () => {
  const state = getScrollStoryState(0.72, { reducedMotion: true })
  assert.equal(state.phase, 'reduced')
  assert.equal(state.heroPortal.opacity, 0)
  assert.equal(state.navPortal.opacity, 0)
  assert.equal(state.ejection.progress, 0)
  assert.equal(state.landingReady, false)
  assert.equal(state.system.scale, 1)
})

test('ejection curve starts at the portal and ends exactly at drop start', () => {
  const portal = { x: 400, y: 700 }
  const dropStart = { x: 400, y: 608 }
  const path = buildEjectionPath(portal, dropStart, { mobile: false })
  assert.deepEqual(sampleEjectionPath(path, 0), portal)
  assert.deepEqual(sampleEjectionPath(path, 1), dropStart)
  const middle = sampleEjectionPath(path, 0.5)
  assert.ok(middle.y < portal.y)
  assert.notEqual(middle.x, portal.x)
})
```

- [ ] **Step 3: Run the tests and verify the module is missing**

Run:

```bash
npm test -- tests/scroll-story.test.mjs
```

Expected: FAIL because `src/scripts/scrollStory.mjs` does not exist.

- [ ] **Step 4: Implement the pure state mapper and cubic ejection helper**

Use local helpers `clamp01`, `rangeProgress`, `smoothstep`, `easeOutCubic`, and a cubic Bézier sampler inside `scrollStory.mjs`. `accent.mode` must be `orbit` before absorption, `absorbing` during absorption, and `hidden` from absorption completion through nav handoff. The state mapper must compute the same semantic outputs on every call without reading DOM or time.

For ejection, construct a curve from portal center to drop-start with a short sideways kick:

```js
export function buildEjectionPath(start, end, { mobile = false } = {}) {
  const side = mobile ? 18 : 28
  const lift = mobile ? 28 : 42
  return {
    start: { ...start },
    control1: { x: start.x + side, y: start.y - lift },
    control2: { x: end.x - side * 0.55, y: end.y - lift * 0.35 },
    end: { ...end }
  }
}
```

The state must set `landingReady: true` at and after `STORY_LIMITS.ejectEnd`.

- [ ] **Step 5: Run the focused tests**

Run:

```bash
node --test tests/scroll-story.test.mjs
```

Expected: all scroll-story tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/scripts/scrollStory.mjs tests/scroll-story.test.mjs
git commit -m "test: define black hole scroll story contract"
```

---

### Task 2: Add Three.js and the Astro visual shell with a real fallback

**Files:**
- Modify: `package.json`
- Create: `src/components/SpaceScene.astro`
- Modify: `src/pages/index.astro`
- Create: `tests/space-scene-contract.test.mjs`
- Modify: `tests/ui-contract.test.mjs`

**Interfaces:**
- `SpaceScene.astro` renders `[data-space-scene]`, `canvas[data-space-canvas]`, and `[data-space-fallback]`.
- The fallback contains a simplified copy of the existing sun + three orbit rings + planets, including an orange accent planet.
- `index.astro` keeps `.flight-orb`, `.flight-echo-one`, `.flight-echo-two`, and adds `.nav-portal` as a fixed decorative overlay.
- Later `home.js` queries these stable data/class hooks.

- [ ] **Step 1: Write failing structural tests before changing markup**

Create `tests/space-scene-contract.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('space scene shell provides WebGL canvas and SVG fallback without React', async () => {
  const component = await read('../src/components/SpaceScene.astro')
  assert.match(component, /data-space-scene/)
  assert.match(component, /data-space-canvas/)
  assert.match(component, /data-space-fallback/)
  assert.match(component, /orbit-fallback-accent/)
  assert.doesNotMatch(component, /react|ReactThreeFiber|@react-three/i)
})

test('homepage preserves all controls while mounting space scene and nav portal', async () => {
  const page = await read('../src/pages/index.astro')
  assert.match(page, /<SpaceScene/)
  assert.match(page, /class="nav-portal"/)
  assert.match(page, /id="article-search"/)
  assert.match(page, /data-category="All"/)
  assert.match(page, /<ArticleRow/)
})
```

Update the first assertion in `tests/ui-contract.test.mjs` from requiring `orbit-svg` to requiring `<SpaceScene`, while retaining assertions for hero/search/categories/content collection.

- [ ] **Step 2: Run the focused contract tests**

```bash
node --test tests/space-scene-contract.test.mjs tests/ui-contract.test.mjs
```

Expected: FAIL because `SpaceScene.astro` and the nav portal do not exist yet.

- [ ] **Step 3: Install Three.js as the only new runtime dependency**

Run:

```bash
npm install three
```

Verify `package.json` adds only `three` under `dependencies`; do not add React, GSAP, React Three Fiber, or a second animation runtime.

- [ ] **Step 4: Create `SpaceScene.astro`**

Use this shell shape:

```astro
<div class="space-scene" data-space-scene aria-hidden="true">
  <canvas class="space-canvas" data-space-canvas tabindex="-1"></canvas>
  <div class="space-fallback" data-space-fallback>
    <svg class="orbit-fallback-svg" viewBox="0 0 420 420" focusable="false">
      <g transform="translate(210 210)">
        <circle class="orbit-fallback-ring" r="70" />
        <circle class="orbit-fallback-ring" r="120" />
        <circle class="orbit-fallback-ring" r="172" />
        <circle class="orbit-fallback-core" r="9" />
        <circle class="orbit-fallback-planet" cx="70" r="4" />
        <circle class="orbit-fallback-planet" cx="-120" r="4.5" />
        <circle class="orbit-fallback-accent" cx="172" r="7" />
      </g>
    </svg>
  </div>
</div>
```

- [ ] **Step 5: Replace only the old orbit visual in `index.astro`**

Import `SpaceScene` and replace `.orbit-stage > svg` with `<SpaceScene />`. Keep `.orbit-wrap` and `.orbit-caption`. Add exactly one top-level decorative element beside the flight orb nodes:

```html
<span class="nav-portal" aria-hidden="true"></span>
```

Do not change copy, search controls, category buttons, article rows, or footer.

- [ ] **Step 6: Run contract tests and full tests**

```bash
node --test tests/space-scene-contract.test.mjs tests/ui-contract.test.mjs
npm test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json src/components/SpaceScene.astro src/pages/index.astro tests/space-scene-contract.test.mjs tests/ui-contract.test.mjs
git commit -m "feat: add 3d space scene shell"
```

---

### Task 3: Build the 3D star field, solar system, and hero portal as isolated modules

**Files:**
- Create: `src/scripts/starField.mjs`
- Create: `src/scripts/solarSystem3d.mjs`
- Create: `src/scripts/blackHolePortal.mjs`
- Modify: `tests/space-scene-contract.test.mjs`

**Interfaces:**
- `createStarField(scene, { mobile })` returns `{ update(elapsedSeconds, storyState), setTheme(theme), destroy() }`.
- `createSolarSystem(scene, { mobile })` returns `{ group, update(deltaSeconds), setStoryState(state), setTheme(theme), destroy() }`.
- `createBlackHolePortal()` returns `{ group, setState(portalState), setTheme(theme), destroy() }`.
- The orange accent planet remains owned by `solarSystem3d`; `blackHolePortal` never owns or replaces the sun.

- [ ] **Step 1: Extend architectural tests to require separated responsibilities**

Append to `tests/space-scene-contract.test.mjs`:

```js
test('3d scene responsibilities stay split into focused modules', async () => {
  const stars = await read('../src/scripts/starField.mjs')
  const solar = await read('../src/scripts/solarSystem3d.mjs')
  const portal = await read('../src/scripts/blackHolePortal.mjs')
  assert.match(stars, /createStarField/)
  assert.match(solar, /createSolarSystem/)
  assert.match(solar, /accentPlanet/)
  assert.match(portal, /createBlackHolePortal/)
  assert.doesNotMatch(portal, /createSolarSystem/)
})
```

- [ ] **Step 2: Run and verify failure**

```bash
node --test tests/space-scene-contract.test.mjs
```

Expected: FAIL because the three modules do not exist.

- [ ] **Step 3: Implement three-layer star field**

`starField.mjs` uses `THREE.Points` with deterministic pseudo-random positions generated once at construction. Use these default counts:

```js
const COUNTS = {
  desktop: { far: 900, mid: 360, near: 90 },
  mobile: { far: 420, mid: 170, near: 42 }
}
```

Each layer gets a `BufferGeometry` and `PointsMaterial`; far stars are smallest/dimmest, near stars are sparse and slightly larger. `update()` rotates the three groups by very small different rates and applies restrained offsets based on `storyState.system.rotationY`. Do not blink individual stars each frame and do not allocate new vectors in the render loop.

- [ ] **Step 4: Implement the 3D solar system**

Create one `THREE.Group` for the system. Add:

- one sun mesh at the origin;
- three thin orbit rings using line/curve geometry;
- three orbit pivots with mild different inclinations;
- two neutral planets and one orange accent planet;
- an accent-orbit angle that advances independently while `accent.mode === 'orbit'`.

Use simple materials and no external textures. During `accent.mode === 'absorbing'`, blend the orange planet away from its current orbit toward a portal-local target with a curved spiral:

```js
const angle = absorptionStartAngle + absorption * Math.PI * 2.2
const radius = orbitRadius * (1 - absorption) * (1 - 0.35 * absorption)
accentPlanet.position.set(
  portalTarget.x + Math.cos(angle) * radius,
  portalTarget.y + Math.sin(angle * 0.72) * radius * 0.24,
  portalTarget.z + Math.sin(angle) * radius * 0.48
)
```

Also shrink the accent planet toward zero as absorption approaches 1 and add a mild velocity-axis stretch using mesh scale. The other planets keep orbiting during absorption and compact phases.

`setStoryState(state)` applies `state.system.scale`, `rotationX`, `rotationY`, and `lift` to the whole group.

- [ ] **Step 5: Implement the hero black-hole portal**

Use original Three.js geometry/material composition only:

- black inner sphere/disc;
- two thin torus/ring meshes with additive transparent material;
- one faint halo sprite or transparent ring;
- no jets;
- no giant accretion disc;
- no external textures.

`setState({ opacity, scale, distortion, pulse })` controls group visibility/scale and ring material opacity. The portal group is positioned behind/slightly offset from the orange planet’s outer-orbit region, not at the sun.

- [ ] **Step 6: Run focused and full tests**

```bash
node --test tests/space-scene-contract.test.mjs
npm test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/scripts/starField.mjs src/scripts/solarSystem3d.mjs src/scripts/blackHolePortal.mjs tests/space-scene-contract.test.mjs
git commit -m "feat: build 3d solar system and portal primitives"
```

---

### Task 4: Build the Three.js scene lifecycle, containment, quality caps, and WebGL fallback

**Files:**
- Create: `src/scripts/spaceScene.mjs`
- Modify: `tests/space-scene-contract.test.mjs`

**Interfaces:**
- Produces `createSpaceScene(canvas, options)`.
- `options` shape:

```js
{
  mobile,
  reducedMotion,
  theme,
  onUnavailable
}
```

- Returned interface:

```js
{
  available,
  setStoryState(state),
  setTheme(theme),
  resize(),
  destroy()
}
```

- `home.js` must not access Three.js renderer internals.

- [ ] **Step 1: Add failing scene-lifecycle contract tests**

Append:

```js
test('space scene exposes a small lifecycle API and quality protections', async () => {
  const scene = await read('../src/scripts/spaceScene.mjs')
  assert.match(scene, /createSpaceScene/)
  assert.match(scene, /setStoryState/)
  assert.match(scene, /setTheme/)
  assert.match(scene, /resize/)
  assert.match(scene, /destroy/)
  assert.match(scene, /setPixelRatio/)
  assert.match(scene, /webglcontextlost/)
  assert.match(scene, /onUnavailable/)
})
```

- [ ] **Step 2: Run and verify failure**

```bash
node --test tests/space-scene-contract.test.mjs
```

Expected: FAIL because `spaceScene.mjs` does not exist.

- [ ] **Step 3: Implement renderer/camera/scene orchestration**

`createSpaceScene()` must:

1. Try to instantiate `THREE.WebGLRenderer({ canvas, alpha: true, antialias: !mobile, powerPreference: 'high-performance' })`.
2. On constructor failure, call `onUnavailable()` and return a no-op interface with `available: false`.
3. Cap DPR to `1.75` desktop and `1.25` mobile:

```js
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.75))
```

4. Use a `PerspectiveCamera` with mild tilt and enough depth for parallax.
5. Create the star field, solar system, and hero portal once.
6. Maintain one RAF loop; reuse elapsed/delta scalars and avoid per-frame array/object construction.
7. Pause expensive animation when `document.hidden` is true.
8. Handle `webglcontextlost` with `event.preventDefault()`, stop rendering, and call `onUnavailable()`.
9. Handle resize with `ResizeObserver` on the canvas parent; update camera aspect and renderer size.
10. `destroy()` cancels RAF, removes listeners/observer, and disposes geometries/materials/renderer.

- [ ] **Step 4: Enforce containment in scene coordinates and CSS clipping contract**

`setStoryState(state)` must clamp vertical group lift so the system cannot drift downward out of its scene box. Use the story state’s compact scale floor rather than allowing arbitrary shrink. The stronger DOM-level containment is implemented in Task 7 with `overflow: clip`; both protections stay in place.

- [ ] **Step 5: Implement reduced-motion behavior**

When `reducedMotion` is true:

- keep a static or extremely slow solar-system rotation;
- never show hero portal;
- never run orange-planet absorption;
- do not run an extra high-frequency visual effect loop beyond the basic scene draw.

- [ ] **Step 6: Run tests**

```bash
node --test tests/space-scene-contract.test.mjs
npm test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/scripts/spaceScene.mjs tests/space-scene-contract.test.mjs
git commit -m "feat: add resilient threejs scene lifecycle"
```

---

### Task 5: Build the navigation portal and exact ejection/drop geometry

**Files:**
- Create: `src/scripts/navPortal.mjs`
- Modify: `tests/scroll-story.test.mjs`
- Modify: `tests/space-scene-contract.test.mjs`

**Interfaces:**
- Produces `getIndicatorGeometry(trackRect, buttonRect)` as a pure function.
- Produces `getDropGeometry(indicatorGeometry, { mobile })` returning `{ portal, dropStart, target, targetWidth, targetHeight }`.
- Produces `createNavPortal(node, { indicator, allButton, mobile })` returning `{ measure(), setState(state), destroy() }`.
- `home.js` combines `getDropGeometry()` with `buildEjectionPath()` from `scrollStory.mjs`.

- [ ] **Step 1: Add failing geometry tests**

Append to `tests/scroll-story.test.mjs`:

```js
import { getIndicatorGeometry, getDropGeometry } from '../src/scripts/navPortal.mjs'

test('navigation portal anchors to the measured All indicator center', () => {
  const track = { left: 100, bottom: 720 }
  const button = { left: 220, width: 46 }
  const geometry = getIndicatorGeometry(track, button)
  assert.equal(geometry.centerX, 243)
  assert.equal(geometry.centerY, 714.25)
  assert.equal(geometry.width, 46)
})

test('drop geometry keeps exact target and uses smaller mobile drop height', () => {
  const indicator = { centerX: 243, centerY: 714.25, width: 46, height: 1.5, offsetX: 120 }
  const desktop = getDropGeometry(indicator, { mobile: false })
  const mobile = getDropGeometry(indicator, { mobile: true })
  assert.deepEqual(desktop.target, { x: 243, y: 714.25 })
  assert.equal(desktop.dropStart.y, 622.25)
  assert.equal(mobile.dropStart.y, 648.25)
})
```

- [ ] **Step 2: Run and verify failure**

```bash
node --test tests/scroll-story.test.mjs
```

Expected: FAIL because `navPortal.mjs` does not exist.

- [ ] **Step 3: Implement pure geometry helpers**

Use the existing indicator semantics exactly:

```js
const width = Math.max(18, buttonRect.width)
const height = 1.5
const centerX = buttonRect.left + buttonRect.width / 2
const centerY = trackRect.bottom - 5 - height / 2
```

`getDropGeometry()` uses desktop drop height `92px` and mobile `66px`.

- [ ] **Step 4: Implement DOM portal controller**

The nav portal is a fixed-position, pointer-events-none node. `measure()` reads the real filter-list/button rectangles and positions the node at the measured indicator center. `setState({ opacity, scale, pulse })` only changes CSS custom properties/transform/opacity; it must not alter layout.

- [ ] **Step 5: Run tests**

```bash
node --test tests/scroll-story.test.mjs tests/space-scene-contract.test.mjs
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/scripts/navPortal.mjs tests/scroll-story.test.mjs tests/space-scene-contract.test.mjs
git commit -m "feat: anchor portal to article navigation"
```

---

### Task 6: Rewire `home.js` around the new story while preserving the proven landing physics

**Files:**
- Modify: `src/scripts/home.js`
- Modify: `tests/ui-contract.test.mjs`
- Modify: `tests/orbit-motion.test.mjs` only if obsolete SVG-transition-only tests fail after production migration.

**Interfaces:**
- Consumes `getScrollStoryState`, `buildEjectionPath`, `sampleEjectionPath`.
- Consumes `createSpaceScene`.
- Consumes `createNavPortal`, `getIndicatorGeometry`, `getDropGeometry`.
- Continues consuming `getLandingMotionState` and `landingProgressFromElapsed` from `orbitMotion.mjs`.
- Existing article/filter/theme functions remain behaviorally unchanged.

- [ ] **Step 1: Update UI-contract test to require the new coordinator boundaries**

Add assertions that `home.js` imports the new modules and still imports `filterArticleMetadata` and landing helpers:

```js
assert.match(script, /getScrollStoryState/)
assert.match(script, /createSpaceScene/)
assert.match(script, /createNavPortal/)
assert.match(script, /getLandingMotionState/)
assert.match(script, /landingProgressFromElapsed/)
assert.match(script, /filterArticleMetadata/)
```

Also assert it no longer owns the old SVG node map:

```js
assert.doesNotMatch(script, /orbitNodes\s*=|orbit-ring-a|setSvgPoint/)
```

- [ ] **Step 2: Run the UI contract and verify failure**

```bash
node --test tests/ui-contract.test.mjs
```

Expected: FAIL until `home.js` is migrated.

- [ ] **Step 3: Replace SVG orbit initialization with scene/nav initialization**

At module setup:

```js
const spaceCanvas = document.querySelector('[data-space-canvas]')
const spaceSceneNode = document.querySelector('[data-space-scene]')
const fallbackNode = document.querySelector('[data-space-fallback]')
const navPortalNode = document.querySelector('.nav-portal')
```

Create scene using current media/theme state. `onUnavailable()` adds `is-fallback` to the scene wrapper so CSS shows SVG fallback and hides the canvas.

- [ ] **Step 4: Keep one scroll progress source and map it through `scrollStory.mjs`**

Use:

```js
function getScrollProgress() {
  const distance = Math.max(hero.offsetHeight * (mobileMedia.matches ? 0.92 : 0.96), 1)
  return window.scrollY / distance
}
```

Then:

```js
currentStory = getScrollStoryState(getScrollProgress(), {
  mobile: mobileMedia.matches,
  reducedMotion: reducedMotion.matches
})
spaceScene.setStoryState(currentStory)
navPortal.setState(currentStory.navPortal)
```

Do not map scroll thresholds independently in `home.js`.

- [ ] **Step 5: Replace the old tangent flight with portal ejection**

When `currentStory.ejection.progress > 0`, ensure measured drop geometry exists, build one cached ejection path from `geometry.portal` to `geometry.dropStart`, and place `.flight-orb` at `sampleEjectionPath(path, currentStory.ejection.progress)`. Show restrained echoes only during ejection.

At `currentStory.landingReady === true`, stop scroll-driving the orb and start the existing elapsed-time landing micro-sequence:

```js
if (landingStartedAt === null) landingStartedAt = performance.now()
const landingProgress = landingProgressFromElapsed(
  performance.now() - landingStartedAt,
  { mobile: mobileMedia.matches }
)
const landing = getLandingMotionState(landingProgress, { mobile: mobileMedia.matches })
```

During fall, interpolate from `dropStart` to exact `target` using `landing.fall`; during impact/bounce use `landing.yOffset`; during morph interpolate orb width/height to `targetWidth/targetHeight` exactly as the existing implementation does.

- [ ] **Step 6: Preserve user-interruption behavior**

If a user clicks any category before the story completes:

- set `filterStoryInterrupted = true`;
- hide nav portal and flight orb/echoes;
- show the real filter indicator immediately;
- keep category filtering functional.

Reduced-motion follows the same simple indicator-visible path from the start.

- [ ] **Step 7: Preserve theme, search, keyboard shortcut, article filtering, and reveal behavior**

Keep the current `glenn-blog-theme` key. After `applyTheme(theme)`, call `spaceScene.setTheme(theme)`. Do not alter search query/category filtering logic or the `⌘/Ctrl + K` shortcut.

- [ ] **Step 8: Preserve resize behavior**

On resize/media changes:

- clear cached ejection geometry;
- call `spaceScene.resize()`;
- call `navPortal.measure()`;
- reposition active indicator;
- recalculate story state.

- [ ] **Step 9: Run regression tests**

```bash
node --test tests/ui-contract.test.mjs tests/orbit-motion.test.mjs tests/scroll-story.test.mjs
npm test
```

If old tests asserting `getOrbitTransitionState()` describe only the retired SVG release/breakup path, remove those specific assertions. Do not remove landing/free-fall/impact/bounce/settle/morph regression tests.

- [ ] **Step 10: Commit**

```bash
git add src/scripts/home.js tests/ui-contract.test.mjs tests/orbit-motion.test.mjs
git commit -m "feat: connect scroll portals to existing landing physics"
```

---

### Task 7: Style the deep-space scene, portal handoff, containment, mobile, and fallbacks

**Files:**
- Modify: `src/styles/global.css`
- Modify: `tests/ui-contract.test.mjs`

**Interfaces:**
- CSS classes/data state are visual only; no layout API changes to article/search/filter components.
- `.space-scene.is-fallback` displays `[data-space-fallback]` and hides the WebGL canvas.
- `.hero`/`.orbit-wrap` enforce clipping so the compact system cannot enter the article region.

- [ ] **Step 1: Add failing CSS contract assertions**

Add to the responsive/reduced-motion test:

```js
assert.match(styles, /\.space-scene/)
assert.match(styles, /\.space-canvas/)
assert.match(styles, /\.nav-portal/)
assert.match(styles, /is-fallback/)
assert.match(styles, /overflow:\s*(clip|hidden)/)
assert.match(styles, /pointer-events:\s*none/)
```

- [ ] **Step 2: Run and verify failure**

```bash
node --test tests/ui-contract.test.mjs
```

Expected: FAIL until CSS is added.

- [ ] **Step 3: Replace old orbit-specific visual CSS with the 3D scene shell**

Keep `.orbit-wrap` as the positioning/containment wrapper but remove production reliance on `.orbit-stage`, `.orbit-svg`, `.orbit-ring-*`, and `.orbit-planet-*` styling except fallback classes.

Desktop target:

```css
.orbit-wrap {
  min-height: 500px;
  position: relative;
  overflow: clip;
}

.space-scene {
  width: min(46vw, 540px);
  aspect-ratio: 1;
  position: relative;
  pointer-events: none;
  isolation: isolate;
  background: radial-gradient(circle at 50% 50%, rgba(5,10,24,.96) 0 46%, rgba(6,10,23,.68) 61%, transparent 78%);
  -webkit-mask-image: radial-gradient(circle, #000 62%, transparent 88%);
  mask-image: radial-gradient(circle, #000 62%, transparent 88%);
}

.space-canvas,
.space-fallback {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
```

The scene must not become a rectangular dark card in light mode; its edge fades into the page through the radial mask.

- [ ] **Step 4: Style fallback and nav portal**

Fallback is hidden by default and shown only under `.is-fallback` or reduced motion where chosen. The nav portal uses layered radial/conic gradients with a near-black center and thin orange/blue-white rim. It stays small enough to read as a transient portal, not a second hero.

Example structural properties:

```css
.nav-portal {
  position: fixed;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  pointer-events: none;
  opacity: 0;
  z-index: 58;
  transform: translate3d(-50%, -50%, 0) scale(var(--portal-scale, .2));
  background: radial-gradient(circle, #000 0 38%, #070912 40% 48%, rgba(255,117,69,.72) 52%, transparent 68%);
  box-shadow: 0 0 16px rgba(255,117,69,.12), 0 0 26px rgba(92,124,255,.08);
}
```

- [ ] **Step 5: Add mobile quality/layout treatment**

At `max-width: 760px`:

- scene width `min(86vw, 390px)`;
- smaller minimum wrapper height;
- keep all visual overflow clipped;
- nav portal slightly smaller;
- flight orb keeps existing mobile shadow restraint;
- no horizontal overflow.

- [ ] **Step 6: Add reduced-motion CSS**

Under `prefers-reduced-motion: reduce`:

- hide `.nav-portal`, `.flight-orb`, `.flight-echo`;
- make `.filter-indicator` visible;
- avoid transform animation on the 3D wrapper;
- permit the static fallback/scene to remain visible.

- [ ] **Step 7: Run tests and build**

```bash
node --test tests/ui-contract.test.mjs
npm test
npm run build
```

Expected: PASS and Astro production build completes.

- [ ] **Step 8: Commit**

```bash
git add src/styles/global.css tests/ui-contract.test.mjs
git commit -m "style: add deep space hero and portal states"
```

---

### Task 8: Performance, visual-frame verification, production regression, and final branch review

**Files:**
- Modify only files from Tasks 1–7 when verification finds a concrete defect.
- Do not change content/deployment architecture during this task.

**Interfaces:**
- Final feature contract is the approved spec plus all automated tests.

- [ ] **Step 1: Run the complete automated gate from a clean install**

```bash
rm -rf node_modules dist .astro
npm install
npm test
npm run build
```

Expected: all tests PASS; `dist/index.html`, article route, archive, tags, RSS, sitemap, and 404 are still generated by the existing build.

- [ ] **Step 2: Verify dependency scope**

Run:

```bash
npm ls --depth=0
```

Expected new visual runtime dependency: `three`; no React, React Three Fiber, GSAP, or unrelated UI framework added.

- [ ] **Step 3: Verify story frames on desktop**

Run the dev/preview server and inspect at approximately these normalized scroll states:

```text
p=0.05  large readable 3D solar system, no portal
p=0.24  portal grows behind orange planet, system begins mild rotation/shrink
p=0.38  orange planet visibly curves toward portal
p=0.52  orange planet hidden; compact system still visible inside hero
p=0.62  navigation portal visible at All indicator; hero portal gone
p=0.71  orange planet visibly ejecting from nav portal
p>=0.76 landing sequence begins, then squash → bounce → settle → horizontal indicator
```

Reject the implementation if the compact system overlaps the controls/article area, the black hole replaces the sun, or the orange ball jumps between anchors.

- [ ] **Step 4: Verify aggressive wheel scrolling cannot skip the landing micro-sequence**

Scroll quickly through the trigger. Observe that once ejection completes, impact and bounce still play because landing progress comes from elapsed time, not raw scroll progress. Confirm the existing `landingProgressFromElapsed` tests remain green.

- [ ] **Step 5: Verify mobile at 390 × 844**

Check:

- no horizontal overflow;
- 3D system readable but smaller;
- same phase order;
- portal remains aligned to the real `All` indicator after horizontal filter layout;
- bounce/sink amplitude stays at existing mobile values;
- article list begins cleanly below the hero without solar-system overlap.

- [ ] **Step 6: Verify reduced motion**

Enable `prefers-reduced-motion: reduce` and confirm:

- no swallow/eject travel;
- no rapid system transform;
- active filter indicator is visible normally;
- search, categories, theme, article links work.

- [ ] **Step 7: Verify WebGL fallback**

Force `createSpaceScene` into its unavailable path (temporarily stub WebGL renderer creation in local verification or trigger context loss in browser devtools). Confirm SVG fallback appears and all UI stays usable. Restore the normal code before commit.

- [ ] **Step 8: Compare branch to main**

```bash
git diff --stat main...HEAD
git diff main...HEAD -- src/pages/index.astro src/scripts/home.js src/styles/global.css package.json
```

Review for accidental copy changes to typography, category labels, search behavior, article markup, or footer.

- [ ] **Step 9: Final test/build evidence**

```bash
npm test
npm run build
```

Record exact pass/fail output in the implementation report. Do not claim completion from visual inspection alone.

- [ ] **Step 10: Commit any verification fixes**

If verification required fixes, commit only those concrete fixes:

```bash
git add <verified-files-only>
git commit -m "fix: harden 3d scroll story verification"
```

If no fixes were required, do not create an empty commit.

## Completion Checklist

The branch is ready for review only if all of the following are true:

- [ ] Three.js solar system is visibly 3D and larger than the old SVG treatment.
- [ ] Deep-space star field has three restrained depth layers and no wallpaper-like blinking.
- [ ] Orange accent planet orbits normally before capture.
- [ ] Hero portal appears behind the orange planet, not at the sun.
- [ ] Absorption is curved/continuous and completes before nav ejection.
- [ ] Compact solar system remains visible but cannot enter the article section.
- [ ] Hero portal is gone before navigation portal becomes dominant.
- [ ] Navigation portal is measured from the actual `All` indicator geometry.
- [ ] Ejected orange planet reaches the exact existing drop-start contract.
- [ ] Existing free-fall, impact squash, bounce, settle, and morph tests remain intact.
- [ ] User category interaction can interrupt the decorative story safely.
- [ ] Search, theme, article list, archive/tags/RSS/content model are unchanged.
- [ ] Mobile and reduced-motion behavior are usable.
- [ ] WebGL failure falls back without breaking the page.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
