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
- Reuse no third-party implementation code or assets unless the repository has an explicit compatible license. This implementation is original and uses only Three.js as a new runtime dependency.
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

### Preserve Unchanged

- `src/scripts/orbitMotion.mjs` and `tests/orbit-motion.test.mjs` — keep all existing landing and legacy math regressions green even though production `home.js` stops using the old SVG transition helpers.
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
- Produces: `STORY_PHASES`, a frozen array in the exact semantic order.
- Produces: `STORY_LIMITS` containing exact phase thresholds and desktop/mobile minimum system scale.
- Produces: `getScrollStoryState(progress, { mobile = false, reducedMotion = false } = {})`.
- Produces: `buildEjectionPath(start, end, { mobile = false } = {})`.
- Produces: `sampleEjectionPath(path, progress)`.
- Consumes later: `home.js` and `spaceScene.mjs` use the semantic state object; no renderer-specific values are read directly from scroll position elsewhere.

Use these exact initial constants:

```js
export const STORY_PHASES = Object.freeze([
  'stable-orbit',
  'portal-emerge',
  'absorb',
  'compact',
  'nav-portal',
  'eject',
  'landing'
])

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

Create `tests/scroll-story.test.mjs`:

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

- [ ] **Step 3: Run the focused test and verify failure**

```bash
node --test tests/scroll-story.test.mjs
```

Expected: FAIL because `src/scripts/scrollStory.mjs` does not exist.

- [ ] **Step 4: Implement the pure state mapper and cubic ejection helper**

Use local `clamp01`, `rangeProgress`, `smoothstep`, `easeOutCubic`, and cubic Bézier helpers. `accent.mode` is `orbit` before absorption, `absorbing` during absorption, and `hidden` from absorption completion through nav handoff. The mapper reads no DOM/time.

For ejection:

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

Set `landingReady: true` at and after `STORY_LIMITS.ejectEnd`. Reduced-motion returns `phase: 'reduced'`, system scale `1`, both portals hidden, no ejection, and `landingReady: false`.

- [ ] **Step 5: Run focused tests**

```bash
node --test tests/scroll-story.test.mjs
```

Expected: PASS.

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
- The fallback contains a simplified sun + three orbit rings + planets, including an orange accent planet.
- `index.astro` keeps `.flight-orb`, `.flight-echo-one`, `.flight-echo-two`, and adds `.nav-portal`.

- [ ] **Step 1: Write failing structural tests**

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

Update `tests/ui-contract.test.mjs` so the homepage test requires `<SpaceScene` instead of `orbit-svg`; retain hero/search/category/content assertions.

- [ ] **Step 2: Run and verify failure**

```bash
node --test tests/space-scene-contract.test.mjs tests/ui-contract.test.mjs
```

Expected: FAIL.

- [ ] **Step 3: Install Three.js only**

```bash
npm install three --package-lock=false
```

Verify `package.json` adds only `three`. Do not add React, GSAP, React Three Fiber, or another animation runtime.

- [ ] **Step 4: Create `SpaceScene.astro`**

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

Import `SpaceScene`, replace `.orbit-stage > svg` with `<SpaceScene />`, retain `.orbit-wrap`/caption, and add:

```html
<span class="nav-portal" aria-hidden="true"></span>
```

Do not change copy/search/categories/articles/footer.

- [ ] **Step 6: Run tests**

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
- `createSolarSystem(scene, { mobile, portalPosition })` returns `{ group, update(deltaSeconds), setStoryState(state), setTheme(theme), destroy() }`.
- `createBlackHolePortal({ position })` returns `{ group, setState(portalState), setTheme(theme), destroy() }`.
- `spaceScene.mjs` supplies one shared `portalPosition` to both solar system and portal so absorption ends at the visible event horizon.

- [ ] **Step 1: Add failing module-boundary test**

Append:

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

Expected: FAIL.

- [ ] **Step 3: Implement three-layer star field**

Use `THREE.Points` and deterministic positions generated once. Counts:

```js
const COUNTS = {
  desktop: { far: 900, mid: 360, near: 90 },
  mobile: { far: 420, mid: 170, near: 42 }
}
```

Far stars are smallest/dimmest; near stars are sparse/slightly larger. `update()` applies tiny independent rotation/parallax. Do not blink stars or allocate arrays/vectors every frame.

- [ ] **Step 4: Implement the 3D solar system**

Use one root `THREE.Group`, a sun at origin, three thin line-ring orbital planes with mild inclinations, two neutral planets, and one orange accent planet. No external textures. While `accent.mode === 'orbit'`, advance its orbit normally.

`spaceScene.mjs` will pass this shared location:

```js
const portalPosition = new THREE.Vector3(2.15, 0.18, 0.55)
```

During absorption, curve from the accent’s outer orbit toward that position:

```js
const angle = absorptionStartAngle + absorption * Math.PI * 2.2
const radius = 2.35 * (1 - absorption) * (1 - 0.35 * absorption)
accentPlanet.position.set(
  portalPosition.x + Math.cos(angle) * radius,
  portalPosition.y + Math.sin(angle * 0.72) * radius * 0.24,
  portalPosition.z + Math.sin(angle) * radius * 0.48
)
```

Shrink toward zero and add mild directional stretch near capture. Other planets continue orbiting. `setStoryState(state)` applies system scale, X/Y rotations, and lift.

- [ ] **Step 5: Implement the hero black-hole portal**

Use original Three.js geometry/material composition: black inner sphere/disc, two thin transparent additive rings, faint halo; no jets, giant accretion disc, or external textures. `setState({ opacity, scale, distortion, pulse })` controls visibility/scale/ring intensity. Set group position from the `position` argument so it matches `portalPosition`, never the sun.

- [ ] **Step 6: Run tests**

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

### Task 4: Build the Three.js lifecycle, containment, quality caps, and WebGL fallback

**Files:**
- Create: `src/scripts/spaceScene.mjs`
- Modify: `tests/space-scene-contract.test.mjs`

**Interfaces:**
- `createSpaceScene(canvas, { mobile, reducedMotion, theme, onUnavailable })`.
- Returns `{ available, setStoryState(state), setTheme(theme), resize(), destroy() }`.
- `home.js` never accesses renderer internals.

- [ ] **Step 1: Add failing lifecycle test**

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

Expected: FAIL.

- [ ] **Step 3: Implement renderer/camera/scene orchestration**

Create `portalPosition` once:

```js
const portalPosition = new THREE.Vector3(2.15, 0.18, 0.55)
const solarSystem = createSolarSystem(scene, { mobile, portalPosition })
const heroPortal = createBlackHolePortal({ position: portalPosition })
scene.add(heroPortal.group)
```

Then:

1. Try `new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !mobile, powerPreference: 'high-performance' })`.
2. On constructor failure call `onUnavailable()` and return no-op `{ available: false, ... }` lifecycle methods.
3. Cap DPR:

```js
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.75))
```

4. Use a mildly tilted `PerspectiveCamera`.
5. Construct stars/system/portal once.
6. Use one RAF loop and scalar delta/elapsed values; no per-frame collection rebuilding.
7. Pause costly updates while `document.hidden`.
8. On `webglcontextlost`, prevent default, stop rendering, call `onUnavailable()`.
9. Resize via `ResizeObserver` on the canvas parent and update camera aspect/renderer size.
10. `destroy()` cancels RAF, removes events/observer, disposes scene-owned geometry/materials/renderer.

- [ ] **Step 4: Enforce containment**

Clamp scene/root downward lift and never allow scale below state floor. Task 7 also clips visual overflow at DOM level, so both scene and CSS prevent entering article content.

- [ ] **Step 5: Implement reduced-motion scene behavior**

When reduced motion is true: static/extremely slow solar-system drift, hero portal always hidden, no orange absorption, no high-motion choreography.

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
- `getIndicatorGeometry(trackRect, buttonRect)` is pure.
- `getDropGeometry(indicatorGeometry, { mobile })` returns `{ portal, dropStart, target, targetWidth, targetHeight }`.
- `createNavPortal(node, { indicator, allButton })` returns `{ measure(), setState(state), destroy() }`.
- `home.js` combines drop geometry with `buildEjectionPath()`.

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
  assert.equal(geometry.offsetX, 120)
})

test('drop geometry keeps exact target and uses smaller mobile drop height', () => {
  const indicator = { centerX: 243, centerY: 714.25, width: 46, height: 1.5, offsetX: 120 }
  const desktop = getDropGeometry(indicator, { mobile: false })
  const mobile = getDropGeometry(indicator, { mobile: true })
  assert.deepEqual(desktop.portal, { x: 243, y: 714.25 })
  assert.deepEqual(desktop.target, { x: 243, y: 714.25 })
  assert.equal(desktop.dropStart.y, 622.25)
  assert.equal(mobile.dropStart.y, 648.25)
})
```

