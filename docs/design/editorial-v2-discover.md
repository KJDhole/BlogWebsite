# Editorial V2 — Discover

> Internal design working note. This file is not product copy and is not rendered by the site.

## Baseline

Captured from the unmodified production UI with Astro production build + Chromium at:

- Desktop home — 1440 × 1000
- Desktop article — 1440 × 1000
- Mobile home — 390 × 844
- Mobile article — 390 × 844

The current site already owns several valuable decisions: the tiny GLENN masthead and orange proof-mark dot, the warm paper-like light surface, near-black dark surface, the restrained serif/sans contrast, and the Orbit + orange orb narrative. These are not redesign targets.

The main visual debt is not lack of decoration; it is residual interface-template language around an otherwise personal system: rounded search chrome, tag pills, forced synthetic thumbnails, a boxed TOC, repeated labels, and a few elevated/background treatments. On mobile these choices consume disproportionate vertical space and the filter row clips.

## Private design seed

DESIGN_SEED=e823b4cbadaf022399b84d94fa05b246101b1e447c60aaaf3824bf70158d337f93c5786338187fd62b27337faf98b5c23e6b9b65d99d92516e76282368bdee55

The seed is used only to break design-path dependence. Its dense numeric rhythm and irregular bursts suggest a measured folio: mostly calm text fields interrupted by precise technical notation, rather than a decorative magazine or a software dashboard. The seed itself must never appear in the UI.

---

## Six distinct design worlds

### 1. Scientific Field Notes

**Visual philosophy**  
A personal record of observations, mechanisms, experiments, and conclusions. It feels accumulated rather than launched.

**Typography logic**  
Reading-first serif for long Chinese text; restrained sans for structure; compact mono only for data-like metadata and code.

**Spatial relationship**  
A narrow reading measure with generous outer margins. Supporting metadata sits at the edge of the main text field rather than inside boxes.

**Image treatment**  
Images behave as evidence plates: unframed, captioned, allowed to exceed the text measure when information needs room.

**Navigation**  
A typographic index, almost invisible until needed.

**Article list**  
Chronological field log: date / title / short note, with title carrying most visual weight.

**Reading feeling**  
Slow, annotated, trustworthy.

**Interaction**  
Only state changes: underline, current section, copy, progress.

### 2. Independent Technical Journal

**Visual philosophy**  
A serious self-published journal written by one builder. More editorial than personal-homepage, but never institutional.

**Typography logic**  
Expressive serif display titles, Chinese-aware serif body, utilitarian sans metadata. Strong size contrast, little color contrast.

**Spatial relationship**  
A folio grid with deliberate asymmetry: strong left text column, controlled whitespace, hairline rules.

**Image treatment**  
Editorial inserts rather than thumbnails. No image is present merely to fill a slot.

**Navigation**  
Small masthead and quiet text links. Search and categories read like editorial tools, not form components.

**Article list**  
Index/table-of-contents behavior rather than cards.

**Reading feeling**  
Published, authored, durable.

**Interaction**  
Nearly invisible; motion belongs primarily to the Orbit.

### 3. Swiss Architecture Portfolio

**Visual philosophy**  
A strict analytical grid where every alignment feels intentional.

**Typography logic**  
Neutral sans dominates; serif appears only as an essay counterpoint. Strong baseline and column discipline.

**Spatial relationship**  
Modular columns, explicit coordinates, narrow metadata rails, broad empty planes.

**Image treatment**  
Large plates aligned to the grid, with tiny captions and identifiers.

**Navigation**  
Systematic, compact, location-aware.

**Article list**  
A project schedule or catalogue register.

**Reading feeling**  
Exact, dry, architectural.

**Interaction**  
Small, deterministic state transitions.

### 4. Contemporary Art Catalogue

**Visual philosophy**  
The page is a sequence of objects and pauses. Omission is as important as content.

**Typography logic**  
Large editorial serif titles, quiet captions, dramatic changes in scale rather than boxes or backgrounds.

**Spatial relationship**  
Asymmetry, large intervals, occasional wide visual interruptions.

**Image treatment**  
Images are treated as plates: often unframed, sometimes wide or full, always captioned.

**Navigation**  
Extremely quiet and secondary.

**Article list**  
Catalogue entries with minimal metadata.

**Reading feeling**  
Reflective, tactile, art-directed.

**Interaction**  
Very low; hover only where it clarifies affordance.

### 5. Industrial Instrument / Research Log

**Visual philosophy**  
An engineer’s instrument panel translated into print, without becoming a dashboard.

**Typography logic**  
Mono/sans notation around serif essays. Orange is a state marker, not a decorative fill.

**Spatial relationship**  
Measured rules, coordinate-like metadata, compact utility areas around a calm reading core.

**Image treatment**  
Figures, diagnostics, diagrams, test outputs.

**Navigation**  
State-oriented and exact.

**Article list**  
Registry/log language.

**Reading feeling**  
Technical manual meets personal essay.

**Interaction**  
Precise microstates. High risk of drifting into dashboard aesthetics if overused.

### 6. Japanese Editorial / Quiet Catalogue

**Visual philosophy**  
Restraint, materiality, and rhythm through spacing rather than visual effects.

**Typography logic**  
Chinese/CJK-aware body texture first; subtle serif/sans hierarchy; small labels with disciplined tracking.

