# Solar Archive Dual-Personality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing light/dark theme into two intentional personalities — Night `OBSERVATORY` and Day `SOLAR ARCHIVE` — with one shared site structure and a mandatory Eclipse → Corona → radial Solar Wave → Solar Archive transition.

**Architecture:** Keep one Astro/HTML content tree and one persistent Three.js renderer. Introduce a shared world-state/controller layer that maps `dark -> observatory` and `light -> solar`, drives a progressive-enhancement theme transition from the actual toggle origin, and emits world-transition events to the existing Hero scene. The current cosmic scene remains the Observatory layer; a new procedural Solar layer is added to the same WebGL scene, while CSS world tokens and shared DOM hooks recompose the Hero, Writing index, supporting pages, and article chrome without duplicating routes or content.

**Tech Stack:** Astro 7.3.1, vanilla JavaScript/ES modules, CSS custom properties + CSS Grid, native View Transition API with CSS fallback, Three.js 0.180.0, Node test runner, Playwright-based GitHub Actions QA.

**Spec:** `docs/superpowers/specs/2026-09-08-solar-archive-dual-personality-design.md`

## Global Constraints

- Night personality is `OBSERVATORY`; day personality is `SOLAR ARCHIVE`.
- Keep one Astro page structure, one article collection, one SEO/canonical/RSS system, one navigation model, one search/filter state, and one WebGL scene lifecycle.
- Do not duplicate light/day page trees or article data.
- Theme transition must use **Eclipse → Corona → radial Solar Wave → Solar Archive reveal**; a generic fade, instant color swap, or simple white circular wipe is not acceptable.
- Night Hero preserves the current Cosmic Editorial V3 direction except compatibility work.
- Day Hero uses a huge cropped procedural solar limb; never a complete centered floating sphere.
- Solar Archive uses warm ivory, cobalt/sky blue, silver-grey technical lines, and only sparse solar orange/red annotation.
- No persistent meteor/traveler animation may return.
- After the signature transition ends, both worlds become quiet.
- One WebGL context maximum for the Hero system; do not recreate the renderer on each theme toggle.
- Preserve current DPR protection (`<= 1.2` mobile, `<= 1.65` desktop) or stricter equivalents.
- `prefers-reduced-motion` disables the radial wave, heat shimmer, solar flare animation, and nonessential parallax.
- Preserve article publishing, SEO, canonical URLs, RSS, archive/tags, search/filter behavior, article reading measure, and theme persistence key `glenn-blog-theme`.
- No large new animation dependency unless the native implementation is proven insufficient.

---

## File Structure Lock

### New files

- `src/scripts/themeWorld.mjs` — pure theme/world mapping and transition phase math; no DOM access.
- `src/scripts/themeController.js` — browser controller for persistence, toggle origin, View Transition progressive enhancement, transition events, and accessibility labels.
- `src/components/ThemeTransition.astro` — one global decorative transition surface mounted by `BaseLayout`.
- `src/styles/solar.css` — Solar Archive world tokens, homepage day layout, publication-grid styling, solar annotations, and transition visuals.
- `src/scripts/solarField.mjs` — procedural Three.js solar limb, granulation, corona, spectral/magnetic detail, and lifecycle.
- `tests/theme-world.test.mjs` — pure world/transition behavior tests.
- `tests/solar-archive-contract.test.mjs` — shared-DOM, CSS, scene, and accessibility contracts.
- `scripts/world-transition-qa.mjs` — Playwright transition frame capture and browser assertions.
- `.github/workflows/world-transition-qa.yml` — CI workflow and artifact upload for signature animation frames.

### Existing files to modify

- `src/layouts/BaseLayout.astro` — initialize `data-world`, mount global transition surface/controller, import `solar.css`, preserve SEO.
- `src/components/SiteHeader.astro` — remove duplicated inline theme logic; expose the shared world toggle hook.
- `src/pages/index.astro` — preserve content/data but add world-aware decorative hooks/labels and Solar Archive annotation furniture.
- `src/components/SpaceScene.astro` — add theme-neutral foreground/fallback hooks required by both worlds; keep one canvas.
- `src/scripts/home.js` — remove theme ownership; listen for world controller events and forward transition state to `SpaceScene`.
- `src/scripts/spaceScene.mjs` — add persistent Solar layer and world-transition API while keeping one renderer.
- `src/scripts/starField.mjs` — expose world opacity/intensity control needed for dawn/night crossfade without rebuild.
- `src/scripts/cosmicField.mjs` — expose world opacity/intensity control needed for the same crossfade.
- `src/styles/global.css` — replace generic light tokens with Solar Archive base tokens; preserve Observatory dark tokens and accessibility focus behavior.
- `src/styles/editorial.css` — add shared world-aware layout hooks for homepage/article/supporting routes without duplicating DOM.
- `src/styles/space.css` — keep Observatory rules and add world-neutral scene container variables; remove any day styling that fights `solar.css`.
- `scripts/deliver-qa.mjs` — assert `data-world`, capture Solar/Observatory screenshots, preserve current route/stress/search coverage.
- `tests/ui-contract.test.mjs` — require shared world controller and one content tree.
- `tests/space-scene-contract.test.mjs` — require one canvas/renderer plus Solar layer; prohibit centered solar-model fallback.
- `tests/deliver-qa-contract.test.mjs` — extend artifact coverage for both personalities if present; otherwise add equivalent assertions to the current deliver QA contract test file.