- [ ] **Step 2: Run and verify failure**

```bash
node --test tests/scroll-story.test.mjs
```

Expected: FAIL.

- [ ] **Step 3: Implement geometry helpers**

```js
const width = Math.max(18, buttonRect.width)
const height = 1.5
const centerX = buttonRect.left + buttonRect.width / 2
const centerY = trackRect.bottom - 5 - height / 2
```

`offsetX = buttonRect.left - trackRect.left`. `getDropGeometry()` uses drop height `92px` desktop and `66px` mobile; portal and landing target are the measured indicator center.

- [ ] **Step 4: Implement DOM portal controller**

`measure()` reads real filter-list/button rects and positions the fixed node at the center. `setState({ opacity, scale, pulse })` changes only transform/opacity/CSS custom properties; no layout shifts or pointer capture.

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

### Task 6: Rewire `home.js` around the new story while preserving landing physics

**Files:**
- Modify: `src/scripts/home.js`
- Modify: `tests/ui-contract.test.mjs`

**Interfaces:**
- Consumes `getScrollStoryState`, `buildEjectionPath`, `sampleEjectionPath`.
- Consumes `createSpaceScene`.
- Consumes `createNavPortal`, `getDropGeometry`.
- Continues consuming `getLandingMotionState` and `landingProgressFromElapsed` from `orbitMotion.mjs`.
- Existing article/filter/theme functions remain behaviorally unchanged.

