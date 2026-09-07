# Cosmic Editorial V3 — Design Spec

Date: 2026-09-07
Repo: `KJDhole/BlogWebsite`
Branch: `feature/cosmic-editorial-v3`
Status: Approved direction, implementation pending

## 1. Goal

Replace the current Hero “solar-system model” presentation with a deeper, more cinematic cosmic background system that still fits the Research Folio editorial identity.

The result should read as a living deep-space environment, not a 3D demo. Motion must feel intentional, spatial, and restrained. The visual system must remain secondary to the text and publication index.

## 2. Problems in the current implementation

The existing stack is:

- `SpaceScene.astro` → one WebGL canvas plus SVG fallback.
- `spaceScene.mjs` → Three.js scene orchestration.
- `starField.mjs` → far/mid/near point layers.
- `solarSystem3d.mjs` → central sphere, three orbit rings, three planet meshes.
- `blackHolePortal.mjs` → portal effect.
- `scrollStory.mjs` + `home.js` → scroll-state story, ejection, landing, navigation handoff.

The current visual problem is structural, not just parametric:

1. A central sphere plus explicit orbit rings and planet meshes reads as a solar-system model.
2. The accent body is not visually constrained to the exact path users perceive on screen.
3. Too much of the narrative depends on the model object itself, so the composition feels like a demo rather than an ambient brand environment.
4. The visual mass is too concentrated in one “object,” reducing perceived depth.

## 3. Design thesis

**Cosmic Editorial V3** is a layered deep-space field with one signature traveler motion.

The universe is the environment. The traveler is the narrative accent. The interface remains the product.

The visual keywords are:

- deep space
- cosmic
- editorial
- cinematic but minimal
- mysterious
- refined
- restrained
- premium
- not gamified
- not demo-like

## 4. Recommended architecture

### 4.1 Background layer — ambient cosmic field

Retain Three.js only where it is useful for atmospheric depth.

The background should contain:

- deep navy/near-black volumetric gradient;
- three depth layers of stars;
- subtle parallax drift;
- very soft nebula/noise glow;
- sparse long-distance particles;
- occasional distant planet silhouette or halo, never a central model;
- faint gravitational arcs / path remnants rather than full textbook orbit rings.

The background should not contain a large central sphere or an obvious multi-planet system.

### 4.2 Foreground layer — signature traveler path

The main bright traveler must be path-driven, not free-positioned.

Use a deterministic 2D projected path in Hero coordinates. The path is the single source of truth for both:

- the visible guide / gravitational trace;
- the traveler position.

Preferred implementation:

- SVG path or mathematically sampled cubic Bézier path in screen coordinates;
- DOM/SVG traveler element above the canvas;
- optional Canvas/WebGL glow only as decoration around the traveler.

The traveler must never visually drift away from its guide path.

### 4.3 Signature motion sequence

The default desktop sequence has four phases:

1. **Drift** — traveler moves slowly on a faint path while the cosmic field breathes.
2. **Charge** — local path segment brightens; nearby dust subtly converges.
3. **Flyby** — traveler leaves the slow orbit-like segment and follows a deliberate Bézier escape path with a short restrained trail.
4. **Settle** — the traveler fades/settles and the interface returns to quiet.

The existing hard “ball morphs into navigation underline” choreography is no longer the primary requirement. The navigation may respond with a subtle highlight, but the traveler does not need to become the nav indicator.

This removes the current fragile coupling between Hero geometry and filter/navigation geometry.

## 5. Scroll behavior

The animation remains scroll-aware but should be simpler than the current black-hole absorption story.

Recommended scroll state:

- 0.00–0.24: ambient drift;
- 0.24–0.44: charge / local arc illumination;
- 0.44–0.72: flyby path;
- 0.72–1.00: settle / fade to quiet background.

Scrolling backwards must reverse cleanly without jumps.

No irreversible timer-driven landing state should be required for the core Hero sequence.

## 6. Component boundaries

### Keep

