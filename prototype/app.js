import { filterArticles } from './filterArticles.mjs'
import {
  RELEASE_ANGLE,
  advanceOrbitAngles,
  buildTangentFlightPath,
  getOrbitTransitionState,
  getLandingMotionState,
  landingProgressFromElapsed,
  nearestEquivalentAngle,
  sampleTangentFlightPath
} from './orbitMotion.mjs'

const articles = [
  {
    id: 'commerce-agent-rules',
    date: '2026-09-03',
    title: 'Commerce Agent 的 24 条设计法则',
    summary: '从 Anthropic 的 Commerce Agent 架构出发，重新理解 Agent 应该负责什么，不应该负责什么。',
    readTime: 8,
    category: 'Agent',
    tags: ['AI', 'Agent', 'Architecture'],
    visual: 'pearl'
  },
  {
    id: 'ai-native-development',
    date: '2026-08-31',
    title: 'AI Native 开发到底改变了什么',
    summary: '以前我们优化的是写代码的效率，现在开始优化的是交付智能的速度。',
    readTime: 12,
    category: 'Development',
    tags: ['AI', 'Development', 'Tools'],
    visual: 'rays'
  },
  {
    id: 'agent-memory-notes',
    date: '2026-08-28',
    title: '我对 Agent 记忆系统的一些思考',
    summary: '短期记忆、长期记忆、知识图谱、向量数据库，到底应该在什么场景下使用？',
    readTime: 6,
    category: 'Agent',
    tags: ['Agent', 'Memory', 'Design'],
    visual: 'paper'
  },
  {
    id: 'claude-code-workflow',
    date: '2026-08-26',
    title: 'Claude Code + 自定义指令的工作流',
    summary: '如何让 Coding Agent 真正理解你的代码库，而不是每次都从零开始猜。',
    readTime: 7,
    category: 'Development',
    tags: ['Claude', 'Workflow', 'Best Practice'],
    visual: 'code'
  },
  {
    id: 'building-in-public',
    date: '2026-08-23',
    title: '为什么我选择公开构建所有项目',
    summary: '透明构建带来的反馈质量，远比想象中更高。',
    readTime: 5,
    category: 'Thinking',
    tags: ['Building in Public', 'Mindset'],
    visual: 'halo'
  }
]

const state = { query: '', category: 'All' }
const articleList = document.querySelector('#article-list')
const template = document.querySelector('#article-template')
const searchInput = document.querySelector('#article-search')
const filterButtons = [...document.querySelectorAll('.filter-button')]
const filterIndicator = document.querySelector('.filter-indicator')
const resultCount = document.querySelector('#result-count')
const emptyState = document.querySelector('#empty-state')
const clearFilters = document.querySelector('#clear-filters')
const themeToggle = document.querySelector('#theme-toggle')
const hero = document.querySelector('.hero')
const controls = document.querySelector('.controls')
const orbitStage = document.querySelector('.orbit-stage')
const orbitCaption = document.querySelector('.orbit-caption')
const mobileMedia = window.matchMedia('(max-width: 760px)')
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

const orbitNodes = {
  ringA: document.querySelector('.orbit-ring-a'),
  ringB: document.querySelector('.orbit-ring-b'),
  ringCBase: document.querySelector('.orbit-ring-c-base'),
  ringCFragments: document.querySelector('.orbit-ring-c'),
  planetA: document.querySelector('.orbit-planet-a'),
  planetB: document.querySelector('.orbit-planet-b'),
  planetC: document.querySelector('.orbit-planet-c'),
  core: document.querySelector('.orbit-core'),
  coreHalo: document.querySelector('.orbit-core-halo'),
  grid: document.querySelector('.orbit-grid')
}

const flightOrb = document.querySelector('.flight-orb')
const flightEchoOne = document.querySelector('.flight-echo-one')
const flightEchoTwo = document.querySelector('.flight-echo-two')
const allButton = filterButtons.find(button => button.dataset.category === 'All')

const SVG_CENTER = 210
const ORBIT_RADII = { a: 70, b: 120, c: 172 }
let orbitAngles = { a: 16, b: 198, c: 312 }
let previousFrame = null
let currentMotion = getOrbitTransitionState(0)
let orbitHoverBoost = 1
let releaseCapture = null
let flightCapture = null
let filterStoryInterrupted = false
let scrollStoryLayoutSettled = false
let landingStartedAt = null

function lerp(start, end, amount) {
  return start + (end - start) * amount
}

function positionOnOrbit(angleDeg, radius) {
  const radians = angleDeg * Math.PI / 180
  return {
    x: SVG_CENTER + Math.cos(radians) * radius,
    y: SVG_CENTER + Math.sin(radians) * radius
  }
}

