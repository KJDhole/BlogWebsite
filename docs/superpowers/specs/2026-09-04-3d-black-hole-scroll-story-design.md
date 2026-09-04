# 3D Black Hole Scroll Story — Design Spec

## Status

Approved concept, implementation not started.

## Goal

Upgrade the existing homepage hero animation from a flat SVG orbit story into a deeper 3D space scene while preserving the approved blog UI, article system, controls, filter buttons, search, theme behavior, and the existing final landing physics.

The new story must keep the solar-system metaphor intact. The black hole is not the center of the solar system. It appears temporarily behind the orange accent planet, swallows it, then reappears at the article filter navigation and releases the same orange planet. The released planet then continues into the existing fall → impact → squash → bounce → settle → morph-to-indicator sequence.

## Non-goals

- Do not redesign the homepage typography, buttons, search, categories, article list, footer, or blog information architecture.
- Do not turn the hero into a full-screen game or observatory UI.
- Do not replace the sun with a black hole.
- Do not let the shrunken solar system cross into the article section.
- Do not add React or React Three Fiber solely for this feature.
- Do not copy code from repositories without a compatible explicit license.

## Existing constraints

The current homepage uses Astro with native JavaScript, CSS, and SVG. `src/scripts/home.js` drives scroll progress, orbit geometry, filter indicator handoff, search/filtering, and theme behavior. `src/scripts/orbitMotion.mjs` contains the approved landing/free-fall/squash/bounce/morph physics. The new system must preserve the landing behavior rather than rewrite it.

## Recommended architecture

Use Three.js directly inside the existing Astro page. The 3D visual system is isolated from the normal page UI and communicates through a small scroll-story state API.

```text
Astro homepage
├── existing copy / search / filter UI
├── SpaceScene canvas
│   ├── 3D solar system
│   ├── layered star field
│   ├── subtle nebula / depth haze
│   ├── orange accent planet
│   └── hero black-hole portal
├── NavPortal DOM/WebGL overlay
└── ScrollStory controller
    ├── orbit
    ├── portal-appear
    ├── absorb
    ├── compact
    ├── portal-handoff
    ├── eject
    └── existing landing physics
```

### Why direct Three.js

The site is already Astro + native JS. Direct Three.js adds only one rendering dependency and avoids introducing a second component runtime. It also makes it easier to bind the scene to the current scroll controller and DOM filter geometry.

## Visual direction

The overall tone is deep, quiet, spatial, and cinematic rather than decorative sci-fi.

### Star field

Use three depth layers:

1. Far field: many tiny, dim stars with almost no visible motion.
2. Mid field: fewer blue-white stars with weak parallax.
3. Near field: very sparse brighter dust/stars with stronger but still restrained parallax.

Add only subtle dark-blue spatial haze / nebula noise. Avoid excessive blinking, saturated purple gradients, or a wallpaper-like star texture.

### Solar system

The existing three-orbit visual language remains recognizable but becomes spatial:

- larger hero footprint on desktop;
- perspective camera with mild tilt;
- orbit planes use small depth offsets and/or different inclinations;
- planets continue moving independently around the sun;
- the orange accent planet remains the narrative object;
- the whole system can rotate and scale as a group during scroll.

The system is not scientifically to scale. The goal is visual depth while preserving the original minimalist identity.

### Black-hole portal

The portal is temporary and local. It appears behind the orange planet rather than replacing the solar system core.

Hero portal components:

- near-black event-horizon disc / sphere;
- thin distorted photon-ring/accretion glow;
- subtle local star distortion;
- restrained bloom;
- no large astrophysical jets or giant cinematic accretion disk.

The black hole should feel like a portal embedded in the scene, not a second hero subject.

## Scroll choreography

Use normalized story progress `p` from 0 to 1. Exact thresholds can be tuned during implementation, but the phase order is fixed.

### Phase A — Stable orbit (`p ≈ 0.00–0.18`)

- 3D solar system is large and readable.
- planets orbit normally.
- star field has subtle autonomous drift.
- orange planet remains on its orbit.
- no black hole visible.

