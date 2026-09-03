# Glenn Blog UI Prototype

A dependency-free, responsive personal blog homepage prototype focused on typography, restrained motion, and article-first reading.

## Run locally

```bash
npm run dev
```

Open `http://localhost:4173`.

## Build

```bash
npm run build
```

This generates:

- `dist/index.html`
- `glenn-blog-demo.html`

Both are self-contained HTML builds with the page CSS and JavaScript inlined.

## Test

```bash
npm test
```

## Current interactions

- Continuous multi-speed orbital Hero animation without loop snapping
- Scroll narrative: orbital release → tangent escape → guided approach
- Time-driven landing microphysics: free fall → squash/sink → bounce → settle → morph into the active category indicator
- Shared landing geometry so the orange orb docks exactly on the real `All` indicator
- Dedicated mobile motion tuning and responsive layout
- `prefers-reduced-motion` fallback
- Live article search (`Ctrl/Cmd + K`)
- Animated category filtering
- Article hover micro-interactions
- Light/dark theme switching
- Improved light-theme text and orbit contrast

## Structure

```text
prototype/
  app.js               # Page state, scroll story, theme, filters, DOM animation
  orbitMotion.mjs      # Pure orbit / flight / landing motion math
  filterArticles.mjs   # Pure search/filter logic
  index.html            # Prototype markup
  styles.css            # Responsive visual system
  tests/                # Node test suite
  build.mjs             # Produces the standalone HTML build
  serve.mjs             # Tiny local dev server

docs/superpowers/       # Design specification and implementation plan
```

## Implementation note

This review prototype intentionally uses native DOM, SVG, CSS, and `requestAnimationFrame`, so it runs without third-party runtime dependencies. The design can later be migrated to React + Motion while preserving the same motion model and component boundaries.
