# Official Three.js World Transition Design

## Goal
Replace the hand-built DOM/CSS world-transition mechanics with official Three.js post-processing patterns while preserving the two stable visual personalities: Observatory and Solar Archive.

## Sources of truth
- Anthropic official `frontend-design` skill: https://github.com/anthropics/skills/tree/main/skills/frontend-design
- Three.js `RenderTransitionPass`: https://threejs.org/docs/#RenderTransitionPass
- Three.js `webgl_postprocessing_transition`: https://threejs.org/examples/webgl_postprocessing_transition.html
- Three.js `UnrealBloomPass`: https://threejs.org/docs/#UnrealBloomPass
- Three.js bloom example: https://threejs.org/examples/webgl_postprocessing_unreal_bloom.html

## Design principles
1. Do not recreate library features that Three.js already ships.
2. Three.js owns the visual world transition; DOM text never flies across the viewport.
3. DOM owns semantic layout only: fade out, switch final layout, fade in.
4. Keep one persistent renderer and one animation lifecycle.
5. Keep the existing Observatory and Solar stable layouts/content unchanged unless integration requires a small compatibility fix.
6. Reduced motion bypasses post-processing travel and settles directly.
7. Mobile must remain overflow-safe at 390px and 360px.

## Transition sequence
1. User activates the existing world toggle.
2. Observatory star field converges toward the toggle using the existing preallocated Points/BufferGeometry system; no new particle engine.
3. Toggle highlight is rendered with official `UnrealBloomPass` rather than a custom CSS glow stack.
4. Current DOM content fades out in place.
5. Official `RenderTransitionPass` blends the Observatory and Solar Three.js scenes. A transition texture/radial mask controls the wipe; `setTransition()` is driven by the existing master timeline.
6. At the semantic swap point, DOM layout switches directly to the destination world while hidden.
7. Destination DOM fades in at its final layout. No FLIP translation for text/content.
8. Post-processing settles and returns to the stable single-world render path.

## Architecture
### `spaceScene.mjs`
Own one WebGLRenderer and expose two renderable scene states/cameras to a post-processing transition controller. Preserve current cleanup, visibility, resize and context-loss handling.

### `officialWorldTransition.mjs` (new)
Thin adapter around official Three.js addons:
- `EffectComposer`
- `RenderTransitionPass`
- `UnrealBloomPass`
- `OutputPass`

Responsibilities:
- create/dispose passes;
- resize composer/passes;
- set source/destination scenes;
- set transition ratio;
- set optional mix texture;
- set restrained bloom strength around toggle ignition;
- render the transition frame.

No custom full-screen transition shader.

### `themeController.js`
Remains master 1500ms semantic timeline and event dispatcher. It does not implement visual shader math.

### `home.js`
Coordinates DOM fade state and scene transition state. Remove physical FLIP movement for text/content. Structural scene anchors may still drive viewport positioning.

### `worldMorph.mjs`
Reduce scope to non-text structural geometry only, or remove it entirely if scene viewport + DOM fade make it unnecessary. No cross-screen translation of typography.

## Claude project skill
Add `.claude/skills/frontend-motion/SKILL.md` plus a compact Three.js reference. It must require agents to:
- check official library docs/examples first;
- prefer official addons/examples over custom shaders or animation engines;
- document the reused upstream primitive in PRs;
- only write project-specific glue when the library already provides the core effect.

This follows Anthropic's official skill pattern: a self-contained `SKILL.md`, references kept outside the main file when detailed, and concise trigger-focused frontmatter.

## Acceptance criteria
- Stable Observatory and Solar layouts visually match their pre-refactor stable states.
- No hero/title/support text crosses the viewport during world switches.
- The world switch is visibly stronger than a simple DOM fade: star convergence + bloom ignition + scene transition must be observable.
- The scene transition uses `RenderTransitionPass` from `three/addons/postprocessing/RenderTransitionPass.js`.
- Bloom uses `UnrealBloomPass` from `three/addons/postprocessing/UnrealBloomPass.js`.
- No second WebGLRenderer is created.
- No custom full-screen transition fragment shader exists in project code.
- Existing 1500ms timing, responsive QA, reduced-motion behavior and production/editor flows remain intact.
- CI, build, browser QA and exact-frame World Transition QA all pass before merge.