function setSvgPoint(node, point) {
  node.setAttribute('cx', point.x.toFixed(3))
  node.setAttribute('cy', point.y.toFixed(3))
}

function ensureReleaseCapture() {
  if (releaseCapture) return
  releaseCapture = {
    startAngle: orbitAngles.c,
    targetAngle: nearestEquivalentAngle(RELEASE_ANGLE, orbitAngles.c)
  }
}

function clearReleaseCapture() {
  if (!releaseCapture) return
  orbitAngles.c = releaseCapture.startAngle
  releaseCapture = null
}

function getAccentPlanetAngle() {
  if (!releaseCapture) return orbitAngles.c
  return lerp(releaseCapture.startAngle, releaseCapture.targetAngle, currentMotion.focus)
}

function paintOrbitGeometry() {
  if (!orbitStage) return

  if (reducedMotion.matches) {
    orbitStage.style.transform = 'none'
    orbitStage.style.opacity = '1'
    orbitCaption.style.opacity = '1'
    filterIndicator.style.opacity = '1'
    flightOrb.style.opacity = '0'
    flightEchoOne.style.opacity = '0'
    flightEchoTwo.style.opacity = '0'
    return
  }

  const collapse = currentMotion.satelliteCollapse
  const breakup = currentMotion.breakup
  const radiusA = ORBIT_RADII.a * (1 - 0.76 * collapse)
  const radiusB = ORBIT_RADII.b * (1 - 0.72 * collapse)
  const ringARadius = ORBIT_RADII.a * (1 - 0.24 * collapse)
  const ringBRadius = ORBIT_RADII.b * (1 - 0.19 * collapse)

  const planetA = positionOnOrbit(orbitAngles.a + collapse * 128, radiusA)
  const planetB = positionOnOrbit(orbitAngles.b - collapse * 112, radiusB)
  const planetC = positionOnOrbit(getAccentPlanetAngle(), ORBIT_RADII.c)
  setSvgPoint(orbitNodes.planetA, planetA)
  setSvgPoint(orbitNodes.planetB, planetB)
  setSvgPoint(orbitNodes.planetC, planetC)

  orbitNodes.ringA.setAttribute('r', ringARadius.toFixed(3))
  orbitNodes.ringB.setAttribute('r', ringBRadius.toFixed(3))
  orbitNodes.ringA.style.opacity = String(1 - collapse * 0.92)
  orbitNodes.ringB.style.opacity = String(1 - collapse * 0.88)
  orbitNodes.planetA.style.opacity = String(1 - collapse * 0.98)
  orbitNodes.planetB.style.opacity = String(1 - collapse * 0.98)

  orbitNodes.ringCBase.style.opacity = String(Math.max(0, 1 - breakup * 1.08))
  orbitNodes.ringCFragments.style.opacity = String(Math.min(1, breakup * 1.22) * (1 - Math.max(0, breakup - 0.86) / 0.14))
  orbitNodes.ringCFragments.style.strokeDasharray = `${(0.19 - 0.055 * breakup).toFixed(4)} ${(0.018 + 0.092 * breakup).toFixed(4)}`
  orbitNodes.ringCFragments.style.strokeDashoffset = String((-0.18 * breakup).toFixed(4))
  orbitNodes.ringCFragments.style.transform = `rotate(${(breakup * 22).toFixed(2)}deg)`

  const planetCOpacity = currentMotion.flight === 0 ? 1 : Math.max(0, 1 - currentMotion.flight * 7)
  orbitNodes.planetC.style.opacity = String(planetCOpacity)
  orbitNodes.grid.style.opacity = String(currentMotion.gridOpacity)
  orbitNodes.core.style.opacity = String(currentMotion.coreOpacity)
  orbitNodes.coreHalo.style.opacity = String(0.9 * currentMotion.coreOpacity)
  orbitNodes.core.setAttribute('r', (9 + Math.sin(breakup * Math.PI) * 2.2 - collapse * 2.7).toFixed(3))

  orbitStage.style.transform = `translate3d(${currentMotion.systemX}px, ${currentMotion.systemY}px, 0) scale(${currentMotion.systemScale}) rotate(${currentMotion.systemRotate}deg) scaleY(${currentMotion.systemTilt})`
  orbitStage.style.opacity = String(currentMotion.systemOpacity)
  orbitCaption.style.opacity = String(Math.max(0, 1 - currentMotion.focus * 1.35))
}

