---
name: frontend-motion
description: Use for homepage motion, Three.js, WebGL, theme/world transitions, particles, post-processing, and any visually significant animation in this repository.
---

# Frontend Motion

Use this skill together with Anthropic's official `frontend-design` guidance. The design brief and approved product direction always win.

## Core rule

**Official primitive first. Project glue second. Custom engine last.**

Before writing animation code:

1. Check the project's installed Three.js version in `package.json`.
2. Check the matching Three.js tag, examples, addons, docs, and manual.
3. Prefer an official class/example pattern over a project-specific reimplementation.
4. Write only the glue needed to adapt the official primitive to Glenn's UI.
5. If an official primitive does not fit, document why before writing custom shader/math infrastructure.

## Design rules

Follow Anthropic's official frontend-design principles:

- Ground motion in the actual interface and subject matter.
- Spend boldness in one memorable place.
- Prefer one orchestrated user-triggered moment over scattered effects.
- Motion should show what changed, not decorate everything.
- Keep typography readable; never distort glyphs for spectacle.
- Review screenshots, not just tests.

Official source:
https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md

## Repository-specific rules

### World switch

The world toggle is the trigger and visual origin.

Approved story:

1. Observatory stars converge toward the toggle.
2. Existing text/content exits locally; it does not fly across the viewport.
3. Three.js owns the middle of the switch.
4. Destination layout is committed while content is hidden.
5. Destination content reveals at its final geometry.
6. The persistent scene settles into the destination anchor.

### Three.js version lock

Current dependency: `three@0.180.0`.

Use r180 references unless the dependency is intentionally upgraded in a separate change.

Read before changing the world transition:

- `references/threejs-official-patterns.md`
- `docs/superpowers/specs/2026-09-11-official-threejs-motion-refactor-design.md`

### Reuse map

Use these official r180 primitives first:

- scene/world mixing → `RenderTransitionPass`
- postprocessing pipeline → `EffectComposer`
- final output → `OutputPass`
- optional restrained bloom → `UnrealBloomPass`
- particle updates → `THREE.Points` + `BufferGeometry` + `DynamicDrawUsage` + `needsUpdate`

### Hard constraints

- One persistent `WebGLRenderer` / WebGL context.
- No new animation library for this refactor.
- No custom full-screen transition shader when `RenderTransitionPass` can do the job.
- No per-frame `BufferGeometry`, `BufferAttribute`, typed-array, or renderer allocation.
- No cross-screen DOM text FLIP.
- Stable Observatory and Solar layouts must not change as a side effect of transition work.
- Respect `prefers-reduced-motion`.
- Preserve visibility/context-loss/resize/dispose cleanup.
- Test 1440 / 1024 / 768 / 390 / 360.

## Workflow

For every motion change:

1. Name the official Three.js primitive/example being reused.
2. Write a regression/contract test first when production behavior changes.
3. Confirm RED.
4. Implement the smallest adapter.
5. Confirm GREEN with unit/build QA.
6. Run browser/exact-frame QA.
7. Inspect screenshots manually at the important transition frames.
8. Only then call it complete.

## Avoid

Do not add:

- another renderer;
- another independent animation clock;
- generic GSAP/Framer-style motion just to move text;
- duplicated CSS and WebGL versions of the same transition;
- new decorative effects before the world switch itself is clear.

If the implementation starts accumulating phase-specific patches, stop and look for an official primitive or simpler ownership boundary.