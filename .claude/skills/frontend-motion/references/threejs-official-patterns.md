# Three.js Official Motion Patterns — r180

This repository currently uses `three@0.180.0`, so all implementation references below are pinned to the r180 source/examples.

## 1. Scene transition — use this instead of a custom transition shader

Official example:
https://github.com/mrdoob/three.js/blob/r180/examples/webgl_postprocessing_transition.html

Official addon:
https://github.com/mrdoob/three.js/blob/r180/examples/jsm/postprocessing/RenderTransitionPass.js

Pattern:

```js
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderTransitionPass } from 'three/addons/postprocessing/RenderTransitionPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

const composer = new EffectComposer(renderer)
const transitionPass = new RenderTransitionPass(sceneA, cameraA, sceneB, cameraB)
transitionPass.setTexture(maskTexture)
transitionPass.setTextureThreshold(0.1)
composer.addPass(transitionPass)
composer.addPass(new OutputPass())
```

The official example renders the endpoint scene directly when the transition is exactly 0 or 1, and uses `composer.render()` only between endpoints. Copy that ownership pattern.

Important r180 direction detail:

- transition `0` resolves to scene B;
- transition `1` resolves to scene A.

If scene A is Observatory and scene B is Solar:

```js
const mix = direction === 'to-solar'
  ? 1 - progress
  : progress
transitionPass.setTransition(mix)
```

## 2. Toggle-origin radial transition texture

`RenderTransitionPass` already owns scene mixing and shader logic. Do not fork its shader.

Project-specific glue may generate a grayscale `CanvasTexture` whose radial gradient is centered at the measured toggle position. Regenerate it only on transition start or resize, then pass it to:

```js
transitionPass.setTexture(maskTexture)
```

This replaces the project's custom full-screen CSS radiation-mask implementation while preserving the approved visual origin.

## 3. Dynamic star points

Official example:
https://github.com/mrdoob/three.js/blob/r180/examples/webgl_points_dynamic.html

Reuse this data-update pattern:

```js
const geometry = new THREE.BufferGeometry()
const positions = new Float32Array(count * 3)
const position = new THREE.BufferAttribute(positions, 3)
position.setUsage(THREE.DynamicDrawUsage)
geometry.setAttribute('position', position)

// mutate existing array / attribute values
position.needsUpdate = true
```

Rules for this repo:

- Allocate position arrays once.
- Keep base/rest positions in reusable typed arrays.
- Mutate in place.
- Set `needsUpdate = true` after mutation.
- Never create geometry/attributes inside the render loop.

The star-fold path itself is product-specific and may remain custom. The rendering/update mechanism should stay aligned with the official pattern.

## 4. Bloom — optional, not automatic

Official addon:
https://github.com/mrdoob/three.js/blob/r180/examples/jsm/postprocessing/UnrealBloomPass.js

Pattern:

```js
const bloom = new UnrealBloomPass(
  new THREE.Vector2(width, height),
  strength,
  radius,
  threshold
)
composer.addPass(bloom)
```

Use only if screenshot QA proves it improves the toggle/transition moment. Do not add bloom just because it exists. If used, keep it restrained and ensure renderer tone mapping requirements are satisfied.

## 5. What stays custom

Allowed project-specific glue:

- converting the world-toggle DOM center to normalized texture coordinates;
- creating/updating the radial mask texture;
- mapping the existing 1500ms product timeline to `RenderTransitionPass.setTransition()`;
- the exact star-fold curve toward the world toggle;
- DOM fade-out/fade-in timing around the WebGL transition.

Not allowed without a written reason:

- a custom full-screen scene-transition shader;
- a second renderer/context;
- a second generic particle system;
- a CSS full-screen transition that duplicates the Three.js transition;
- per-frame allocations for geometry or postprocessing infrastructure.

## 6. Verification checklist

For every implementation PR:

- installed Three version still matches the reference tag;
- exactly one `new THREE.WebGLRenderer` remains;
- stable Observatory screenshot unchanged;
- stable Solar screenshot unchanged;
- transition is obvious at 520–820ms;
- text is not moving across the viewport;
- no horizontal overflow at 1440 / 1024 / 768 / 390 / 360;
- reduced motion bypasses the large transition;
- renderer/pass/texture resources are disposed cleanly.