### Phase B — Portal emergence (`p ≈ 0.18–0.32`)

- the black hole appears directly behind / slightly offset from the orange planet.
- it grows from near-zero visibility instead of popping full-size.
- nearby stars distort subtly.
- orange planet still has forward orbital momentum.
- solar system begins a slow whole-group rotation and small scale reduction.

### Phase C — Absorption (`p ≈ 0.32–0.46`)

- orange planet leaves its normal orbit and curves toward the black hole.
- attraction path is spiral/curved, not a straight line.
- velocity increases toward capture.
- orange planet may stretch slightly along velocity, dim at the edge, then shrink to zero inside the portal.
- no teleport cut is visible.

### Phase D — Compact persistent system (`p ≈ 0.46–0.62`)

- orange planet is hidden.
- hero black hole fades after swallowing it.
- solar system remains visible while the user continues scrolling.
- the system rotates and scales down to a compact state.
- it remains pinned/clamped within the hero visual region and must never descend into the article section.
- its scale remains readable rather than collapsing to a dot.

### Phase E — Navigation portal appearance (`p ≈ 0.58–0.70`)

- a second portal appears at the real All-filter indicator anchor.
- hero portal is already gone, so there are never two dominant portals competing visually.
- the user should perceive this as the same portal reopening in another place.

### Phase F — Ejection (`p ≈ 0.66–0.76`)

- orange planet is emitted from the navigation portal.
- it emerges upward / slightly outward, then transitions into the existing drop setup above the indicator.
- ejection should have a short acceleration/deceleration arc rather than appearing at the drop start point.
- the nav portal closes as the planet becomes fully visible.

### Phase G — Existing landing sequence (`p / elapsed timeline after ejection`)

Reuse the current proven sequence:

1. free fall with acceleration;
2. exact contact with the All indicator geometry;
3. impact squash / slight sink;
4. single bounce;
5. settle;
6. morph into the horizontal active indicator.

The landing micro-sequence remains time-based after trigger so aggressive wheel scrolling cannot skip impact or bounce.

## Two-anchor portal handoff

Do not physically move one WebGL portal from the hero to the navigation bar across the document. That would create layout, clipping, and mobile stability problems.

Use two anchors:

- Hero Portal A: inside the Three.js hero scene.
- Navigation Portal B: anchored to the measured All-filter indicator center.

Scroll state crossfades/handoffs the portal identity between them. Only one should be visually dominant at a time. This preserves the illusion of one portal while keeping rendering and layout reliable.

## Solar-system containment

The compact solar system must stay visually inside the hero and never overlap the second-page/article region.

Implementation rule:

- derive a hero visual bounding box from the hero section;
- compute a maximum downward position and minimum scale;
- clamp the Three.js canvas/group transform before the controls/article boundary;
- on mobile, use a smaller compact scale and earlier clamp threshold.

The system may remain visible near the upper edge while the navigation becomes active, but it must not float over article rows.

## Component boundaries

### `spaceScene`

Owns:

- renderer, camera, scene;
- star field;
- solar-system objects;
- orange planet mesh;
- hero portal visuals;
- resize / device-pixel-ratio handling;
- pause/cleanup.

Public interface should be small, e.g.:

- `setStoryState(state)`
- `getAccentPlanetScreenPosition()` if needed for handoff
- `resize()`
- `destroy()`

### `blackHolePortal`

Owns portal visual state independent of scroll interpretation:

- opacity;
- scale;
- distortion strength;
- ring strength;
- swallow/eject pulse.

### `scrollStory`

Pure functions map normalized progress to semantic state:

- phase;
- system scale/rotation/position;
- hero portal visibility;
- absorption progress;
- navigation portal visibility;
- ejection progress;
- landing trigger.

This logic should remain unit-testable without WebGL.

### `navPortal`

A lightweight DOM/canvas overlay positioned using the actual All-filter button geometry. It must not shift layout or intercept pointer events.

### Existing landing module

Keep `getLandingMotionState`, `landingProgressFromElapsed`, free-fall behavior, and final morph semantics. New code feeds the orange orb into the existing landing start instead of replacing the landing module.

## Reference code and licensing