function getIndicatorGeometry(button) {
  const track = filterIndicator.parentElement
  const listRect = track.getBoundingClientRect()
  const rect = button.getBoundingClientRect()
  const width = Math.max(18, rect.width)
  const height = 1.5
  return {
    width,
    height,
    offsetX: rect.left - listRect.left + (rect.width - width) / 2,
    centerX: rect.left + rect.width / 2,
    centerY: listRect.bottom - 5 - height / 2
  }
}

function captureFlightGeometry() {
  if (flightCapture || !filterIndicator || !allButton) return

  const mobile = mobileMedia.matches
  const releaseState = getOrbitTransitionState(0.38, { mobile })
  const releasePoint = positionOnOrbit(RELEASE_ANGLE, ORBIT_RADII.c)
  const indicatorTrack = filterIndicator.parentElement
  if (!indicatorTrack) return

  const previous = {
    orbitTransform: orbitStage.style.transform,
    orbitOpacity: orbitStage.style.opacity,
    cx: orbitNodes.planetC.getAttribute('cx'),
    cy: orbitNodes.planetC.getAttribute('cy'),
    planetOpacity: orbitNodes.planetC.style.opacity,
    heroTransform: hero.style.transform,
    heroTransition: hero.style.transition,
    controlsTransform: controls.style.transform,
    controlsTransition: controls.style.transition
  }

  // Freeze reveal transitions at their settled geometry while measuring. This makes
  // the destination deterministic even if the user fast-scrolls during page entry.
  hero.style.transition = 'none'
  hero.style.transform = 'none'
  controls.style.transition = 'none'
  controls.style.transform = 'none'

  // Measure a deterministic release pose even if the user scrolls past 38% in one wheel gesture.
  setSvgPoint(orbitNodes.planetC, releasePoint)
  orbitNodes.planetC.style.opacity = '1'
  orbitStage.style.transform = `translate3d(${releaseState.systemX}px, ${releaseState.systemY}px, 0) scale(${releaseState.systemScale}) rotate(${releaseState.systemRotate}deg) scaleY(${releaseState.systemTilt})`
  orbitStage.style.opacity = '1'

  const planetRect = orbitNodes.planetC.getBoundingClientRect()
  const stageRect = orbitStage.getBoundingClientRect()
  const indicatorGeometry = getIndicatorGeometry(allButton)
  const scrollX = window.scrollX
  const scrollY = window.scrollY
  const start = {
    x: planetRect.left + planetRect.width / 2 + scrollX,
    y: planetRect.top + planetRect.height / 2 + scrollY
  }
  const center = {
    x: stageRect.left + stageRect.width / 2 + scrollX,
    y: stageRect.top + stageRect.height / 2 + scrollY
  }
  const target = {
    x: indicatorGeometry.centerX + scrollX,
    y: indicatorGeometry.centerY + scrollY
  }

  orbitStage.style.transform = previous.orbitTransform
  orbitStage.style.opacity = previous.orbitOpacity
  orbitNodes.planetC.setAttribute('cx', previous.cx)
  orbitNodes.planetC.setAttribute('cy', previous.cy)
  orbitNodes.planetC.style.opacity = previous.planetOpacity
  hero.style.transform = previous.heroTransform
  hero.style.transition = previous.heroTransition
  controls.style.transform = previous.controlsTransform
  controls.style.transition = previous.controlsTransition

  const dropHeight = mobile ? 66 : 92
  const dropStart = {
    x: target.x,
    y: target.y - dropHeight
  }

  flightCapture = {
    path: buildTangentFlightPath(start, dropStart, center, RELEASE_ANGLE, { mobile }),
    dropStart,
    target,
    targetWidth: indicatorGeometry.width,
    targetHeight: indicatorGeometry.height
  }
}

function clearFlightCapture() {
  flightCapture = null
}

function documentPointToViewport(point) {
  return {
    x: point.x - window.scrollX,
    y: point.y - window.scrollY
  }
}

function placeFlightDot(node, point, opacity, width = null, height = null) {
  node.style.left = `${point.x}px`
  node.style.top = `${point.y}px`
  node.style.opacity = String(Math.max(0, opacity))
  if (width !== null) node.style.width = `${width}px`
  if (height !== null) node.style.height = `${height}px`
}

function getActiveLandingMotion() {
  const mobile = mobileMedia.matches
  if (currentMotion.progress < 0.66) {
    landingStartedAt = null
    return currentMotion.landing
  }

  if (landingStartedAt === null) landingStartedAt = performance.now()
  const landingProgress = landingProgressFromElapsed(performance.now() - landingStartedAt, { mobile })
  return getLandingMotionState(landingProgress, { mobile })
}

