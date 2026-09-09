# Solar Archive Dual-Personality Design

Date: 2026-09-08
Status: Approved direction, implementation pending
Branch: `feature/solar-archive-dual-personality`
Base: `main@cc3849144b33afe4a26e54f402e6a2d712ef6abd`

## 1. Goal

Turn the existing light/dark theme into two intentional visual personalities while keeping one semantic website, one article system, one route tree, and one content source.

- **Night = OBSERVATORY**: deep-space research folio, quiet, analytical, observational.
- **Day = SOLAR ARCHIVE**: warm scientific publication, luminous, editorial, constructive.

The user must feel that changing theme changes the site's personality, not merely its colors.

## 2. Core product rule

Visual difference may be dramatic; product structure must remain shared.

- One Astro page structure.
- One article collection.
- One SEO/canonical/RSS system.
- One navigation model.
- One search/filter state.
- One WebGL scene lifecycle.
- No duplicated light and dark page trees.

Theme-specific layout changes should come from tokens, CSS Grid, CSS custom properties, theme-aware decoration, and a small number of theme-specific scene states.

## 3. Personality model

### 3.1 OBSERVATORY — night

Purpose: observation, analysis, systems thinking.

Visual language:
- Deep black/navy background.
- Layered star field and sparse deep-space atmosphere.
- Cold white typography.
- Faint orbital/gravitational lines.
- Quiet instrumentation and research-log details.
- No persistent focal animation.

Personality words:
- Observe
- Analyze
- Think

Writing index language:
- research log
- observation register
- chronological field notes

The existing Cosmic Editorial V3 night direction remains the baseline and should only receive compatibility changes required by the dual-personality system.

### 3.2 SOLAR ARCHIVE — day

Purpose: building, publishing, illuminating ideas.

Visual language:
- Warm ivory paper base, never pure white.
- Cobalt / sky blue scientific annotation.
- Silver-grey technical lines.
- Very limited solar orange/red for measurements, flares, issue markers, and marginalia.
- Solar observation imagery and spectral / magnetic-field references.
- Modern science journal + laboratory printout + Swiss editorial grid.

Personality words:
- Build
- Publish
- Illuminate

The day UI must not look like a faded or desaturated version of Observatory.

## 4. Signature theme transition — mandatory

This is a product signature, not optional polish.

### 4.1 Night → Day: Eclipse → Corona → Solar Wave → Solar Archive

Total target duration: approximately 1.5 s on capable desktop devices.

#### Phase A — Eclipse core, 0.00–0.18 s
- The user's actual theme-toggle click position is the transition origin.
- The sun control contracts into a small dark eclipse disc.
- A thin white-gold corona appears around the disc.
- Corona may contain tiny asymmetric flare details; it must not look like a generic glowing circle.

#### Phase B — Totality, 0.18–0.45 s
- The page briefly compresses luminance.
- Night stars remain momentarily visible but begin fading.
- The corona breathes outward subtly.
- This is the quietest moment of the transition.

#### Phase C — Radial Solar Wave, 0.45–0.95 s
- A radial wave expands from the user's click position across the viewport.
- This is NOT a generic white circular wipe.
- Regions crossed by the wave change visual rules:
  - deep black → navy → cold blue-grey → warm ivory
  - stars dissolve like dawn exposure
  - star dust becomes daylight particulate
  - gravitational/orbital references become spectral or magnetic-field lines
  - cold instrumentation becomes cobalt scientific annotation
  - limited solar-orange accents emerge

The wave communicates a world transition, not a color fade.

#### Phase D — Solar reveal, 0.95–1.25 s
- A huge solar surface becomes visible from the right side of the Hero.
- Only a partial stellar limb is visible; never a complete floating sphere.
- The visual reference is close-range solar-observatory imagery, not a 3D planet demo.
- Required qualities:
  - granular surface structure
  - restrained corona edge
  - subtle thermal refraction
  - sparse magnetic field lines
  - at most one or two controlled flare details

#### Phase E — Archive settle, 1.25–1.50 s
- The rest of the UI reaches Solar Archive layout and styling.
- Writing/index, search, filters, navigation and footer settle into their day personality.
- One very small flare or light response may close the transition.
- After this point the UI must become quiet.

### 4.2 Day → Night