**Spatial relationship**  
Long quiet intervals, thin rules, carefully weighted margins.

**Image treatment**  
Natural width, no obligatory frame, low-key caption.

**Navigation**  
Small, simple, typographic.

**Article list**  
Elegant vertical index with little metadata noise.

**Reading feeling**  
Calm and human.

**Interaction**  
Almost none beyond navigation state.

### 7. Early Desktop Publishing

**Visual philosophy**  
The personal computer as a publishing instrument, not nostalgia as decoration.

**Typography logic**  
Small mono utility text paired with serious editorial serif.

**Spatial relationship**  
Hard edges and compact commands around a paper-like document.

**Image treatment**  
Document inserts and diagrams.

**Navigation**  
Text-command feeling.

**Article list**  
File/index metaphor.

**Reading feeling**  
Personal computing history meets modern essay.

**Interaction**  
Direct and tactile. Rejected as a primary direction because the retro language could become a gimmick and compete with Orbit.

---

# Three candidates

## Candidate A — Research Folio

### A. Design Thesis
A personal research folio where every article feels recorded, tested, and published rather than posted.

### B. Typography
- **Chinese:** reading-first CJK serif stack, with platform-native fallback before generic Western serif.
- **English:** restrained editorial serif for display; neutral sans for interface and structural headings.
- **Titles:** large but not heroic-marketing large; compact line-height, editorial wrapping.
- **Body:** stable 18px-class rhythm on desktop, tuned by screenshot; high line-height for Chinese.
- **Meta:** small sans, no pill containers.
- **Code:** mono with explicit language/copy utility, visually separate from body but not window chrome.

### C. Layout
- **Home:** left author statement / right Orbit, then a typographic writing index.
- **Article list:** date rail + main text; no forced visual slot.
- **Article:** 700–720px reading core, wide visual lanes at ~920px, optional full media up to ~1080px; quiet desktop marginal TOC.
- **Wide screens:** space is used for breathing and marginal information, not more cards.
- **Mobile:** one strong column, 18–22px safe margins, horizontal category rail, no thumbnail tax.

### D. Visual Rhythm
Whitespace is the main separator; hairlines are the second. Orange appears as tiny proof/state marks. Images interrupt the narrow text measure only when they carry information.

### E. Signature Element
The existing Orbit + orange orb is the only major kinetic signature. The supporting identity is a repeatable folio rhythm: precise hairlines, date/section notation, and editorial measure.

### F. Things We Refuse
Forced thumbnails, tag pills, card TOC, rounded search card, large shadows, decorative gradients outside the Orbit, excessive labels, ornamental badges, new motion systems.

## Candidate B — Independent Technical Journal

### A. Design Thesis
A one-person technical journal with the authority of a publication and the intimacy of a notebook.

### B. Typography
More expressive display serif than Candidate A, dense sans metadata, body serif with slightly shorter line length.

### C. Layout
Front page resembles an issue index; article headers feel more magazine-like and may use stronger asymmetry. Mobile remains linear.

### D. Visual Rhythm
Larger jumps in type scale and more dramatic editorial whitespace.

### E. Signature Element
Orbit as a recurring “cover apparatus”; issue-like folio markers around article metadata.

### F. Things We Refuse
Magazine-cover decoration, fake issue numbers, hero marketing copy, card grids, decorative illustrations.

## Candidate C — Quiet Catalogue

### A. Design Thesis
A calm catalogue of Glenn’s ongoing work where content and pauses carry more weight than interface chrome.

### B. Typography
CJK body texture dominates. Titles are quieter than A/B; labels are extremely sparse.

### C. Layout
Very open home, thin index rows, generous article margins, images as plates.

### D. Visual Rhythm
Most spacious of the three; few separators, long intervals.

### E. Signature Element
Orbit sits like a single art object on an otherwise quiet surface.

### F. Things We Refuse
Almost all visible controls beyond what is necessary; no chips, cards, gradients, visual thumbnails, decorative status markers.

---

# Selected direction — Research Folio

**Final thesis:** **A personal research folio where each article feels published, not posted; the Orbit is the moving instrument, and everything else behaves like a calm editorial index.**

Research Folio is selected because it gives the existing Orbit enough room to remain unmistakably Glenn without forcing the rest of the site to compete with it. It translates Build / Analyze / Think into structure rather than slogans: chronological evidence, precise metadata, stable reading measure, purposeful wide figures, and very small state-oriented uses of orange. It also scales naturally from AI/Agent engineering notes to product thinking and long essays.

Candidate B is slightly too publication-branded and could make a one-person blog feel performative. Candidate C has beautiful restraint but risks making technical navigation/search/code too invisible. Research Folio keeps the intellectual calm of both while remaining useful for a developer-heavy archive.

## Define constraints carried forward

1. No new major visual object beyond Orbit.
2. Do not change Orbit/orb motion thresholds, trajectories, handoff, landing, or navigation destination.
3. Remove template chrome before adding visual treatments.
4. Chinese reading quality outranks English display styling.
5. Homepage list is an index, never a card grid.
6. Article media width is semantic: body / wide / full.
7. Prompt and code are different content types and must look different.
8. Desktop TOC is marginal and quiet; mobile TOC is collapsible.
9. One top hairline is enough for reading progress.
10. Any new border/background/radius must justify an information role.
