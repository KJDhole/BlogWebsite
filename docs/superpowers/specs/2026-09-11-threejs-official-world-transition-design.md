# Official Three.js World Transition Design

## Goal

Replace the custom page-wide world-transition implementation with Three.js official post-processing patterns while preserving the two existing visual worlds, the 1500 ms story, responsive behavior, reduced motion, and the current content/editor architecture.

## Why

The current transition mixes three responsibilities:

1. DOM FLIP/layout movement.
2. CSS radial-wave rendering.
3. WebGL world interpolation.

That produced duplicated transition logic, hard-to-debug intermediate states, and text/layout artifacts. The new design makes Three.js own the visual world switch and leaves DOM motion to simple exit/reveal states.

## Official references

Use these as the implementation source of truth:

- Anthropic frontend-design skill: https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md
- Anthropic skill-creator: https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md
- Three.js scene transition example: https://threejs.org/examples/webgl_postprocessing_transition.html
- Three.js RenderTransitionPass: https://threejs.org/docs/pages/RenderTransitionPass.html
- Three.js UnrealBloomPass: https://threejs.org/docs/pages/UnrealBloomPass.html
- Three.js BufferGeometry update guidance: https://threejs.org/manual/en/how-to-update-things.html

Project Three.js version remains `0.180.0`. `RenderTransitionPass` already exists in releases before r180, so no dependency upgrade is required.

## Architecture

### Stable worlds

Keep one `WebGLRenderer` and one camera, but render two separate scenes:

- `observatoryScene`: star field + cosmic field.
- `solarScene`: solar limb + spectral/magnetic structure.

Stable mode renders only the active scene directly with `renderer.render()`.

### World switch

During an active world transition:

1. Existing `sceneViewport` expands the one canvas toward a full-viewport stage.
2. `RenderTransitionPass` renders both scenes to its internal render targets and mixes them.
3. A generated radial `CanvasTexture` is supplied through `setTexture()`; its center comes from the actual world-toggle center.
4. `setTransition()` is driven by the existing 1500 ms master timeline.
5. Observatory → Solar uses transition `0 → 1`; Solar → Observatory uses `1 → 0`.
6. `UnrealBloomPass` adds a restrained peak only during the transition.
7. `OutputPass` closes the post-processing chain.
8. At transition end, composer rendering stops and direct stable rendering resumes.

No custom transition shader is allowed.

### DOM behavior

DOM content must not physically travel between the two layouts.

- `convergence`: current copy fades/lifts out.
- `layout-release` + `radiation`: copy stays hidden.
- world/layout state swaps while copy is hidden.
- `solar-arrival`: destination copy fades into its final layout.

Delete runtime DOM FLIP orchestration from `home.js`; `worldMorph.mjs` is no longer part of the homepage transition path.

### Star field

Do not replace the particle system with another custom engine. Keep the current `BufferGeometry` + preallocated `Float32Array` + `DynamicDrawUsage` approach because it already matches Three.js official dynamic-buffer guidance.

Only the project-specific gravitational fold remains custom. No per-frame geometry allocation is introduced.

### CSS

CSS remains responsible only for:

- DOM exit/reveal.
- the small HTML toggle halo/micro-interaction.
- persistent canvas positioning.
- responsive overflow guards.

Remove the custom full-screen `.theme-solar-wave` renderer and its CSS radial/conic gradients. The scene transition itself is rendered by Three.js.

## Skill

Add a project-local `.claude/skills/frontend-motion/` skill following Anthropic's skill structure.

The skill must require future agents to:

1. Search official framework examples/docs before implementing visual infrastructure.
2. Prefer official addons/examples over custom shaders, render passes, animation engines, or particle engines.
3. Keep custom code limited to project-specific composition and glue.
4. Record the official reference used in the PR/task.
5. Preserve reduced-motion, lifecycle cleanup, responsive behavior, and performance gates.

Files:

- `.claude/skills/frontend-motion/SKILL.md`
- `.claude/skills/frontend-motion/references/threejs-official-patterns.md`

## Non-goals

- No redesign of Observatory or Solar stable layouts.
- No change to article content or the private content repository workflow.
- No change to editor/admin/editor-api behavior.
- No React/Motion dependency.
- No Three.js version upgrade.
- No WebGPU migration.

## Acceptance criteria

- Stable Observatory and Solar screenshots stay materially unchanged.
- Text never FLIPs across the viewport.
- World switch visibly comes from the toggle and reads as one coherent transition.
- `RenderTransitionPass` is the world-mixing implementation.
- One WebGL renderer/context remains.
- Stable rendering does not render both scenes every frame.
- 1440 / 1024 / 768 / 390 / 360 have no horizontal overflow.
- Reduced-motion bypass remains immediate and stable.
- Existing CI, Deliver QA, Cosmic Motion QA, and World Transition QA all pass.
- Final world-transition artifact receives manual frame review before merge.
