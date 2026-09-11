# Three.js Official Motion Patterns

Use the official Three.js implementation as the starting point. Project code should compose these primitives instead of recreating them.

## Scene transition

- Example: https://threejs.org/examples/webgl_postprocessing_transition.html
- API: https://threejs.org/docs/pages/RenderTransitionPass.html
- Addon: `three/addons/postprocessing/RenderTransitionPass.js`

`RenderTransitionPass` renders two scenes to internal render targets and mixes them. Prefer it for Observatory/Solar world switching instead of a custom transition shader or CSS full-screen wipe.

For this project, construct the pass with Solar as scene A and Observatory as scene B. A transition value of `0` shows Observatory; `1` shows Solar.

## Post-processing

- `EffectComposer`: use the Three.js addon composer as the pass pipeline.
- Bloom: https://threejs.org/docs/pages/UnrealBloomPass.html
- Output: use `three/addons/postprocessing/OutputPass.js` last when a composer chain needs final output handling.

Bloom is an accent, not the transition mechanism. Keep its strength restrained and activate it only during the switch.

## Dynamic stars and particles

- Buffer updates: https://threejs.org/manual/en/how-to-update-things.html

Prefer `BufferGeometry` with preallocated typed arrays. Mark frequently updated attributes with `THREE.DynamicDrawUsage`, mutate their arrays in place, then set `attribute.needsUpdate = true`.

Do not allocate new particle geometry every frame. Project-specific gravitational folding may update the existing buffers in place; it does not justify a custom particle engine.

## Decision rule

Before adding animation infrastructure, ask in order:

1. Is there an official Three.js example for this effect?
2. Is there an official addon/pass that owns this responsibility?
3. Can the project requirement be expressed by configuring/composing it?
4. Only if all three answers are no, add custom rendering infrastructure and document why.