---

### Task 1: Shared World State and Theme Ownership

**Files:**
- Create: `src/scripts/themeWorld.mjs`
- Create: `tests/theme-world.test.mjs`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/components/SiteHeader.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/scripts/home.js`
- Modify: `tests/ui-contract.test.mjs`

**Interfaces:**
- Produces: `themeToWorld(theme) -> 'observatory' | 'solar'`
- Produces: `worldToTheme(world) -> 'dark' | 'light'`
- Produces: `getTransitionDirection(fromWorld, toWorld) -> 'to-solar' | 'to-observatory' | 'none'`
- Produces: `getTransitionFrame(elapsedMs, direction) -> { progress, phase, phaseProgress, direction }`
- Consumed later by: `themeController.js`, `spaceScene.mjs`, browser QA.

- [ ] **Step 1: Write failing pure world-state tests**

Create `tests/theme-world.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  themeToWorld,
  worldToTheme,
  getTransitionDirection,
  getTransitionFrame
} from '../src/scripts/themeWorld.mjs'

test('light maps to Solar Archive and dark maps to Observatory', () => {
  assert.equal(themeToWorld('light'), 'solar')
  assert.equal(themeToWorld('dark'), 'observatory')
  assert.equal(worldToTheme('solar'), 'light')
  assert.equal(worldToTheme('observatory'), 'dark')
})

test('world transitions have fixed signature phases', () => {
  assert.equal(getTransitionFrame(0, 'to-solar').phase, 'eclipse')
  assert.equal(getTransitionFrame(180, 'to-solar').phase, 'totality')
  assert.equal(getTransitionFrame(450, 'to-solar').phase, 'solar-wave')
  assert.equal(getTransitionFrame(950, 'to-solar').phase, 'solar-reveal')
  assert.equal(getTransitionFrame(1250, 'to-solar').phase, 'archive-settle')
  assert.equal(getTransitionFrame(1500, 'to-solar').progress, 1)
})

test('direction follows personality destination', () => {
  assert.equal(getTransitionDirection('observatory', 'solar'), 'to-solar')
  assert.equal(getTransitionDirection('solar', 'observatory'), 'to-observatory')
  assert.equal(getTransitionDirection('solar', 'solar'), 'none')
})
```

- [ ] **Step 2: Run the new tests and verify RED**

Run:

```bash
node --test tests/theme-world.test.mjs
```

Expected: FAIL because `src/scripts/themeWorld.mjs` does not exist.

- [ ] **Step 3: Implement the pure world mapping and signature timing**

Create `src/scripts/themeWorld.mjs` with this public shape:

```js
export const WORLD_BY_THEME = Object.freeze({
  light: 'solar',
  dark: 'observatory'
})

export const THEME_BY_WORLD = Object.freeze({
  solar: 'light',
  observatory: 'dark'
})

const LIMITS = Object.freeze({
  eclipseEnd: 180,
  totalityEnd: 450,
  waveEnd: 950,
  revealEnd: 1250,
  settleEnd: 1500
})

const clamp01 = value => Math.min(1, Math.max(0, value))

export function themeToWorld(theme) {
  return WORLD_BY_THEME[theme] ?? 'solar'
}

export function worldToTheme(world) {
  return THEME_BY_WORLD[world] ?? 'light'
}

export function getTransitionDirection(fromWorld, toWorld) {
  if (fromWorld === toWorld) return 'none'
  return toWorld === 'solar' ? 'to-solar' : 'to-observatory'
}

export function getTransitionFrame(elapsedMs, direction) {
  const ms = Math.min(LIMITS.settleEnd, Math.max(0, elapsedMs))
  const progress = clamp01(ms / LIMITS.settleEnd)
  let phase = 'archive-settle'
  let start = LIMITS.revealEnd
  let end = LIMITS.settleEnd
  if (ms < LIMITS.eclipseEnd) {
    phase = 'eclipse'; start = 0; end = LIMITS.eclipseEnd
  } else if (ms < LIMITS.totalityEnd) {
    phase = 'totality'; start = LIMITS.eclipseEnd; end = LIMITS.totalityEnd
  } else if (ms < LIMITS.waveEnd) {
    phase = 'solar-wave'; start = LIMITS.totalityEnd; end = LIMITS.waveEnd
  } else if (ms < LIMITS.revealEnd) {
    phase = 'solar-reveal'; start = LIMITS.waveEnd; end = LIMITS.revealEnd
  }
  return {
    progress,
    phase,
    phaseProgress: clamp01((ms - start) / Math.max(1, end - start)),
    direction
  }
}
```

- [ ] **Step 4: Move theme ownership out of `home.js` and `SiteHeader.astro`**

Required structural changes:

```js
// home.js must no longer own these behaviors:
// - getInitialTheme()
// - applyTheme()
// - themeToggle click handler

window.addEventListener('glenn:worldchange', event => {
  const { world, theme } = event.detail
  spaceScene?.setWorld(world)
  spaceScene?.setTheme(theme)
})