- `src/components/SpaceScene.astro`
- `src/scripts/starField.mjs` concept, but tune it for deeper layered space
- `src/scripts/home.js` as page-level coordinator
- theme switching
- current article search/filter behavior
- reduced-motion handling

### Replace or retire

- replace `solarSystem3d.mjs` with a new ambient cosmic field module, e.g. `cosmicField.mjs`;
- remove the central sun/planet/orbit model from the active scene;
- retire black-hole absorption as the default Hero narrative;
- simplify old scroll-story states that only exist for absorption/portal/ejection.

### Add

- `src/scripts/cosmicPath.mjs` — pure path/state math, no DOM;
- foreground traveler markup inside `SpaceScene.astro` or a dedicated `CosmicTraveler.astro`;
- CSS for traveler glow, path trace, and responsive composition.

## 7. Theme behavior

### Dark theme

This is the strongest expression:

- very deep navy/black field;
- cool white/blue stars;
- subtle orange traveler accent;
- nebula glow remains low-opacity.

### Light theme

Do not turn the universe into a gray blob.

Use a restrained pale-space treatment:

- warm paper page remains dominant;
- cosmic region becomes a translucent blue-gray depth field;
- stars and arcs are lower contrast;
- traveler stays readable;
- no heavy dark circular mass.

## 8. Responsive behavior

### Desktop

- full atmospheric field;
- complete traveler sequence;
- 3 star layers;
- subtle parallax;
- full Bézier flyby.

### Tablet

- lower star count;
- reduced drift amplitude;
- same narrative path but shorter travel.

### Mobile

- no expensive full scene choreography;
- lower device pixel ratio and particle count;
- retain deep-space gradient, light star drift, one short traveler pass;
- no geometry that depends on desktop nav positions;
- text remains primary.

## 9. Reduced motion

For `prefers-reduced-motion: reduce`:

- disable flyby and parallax;
- retain static or near-static cosmic background;
- traveler stays in a stable resting location or is hidden;
- no timer-driven transform sequence;
- page composition remains complete.

## 10. Performance requirements

- no new heavy runtime dependency unless strictly necessary;
- continue using existing `three` dependency;
- cap DPR similarly to current implementation;
- pause animation when page is hidden;
- avoid per-frame DOM layout reads;
- precompute path geometry on resize only;
- mobile must use materially fewer particles than desktop;
- WebGL fallback must remain valid.

## 11. Test strategy

### Unit/contract tests

Add tests for pure motion math:

- path sampler returns exact endpoints;
- traveler remains on the same sampled path used by the visible trace;
- scroll phase boundaries are deterministic;
- reverse scrolling returns matching positions;
- mobile path remains within Hero bounds;
- reduced motion returns a stable state.

### DOM / build contracts

Assert:

- Hero contains cosmic foreground path/traveler hooks;
- old central-solar-system model is no longer the active visual contract;
- article search/filter hooks remain unchanged;
- theme/reduced-motion hooks remain present.

### Browser QA

Capture at least:

- desktop light/dark Hero at several scroll states;
- mobile light/dark Hero;
- reduced-motion state;
- article/search/filter regression.

Check:

- no global horizontal overflow;
- traveler visually follows path;
- no abrupt jump when resizing or reversing scroll;
- no major text contrast regression;
- no console errors.

## 12. Non-goals

This change does not:

- redesign article pages;
- change content schema;
- change RSS/SEO;
- add video assets as a hard dependency;
- add a realistic astronomical simulator;
- add many interactive planets;
- make the Hero a game or explorable 3D scene.

## 13. Acceptance criteria

The work is complete when:

1. First impression is “deep cosmic environment,” not “solar-system model.”
2. No large central model sphere dominates the Hero.
3. The signature traveler follows its visible path exactly.
4. Motion is elegant and reversible.
5. The effect is impressive without reducing readability.
6. Mobile is materially simplified and smooth.
7. Reduced motion is complete and intentional.
8. Search, filter, theme, RSS, SEO, Archive, Tags, and article rendering remain intact.
9. Automated tests and production build pass.
10. Browser QA screenshots show a coherent result in desktop/mobile and light/dark modes.