The reverse direction is conceptually related but should not be a crude frame-reverse:
- solar luminance falls
- shadow crosses the stellar surface
- corona forms
- totality occurs
- darkness spreads outward from the toggle origin
- spectral lines recede into gravitational arcs
- stars return in far/mid/near layers
- Observatory settles into stillness

### 4.3 Hard acceptance rule

> Theme transition must use Eclipse → Corona → radial Solar Wave → Solar Archive reveal. A generic fade, instant color swap, or simple white circular wipe is not acceptable.

## 5. Hero design

### Night Hero
Preserve current Observatory composition and deep-space behavior with minimal structural disturbance.

### Day Hero
The Hero becomes a solar-observation spread.

Required visual structure:
- Left: editorial title and copy remain semantically the same.
- Right: massive cropped stellar limb, occupying enough scale that it feels close and physical.
- Solar surface must be atmospheric/procedural rather than a simple orange circle.
- Add restrained scientific metadata around the scene:
  - observation timestamp
  - spectral band / wavelength-style label
  - coordinate ticks
  - tiny instrument labels
- Metadata is decorative and must not dominate the copy.
- No meteor, traveler orb, or obvious loop animation.

Day headline may keep the same wording, but typography spacing, annotation and supporting labels can shift to the Solar Archive personality.

## 6. Navigation and theme control

The theme control becomes a world switch rather than a generic light/dark toggle.

Semantic behavior remains accessible:
- real button
- keyboard operable
- useful aria-label
- theme persistence stays intact

Visual concepts:
- Night destination: moon / eclipse / Observatory.
- Day destination: sun / corona / Solar Archive.
- The toggle position must be used as the transition origin.

Navigation links remain the same destinations, but styling changes by personality.

## 7. Writing index — must also change personality

The lower page must participate in the world switch. Hero-only theming is insufficient.

### Observatory writing index
Keep the current research-register feel:
- date
- entry
- field / read
- restrained white/grey technical grid

### Solar Archive writing index
Recompose the same content into a modern science-publication register.

Desired language:
- `ISSUE`
- `FIELD NOTE`
- `OBSERVATION`
- publication-like numbering

Visual behavior:
- stronger editorial typographic contrast
- cobalt issue numbers and annotations
- restrained fluorescent/solar orange marginalia
- page-number / lab-record cues
- scientific grid rather than dark-mode table styling copied onto ivory
- hover can use a very thin spectral scan line or annotation response
- category/filter state should resemble editorial annotation, not generic tabs
- search should feel like an archive catalogue or publication index

The DOM/data source remains shared with Observatory.

## 8. Footer and supporting UI

Footer changes personality with the rest of the page.

Observatory:
- quiet research log termination
- dark, restrained metadata

Solar Archive:
- publication colophon / archive footer
- warm paper, fine cobalt rules, issue/edition cues

No duplicated routes or content.

## 9. Scene architecture

Keep one persistent scene lifecycle.

Preferred architecture:
- existing `SpaceScene` remains the mount point
- existing renderer lifecycle is preserved
- renderer receives a world/theme state: `observatory | solar`
- night scene renders star field + cosmic atmosphere
- day scene renders solar atmosphere + solar limb + spectral/magnetic detail
- transition may crossfade or parameter-interpolate scene layers, but must not destroy/recreate expensive rendering contexts during every toggle

The large solar object must be a cropped atmospheric field, not a model-like sphere centered in a canvas.

## 10. View transition architecture

Use progressive enhancement.

Preferred order:
1. `document.startViewTransition()` when available.
2. CSS-driven fallback with the same conceptual eclipse/reveal language.
3. Reduced-motion fallback: immediate theme swap with a short opacity/color settle; no radial wave.

The radial reveal origin is measured from the user's actual theme-toggle interaction.

No large new animation dependency is required unless implementation proves the native path insufficient.

## 11. Color direction

### Observatory
Retain deep-space dark palette.

### Solar Archive
Base:
- warm ivory / paper
- soft warm grey

Scientific annotation:
- cobalt
- sky blue
- silver blue-grey

Accent:
- sparse solar orange/red only for important measurements, flare, issue markers, or marginal notes

Avoid:
- pure white page background
- large orange objects
- orange moving particles
- generic pastel gradient SaaS styling

## 12. Typography and layout