- [ ] **Step 1: Update UI-contract test**

```js
assert.match(script, /getScrollStoryState/)
assert.match(script, /createSpaceScene/)
assert.match(script, /createNavPortal/)
assert.match(script, /getLandingMotionState/)
assert.match(script, /landingProgressFromElapsed/)
assert.match(script, /filterArticleMetadata/)
assert.doesNotMatch(script, /orbitNodes\s*=|orbit-ring-a|setSvgPoint/)
```

- [ ] **Step 2: Run and verify failure**

```bash
node --test tests/ui-contract.test.mjs
```

Expected: FAIL.

- [ ] **Step 3: Replace SVG initialization with scene/nav initialization**

```js
const spaceCanvas = document.querySelector('[data-space-canvas]')
const spaceSceneNode = document.querySelector('[data-space-scene]')
const navPortalNode = document.querySelector('.nav-portal')
```

Create the scene with current mobile/reduced/theme state. `onUnavailable()` adds `is-fallback` to the wrapper.

- [ ] **Step 4: Use one scroll progress source**

```js
function getScrollProgress() {
  const distance = Math.max(hero.offsetHeight * (mobileMedia.matches ? 0.92 : 0.96), 1)
  return window.scrollY / distance
}
```

Map only through `getScrollStoryState()` and send the same state to the scene/nav portal. Do not duplicate phase thresholds in `home.js`.

- [ ] **Step 5: Replace tangent flight with portal ejection**

When ejection progress becomes positive, cache measured drop geometry and one ejection path from `geometry.portal` to `geometry.dropStart`. Place `.flight-orb` using `sampleEjectionPath`. Use restrained echoes only while ejecting.

When `landingReady` becomes true, start the existing elapsed-time landing sequence:

```js
if (landingStartedAt === null) landingStartedAt = performance.now()
const landingProgress = landingProgressFromElapsed(
  performance.now() - landingStartedAt,
  { mobile: mobileMedia.matches }
)
const landing = getLandingMotionState(landingProgress, { mobile: mobileMedia.matches })
```

During fall interpolate `dropStart → target` with `landing.fall`; during impact/bounce use `landing.yOffset`; during morph interpolate orb width/height to target width/height exactly as current production code does.

- [ ] **Step 6: Preserve interruption behavior**

User category click sets `filterStoryInterrupted = true`, hides nav portal/orb/echoes, shows real indicator immediately, and filtering continues. Reduced motion follows the simple indicator-visible path from the start.

- [ ] **Step 7: Preserve theme/search/keyboard/article logic**

Keep `glenn-blog-theme`; after `applyTheme(theme)`, call `spaceScene.setTheme(theme)`. Preserve `⌘/Ctrl + K`, clear-filters, filtering, result count, and reveal observer.

- [ ] **Step 8: Preserve resize/media behavior**

Clear cached ejection geometry, call `spaceScene.resize()`, call `navPortal.measure()`, reposition active indicator, and recalculate story state.

- [ ] **Step 9: Run regressions**

```bash
node --test tests/ui-contract.test.mjs tests/orbit-motion.test.mjs tests/scroll-story.test.mjs
npm test
```

Expected: all existing orbit/landing regressions remain PASS without editing `orbitMotion.mjs` or `tests/orbit-motion.test.mjs`.

- [ ] **Step 10: Commit**

```bash
git add src/scripts/home.js tests/ui-contract.test.mjs
git commit -m "feat: connect scroll portals to existing landing physics"
```

---

### Task 7: Style deep space, portal handoff, containment, mobile, and fallbacks

**Files:**
- Modify: `src/styles/global.css`
- Modify: `tests/ui-contract.test.mjs`

**Interfaces:**
- `.space-scene.is-fallback` shows fallback/hides canvas.
- `.hero`/`.orbit-wrap` clip visual overflow so the compact system cannot enter article content.

- [ ] **Step 1: Add failing CSS contract assertions**

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

Expected: FAIL.

- [ ] **Step 3: Replace production orbit styling with 3D scene styling**

Keep `.orbit-wrap` as containment but remove production reliance on old `.orbit-stage/.orbit-svg/.orbit-ring-*` styles except fallback equivalents.

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

