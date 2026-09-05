# Signal Ledger V3 — Design Specification

## Status

Approved direction: **A — SIGNAL LEDGER**

Repository: `KJDhole/BlogWebsite`

Branch: `design/signal-ledger-v3`

This specification governs a full visual/interaction redesign of Glenn's Astro blog. It intentionally does **not** preserve the previous Research Folio visual system, Orbit, orange orb, black-hole animation, existing color palette, or current page composition.

The content model, article data, SEO, RSS, Tags, Archive, Search, previous/next article logic, responsive behavior, accessibility, and Astro architecture remain product constraints.

---

# 1. Design Thesis

> **Glenn's website is a personal knowledge instrument: a long-running signal ledger for things he builds, analyzes, tests, and thinks through.**

The site should feel like a hybrid of an independent publication, a technical field notebook, and a precision instrument.

It must not look like an AI SaaS homepage, portfolio template, dashboard, generic editorial theme, or stylized retro terminal.

The visual personality is:

- quiet, not sterile;
- technical, not corporate;
- editorial, not magazine-cosplay;
- experimental, not theatrical;
- intellectual, not self-important;
- personal, not autobiographical;
- precise, not ornamental;
- durable enough to live for ten years.

The site must communicate Glenn's identity through structure and behavior, not slogans or decorative branding.

---

# 2. Signature System — The Signal Rail

The sole primary visual signature is the **Signal Rail**.

It is a narrow vertical registration rail that appears in different forms across the product:

- homepage: anchors identity, current state, and writing index;
- article: indicates article metadata and current section;
- archive: becomes the chronology spine;
- tags: becomes the taxonomy spine;
- search: becomes the active-result locator;
- mobile: collapses into short horizontal registration marks rather than consuming width.

The rail is not a decorative line. It must encode real state or information.

Examples of valid uses:

- numbered article entries;
- current article section;
- active year/month in archive;
- active search result;
- current topic group.

Examples of invalid uses:

- random ticks with no semantic meaning;
- glowing animated line;
- scrolling for its own sake;
- duplicating the same rail everywhere regardless of context.

No second competing signature element is allowed.

---

# 3. Motion Philosophy

The previous Orbit / Orange Orb / black-hole interaction is removed.

The new motion language has one purpose: **orientation**.

Allowed:

- active Signal Rail locator translating between meaningful positions;
- subtle text underline/weight transitions;
- search overlay enter/exit;
- very light section-state transitions;
- reading-progress movement if retained;
- reduced-motion-safe opacity changes.

Disallowed:

- scroll hijacking;
- parallax;
- cursor followers;
- particles;
- tilt cards;
- 3D scenes;
- decorative physics;
- staggered fade-ins on every section;
- page-transition spectacles.

All motion must respect `prefers-reduced-motion`.

---

# 4. Typography System

Chinese reading is first priority.

The system uses at most three roles:

## 4.1 Display

Purpose: homepage identity line, article H1, archive/year statements.

Character:

- editorial;
- slightly literary;
- strong enough to make Chinese titles feel authored rather than templated;
- no fashion-magazine excess.

Preferred strategy: a high-quality serif stack that works well for Chinese mixed with Latin, using platform/local system fallbacks rather than shipping a large font payload unless testing proves a custom font necessary.

## 4.2 Body

Purpose: long-form reading, descriptions, navigation labels.

Character:

- neutral;
- excellent CJK legibility;
- stable punctuation rhythm;
- comfortable for 10–20 minute reading.

Target desktop body range: approximately `18px`, tuned by screenshot rather than fixed numerology.

Target line-height range: approximately `1.78–1.88`.

Mobile target: approximately `17px–18px`, with 19–22px content-side safe margins depending on viewport.

## 4.3 Mono

Purpose: IDs, dates, reading time, category codes, figure numbers, command/search metadata.

Mono must be secondary. It must never dominate long text.

---

# 5. Color System

The previous orange accent is not retained by default.

The initial direction is:

## Light

- paper: warm off-white rather than pure white;
- ink: near-black with warm bias;
- muted text: graphite gray;
- rules: low-contrast neutral;
- signal accent: deep signal red / vermilion-red, used sparingly.

## Dark

Dark mode is redrawn, not inverted.

- background: charcoal/ink rather than pure black;
- body text: warm light gray rather than pure white;
- muted metadata: cooler gray;
- rules: very low-contrast gray;
- signal accent: slightly brighter but not neon.

Accent usage is restricted to:

- current rail locator;
- selected search/section state;
- occasional section-registration marks;
- critical links on interaction.

No gradients. No glow. No gradient text.

---

# 6. Grid

The site must stop behaving like a centered 1200px template container.

Desktop uses a **four-zone editorial grid**:

1. outer page margin;
2. signal/meta rail;
3. primary reading/content field;
4. optional contextual rail (TOC, source, auxiliary metadata).

The grid is intentionally asymmetric.

Typical desktop article relationship:

- meta/signal zone: narrow;
- body column: approximately 680–720px;
- contextual rail: approximately 180–230px;
- wide media: approximately 900–980px;
- full media: up to approximately 1080–1120px where content warrants it.

Homepage uses wider space because it is an index, not a reading column.

Tablet collapses context before collapsing body readability.

Mobile removes persistent side rails entirely.

---

# 7. Spacing Rhythm

Use one consistent rhythm rather than isolated arbitrary margins.

Base rhythm:

`4 / 8 / 12 / 20 / 32 / 48 / 72 / 112`

Small optical corrections are allowed only when necessary for typography.

Spacing hierarchy:

- metadata grouping: tight;
- paragraph rhythm: moderate;
- subsection rhythm: generous;
- major section changes: very generous;
- page openings: intentionally spacious but never landing-page-like.

---

# 8. Shape / Border / Elevation

Default radius: `0`.

Radius may be introduced only for a control whose affordance benefits from it, and then should remain small.

No card system.

No generic shadow system.

No elevation hierarchy for content sections.

Hierarchy should be created using:

- typography;
- position;
- spacing;
- alignment;
- thin rules;
- tonal contrast.

---

# 9. Navigation

The top navigation is rebuilt as a restrained publication header.

Required destinations remain available:

- Home;
- Writing;
- Archive;
- Tags;
- Search;
- Theme.

GitHub / X / RSS should remain discoverable but not compete with reading navigation.

Desktop concept:

`GLENN / INDEX` at left, primary low-contrast navigation at right.

Mobile concept:

- GLENN identity;
- Search control;
- compact menu/index control;
- theme control.

The top bar must never resemble a SaaS navbar.

---

# 10. Homepage

The homepage does **not** use a conventional hero.

There is no "Hi, I'm Glenn" block and no decorative right-side visual.

The page opens as an instrument/index.

## 10.1 Opening state

The first viewport should answer within five seconds:

- this is Glenn;
- this is a writing/building/thinking space;
- what themes dominate;
- what is current;
- what is worth reading first.

Proposed structure:

1. publication header;
2. small identity/state line;
3. one current-signal statement;
4. writing ledger immediately visible;
5. topic/archive pathways below.

The identity copy should remain short and avoid resume language.

## 10.2 Writing Ledger

Article rows are the visual core.

Each entry has restrained fields:

- sequence / registration number;
- date;
- title;
- short description;
- category/topic;
- reading time.

Title dominates.

Description is secondary.

Metadata is tertiary.

Do not show thumbnails unless an article has an image whose presence genuinely improves the index.

No pills.

No card backgrounds.

Hover behavior may move the rail locator and subtly change title treatment.

## 10.3 Current Signal

A small "current signal" may expose what Glenn is currently exploring/building.

It must use real, maintainable content, not marketing language.

If there is no maintained data source yet, omit this module in V1 rather than hard-code fake status.

---

# 11. Search

The large inline search field is removed.

Search becomes a **Command Search overlay** opened by:

- visible Search control;
- keyboard shortcut (`⌘/Ctrl + K`).

The overlay is editorial, not application-dashboard-like.

Results show:

- title;
- excerpt;
- date;
- topic/category.

Active result aligns with a compact signal locator.

Mobile search must be full-width, touch-friendly, and easy to dismiss.

Search must remain usable without animation.

---

# 12. Archive

Archive becomes a true chronological ledger.

Desktop:

- year/month spine;
- article rows aligned to time markers;
- active year can be reflected by the Signal Rail.

Mobile:

- years become clear section headers;
- no persistent side rail;
- dates remain scan-friendly.

Archive should feel meaningfully different from Home rather than being the same list under another heading.

---

# 13. Tags / Topic Index

Tags becomes a **knowledge-topic index**, not a pill cloud.

The page should make relationships legible through count, grouping, and hierarchy.

Possible initial grouping:

- AI / Agent;
- Product / Development;
- Systems / Cloud;
- Thinking / Research / Experiments.

Grouping is derived only from actual content taxonomy. Do not invent categories that have no articles solely to make the layout look complete.

