# Solar Archive World Morph — Design Spec

Date: 2026-09-10
Status: Proposed for implementation
Scope: Blog homepage world switch + Solar Archive homepage redesign

## 1. Goal

The current light mode reads as the same homepage with a different palette. The redesign must make Observatory and Solar Archive feel like two genuinely different visual worlds while preserving one content tree and one set of semantic DOM content.

The switch itself must explain the relationship between the worlds. It is not a fade or theme toggle. The page visibly reorganizes itself:

**Observatory → button ignition → gravitational fold → solar radiation → editorial re-layout → Solar Archive**

The final Solar Archive should feel like a scientific publication with the kinetic confidence of a launch keynote during transition, then settle into a restrained Swiss/editorial system.

## 2. Non-goals

- Do not duplicate article content or maintain separate light/dark homepages.
- Do not add a second persistent WebGL renderer.
- Do not turn Solar Archive into a dashboard full of panels, metrics, or fake controls.
- Do not use an opaque white/black circular wipe.
- Do not make the transition origin follow the mouse click position.
- Do not change article/archive/tag information architecture in this phase beyond shared world styling.

## 3. Current architecture to preserve

The homepage already uses one Astro content collection and renders one set of hero, navigation, and article rows. `SpaceScene` already owns a single canvas and creates stars, cosmic field, and solar field once inside one renderer. The world controller already emits `glenn:worldchange` and `glenn:worldtransition` events.

The redesign keeps those strengths and changes the presentation architecture around them.

## 4. Static Solar Archive composition

Solar Archive is no longer "Observatory with warm colors".

### Header

A thin publication masthead:

`GLENN / SOLAR ARCHIVE / 2026` on the left, navigation distributed as issue furniture, and the world toggle on the far right.

The header uses hairline cobalt rules, generous spacing, and small mono metadata. It should read like a scientific journal header, not an app navbar.

### Hero

The hero changes from the Observatory left-copy/right-scene split into an asymmetric editorial composition:

- Main headline moves to the middle-right and becomes materially larger.
- The same `h1` DOM element is reused.
- Observation metadata occupies the upper-left/left rail.
- The principles line moves to the lower-left as a small publication statement.
- A cropped solar limb enters from the upper-right edge. The full sun is never shown.
- Fine cobalt coordinate/grid marks provide structure, not decoration overload.
- Warm ivory is the dominant field; cobalt is structural; orange/red is reserved for solar accents.

### Writing index

The article list becomes an issue index rather than a recolored list:

- `WRITING / ISSUE INDEX` becomes the large section register.
- Article rows become strict editorial rows with number, date, field/read metadata, and title on a new grid.
- Hairline rules draw across rows.
- Search/filter controls stay functional but visually reduce into publication tools.
- The same `posts.map(...)` and same `ArticleRow` DOM are reused.

## 5. Shared-DOM layout morph

The transition must visibly move the same elements instead of hiding the old layout and revealing a second layout.

### Layout state

Separate visual world from layout target:

- `data-world` controls stable color/renderer world.
- `data-layout-world` controls the target geometry of the page.
- Stable state always has both values equal.

During a transition, `data-layout-world` changes first so the browser can calculate the destination layout while `data-world` is still the source world. The semantic `data-world` commit happens at the start of the radiation phase; source-world appearance outside the expanding reveal remains protected by the transition surface until the wave passes. Morphing DOM elements remain the same nodes throughout.

### FLIP morph

Key elements receive `data-world-morph` identifiers:

- masthead/brand
- primary nav
- world toggle
- hero eyebrow
- hero title
- principles line
- hero note/social group
- scene stage
- writing section heading
- search/filter block
- article rows

For each morph:

1. Measure source rectangles.
2. Set `data-layout-world` to the destination.
3. Measure destination rectangles.
4. Apply inverse translate/scale so every element remains visually at its source position.
5. Animate those transforms toward zero on the shared 1500 ms timeline.