Typography should express two personalities without requiring two content structures.

Night:
- restrained research folio
- quiet hierarchy
- technical spacing

Day:
- more editorial scale contrast
- magazine/scientific publication rhythm
- annotation columns and marginalia
- stronger grid logic

Main article body pages should not radically change reading structure. They may receive personality-specific color, rules, metadata, and transition polish, while preserving reading stability.

## 13. Motion rules

After the theme transition ends, both personalities become calm.

Allowed ambient motion:
- low-amplitude solar surface drift
- minimal heat shimmer
- extremely slow line motion
- subtle star drift at night

Disallowed:
- persistent attention-seeking loops
- floating orange objects
- repeated signature transition without user action
- game-like particles
- aggressive parallax

## 14. Responsive behavior

Desktop:
- full signature transition
- large cropped solar limb
- richer scientific annotation

Mobile:
- same personality concept
- shorter, lighter transition
- reduced solar detail density
- avoid text overlap and viewport overflow
- no expensive full-screen distortion

The day layout must still feel intentionally different on mobile, not merely collapse back into the night layout.

## 15. Accessibility and reduced motion

- Theme control remains keyboard accessible.
- Maintain readable contrast in both personalities.
- Decorative visual layers remain `aria-hidden` where appropriate.
- `prefers-reduced-motion` disables radial wave, heat shimmer, solar flare animation and nonessential parallax.
- Theme change must remain understandable without motion.
- No information may exist only in decorative theme-specific elements.

## 16. Performance constraints

- One WebGL context maximum for the Hero system.
- Do not reinitialize the renderer on every theme toggle.
- Keep current DPR protections or stricter equivalents.
- Pause expensive work when hidden/offscreen.
- Mobile uses lower particle/detail density.
- Avoid large looping background video.

## 17. Engineering boundaries

Must preserve:
- article collection and publishing flow
- SEO metadata
- canonical URLs
- RSS
- archive/tags routes
- search/filter behavior
- reading layout
- existing theme persistence semantics

May change:
- theme naming and internal presentation state
- Hero layout/styling
- scene world state
- theme transition implementation
- homepage Writing layout
- navigation/footer styling
- theme-specific decorative metadata

## 18. Testing strategy

### Unit/contract tests
- theme state maps to Observatory/Solar Archive correctly
- shared DOM/content source remains one implementation
- no duplicate light/day article tree
- reduced-motion bypasses signature transition
- transition origin accepts actual pointer position and safe keyboard fallback
- Solar Archive uses its own layout/style tokens

### Browser QA
Capture at minimum:
- Night desktop home
- Day desktop home
- Night mobile home
- Day mobile home
- Night article
- Day article
- theme transition frames at meaningful checkpoints

Transition frame checkpoints should include approximately:
- 0 ms
- 180 ms
- 450 ms
- 700 ms
- 950 ms
- 1250 ms
- 1500 ms

Manually inspect that:
- eclipse originates from the theme control
- corona is visible before the wave
- wave is not a generic white wipe
- stars transform/fade coherently
- Solar Archive layout is already settling by the final frames
- the solar limb never reads as a centered 3D model ball

## 19. Acceptance criteria

1. Night and day feel like two personalities of one mind, not dark/light color variants.
2. Night remains Observatory: deep, quiet, analytical.
3. Day becomes Solar Archive: luminous, editorial, scientific, warm.
4. The whole homepage, including Writing/search/filter/footer, participates in the day personality.
5. Content, SEO, HTML semantics and publishing remain shared.
6. Theme toggle executes the mandatory Eclipse → Corona → radial Solar Wave → Solar Archive reveal on supported devices.
7. Reveal starts at the actual theme-control location.
8. Day Hero uses a huge cropped solar surface, never a complete floating sphere model.
9. No persistent meteor/traveler animation returns.
10. Animation stops demanding attention once the transition completes.
11. Mobile and reduced-motion versions remain complete and intentional.
12. Existing blog features and CI remain green.

## 20. Non-goals

- Building two separate websites.
- Duplicating article data or routes.
- Rebuilding the article reader into two unrelated layouts.
- Creating an astronomical simulator.
- Adding a generic theme animation library merely for convenience.
- Reintroducing orbiting model planets or a hero-object demo aesthetic.