Each topic exposes article count and latest activity where available.

---

# 14. Article Page

The article page is the highest-priority screen.

## 14.1 Header

Article header contains:

- category/topic;
- title;
- description/dek;
- published date;
- reading time;
- optional updated date;
- source where present.

Do not compress all metadata into one dense line.

The title should feel like a publication title, not a blog CMS H1.

Long Chinese titles must wrap elegantly.

## 14.2 Article Grid

Desktop supports:

- left meta/signal rail;
- 680–720px reading body;
- optional right TOC/context rail.

Article header aligns to the same underlying grid.

Mobile becomes a single reading stream.

## 14.3 Heading hierarchy

H2 is a chapter event.

It uses:

- section number/registration mark where semantically possible;
- major top spacing;
- clear typographic shift;
- thin rule or rail connection when beneficial.

H3 is subordinate and quieter.

No heading cards.

## 14.4 Media

Support:

- body image;
- wide image;
- full image;
- caption;
- gallery;
- before/after if content requires it.

No default shadow.

No mandatory rounded corners.

Media should create rhythm: narrow text → wider visual → narrow text.

## 14.5 Code

Code block supports:

- language label;
- copy;
- horizontal scroll;
- long lines;
- light/dark adaptation;
- mobile safety.

No fake Mac window chrome.

Inline code is visually distinct but quiet.

## 14.6 Prompt

Prompt is a first-class content object, distinct from code.

Required anatomy:

- `PROMPT` label;
- prompt text;
- Copy action.

Visual language:

- editorial rule / signal mark;
- no card elevation;
- no SaaS component styling.

## 14.7 Quote

Use typography, whitespace, and a thin rule.

No giant quote marks.

No colored quote cards.

## 14.8 Tables

- horizontal rules only where possible;
- generous cell spacing;
- no unnecessary vertical lines;
- mobile horizontal scrolling;
- do not compress technical tables to illegibility.

## 14.9 TOC

Desktop: low-contrast sticky context rail.

Mobile: collapsed disclosure inside article flow.

Only current section should receive a visible active state.

## 14.10 Previous / Next

Previous/Next remains, but is rebuilt as editorial navigation rather than large cards.

---

# 15. Long-form Stress Test

The saved article:

`如何榨出 AI 设计的 99% 创造力：一套三阶段工作流`

is the required real-content stress fixture.

It must be rendered using the new article system during QA and used to verify:

- long Chinese paragraphs;
- mixed Chinese/English;
- multiple headings;
- many images;
- code;
- prompt blocks;
- lists;
- quote;
- links;
- long URLs;
- long-page TOC behavior;
- mobile reading rhythm.

This fixture must not be silently rewritten just to make the layout pass.

---

# 16. Mobile Strategy

Mobile is separately designed at:

- 375 × 812;
- 390 × 844;
- 430 × 932.

Key principles:

- no persistent side rail;
- signal language becomes horizontal registration marks;
- content margins approximately 19–22px depending on viewport;
- H1 must scale independently rather than desktop shrink;
- metadata may stack;
- TOC collapses;
- code/table scroll within their own regions;
- wide media may bleed toward viewport edges when intentional;
- touch targets remain comfortable;
- search overlay uses the whole available width;
- header stays quiet and compact.

---

# 17. Accessibility

Maintain or improve:

- semantic heading order;
- visible keyboard focus;
- keyboard-operable search;
- skip/landmark clarity where useful;
- color contrast;
- reduced-motion behavior;
- accessible labels on theme/search/menu/copy controls;
- no information conveyed by accent color alone;
- table semantics;
- link distinction inside long-form body text.

---

# 18. Performance

Do not add a UI framework.

Preferred implementation:

- Astro;
- CSS;
- native JavaScript;
- browser APIs.

The previous Three.js homepage scene should be removed from the active production bundle if Signal Ledger no longer uses it.

After removal, verify that `three` can also be removed from runtime dependencies if no other page depends on it.

Do not add a new heavy dependency to replace it.

Lighthouse/performance should not materially regress relative to current production.

---

# 19. Design Critic Loop

After Define V1 implementation, capture real browser screenshots at minimum:

- Homepage top — 1440 × 1000;
- Homepage writing — 1440 × 1000;
- Article header — 1440 × 1000;
- Article body — 1440 × 1000;
- Article media — 1440 × 1000;
- Archive — 1440 × 1000;
- Search — 1440 × 1000;
- Dark mode screen;
- Mobile Home — 390 × 844;
- Mobile Article — 390 × 844.

