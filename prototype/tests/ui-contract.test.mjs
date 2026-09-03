import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const htmlPath = new URL('../index.html', import.meta.url)

test('homepage has no traditional content navigation and exposes core controls', async () => {
  const html = await readFile(htmlPath, 'utf8')
  assert.equal(/>\s*(Writing|Notes|Projects|About)\s*</.test(html), false)
  assert.match(html, /id="article-search"/)
  assert.match(html, /class="orbit-stage"/)
  assert.match(html, /id="theme-toggle"/)
})

test('light theme keeps supporting text and orbital graphics readable', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8')
  assert.match(css, /--text-soft:\s*#565954/)
  assert.match(css, /--text-faint:\s*#6f716c/)
  assert.match(css, /--orbit-line:\s*rgba\(20,20,18,\.24\)/)
  assert.equal(/orbit-stage:hover[^{]*\{[^}]*animation-duration/s.test(css), false)
})

test('orbital transition uses svg breakup plus a cross-section flight orb', async () => {
  const html = await readFile(htmlPath, 'utf8')
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8')
  assert.match(html, /class="orbit-svg"/)
  assert.match(html, /class="flight-orb"/)
  assert.match(html, /class="orbit-ring orbit-ring-c"/)
  assert.match(app, /getOrbitTransitionState/)
  assert.match(app, /sampleTangentFlightPath/)
  assert.match(app, /landingProgressFromElapsed/)
})

test('mobile has a dedicated orbital layout instead of shrinking desktop blindly', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8')
  assert.match(css, /@media \(max-width:\s*760px\)/)
  assert.match(css, /--mobile-orbit-size:/)
  assert.match(css, /\.flight-orb/)
})

test('small supporting text stays legible in the light theme', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8')
  assert.match(css, /\.eyebrow\s*\{[^}]*font-size:\s*11px/s)
  assert.match(css, /\.article-date\s*\{[^}]*font-size:\s*11px/s)
  assert.match(css, /\.article-meta\s*\{[^}]*font-size:\s*11px/s)
  assert.match(css, /\.footer-meta\s*\{[^}]*font-size:\s*11px/s)
})

test('accent planet is larger and docks to the real indicator geometry', async () => {
  const html = await readFile(htmlPath, 'utf8')
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8')
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8')

  assert.match(html, /class="orbit-planet orbit-planet-c"[^>]*r="7"/)
  assert.match(css, /\.flight-orb,[\s\S]*width:\s*14px;[\s\S]*height:\s*14px;/)
  assert.match(app, /getIndicatorGeometry\(allButton\)/)
  assert.match(app, /const track = filterIndicator\.parentElement/)
  assert.match(app, /track\.getBoundingClientRect\(\)/)
  assert.match(app, /buildTangentFlightPath/)
  assert.match(app, /sampleTangentFlightPath/)
})

test('flight orb lives outside the transformed hero so fixed coordinates are true viewport coordinates', async () => {
  const html = await readFile(htmlPath, 'utf8')
  const heroStart = html.indexOf('<section class="hero')
  const heroEnd = html.indexOf('</section>', heroStart)
  const flightOrb = html.indexOf('class="flight-orb"')

  assert.ok(heroStart >= 0 && heroEnd > heroStart)
  assert.ok(flightOrb < heroStart || flightOrb > heroEnd, 'flight orb must not be nested inside the transformed hero')
})

test('flight capture is deterministic even when scrolling jumps past the release frame', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8')
  assert.match(app, /getOrbitTransitionState\(0\.38,\s*\{\s*mobile(?:\s*:|\s*\})/)
  assert.match(app, /releaseState\.systemX/)
  assert.match(app, /positionOnOrbit\(RELEASE_ANGLE,\s*ORBIT_RADII\.c\)/)
})

test('flight target is measured from settled layout, not from an in-progress reveal or indicator transition', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8')
  assert.match(app, /controls\.style\.transition\s*=\s*'none'/)
  assert.match(app, /hero\.style\.transition\s*=\s*'none'/)
  assert.match(app, /getIndicatorGeometry\(allButton\)/)
  assert.match(app, /const track = filterIndicator\.parentElement/)
  assert.match(app, /track\.getBoundingClientRect\(\)/)
})

test('scroll story settles the hero and filter controls before the orb docks', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8')
  assert.match(app, /function settleScrollStoryLayout\(\)/)
  assert.match(app, /controls\.classList\.add\('is-visible'\)/)
  assert.match(app, /controls\.style\.opacity\s*=\s*'1'/)
  assert.match(app, /hero\.classList\.add\('is-visible'\)/)
  assert.match(app, /if \(currentMotion\.progress > 0\.18\) settleScrollStoryLayout\(\)/)
})

test('narrow filter labels share one centered indicator geometry with the landing orb', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8')
  assert.match(app, /function getIndicatorGeometry\(button\)/)
  assert.match(app, /Math\.max\(18,\s*rect\.width\)/)
  assert.match(app, /\(rect\.width - width\) \/ 2/)
  assert.match(app, /getIndicatorGeometry\(allButton\)/)
  assert.match(app, /getIndicatorGeometry\(button\)/)
})

test('scroll-linked indicator opacity is not delayed by a second css opacity transition', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8')
  const rule = css.match(/\.filter-indicator\s*\{([\s\S]*?)\}/)?.[1] ?? ''
  const transition = rule.match(/transition:\s*([^;]+);/)?.[1] ?? ''
  assert.equal(/opacity/.test(transition), false)
})

test('scroll story locks the hidden indicator to the docking geometry and restores tab motion for user clicks', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8')
  assert.match(app, /filterIndicator\.style\.transition\s*=\s*'none'/)
  assert.match(app, /moveIndicator\(allButton\)/)
  assert.match(app, /if \(fromUser\)[\s\S]*filterIndicator\.style\.transition\s*=\s*''/)
})

test('landing animation approaches from above, then squashes, bounces, and only then morphs into the indicator', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8')
  assert.match(app, /dropStart/)
  assert.match(app, /getActiveLandingMotion/)
  assert.match(app, /landing\.fall/)
  assert.match(app, /landing\.scaleX/)
  assert.match(app, /landing\.scaleY/)
  assert.match(app, /landing\.yOffset/)
  assert.match(app, /landingProgressFromElapsed/)
})


test('landing microphysics is time-driven after the scroll reaches the drop point', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8')
  assert.match(app, /landingStartedAt/)
  assert.match(app, /performance\.now\(\)/)
  assert.match(app, /landingProgressFromElapsed/)
  assert.match(app, /currentMotion\.progress\s*>=\s*0\.66/)
})