function paintFlight() {
  if (reducedMotion.matches || filterStoryInterrupted || !allButton) {
    flightOrb.style.opacity = '0'
    flightEchoOne.style.opacity = '0'
    flightEchoTwo.style.opacity = '0'
    filterIndicator.style.opacity = '1'
    return
  }

  const flight = currentMotion.flight
  const landing = getActiveLandingMotion()
  const morph = landing.morph

  if (currentMotion.progress <= 0.38) {
    flightOrb.style.opacity = '0'
    flightEchoOne.style.opacity = '0'
    flightEchoTwo.style.opacity = '0'
    filterIndicator.style.opacity = '0'
    return
  }

  captureFlightGeometry()
  if (!flightCapture) return

  let documentPoint
  if (currentMotion.progress < 0.66) {
    documentPoint = sampleTangentFlightPath(flightCapture.path, flight)
  } else if (landing.progress <= 0.78) {
    documentPoint = {
      x: flightCapture.target.x,
      y: lerp(flightCapture.dropStart.y, flightCapture.target.y, landing.fall)
    }
  } else {
    documentPoint = {
      x: flightCapture.target.x,
      y: flightCapture.target.y + landing.yOffset
    }
  }

  const point = documentPointToViewport(documentPoint)
  const roundWidth = 14 * landing.scaleX
  const roundHeight = 14 * landing.scaleY
  const width = lerp(roundWidth, flightCapture.targetWidth, morph)
  const height = lerp(roundHeight, flightCapture.targetHeight, morph)
  const orbOpacity = 1 - Math.max(0, morph - 0.72) / 0.28
  placeFlightDot(flightOrb, point, orbOpacity, width, height)

  if (flight > 0 && flight < 1 && currentMotion.progress < 0.66) {
    const echoOnePoint = documentPointToViewport(sampleTangentFlightPath(flightCapture.path, Math.max(0, flight - 0.035)))
    const echoTwoPoint = documentPointToViewport(sampleTangentFlightPath(flightCapture.path, Math.max(0, flight - 0.07)))
    placeFlightDot(flightEchoOne, echoOnePoint, 0.24)
    placeFlightDot(flightEchoTwo, echoTwoPoint, 0.11)
  } else if (currentMotion.progress >= 0.66 && landing.progress < 0.78) {
    const dropDistance = flightCapture.target.y - flightCapture.dropStart.y
    const echoOnePoint = documentPointToViewport({
      x: flightCapture.target.x,
      y: flightCapture.dropStart.y + dropDistance * Math.max(0, landing.fall - 0.13)
    })
    const echoTwoPoint = documentPointToViewport({
      x: flightCapture.target.x,
      y: flightCapture.dropStart.y + dropDistance * Math.max(0, landing.fall - 0.24)
    })
    placeFlightDot(flightEchoOne, echoOnePoint, 0.18 * Math.min(1, landing.fall * 1.8))
    placeFlightDot(flightEchoTwo, echoTwoPoint, 0.08 * Math.min(1, landing.fall * 1.8))
  } else {
    flightEchoOne.style.opacity = '0'
    flightEchoTwo.style.opacity = '0'
  }

  filterIndicator.style.opacity = String(morph)
}

function paintMotion() {
  paintOrbitGeometry()
  paintFlight()
}

function animateOrbit(frameTime) {
  if (previousFrame === null) previousFrame = frameTime
  const delta = Math.min(Math.max(frameTime - previousFrame, 0), 48) * orbitHoverBoost
  previousFrame = frameTime

  if (!reducedMotion.matches) {
    const next = advanceOrbitAngles(orbitAngles, delta)
    orbitAngles.a = next.a
    orbitAngles.b = next.b
    if (currentMotion.progress <= 0.18) orbitAngles.c = next.c
    paintMotion()
  }

  requestAnimationFrame(animateOrbit)
}

function getScrollProgress() {
  const distance = Math.max(hero.offsetHeight * (mobileMedia.matches ? 0.76 : 0.82), 1)
  return window.scrollY / distance
}

function settleScrollStoryLayout() {
  if (scrollStoryLayoutSettled) return
  scrollStoryLayoutSettled = true

  hero.style.transition = 'none'
  hero.classList.add('is-visible')
  hero.style.opacity = '1'
  hero.style.transform = 'none'

  controls.style.transition = 'none'
  controls.classList.add('is-visible')
  controls.style.opacity = '1'
  controls.style.transform = 'none'

  filterIndicator.style.transition = 'none'
  moveIndicator(allButton)
}

function updateOrbitScroll() {
  if (!hero || !orbitStage) return
  currentMotion = getOrbitTransitionState(getScrollProgress(), { mobile: mobileMedia.matches })

  if (currentMotion.progress > 0.18) settleScrollStoryLayout()
  if (currentMotion.progress > 0.18) ensureReleaseCapture()
  else {
    clearReleaseCapture()
    clearFlightCapture()
    landingStartedAt = null
  }

  paintMotion()
}

