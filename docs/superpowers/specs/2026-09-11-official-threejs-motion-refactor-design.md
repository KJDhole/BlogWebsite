# Official Three.js Motion Refactor Design

## Goal

Replace the blog's home-grown world-transition plumbing with official Three.js transition/post-processing patterns while preserving the approved Observatory and Solar Archive stable layouts.

## Approved user intent

- Do not reinvent animation systems when Three.js already provides the primitive.
- Follow Anthropic's official frontend-design guidance: one deliberate, memorable motion moment is better than many unrelated effects.
- The world switch must feel visually obvious.
- Text must not fly across the viewport or become clipped during the switch.
- Keep one persistent WebGL renderer/context.
- Keep responsive behavior and `prefers-reduced-motion` support.
- Work in independent parts; each completed part gets its own PR so progress is saved and reviewable.

## Official reference baseline

Project Three.js version: `0.180.0` / r180.

Use the matching r180 implementation and examples, not code from a newer Three.js release.

### Anthropic

- Official frontend design skill: https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md
- Official skills repository: https://github.com/anthropics/skills

Relevant rules we adopt:

1. Ground visual choices in the actual subject instead of generic effects.
2. Spend boldness in one place.
3. User-triggered motion should explain what changed.
4. Avoid scattered generic fade/slide decoration.
5. Review screenshots during implementation.

### Three.js r180

- Scene transition example: https://github.com/mrdoob/three.js/blob/r180/examples/webgl_postprocessing_transition.html
- `RenderTransitionPass`: https://github.com/mrdoob/three.js/blob/r180/examples/jsm/postprocessing/RenderTransitionPass.js
- `EffectComposer`: official addon used by the transition example.
- `OutputPass`: official output/color-management pass used by the transition example.
- Dynamic points example: https://github.com/mrdoob/three.js/blob/r180/examples/webgl_points_dynamic.html
- `UnrealBloomPass`: https://github.com/mrdoob/three.js/blob/r180/examples/jsm/postprocessing/UnrealBloomPass.js

## Current problem

The current implementation uses several overlapping mechanisms:

- DOM FLIP world morphing;
- a custom CSS radiation ring;
- world-mix logic inside one Three.js scene;
- custom per-phase coordination between DOM, WebGL scene, and CSS;
- dynamic star geometry during the fold.

This produced too much coupling. A transition could pass automated checks while still reading visually as "text moved around" instead of "the world changed".

## Target architecture

### Stable state

Keep the existing semantic DOM and final layouts unchanged.

- Observatory DOM stays in Observatory geometry.
- Solar Archive DOM stays in Solar geometry.
- Stable WebGL renders only the active visual scene.
- No transition-only transform remains after completion.

### WebGL world transition

Use one `WebGLRenderer`, but split visual content into two Three.js scenes:

- `observatoryScene`: star field + cosmic field;
- `solarScene`: solar field.

Use the official r180 `RenderTransitionPass` between those scenes.

During stable endpoints, render the active scene directly, following the official example's optimization. During `0 < transition < 1`, render through `EffectComposer` with:

1. `RenderTransitionPass`
2. optional restrained bloom only if visual QA proves it helps
3. `OutputPass`

### Toggle-origin radial mask

The official transition pass accepts a mix texture. We will reuse its shader and transition logic rather than writing a custom transition shader.

The only project-specific glue is a small `CanvasTexture` generator that produces a grayscale radial mask centered on the actual world-toggle position. It is regenerated only when a transition starts or the viewport size changes.

This keeps the approved "radiation starts at the toggle" behavior without maintaining a custom full-screen CSS wave implementation.

### DOM behavior

DOM text does not physically cross the screen.

Sequence:

1. current content fades/softly lifts out;
2. scene viewport expands toward full screen;
3. official Three.js scene transition owns the middle;
4. destination layout is committed while content is hidden;
5. destination content fades in at its final geometry;
6. scene viewport settles into the destination anchor.

The world switch is therefore carried visually by Three.js, not by moving typography.

### Star fold

Keep the star field as `THREE.Points` / `BufferGeometry` and follow the official dynamic-points pattern:

- mutable `BufferAttribute`;
- `DynamicDrawUsage`;
- mutate the existing typed array;
- set `needsUpdate = true`;
- no per-frame geometry allocation.

The project-specific fold path toward the toggle may remain because it is the product-specific behavior; the rendering/update mechanism must remain the official Three.js pattern.

## What we delete or reduce

After the Three.js transition is verified:

- remove the custom CSS full-screen radiation implementation;
- remove DOM cross-screen FLIP for text/content;
- keep only small DOM exit/arrival opacity/translate effects;
- reduce duplicate world-mix responsibilities inside `spaceScene.mjs`;
- preserve only compatibility code required by current QA or stable layout behavior.

## Safety constraints

- Do not modify article content/editor/private-content deployment behavior.
- Do not duplicate renderers or WebGL contexts.
- Do not upgrade Three.js as part of this refactor.
- Do not introduce a new animation dependency.
- Preserve `visibilitychange`, context-loss, resize, and dispose cleanup.
- Preserve 1440 / 1024 / 768 / 390 / 360 QA coverage.
- Preserve reduced-motion behavior.
- Keep transition duration at 1500ms until visual QA gives a concrete reason to change it.

## Delivery parts

### Part 1 — Foundation

Add a local Claude motion skill, official references, this design, and the execution plan. No production behavior change.

### Part 2 — Official scene transition

Split the two Three.js visual worlds and route the transition through r180 `RenderTransitionPass` + `EffectComposer` + `OutputPass`. Keep existing DOM fade behavior as the UI shell.

### Part 3 — Simplification and final motion hardening

Align the star fold with the official dynamic-buffer pattern, remove obsolete custom transition CSS/logic, run full exact-frame visual QA, and verify stable layouts are unchanged.

Each part ends in its own PR.