window.addEventListener('glenn:worldtransition', event => {
  spaceScene?.setWorldTransition(event.detail)
})
```

`SiteHeader.astro` and `index.astro` theme buttons must expose the same hook:

```astro
<button
  id="theme-toggle"
  class="icon-button theme-toggle"
  type="button"
  data-world-toggle
  aria-label="切换到 Observatory"
  title="切换世界"
>
```

Remove the inline `SiteHeader.astro` script that directly writes `data-theme`.

- [ ] **Step 5: Initialize `data-world` in `BaseLayout.astro` before paint**

The existing inline head script must set both values from the same persisted theme:

```js
const theme = saved === 'light' || saved === 'dark' ? saved : preferred
document.documentElement.dataset.theme = theme
document.documentElement.dataset.world = theme === 'dark' ? 'observatory' : 'solar'
```

Do not change the storage key.

- [ ] **Step 6: Extend UI contract tests for shared ownership**

Add assertions that:

```js
assert.match(baseLayout, /dataset\.world/)
assert.match(page, /data-world-toggle/)
assert.match(siteHeader, /data-world-toggle/)
assert.doesNotMatch(siteHeader, /localStorage\.setItem\('glenn-blog-theme'/)
assert.doesNotMatch(homeScript, /function\s+applyTheme|function\s+getInitialTheme/)
```

- [ ] **Step 7: Run focused and full tests**

Run:

```bash
node --test tests/theme-world.test.mjs tests/ui-contract.test.mjs
npm test
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/scripts/themeWorld.mjs tests/theme-world.test.mjs src/layouts/BaseLayout.astro src/components/SiteHeader.astro src/pages/index.astro src/scripts/home.js tests/ui-contract.test.mjs
git commit -m "feat: introduce Observatory and Solar Archive world state"
```

---

### Task 2: Signature Eclipse / Corona / Solar Wave Controller

**Files:**
- Create: `src/components/ThemeTransition.astro`
- Create: `src/scripts/themeController.js`
- Create: `src/styles/solar.css`
- Create: `tests/solar-archive-contract.test.mjs`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `tests/ui-contract.test.mjs`

**Interfaces:**
- Consumes: `themeToWorld`, `worldToTheme`, `getTransitionDirection`, `getTransitionFrame` from Task 1.
- Produces browser events:
  - `glenn:worldtransition` detail `{ fromWorld, toWorld, theme, world, direction, progress, phase, phaseProgress, originX, originY }`
  - `glenn:worldchange` detail `{ theme, world }`
- Produces CSS vars: `--world-origin-x`, `--world-origin-y`, `--world-wave-radius`.

- [ ] **Step 1: Write failing transition contracts**

Create `tests/solar-archive-contract.test.mjs` with initial checks:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('BaseLayout mounts one global signature transition surface', async () => {
  const layout = await read('../src/layouts/BaseLayout.astro')
  const transition = await read('../src/components/ThemeTransition.astro')
  assert.match(layout, /ThemeTransition/)
  assert.match(transition, /data-eclipse-core/)
  assert.match(transition, /data-corona/)
  assert.match(transition, /data-solar-wave/)
})

test('theme controller uses actual toggle origin and progressive enhancement', async () => {
  const controller = await read('../src/scripts/themeController.js')
  assert.match(controller, /getBoundingClientRect/)
  assert.match(controller, /startViewTransition/)
  assert.match(controller, /prefers-reduced-motion/)
  assert.match(controller, /glenn:worldtransition/)
  assert.match(controller, /glenn:worldchange/)
})

test('Solar reveal is not implemented as a generic white wipe', async () => {
  const css = await read('../src/styles/solar.css')
  assert.match(css, /\.theme-corona/)
  assert.match(css, /\.theme-solar-wave/)
  assert.match(css, /--world-origin-x/)
  assert.doesNotMatch(css, /background:\s*white\s*;/i)
})
```

- [ ] **Step 2: Run contracts and verify RED**

Run:

```bash
node --test tests/solar-archive-contract.test.mjs
```

Expected: FAIL because the transition component/controller/style do not exist.

- [ ] **Step 3: Create the global transition component**

`src/components/ThemeTransition.astro` must mount exactly one decorative transition layer:

```astro
<div class="theme-transition" data-theme-transition aria-hidden="true">
  <span class="theme-eclipse-core" data-eclipse-core></span>
  <span class="theme-corona" data-corona></span>
  <span class="theme-solar-wave" data-solar-wave></span>
  <span class="theme-transition-caption" data-transition-caption>Two modes of the same mind.</span>
</div>

<script>
  import '../scripts/themeController.js'
</script>
```

Mount it once in `BaseLayout.astro` immediately inside `<body>`, before `<slot />`.

- [ ] **Step 4: Implement controller origin and event flow**

`src/scripts/themeController.js` must:

```js
import {
  themeToWorld,
  worldToTheme,
  getTransitionDirection,
  getTransitionFrame
} from './themeWorld.mjs'

const root = document.documentElement
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

function getOrigin(button) {
  const rect = button?.getBoundingClientRect?.()
  if (!rect) return { x: window.innerWidth - 28, y: 28 }
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

function dispatch(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }))
}
```

Behavioral requirements:
- bind all `[data-world-toggle]` buttons
- compute actual click-origin from the clicked button
- keyboard activation uses the same button-center fallback
- set `--world-origin-x/y` in px
- calculate max viewport radius with `Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))`
- if reduced motion: apply theme/world immediately, dispatch `glenn:worldchange`, do not run 1.5 s rAF
- otherwise run a 1500 ms rAF using `getTransitionFrame()` and set transition layer `data-phase`/`data-direction`
- at the world-swap point (start of `solar-wave`, 450 ms), update `data-theme` and `data-world` inside `document.startViewTransition(() => ...)` when available
- fallback performs the same state update without View Transition API
- persist only after the state update succeeds
- emit `glenn:worldtransition` on every frame and `glenn:worldchange` once after swap
- clear transient classes/data after 1500 ms

- [ ] **Step 5: Implement the five visual phases in `solar.css`**

The transition surface must be fixed and pointer-transparent:

```css
.theme-transition {
  position: fixed;
  inset: 0;
  z-index: 1000;
  pointer-events: none;
  overflow: clip;
}

.theme-eclipse-core,
.theme-corona,
.theme-solar-wave {
  position: absolute;
  left: var(--world-origin-x);
  top: var(--world-origin-y);
  translate: -50% -50%;
  opacity: 0;
}
```

Required phase language:
- `eclipse`: dark 12–18px disc + white-gold 1px asymmetric corona
- `totality`: page luminance briefly compresses; corona expands only slightly
- `solar-wave`: wave edge uses layered ivory/cobalt/refractive gradients; interior reveals the new world; it must not be a flat white circle
- `solar-reveal`: wave edge dissipates while solar scene becomes dominant
- `archive-settle`: transition furniture fades out and optional caption appears briefly

Use `clip-path: circle(var(--world-wave-radius) at var(--world-origin-x) var(--world-origin-y))` or equivalent View Transition pseudo-element geometry only as a mask; the visible edge must be layered, not generic white.

- [ ] **Step 6: Add reduced-motion CSS**

```css
@media (prefers-reduced-motion: reduce) {
  .theme-transition { display: none; }
  ::view-transition-old(root),
  ::view-transition-new(root) { animation: none !important; }
}
```

- [ ] **Step 7: Run tests**

```bash
node --test tests/theme-world.test.mjs tests/solar-archive-contract.test.mjs tests/ui-contract.test.mjs
npm test
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/ThemeTransition.astro src/scripts/themeController.js src/styles/solar.css src/layouts/BaseLayout.astro tests/solar-archive-contract.test.mjs tests/ui-contract.test.mjs
git commit -m "feat: add eclipse world transition"
```

---

### Task 3: Persistent Solar WebGL World

**Files:**
- Create: `src/scripts/solarField.mjs`
- Modify: `src/scripts/spaceScene.mjs`
- Modify: `src/scripts/starField.mjs`
- Modify: `src/scripts/cosmicField.mjs`
- Modify: `src/components/SpaceScene.astro`
- Modify: `src/scripts/home.js`
- Modify: `tests/space-scene-contract.test.mjs`
- Modify: `tests/solar-archive-contract.test.mjs`

**Interfaces:**
- `createSolarField(scene, { mobile, reducedMotion }) -> { setWorldMix(value), setTheme(theme), setTransitionState(state), update(elapsedSeconds, story), destroy() }`
- `createSpaceScene()` adds:
  - `setWorld(world)`
  - `setWorldTransition(detail)`
- Existing APIs remain: `setStoryState`, `setTheme`, `resize`, `destroy`.

- [ ] **Step 1: Write failing scene contracts**

Extend `tests/space-scene-contract.test.mjs`:

```js
assert.match(scene, /createSolarField/)
assert.match(scene, /setWorld/)
assert.match(scene, /setWorldTransition/)
assert.doesNotMatch(scene, /new THREE\.WebGLRenderer[\s\S]*new THREE\.WebGLRenderer/)
```

Extend `tests/solar-archive-contract.test.mjs`:

```js
const solar = await read('../src/scripts/solarField.mjs')
assert.match(solar, /ShaderMaterial/)
assert.match(solar, /uWorldMix/)
assert.match(solar, /granulation|noise/i)
assert.match(solar, /corona/i)
assert.doesNotMatch(solar, /SphereGeometry/)
```

- [ ] **Step 2: Verify RED**

```bash
node --test tests/space-scene-contract.test.mjs tests/solar-archive-contract.test.mjs
```

Expected: FAIL because `solarField.mjs` and new APIs are absent.

- [ ] **Step 3: Implement a cropped procedural solar limb**

Create `src/scripts/solarField.mjs` around a single `THREE.Group` with:
- one large `PlaneGeometry(2, 2)` + `ShaderMaterial` for the solar surface
- one secondary additive plane/sprite for corona bloom
- sparse `THREE.Line` magnetic/spectral guides
- no `SphereGeometry`

Required uniforms:

```js
const uniforms = {
  uTime: { value: 0 },
  uWorldMix: { value: 0 },
  uTransition: { value: 0 },
  uReducedMotion: { value: reducedMotion ? 1 : 0 },
  uResolution: { value: new THREE.Vector2(1, 1) }
}
```

The fragment shader must form the limb from UV signed distance, not mesh depth. It should combine:
- 3–4 octaves of inexpensive procedural value/simplex-style noise for granulation
- brighter edge/corona response near the limb
- low-amplitude animated distortion only when motion is allowed
- warm white/gold core colors with restrained orange only in hot details

Place/scale the plane so only a partial right-side limb is visible:

```js
surface.position.set(2.65, 0.05, -0.6)
surface.scale.set(mobile ? 5.5 : 7.2, mobile ? 5.5 : 7.2, 1)
```

Exact visual position may be tuned during screenshot review, but the full circle must remain outside the viewport composition.

- [ ] **Step 4: Add cross-world opacity to existing space layers**

`starField.mjs` and `cosmicField.mjs` must expose `setWorldMix(value)` where:
- `0` = full Observatory
- `1` = full Solar Archive

Night layers multiply opacity by `1 - value` rather than being destroyed/recreated.

- [ ] **Step 5: Extend `spaceScene.mjs` without creating another renderer**

Instantiate all persistent layers once:

```js
const stars = createStarField(scene, { mobile })
const cosmicField = createCosmicField(scene, { mobile })
const solarField = createSolarField(scene, { mobile, reducedMotion })
```

Maintain:

```js
let currentWorld = theme === 'dark' ? 'observatory' : 'solar'
let worldMix = currentWorld === 'solar' ? 1 : 0
```

`setWorldTransition(detail)` sets `worldMix` from transition progress and direction, then forwards it to all three layer systems. `setWorld(world)` snaps to the stable endpoint after transition/reduced-motion.

- [ ] **Step 6: Forward controller events from `home.js`**

`home.js` must not run a second theme timeline. It only forwards the shared controller detail:

```js
window.addEventListener('glenn:worldtransition', event => {
  spaceScene?.setWorldTransition(event.detail)
})

window.addEventListener('glenn:worldchange', event => {
  spaceScene?.setTheme(event.detail.theme)
  spaceScene?.setWorld(event.detail.world)
})
```

Initial scene world derives from `document.documentElement.dataset.world`.

- [ ] **Step 7: Update fallback structure**

`SpaceScene.astro` keeps one canvas and one fallback container. Add a Solar Archive fallback group with a cropped `<circle>`/SVG limb deliberately positioned beyond the right viewBox edge plus spectral lines. It is fallback-only; it must not look like a centered floating sun.

- [ ] **Step 8: Run tests**

```bash
node --test tests/space-scene-contract.test.mjs tests/solar-archive-contract.test.mjs tests/ui-contract.test.mjs
npm test
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/scripts/solarField.mjs src/scripts/spaceScene.mjs src/scripts/starField.mjs src/scripts/cosmicField.mjs src/components/SpaceScene.astro src/scripts/home.js tests/space-scene-contract.test.mjs tests/solar-archive-contract.test.mjs
git commit -m "feat: add persistent Solar Archive scene"
```

---

### Task 4: Solar Archive Homepage Personality

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/styles/global.css`
- Modify: `src/styles/editorial.css`
- Modify: `src/styles/space.css`
- Modify: `src/styles/solar.css`
- Modify: `tests/solar-archive-contract.test.mjs`
- Modify: `tests/ui-contract.test.mjs`

**Interfaces:**
- Consumes stable `html[data-world='solar']` from Task 1/2.
- Does not change article collection/data/search/filter APIs.
- Produces CSS hooks/data attributes for Solar annotation and publication furniture.

- [ ] **Step 1: Write failing homepage personality contracts**

Add checks:

```js
const page = await read('../src/pages/index.astro')
const solarCss = await read('../src/styles/solar.css')

assert.match(page, /data-observatory-label="GLENN \/ RESEARCH FOLIO \/ 2026"/)
assert.match(page, /data-solar-label="GLENN \/ SOLAR ARCHIVE \/ 2026"/)
assert.match(page, /solar-observation-meta/)
assert.match(page, /solar-marginalia/)
assert.equal((page.match(/getCollection\('posts'/g) ?? []).length, 1)
assert.equal((page.match(/posts\.map/g) ?? []).length, 1)
assert.match(solarCss, /html\[data-world=['"]solar['"]\] \.hero/)
assert.match(solarCss, /html\[data-world=['"]solar['"]\] \.article-row/)
```

- [ ] **Step 2: Verify RED**

```bash
node --test tests/solar-archive-contract.test.mjs tests/ui-contract.test.mjs
```

Expected: FAIL because the Solar hooks and layout do not exist yet.

- [ ] **Step 3: Add shared decorative hooks without duplicating page content**

In `index.astro`, keep the existing single H1, single `posts.map`, single search/filter controls. Add decorative hooks only:

```astro
<p
  class="eyebrow world-eyebrow"
  data-observatory-label="GLENN / RESEARCH FOLIO / 2026"
  data-solar-label="GLENN / SOLAR ARCHIVE / 2026"
>GLENN / RESEARCH FOLIO / 2026</p>

<div class="solar-observation-meta" aria-hidden="true">
  <span>OBS / SOL-26</span>
  <span>λ 617.3 NM</span>
  <span>+18.4° / 72.1°</span>
</div>
```

Add one `solar-marginalia` decorative rail near the Writing heading, but do not duplicate article titles or metadata.

- [ ] **Step 4: Define Solar base tokens in `global.css`**

Use intentional paper/science tokens under `html[data-world='solar']`:

```css
html[data-world='solar'] {
  --bg: #f2eddf;
  --bg-elevated: rgba(255, 252, 241, .72);
  --text: #171b20;
  --text-soft: #59616a;
  --text-faint: #777d82;
  --line: rgba(37, 58, 83, .16);
  --line-strong: rgba(37, 58, 83, .28);
  --solar-cobalt: #1f4f9b;
  --solar-sky: #7aa8d8;
  --solar-orange: #e96936;
  --solar-paper: #f2eddf;
  --accent: var(--solar-cobalt);
  color-scheme: light;
}
```

The exact values may be nudged during visual QA, but the palette family and role separation must remain.

- [ ] **Step 5: Recompose the Solar Hero with CSS Grid**

`solar.css` must give Solar Archive its own layout rhythm while preserving the same nodes:
- slightly wider editorial left column
- solar scene intentionally bleeds toward/right beyond the page grid
- annotation metadata aligns to a scientific baseline grid
- headline remains readable and does not overlap solar limb
- theme toggle/corona has enough clear space at top right

Required selector family:

```css
html[data-world='solar'] .cosmic-hero { ... }
html[data-world='solar'] .folio-intro { ... }
html[data-world='solar'] .orbit-wrap { ... }
html[data-world='solar'] .solar-observation-meta { ... }
```

Do not hide the H1 or replace it with a second day-only H1.

- [ ] **Step 6: Recompose Writing into a science-publication register**

Use the same `.article-row` elements but alter grid/typography in Solar Archive:
- cobalt issue/date rail
- larger editorial title contrast
- category/read data as margin annotation
- thin spectral hover line using cobalt → pale blue → sparse orange
- search reads as archive catalogue
- filter active state reads like editorial annotation rather than a pill/tab
- `index-register-head` visually maps to `ISSUE / FIELD NOTE / OBSERVATION` via decorative generated labels or data hooks while keeping accessible meaning unchanged

Example direction:

```css
html[data-world='solar'] .publication-index {
  position: relative;
  border-top: 1px solid var(--line-strong);
}

html[data-world='solar'] .article-row {
  grid-template-columns: 86px minmax(0, 1fr) 150px;
  border-bottom-color: rgba(31, 79, 155, .18);
}

html[data-world='solar'] .article-row::before {
  width: 2px;
  height: 100%;
  background: linear-gradient(180deg, var(--solar-cobalt), var(--solar-sky) 72%, var(--solar-orange));
  opacity: 0;
}
```

- [ ] **Step 7: Make label switching deterministic without JS copy duplication**

Use a generated-label pattern:

```css
.world-eyebrow { font-size: 0; }
.world-eyebrow::before { content: attr(data-observatory-label); font-size: 9px; }
html[data-world='solar'] .world-eyebrow::before { content: attr(data-solar-label); }
```

The original node remains one semantic element.

- [ ] **Step 8: Run tests**

```bash
node --test tests/solar-archive-contract.test.mjs tests/ui-contract.test.mjs
npm test
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/pages/index.astro src/styles/global.css src/styles/editorial.css src/styles/space.css src/styles/solar.css tests/solar-archive-contract.test.mjs tests/ui-contract.test.mjs
git commit -m "feat: give Solar Archive a distinct editorial personality"
```

---

### Task 5: Solar Personality for Articles, Archive, Tags, Navigation, and Footer

**Files:**
- Modify: `src/components/SiteHeader.astro`
- Modify: `src/layouts/ArticleLayout.astro`
- Modify: `src/styles/editorial.css`
- Modify: `src/styles/solar.css`
- Modify: `tests/editorial-v2.test.mjs` or the current article contract test file containing article-layout assertions
- Modify: `tests/solar-archive-contract.test.mjs`

**Interfaces:**
- Uses only shared `data-world` state and existing route DOM.
- Article reading column structure and content remain unchanged.

- [ ] **Step 1: Write failing supporting-page contracts**

Add assertions that Solar CSS has explicit world rules for:

```js
assert.match(solarCss, /html\[data-world=['"]solar['"]\] \.article-header/)
assert.match(solarCss, /html\[data-world=['"]solar['"]\] \.article-body/)
assert.match(solarCss, /html\[data-world=['"]solar['"]\] \.register-header/)
assert.match(solarCss, /html\[data-world=['"]solar['"]\] \.taxonomy-index/)
assert.match(solarCss, /html\[data-world=['"]solar['"]\] \.site-footer/)
```

Also assert ArticleLayout still contains exactly one `<article class="article-body">`.

- [ ] **Step 2: Verify RED**

```bash
node --test tests/solar-archive-contract.test.mjs tests/editorial-v2.test.mjs
```

Expected: FAIL until the day personality reaches supporting pages.

- [ ] **Step 3: Style article chrome, not article structure**

Solar Archive article pages should receive:
- warm paper base
- cobalt section/TOC rules
- small issue/observation metadata cues around header
- restrained orange only on tiny markers or active reading progress
- unchanged article reading width/flow
- code, prompt, tables, images retain current overflow safety

Do not create a second article layout.

- [ ] **Step 4: Style Archive and Tags as publication indexes**

Under `data-world='solar'`:
- stronger publication grid
- cobalt numbering
- fine blue-grey rules
- hover response limited to underline/spectral rule
- no cards/pills/SaaS visual language

- [ ] **Step 5: Style navigation/footer as publication furniture**

Solar navigation should feel like a journal masthead/colophon; Observatory keeps the current quiet research-folio style. Keep the same link destinations.

- [ ] **Step 6: Update accessible world-toggle labels**

Controller labels:
- when in Solar Archive: `切换到 Observatory`
- when in Observatory: `切换到 Solar Archive`

Do not expose only “浅色/深色” in the primary aria label.

- [ ] **Step 7: Run tests**

```bash
node --test tests/solar-archive-contract.test.mjs tests/editorial-v2.test.mjs
npm test
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/SiteHeader.astro src/layouts/ArticleLayout.astro src/styles/editorial.css src/styles/solar.css tests/solar-archive-contract.test.mjs tests/editorial-v2.test.mjs
git commit -m "feat: extend Solar Archive personality across the blog"
```

---

### Task 6: Responsive, Reduced-Motion, and Performance Guardrails

**Files:**
- Modify: `src/scripts/themeController.js`
- Modify: `src/scripts/solarField.mjs`
- Modify: `src/scripts/spaceScene.mjs`
- Modify: `src/styles/solar.css`
- Modify: `src/styles/space.css`
- Modify: `tests/solar-archive-contract.test.mjs`
- Modify: `tests/space-scene-contract.test.mjs`

**Interfaces:**
- `createSolarField(... { mobile, reducedMotion })`
- transition controller respects the existing `prefers-reduced-motion` media query.

- [ ] **Step 1: Add failing guardrail tests**

Require:

```js
assert.match(controller, /prefers-reduced-motion/)
assert.match(solar, /reducedMotion/)
assert.match(solarCss, /@media\s*\(max-width:\s*760px\)/)
assert.match(solarCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/)
assert.match(scene, /mobile\s*\?\s*1\.2\s*:\s*1\.65/)
```

- [ ] **Step 2: Verify RED if any guardrail is missing**

```bash
node --test tests/solar-archive-contract.test.mjs tests/space-scene-contract.test.mjs
```

Expected: FAIL on any omitted constraint.

- [ ] **Step 3: Implement mobile scene reduction**

On mobile:
- lower solar granulation octave/detail count
- fewer magnetic/spectral lines
- smaller flare amplitude
- cropped limb remains visually intentional, not centered
- no viewport overflow

- [ ] **Step 4: Implement reduced-motion stable worlds**

Reduced motion behavior:
- theme state swaps immediately
- no 1500 ms radial wave
- no heat shimmer
- no flare animation
- solar surface may retain static granulation
- night stars remain static or nearly static

- [ ] **Step 5: Keep existing lifecycle safeguards**

Do not remove:
- `visibilitychange` pause
- `webglcontextlost` fallback
- `ResizeObserver`
- renderer disposal on destroy
- one renderer instance

- [ ] **Step 6: Run full tests**

```bash
npm test
npm run build
```

Expected: PASS and Astro build completes.

- [ ] **Step 7: Commit**

```bash
git add src/scripts/themeController.js src/scripts/solarField.mjs src/scripts/spaceScene.mjs src/styles/solar.css src/styles/space.css tests/solar-archive-contract.test.mjs tests/space-scene-contract.test.mjs
git commit -m "perf: harden dual-world motion and responsive behavior"
```

---

### Task 7: Browser QA for Both Personalities and Signature Frames

**Files:**
- Create: `scripts/world-transition-qa.mjs`
- Create: `.github/workflows/world-transition-qa.yml`
- Modify: `scripts/deliver-qa.mjs`
- Modify: `tests/deliver-qa-contract.test.mjs` or the current deliver QA contract test file
- Modify: `tests/solar-archive-contract.test.mjs`

**Interfaces:**
- QA uses persisted themes `light`/`dark` but asserts resolved worlds `solar`/`observatory`.
- Transition screenshots at: `0`, `180`, `450`, `700`, `950`, `1250`, `1500` ms.

- [ ] **Step 1: Write failing QA contracts**

Require the new browser script/workflow and checkpoints:

```js
const qa = await read('../scripts/world-transition-qa.mjs')
assert.match(qa, /0,\s*180,\s*450,\s*700,\s*950,\s*1250,\s*1500/)
assert.match(qa, /data-world/)
assert.match(qa, /data-phase/)
assert.match(qa, /screenshot/)
```

- [ ] **Step 2: Verify RED**

```bash
node --test tests/solar-archive-contract.test.mjs tests/deliver-qa-contract.test.mjs
```

Expected: FAIL because transition QA is absent.

- [ ] **Step 3: Extend Deliver QA world assertions**

For each existing theme case, evaluate:

```js
world: document.documentElement.dataset.world || null
```

Expected mapping:
- `light -> solar`
- `dark -> observatory`

Keep all existing route response, horizontal overflow, article width/font size, search, and stress checks.

Screenshot names should remain predictable, e.g.:
- `solar-desktop-home.png`
- `observatory-desktop-home.png`
- `solar-mobile-home.png`
- `observatory-mobile-home.png`
- corresponding article screenshots.

- [ ] **Step 4: Implement transition frame QA**

`scripts/world-transition-qa.mjs` must:
- launch Chromium desktop `1440x1000` and mobile `390x844`
- start in Observatory (`localStorage = dark`)
- click the actual `[data-world-toggle]`
- record toggle center and assert CSS `--world-origin-x/y` are within 2 px
- capture frames around the fixed checkpoints
- read `[data-theme-transition].dataset.phase`
- verify world becomes `solar` by/after the wave swap
- fail on console/page errors
- fail on horizontal overflow
- after transition, assert no `.theme-transition` phase remains active
- repeat Solar → Observatory direction at least on desktop final verification
- write JSON report and screenshots to `world-transition-qa/`

Because real scheduler timing can drift, checkpoint capture should wait until the controller reports a target phase/progress threshold rather than assuming an exact wall-clock screenshot at the millisecond.

- [ ] **Step 5: Add GitHub Actions workflow**

`.github/workflows/world-transition-qa.yml` must:
- checkout
- setup Node 22
- `npm install`
- install Chromium if the existing QA workflow requires it
- build/preview the site using the same pattern as Deliver QA
- run `node scripts/world-transition-qa.mjs`
- upload `world-transition-qa` artifact with `if: always()`

- [ ] **Step 6: Run local/static test suite**

```bash
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts/world-transition-qa.mjs .github/workflows/world-transition-qa.yml scripts/deliver-qa.mjs tests/deliver-qa-contract.test.mjs tests/solar-archive-contract.test.mjs
git commit -m "test: add dual-world transition visual QA"
```

---

### Task 8: Visual Review, Polish Gate, and Pull Request

**Files:**
- Modify only files identified by screenshot review; likely `src/styles/solar.css`, `src/scripts/solarField.mjs`, and possibly `src/styles/editorial.css`.
- Update: PR body after final verification.

**Interfaces:**
- No new product interfaces; this task is a visual/verification gate.

- [ ] **Step 1: Push the branch and open a Draft PR before polish**

PR target:
- Base: `main`
- Head: `feature/solar-archive-dual-personality`
- Title: `feat: Solar Archive dual-personality world switch`

PR body must include the spec path, plan path, and hard signature-animation rule.

- [ ] **Step 2: Wait for all workflows on the current HEAD**

Required green workflows:
- CI
- Cosmic Motion QA
- Deliver QA
- World Transition QA

Do not treat a previous commit's green run as evidence for the current HEAD.

- [ ] **Step 3: Download and inspect artifacts**

Inspect at minimum:
- Observatory desktop home
- Solar desktop home
- Observatory mobile home
- Solar mobile home
- Observatory article
- Solar article
- full transition contact sheet for both desktop and mobile

- [ ] **Step 4: Run visual acceptance checklist**

Reject and fix the implementation if any item is true:
- Solar looks like a pale Observatory clone.
- Solar Hero reads as a complete floating 3D sphere.
- Solar limb forms a rectangular/circular panel boundary.
- The transition reads as a plain white circle/fade.
- Eclipse/corona is not visible before the Solar Wave.
- The wave does not originate at the toggle.
- Writing/index remains visually identical apart from colors.
- Orange becomes a moving object or dominant page color.
- Mobile collapses back into the Observatory layout language.
- Any persistent loop draws more attention than the writing.

- [ ] **Step 5: Polish only observed defects**

For each visual defect, make one focused correction, commit it, and rerun all four workflows. Do not introduce unrelated redesigns during polish.

- [ ] **Step 6: Final verification**

Run/confirm on final HEAD:

```bash
npm test
npm run build
```

Then verify all GitHub Actions on the exact HEAD are green and inspect the final artifacts again.

- [ ] **Step 7: Mark PR ready for review**

Update PR body with:
- final HEAD
- CI run status
- Cosmic Motion QA status
- Deliver QA status
- World Transition QA status
- summary of manual screenshot inspection

Do not merge unless the user explicitly asks to merge.

- [ ] **Step 8: Commit any final documentation-only PR update if needed**

No code claim is complete until the exact final HEAD has fresh passing evidence.

---

## Plan Self-Review

### Spec coverage

- Dual personalities: Tasks 1, 4, 5.
- Mandatory Eclipse/Corona/Solar Wave: Task 2 and Task 7.
- Actual click origin: Task 2 and Task 7.
- Huge cropped procedural solar surface: Task 3.
- One HTML/content tree: Tasks 1 and 4 contract tests.
- Whole homepage including Writing/search/filter/footer: Tasks 4 and 5.
- Article stability: Task 5 and Deliver QA.
- One WebGL context/persistent lifecycle: Task 3 and Task 6.
- Mobile/reduced motion/performance: Task 6.
- Visual frame checkpoints and final artifact review: Tasks 7 and 8.
- No persistent traveler/meteor regression: existing contracts remain plus visual rejection checklist in Task 8.

### Placeholder scan

No `TBD`, `TODO`, “implement later”, undefined helper names, or unspecified test steps remain.

### Interface consistency

- `themeWorld.mjs` owns pure mapping/timing.
- `themeController.js` owns DOM/persistence/transition dispatch.
- `home.js` only forwards world events to the Hero scene.
- `spaceScene.mjs` owns one renderer and both persistent visual worlds.
- `solarField.mjs` owns only the procedural Solar layer.
- CSS owns visual personality/layout; Astro retains one semantic content tree.