let orbitScrollFrame = 0
function scheduleOrbitScroll() {
  if (orbitScrollFrame) return
  orbitScrollFrame = requestAnimationFrame(() => {
    orbitScrollFrame = 0
    updateOrbitScroll()
  })
}

orbitStage.addEventListener('pointerenter', () => { orbitHoverBoost = 1.42 })
orbitStage.addEventListener('pointerleave', () => { orbitHoverBoost = 1 })
window.addEventListener('scroll', scheduleOrbitScroll, { passive: true })

function formatDate(date) {
  const value = new Date(`${date}T00:00:00`)
  const month = value.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  const day = String(value.getDate()).padStart(2, '0')
  return `${month} ${day}\n${value.getFullYear()}`
}

function renderArticles() {
  const filtered = filterArticles(articles, state.query, state.category)
  articleList.replaceChildren()

  filtered.forEach((article, index) => {
    const node = template.content.cloneNode(true)
    const row = node.querySelector('.article-row')
    node.querySelector('.article-date').textContent = formatDate(article.date)
    const title = node.querySelector('.article-title')
    title.textContent = article.title
    title.href = `#${article.id}`
    node.querySelector('.article-summary').textContent = article.summary
    node.querySelector('.read-time').textContent = `${article.readTime} min read`

    const tagList = node.querySelector('.tag-list')
    article.tags.forEach(tag => {
      const span = document.createElement('span')
      span.className = 'tag'
      span.textContent = tag
      tagList.append(span)
    })

    const visual = node.querySelector('.article-visual')
    visual.classList.add(`visual-${article.visual}`)
    row.style.transitionDelay = `${Math.min(index * 38, 160)}ms`
    articleList.append(node)
  })

  const label = filtered.length === articles.length && !state.query && state.category === 'All'
    ? `${articles.length} recent entries`
    : `${filtered.length} result${filtered.length === 1 ? '' : 's'}`
  resultCount.textContent = label
  emptyState.hidden = filtered.length !== 0

  requestAnimationFrame(() => {
    articleList.querySelectorAll('.reveal-item').forEach((item, index) => {
      setTimeout(() => item.classList.add('is-visible'), index * 34)
    })
  })
}

function moveIndicator(button) {
  const geometry = getIndicatorGeometry(button)
  filterIndicator.style.width = `${geometry.width}px`
  filterIndicator.style.transform = `translateX(${geometry.offsetX}px)`
}

function setCategory(category, button, { fromUser = false } = {}) {
  if (fromUser) {
    filterStoryInterrupted = true
    filterIndicator.style.transition = ''
  }
  state.category = category
  filterButtons.forEach(btn => {
    const active = btn === button
    btn.classList.toggle('is-active', active)
    btn.setAttribute('aria-selected', String(active))
  })
  moveIndicator(button)
  if (filterStoryInterrupted) filterIndicator.style.opacity = '1'
  renderArticles()
}

filterButtons.forEach(button => {
  button.addEventListener('click', () => setCategory(button.dataset.category, button, { fromUser: true }))
})

searchInput.addEventListener('input', (event) => {
  state.query = event.target.value
  renderArticles()
})

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    searchInput.focus()
  }
  if (event.key === 'Escape' && document.activeElement === searchInput) {
    searchInput.value = ''
    state.query = ''
    renderArticles()
    searchInput.blur()
  }
})

clearFilters.addEventListener('click', () => {
  searchInput.value = ''
  state.query = ''
  setCategory('All', allButton, { fromUser: true })
})

function getInitialTheme() {
  const stored = localStorage.getItem('glenn-blog-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  localStorage.setItem('glenn-blog-theme', theme)
  themeToggle.setAttribute('aria-label', theme === 'dark' ? '切换到浅色主题' : '切换到深色主题')
}

applyTheme(getInitialTheme())
themeToggle.addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')
})

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible')
      observer.unobserve(entry.target)
    }
  })
}, { threshold: .08 })

document.querySelectorAll('.reveal-block').forEach(node => observer.observe(node))

window.addEventListener('resize', () => {
  clearFlightCapture()
  const active = document.querySelector('.filter-button.is-active')
  if (active) moveIndicator(active)
  updateOrbitScroll()
})

renderArticles()
requestAnimationFrame(() => {
  moveIndicator(document.querySelector('.filter-button.is-active'))
  updateOrbitScroll()
  requestAnimationFrame(animateOrbit)
})