This produces real movement of the same DOM nodes and avoids cross-fading duplicate copies.

Article rows use a small stagger, but all remain tied to the master timeline.

## 6. Scene viewport architecture

The star field currently lives inside the right-side hero box, but the new transition requires stars to fold toward the actual world-toggle button in the page header. A canvas trapped inside the hero cannot visually reach that point.

Introduce a **scene viewport controller** while keeping one canvas and one WebGL renderer:

- `SpaceScene` remains a single persistent instance.
- Observatory and Solar layouts expose invisible scene anchors describing their stable target rectangles.
- The scene viewport is positioned independently from document flow and follows the active anchor.
- During transition it can expand from the Observatory anchor to a temporary full-viewport stage, then settle into the Solar anchor.
- The renderer is resized through the existing resize path; the WebGL context is not recreated.
- On scroll/resize, the stable scene viewport tracks the active anchor.

This allows the gravitational fold to target the real button center without spawning a second transition renderer.

## 7. Gravitational star fold

Do not "scale the star div into the corner".

The stars should behave like a field whose trajectories bend toward the button.

### Star motion

`starField` stores immutable base positions and receives transition state.

For each layer:

- Far stars move only slightly and fade early.
- Mid stars bend more visibly toward the button.
- Near stars bend strongest and briefly form restrained streaks near the end of the fold.
- Motion follows curved paths, not straight-line lerps.
- Bend strength is depth-dependent and deterministic so every run is stable for QA.

The button center is converted from screen coordinates into scene-space transition coordinates after the scene viewport has expanded.

The fold is not a black hole. There is no dark circular body. The button itself is the visual attractor.

### Button behavior

The button is the only source object:

- slight compression/rebound
- thin corona around its own edge
- controlled luminance increase
- no independent 16 px eclipse core elsewhere on the page

## 8. Radiation wave

After the fold reaches the button, energy reverses direction.

The solar wave:

- starts at approximately the button's own diameter, never at `scale(.001)`
- uses a transparent ring/refraction field, not an opaque disc
- expands from the exact button center
- reveals the destination world inside the wave
- carries cobalt/ivory spectral edges with a very small warm solar accent

The wave is a transition boundary, not a full-screen white flash.

## 9. Master transition timeline — Observatory → Solar

### 0–120 ms — ignition

- Toggle compresses and rebounds.
- Thin corona appears on the button itself.
- No detached circle appears.

### 120–300 ms — field convergence

- Scene viewport begins opening toward full viewport.
- Far/mid/near stars begin depth-dependent gravitational folding toward the button.
- Text and nav begin very small pre-motion so the page feels unlocked rather than frozen.

### 300–520 ms — layout release

- Hero title starts its FLIP move from left to middle-right while scaling up.
- Eyebrow contracts toward the publication rail.
- Nav spacing begins changing.
- Star convergence becomes strongest.
- Source colors remain dominant until the radiation event starts.

### 520–820 ms — radiation

- Fold completes into the button.
- Solar wave expands from button diameter to the viewport edges.
- `data-world` commits to Solar while the transition surface preserves the source appearance outside the wave.
- Destination layout is already moving underneath it.
- Warm paper and cobalt structure become visible inside the wave.

### 820–1080 ms — solar arrival

- Cropped solar limb enters from upper-right.
- Spectral grid/observation markings resolve.
- Hero title reaches its Solar position.
- Residual star streaks disappear.

### 1080–1320 ms — index reconstruction

- Writing heading becomes Issue Index.
- Article row metadata and titles settle into the Solar grid with restrained stagger.
- Hairline rules draw into place.

### 1320–1500 ms — settle

- Large motion ends.
- Solar surface keeps only quiet procedural motion.
- Publication grid and typography stabilize.
- `data-world` and `data-layout-world` are both Solar.

## 10. Reverse transition — Solar → Observatory

Do not simply reverse every animation frame.

The semantic story is:

**solar contraction → editorial structure loosens → light folds back into button → star field re-expands → Observatory settles**