Critic receives screenshots only.

Critic must not receive:

- source code;
- CSS;
- implementation difficulty;
- change history;
- previous critic output;
- builder rationale.

At least three fresh-context rounds are required.

Each round evaluates:

- Identity;
- Typography;
- Composition;
- Hierarchy;
- Editorial Rhythm;
- Whitespace;
- Navigation;
- Article Reading;
- Image Treatment;
- Motion Language;
- Mobile;
- Restraint;
- Originality;
- Detail.

A round that still exposes strong template/AI/SaaS influence requires another iteration.

Builder and Critic roles remain separated.

---

# 20. Deliver Reduction Pass

After the final Critic iteration, stop adding features.

Audit every:

- border;
- card-like container;
- shadow;
- gradient;
- radius;
- icon;
- label;
- badge;
- animation;
- decoration;
- section;
- navigation item;
- explanatory copy;
- background;
- color;
- divider.

If removal preserves meaning and usability, remove it.

Special attention:

- card creep;
- pill creep;
- muted-background creep;
- over-labelling;
- unnecessary metadata;
- ornamental monospace;
- excessive lines/ticks in the Signal Rail;
- animation added to compensate for weak composition.

---

# 21. Final QA Matrix

Viewports:

## Desktop

- 1920 × 1080
- 1440 × 1000
- 1280 × 800

## Tablet

- 1024 × 1366
- 768 × 1024

## Mobile

- 430 × 932
- 390 × 844
- 375 × 812

Required coverage:

- Light mode;
- Dark mode;
- Home;
- Article;
- Archive;
- Tags;
- Search;
- long title;
- long Chinese text;
- English title;
- mixed Chinese/English;
- code;
- prompt;
- image;
- table;
- quote;
- long URL;
- previous/next;
- keyboard focus;
- reduced motion.

No global horizontal overflow is permitted.

---

# 22. Explicit Removals from Research Folio

Signal Ledger V3 intentionally removes or replaces:

- SpaceScene / Orbit visual as homepage identity;
- Orange Orb / black-hole / flight interaction;
- traditional left-copy/right-visual Hero;
- "Hi, I'm Glenn." as primary homepage composition;
- large inline homepage search field;
- tab-like category row as primary taxonomy UI;
- previous orange-accent identity;
- generic editorial page-shell composition inherited from V2;
- Archive/Tags pages that look like variants of the same template;
- decorative reveal behavior not tied to orientation.

Existing code may remain temporarily during implementation only until its replacement is verified. Final delivery should remove dead production code and dependencies.

---

# 23. Success Criteria

The redesign is successful only if all are true:

1. A first-time visitor can identify the site as Glenn's personal publication without reading an About page.
2. Homepage does not resemble a SaaS landing page or generic blog starter.
3. The Signal Rail is recognizable across pages but never ornamental noise.
4. Article reading remains comfortable for 10–20 minute Chinese long-form content.
5. Home, Archive, Tags, Search, and Article are distinct views within one coherent design system.
6. Mobile feels intentionally designed rather than compressed desktop.
7. Prompt, Code, Quote, Table, Media, TOC, and Previous/Next are production-ready.
8. Dark and Light modes are separately tuned.
9. The previous Orbit/Three.js visual system is absent from the final active experience.
10. No new AI-aesthetic clichés are introduced.
11. At least three independent screenshot-only Critic rounds are completed.
12. Final Deliver pass removes unnecessary UI.
13. Full viewport/content QA passes.
14. Existing SEO, RSS, structured data, semantic HTML, accessibility, and content routing remain intact.
15. Build and test pass on the final branch before merge.

---

# 24. Non-Goals

This redesign does not include:

- rewriting Glenn's published article content;
- adding fake projects, fake status, fake metrics, or fake articles;
- converting Astro to React/Next;
- adding CMS infrastructure;
- redesigning server deployment architecture;
- generating decorative AI imagery simply to fill space;
- adding analytics/product features unrelated to reading and discovery.

---

# 25. Implementation Boundary

Implementation must be planned after this spec is approved.

Expected implementation areas include, but are not yet frozen as tasks:

- base design tokens/styles;
- SiteHeader/navigation;
- homepage/index architecture;
- editorial article row/index;
- command search;
- archive ledger;
- topic index;
- ArticleLayout;
- article enhancement JS;
- content component styling;
- responsive system;
- removal of SpaceScene/Three.js/old motion when replacements are verified;
- visual QA workflows and stress fixture.

No production implementation begins until this specification passes user review.
