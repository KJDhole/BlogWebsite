# Three.js Official Motion Patterns

Use these before writing project-owned equivalents.

## Scene transition
- Docs: https://threejs.org/docs/#RenderTransitionPass
- Example: https://threejs.org/examples/webgl_postprocessing_transition.html
- Import: `three/addons/postprocessing/RenderTransitionPass.js`
- Use `setTransition(value)` for 0..1 scene mixing.
- Use `setTexture(texture)` + `setTextureThreshold(value)` for textured/radial wipes.
- Do not copy the pass shader into project code.

## Bloom
- Docs: https://threejs.org/docs/#UnrealBloomPass
- Example: https://threejs.org/examples/webgl_postprocessing_unreal_bloom.html
- Import: `three/addons/postprocessing/UnrealBloomPass.js`
- Compose through `EffectComposer` and finish with `OutputPass`.
- Keep bloom strength/radius/threshold restrained and dispose passes on teardown.

## Post-processing composition
- `EffectComposer`: `three/addons/postprocessing/EffectComposer.js`
- `OutputPass`: `three/addons/postprocessing/OutputPass.js`
- Reuse one `WebGLRenderer`; post-processing is a render pipeline, not a reason to create another renderer.

## Points / particles
- Official examples index: https://threejs.org/examples/?q=points
- Prefer `THREE.Points` + `BufferGeometry` + preallocated attributes.
- Reuse buffers and mark dynamic attributes appropriately; do not allocate geometry every frame.

## Project-specific rule for BlogWebsite
- Observatory ↔ Solar: `RenderTransitionPass` owns the visual scene blend.
- Toggle ignition: `UnrealBloomPass` owns bloom.
- Existing star field may keep project-specific convergence behavior because the destination target is product-specific, but it must remain on Three.js `Points`/`BufferGeometry` and existing preallocated buffers.
- DOM text only fades out/in at final layouts; no long-distance FLIP typography.