The same DOM and same scene are reused, but timing emphasis changes:

- solar limb withdraws before the star field becomes dominant
- cobalt rules lose contrast before the page turns dark
- stars re-expand from the button along curved trajectories
- the hero title travels back to the Observatory left column

The reverse must still originate from the toggle button.

## 11. Homepage DOM changes

`src/pages/index.astro` remains one content tree.

Expected structural changes:

- add stable world-morph identifiers to shared elements
- add Observatory/Solar scene anchors
- add publication metadata needed by the Solar layout
- keep one hero title, one nav, one writing heading, one article list
- do not introduce duplicate hidden light-mode copies

## 12. Script/component boundaries

### `themeController.js`

Owns world transition orchestration only:

- exact toggle-center origin
- transition timeline
- world/layout state coordination
- dispatching normalized transition detail

It should no longer derive origin from pointer `clientX/clientY`.

### New `worldMorph.mjs`

Owns DOM FLIP geometry and element animation state.

It does not own theme persistence or WebGL.

### Scene viewport controller

Owns the one scene's viewport geometry between Observatory anchor, full transition stage, and Solar anchor.

### `starField.mjs`

Owns gravitational deformation of stars and optional near-layer streak geometry.

### `solarField.mjs`

Owns solar limb entry/settle motion and keeps current shader-based surface behavior.

### CSS

- Observatory styles remain the baseline.
- Solar layout styles are rewritten around the new editorial grid.
- Transition CSS owns button corona and transparent wave only.
- Do not encode layout motion as unrelated ad-hoc keyframes; motion should follow controller state/FLIP.

## 13. Mobile behavior

Mobile keeps the story but reduces motion distance and particle work:

- same toggle-center origin
- same curved star fold, fewer stars and no/shorter streaks
- title moves less laterally and scales less
- Solar hero becomes stacked editorial composition
- large solar limb remains cropped from upper-right
- article rows use a compact two-row issue grid

No horizontal overflow at 360/390 px.

## 14. Reduced motion

For `prefers-reduced-motion: reduce`:

- no gravitational particle travel
- no large FLIP movement
- no expanding animated ring
- switch world immediately or with a very short opacity/color settle
- preserve all final Solar/Observatory layouts and content

## 15. Performance constraints

- one persistent Three.js renderer/context
- no per-frame geometry allocation
- star base positions allocated once
- transition buffers reused
- mobile particle counts stay at or below current mobile counts
- stop expensive transition deformation immediately after settle
- preserve visibility/context-loss/resize cleanup guards

## 16. QA and acceptance criteria

### Exact visual checkpoints

Capture both directions at:

`0 / 60 / 120 / 180 / 300 / 450 / 520 / 650 / 820 / 950 / 1080 / 1320 / 1500 ms`

Desktop captures are required for both directions. Mobile captures cover at least Observatory → Solar plus stable reverse state.

### Functional assertions

- Transition origin equals toggle center within 2 px.
- Origin never depends on pointer coordinates.
- No detached black eclipse core is visible.
- First visible wave radius is at least the toggle radius.
- Hero title is the same DOM node before, during, and after transition.
- Article rows are the same DOM nodes; no duplicate Solar list exists.
- Star field bends toward the toggle before fading.
- Solar wave reveals rather than covers the destination.
- Final Solar composition is materially different from Observatory: headline grid area, scene anchor, publication header, and article row grid all change.
- Reverse transition returns to exact Observatory layout.
- No horizontal overflow on 1440, 1024, 768, 390, 360 widths.
- Reduced motion bypasses large motion safely.
- Existing search/filter/article navigation remains functional.
- All unit/contract/browser/world-transition QA passes before merge.

## 17. Delivery rule

Implementation will be split into independently reviewable commits/PR scope, but this redesign should land as one coherent feature only after the full transition and final Solar composition pass visual QA. Do not merge a halfway state where the new layout exists without the world morph, or vice versa.