The light theme keeps its light page surface; the deep-space object fades into it instead of becoming a rectangular dark card.

- [ ] **Step 4: Style fallback and nav portal**

Fallback hidden by default; shown under `.is-fallback`. Portal:

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

Keep it a transient portal, not a second hero subject.

- [ ] **Step 5: Add mobile treatment**

At `max-width: 760px`: scene width `min(86vw, 390px)`, smaller wrapper min-height, clipped overflow, slightly smaller nav portal, existing mobile flight-orb shadow, no horizontal overflow.

- [ ] **Step 6: Add reduced-motion CSS**

Hide nav portal/flight orb/echoes, force filter indicator visible, suppress wrapper transform animation, leave static fallback/scene visible.

- [ ] **Step 7: Run tests/build**

```bash
node --test tests/ui-contract.test.mjs
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/styles/global.css tests/ui-contract.test.mjs
git commit -m "style: add deep space hero and portal states"
```

---

### Task 8: Performance, visual-frame verification, production regression, and final review

**Files:**
- Change only a file from Tasks 1–7 when a specific verification failure proves a correction is needed.
- Do not change content or deployment architecture here.

- [ ] **Step 1: Run clean automated gate**

```bash
rm -rf node_modules dist .astro
npm install --package-lock=false
npm test
npm run build
```

Expected: all tests PASS and all existing production routes still build.

- [ ] **Step 2: Verify dependency scope**

```bash
npm ls --depth=0
```

Expected only new visual dependency: `three`; no React/R3F/GSAP/unrelated framework.

- [ ] **Step 3: Verify desktop story frames**

Inspect these approximate progress points:

```text
p=0.05  large readable 3D solar system, no portal
p=0.24  portal grows behind orange planet; mild system rotate/shrink
p=0.38  orange planet visibly curves toward portal
p=0.52  orange hidden; compact system still visible inside hero
p=0.62  nav portal at All indicator; hero portal gone
p=0.71  orange planet visibly ejecting
p>=0.76 existing landing begins → squash → bounce → settle → indicator
```

Reject if system overlaps controls/articles, black hole replaces sun, or ball jumps between anchors.

- [ ] **Step 4: Verify aggressive scroll cannot skip landing**

Scroll rapidly through trigger; after ejection, impact/bounce must still play from elapsed-time landing progress. Confirm `landingProgressFromElapsed` regression remains green.

- [ ] **Step 5: Verify 390 × 844 mobile**

Confirm no horizontal overflow, same phase order, smaller readable system, nav portal aligned to real `All`, existing smaller mobile bounce/sink, and no system overlap with articles.

- [ ] **Step 6: Verify reduced motion**

With `prefers-reduced-motion: reduce`: no swallow/eject travel, no rapid scale/rotation, active indicator visible, search/categories/theme/article links functional.

- [ ] **Step 7: Verify WebGL fallback**

Trigger `webglcontextlost` from browser devtools or locally force renderer construction to throw, verify SVG fallback and usable UI, then restore normal source before final diff.

- [ ] **Step 8: Compare branch to main**

```bash
git diff --stat main...HEAD
git diff main...HEAD -- src/pages/index.astro src/scripts/home.js src/styles/global.css package.json
```

Check there are no accidental changes to typography, category labels, search behavior, article markup, or footer.

- [ ] **Step 9: Final test/build evidence**

```bash
npm test
npm run build
```

Record exact outputs in the implementation report; do not claim completion from visuals alone.

- [ ] **Step 10: Commit concrete verification fixes only when needed**

If Step 3–8 reveals a defect, make the smallest correction, verify the failing check again, stage interactively, and commit:

```bash
git add -p
git commit -m "fix: harden 3d scroll story verification"
```

If no source changes were necessary, create no commit.

## Completion Checklist

- [ ] Three.js solar system is visibly 3D and larger than old SVG treatment.
- [ ] Deep-space star field has three restrained depth layers and no wallpaper-like blinking.
- [ ] Orange accent planet orbits normally before capture.
- [ ] Hero portal appears behind the orange planet, not at the sun.
- [ ] Absorption is curved/continuous and completes before nav ejection.
- [ ] Compact solar system remains visible but cannot enter article section.
- [ ] Hero portal is gone before navigation portal becomes dominant.
- [ ] Navigation portal is measured from actual `All` indicator geometry.
- [ ] Ejected orange planet reaches exact existing drop-start contract.
- [ ] Existing free-fall, impact squash, bounce, settle, and morph tests remain intact.
- [ ] User category interaction can interrupt decorative story safely.
- [ ] Search, theme, article list, archive/tags/RSS/content model are unchanged.
- [ ] Mobile and reduced-motion behavior are usable.
- [ ] WebGL failure falls back without breaking page.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