### Suitable references

- `rmarchet/blackhole-ts` — MIT. Useful for black-hole shader ideas, bloom/glow, star field, Milky Way/parallax concepts.
- `AmitDigga/threejs-galaxy-shader` — MIT. Useful for lightweight particle/star shader patterns and configurable black-hole distortion.
- `sanderblue/solar-system-threejs` — Apache-2.0. Useful for Three.js scene graph / orbital hierarchy concepts.

### Reference-only

- `ibra-kdbra/black-hole` — strong visual/engineering reference, but no explicit repository license was observed. Do not copy implementation code or assets.
- `MisterPrada/singularity` — visual/technical reference only unless a compatible license is confirmed before any reuse.
- `mohnishlandge/threejs-template-gsap-scrolltrigger` — scroll choreography concept reference; do not copy without confirming licensing.

All third-party code actually reused must have an explicit compatible license and attribution requirements must be respected.

## Performance requirements

Desktop target:

- smooth interaction on a normal discrete GPU and modern integrated GPU;
- cap renderer pixel ratio instead of blindly using full devicePixelRatio;
- avoid per-frame object allocations in the main animation loop;
- use modest particle counts and shader complexity by default.

Mobile target:

- lower star count;
- lower pixel-ratio cap;
- simpler portal distortion / fewer post-process passes;
- same narrative phase order;
- no layout overflow or horizontal scrolling.

If sustained frame rate falls below a practical threshold, degrade visual quality before dropping narrative states.

## Accessibility and fallbacks

### Reduced motion

For `prefers-reduced-motion: reduce`:

- render a static or gently drifting 3D/2D solar system;
- no swallow/eject travel;
- no rapid scale/rotation;
- make the All indicator visible normally.

### WebGL unavailable / context loss

Fallback to the existing SVG-style hero visual or a simplified static orbit scene. Search, filters, theme, article navigation, and content must remain fully usable.

The WebGL canvas must be decorative (`aria-hidden`) and must never block keyboard or pointer access to UI.

## Theme behavior

The new space scene should work in both current themes.

- Dark theme: deeper space background and richer star contrast.
- Light theme: retain the site’s light page surface; the 3D scene can remain a bounded dark/deep-space object rather than turning the entire website dark.

Do not force the whole page into dark mode merely to support the effect.

## Testing

### Pure motion tests

Add tests for the new scroll-state module:

- phases occur in fixed order;
- absorption completes before navigation ejection begins;
- compact solar-system scale never falls below its configured minimum;
- portal A and portal B do not both reach dominant opacity at once;
- ejection ends at the existing landing drop-start contract;
- mobile preserves phase order with adjusted amplitudes;
- reduced-motion state skips high-motion phases safely.

### Existing regression tests

Keep existing assertions for:

- exact landing geometry;
- free-fall acceleration;
- impact/squash;
- bounce;
- settle-before-morph;
- mobile landing behavior;
- search/category controls;
- responsive and reduced-motion behavior.

### Build/production verification

`npm test` and `npm run build` must pass. CI should verify the homepage still renders the approved controls and no article/content behavior regresses.

## Success criteria

The feature is complete only when all are true:

1. Initial hero reads immediately as a larger 3D solar system in deep space.
2. Orange planet remains part of the solar-system orbit before capture.
3. A black hole appears behind it only after sufficient scroll.
4. Capture looks continuous and gravitational rather than like a fade-out.
5. Solar system rotates and shrinks while remaining visible and contained inside the hero.
6. A portal reappears precisely at the All navigation indicator.
7. The same orange planet is visibly ejected from it.
8. Ejection flows continuously into the existing fall → squash → bounce → morph animation.
9. The solar system never enters the article section.
10. Existing UI/buttons/search/theme/article behavior is unchanged.
11. Mobile and reduced-motion modes remain usable.
12. Test suite and production build are green.

## Implementation strategy

Implement on `feat/3d-black-hole-scroll-story`, not `main`. Use TDD for scroll-state and handoff contracts first, integrate Three.js second, then tune visuals without changing the approved phase semantics. Merge only after visual verification and CI pass.
