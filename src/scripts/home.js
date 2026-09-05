import { filterArticleMetadata } from './filterArticles.mjs'
import { getLandingMotionState, landingProgressFromElapsed } from './orbitMotion.mjs'
import { getScrollStoryState, getStoryScrollDistance, buildEjectionPath, sampleEjectionPath } from './scrollStory.mjs'
import { createSpaceScene } from './spaceScene.mjs'
import { createNavPortal, getIndicatorGeometry, getDropGeometry } from './navPortal.mjs'

const state = { query: '', category: 'All' }
const articleList = document.querySelector('#article-list')
const searchInput = document.querySelector('#article-search')
const filterButtons = [...document.querySelectorAll('.filter-button')]
const filterIndicator = document.querySelector('.filter-indicator')
const resultCount = document.querySelector('#result-count')
const emptyState = document.querySelector('#empty-state')
const clearFilters = document.querySelector('#clear-filters')
const themeToggle = document.querySelector('#theme-toggle')
const hero = document.querySelector('.hero')
const controls = document.querySelector('.controls')
const orbitCaption = document.querySelector('.orbit-caption')
const spaceSceneNode = document.querySelector('[data-space-scene]')
const spaceCanvas = document.querySelector('[data-space-canvas]')
const navPortalNode = document.querySelector('.nav-portal')
const flightOrb = document.querySelector('.flight-orb')
const flightEchoOne = document.querySelector('.flight-echo-one')
const flightEchoTwo = document.querySelector('.flight-echo-two')
const allButton = filterButtons.find(button => button.dataset.category === 'All')
const mobileMedia = window.matchMedia('(max-width: 760px)')
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

let currentStory = getScrollStoryState(0, {
  mobile: mobileMedia.matches,
  reducedMotion: reducedMotion.matches
})
let spaceScene = null
let sceneMobile = mobileMedia.matches
let sceneReduced = reducedMotion.matches
let filterStoryInterrupted = false
let scrollStoryLayoutSettled = false
let landingStartedAt = null
let storyScrollFrame = 0
let currentDropGeometry = null
let currentEjectionPath = null

const navPortal = createNavPortal(navPortalNode, {
  indicator: filterIndicator,
  allButton
})

function lerp(start, end, amount) {
  return start + (end - start) * amount
}

function placeFlightDot(node, point, opacity, width = null, height = null) {
  if (!node || !point) return
  node.style.left = `${point.x}px`
  node.style.top = `${point.y}px`
  node.style.opacity = String(Math.max(0, opacity))
  if (width !== null) node.style.width = `${width}px`
  if (height !== null) node.style.height = `${height}px`
}

function hideFlight() {
  if (flightOrb) flightOrb.style.opacity = '0'
  if (flightEchoOne) flightEchoOne.style.opacity = '0'
  if (flightEchoTwo) flightEchoTwo.style.opacity = '0'
}

function refreshFlightGeometry() {
  const indicatorGeometry = navPortal.measure()
  if (!indicatorGeometry) {
    currentDropGeometry = null
    currentEjectionPath = null
    return
  }

  currentDropGeometry = getDropGeometry(indicatorGeometry, { mobile: mobileMedia.matches })
  currentEjectionPath = buildEjectionPath(currentDropGeometry.portal, currentDropGeometry.dropStart, {
    mobile: mobileMedia.matches
  })
}

function paintEjectionEchoes(path, progress) {
  if (progress <= 0 || progress >= 1) {
    flightEchoOne.style.opacity = '0'
    flightEchoTwo.style.opacity = '0'
    return
  }
  const first = sampleEjectionPath(path, Math.max(0, progress - 0.07))
  const second = sampleEjectionPath(path, Math.max(0, progress - 0.14))
  placeFlightDot(flightEchoOne, first, 0.18)
  placeFlightDot(flightEchoTwo, second, 0.08)
}

function paintLandingEchoes(geometry, landing) {
  if (landing.progress >= 0.78) {
    flightEchoOne.style.opacity = '0'
    flightEchoTwo.style.opacity = '0'
    return
  }
  const dropDistance = geometry.target.y - geometry.dropStart.y
  const first = {
    x: geometry.target.x,
    y: geometry.dropStart.y + dropDistance * Math.max(0, landing.fall - 0.13)
  }
  const second = {
    x: geometry.target.x,
    y: geometry.dropStart.y + dropDistance * Math.max(0, landing.fall - 0.24)
  }
  placeFlightDot(flightEchoOne, first, 0.18 * Math.min(1, landing.fall * 1.8))
  placeFlightDot(flightEchoTwo, second, 0.08 * Math.min(1, landing.fall * 1.8))
}

function paintFlight(frameTime = performance.now()) {
  if (!filterIndicator || !flightOrb || !allButton) return

  if (reducedMotion.matches || filterStoryInterrupted) {
    landingStartedAt = null
    navPortal.setState({ opacity: 0, scale: 0, pulse: 0 })
    hideFlight()
    filterIndicator.style.opacity = '1'
    return
  }

  const geometry = currentDropGeometry
  if (!geometry) {
    hideFlight()
    return
  }

  if (!currentStory.landingReady) {
    landingStartedAt = null
    filterIndicator.style.opacity = '0'

    if (currentStory.ejection.progress <= 0 || !currentEjectionPath) {
      hideFlight()
      return
    }

    const point = sampleEjectionPath(currentEjectionPath, currentStory.ejection.progress)
    placeFlightDot(flightOrb, point, 1, 14, 14)
    paintEjectionEchoes(currentEjectionPath, currentStory.ejection.progress)
    return
  }

  if (landingStartedAt === null) landingStartedAt = frameTime
  const landingProgress = landingProgressFromElapsed(frameTime - landingStartedAt, {
    mobile: mobileMedia.matches
  })
  const landing = getLandingMotionState(landingProgress, { mobile: mobileMedia.matches })

  let point
  if (landing.progress <= 0.78) {
    point = {
      x: geometry.target.x,
      y: lerp(geometry.dropStart.y, geometry.target.y, landing.fall)
    }
  } else {
    point = {
      x: geometry.target.x,
      y: geometry.target.y + landing.yOffset
    }
  }

  const roundWidth = 14 * landing.scaleX
  const roundHeight = 14 * landing.scaleY
  const width = lerp(roundWidth, geometry.targetWidth, landing.morph)
  const height = lerp(roundHeight, geometry.targetHeight, landing.morph)
  const orbOpacity = 1 - Math.max(0, landing.morph - 0.72) / 0.28
  placeFlightDot(flightOrb, point, orbOpacity, width, height)
  paintLandingEchoes(geometry, landing)
  filterIndicator.style.opacity = String(landing.morph)
}

function getScrollProgress() {
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
  const distance = getStoryScrollDistance({
    heroHeight: hero.offsetHeight,
    mobile: mobileMedia.matches,
    maxScroll
  })
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

function updateScrollStory() {
  if (!hero) return
  currentStory = getScrollStoryState(getScrollProgress(), {
    mobile: mobileMedia.matches,
    reducedMotion: reducedMotion.matches
  })

  if (currentStory.progress > 0.18) settleScrollStoryLayout()
  if (!currentStory.landingReady) landingStartedAt = null

  refreshFlightGeometry()
  spaceScene?.setStoryState(currentStory)
  if (filterStoryInterrupted || reducedMotion.matches) {
    navPortal.setState({ opacity: 0, scale: 0, pulse: 0 })
  } else {
    navPortal.setState(currentStory.navPortal)
  }

  if (orbitCaption) {
    orbitCaption.style.opacity = reducedMotion.matches
      ? '1'
      : String(Math.max(0, 1 - currentStory.progress * 3.2))
  }
  paintFlight()
}

function scheduleScrollStory() {
  if (storyScrollFrame) return
  storyScrollFrame = requestAnimationFrame(() => {
    storyScrollFrame = 0
    updateScrollStory()
  })
}

function getInitialTheme() {
  const stored = localStorage.getItem('glenn-blog-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function initializeSpaceScene() {
  spaceScene?.destroy()
  sceneMobile = mobileMedia.matches
  sceneReduced = reducedMotion.matches
  spaceSceneNode?.classList.remove('is-fallback')
  spaceScene = createSpaceScene(spaceCanvas, {
    mobile: sceneMobile,
    reducedMotion: sceneReduced,
    theme: document.documentElement.dataset.theme || getInitialTheme(),
    onUnavailable() {
      spaceSceneNode?.classList.add('is-fallback')
    }
  })
  spaceScene.setStoryState(currentStory)
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  localStorage.setItem('glenn-blog-theme', theme)
  themeToggle.setAttribute('aria-label', theme === 'dark' ? '切换到浅色主题' : '切换到深色主题')
  spaceScene?.setTheme(theme)
}

window.addEventListener('scroll', scheduleScrollStory, { passive: true })

const articleRows = [...articleList.querySelectorAll('.article-row')]
const articleMetadata = articleRows.map(row => ({
  row,
  title: row.dataset.title ?? '',
  description: row.dataset.description ?? '',
  category: row.dataset.category ?? '',
  tags: (row.dataset.tags ?? '').split('|').filter(Boolean)
}))

function renderArticles() {
  const filtered = filterArticleMetadata(articleMetadata, state)
  const visibleRows = new Set(filtered.map(item => item.row))
  let visibleIndex = 0

  articleRows.forEach(row => {
    const visible = visibleRows.has(row)
    row.hidden = !visible
    row.classList.toggle('is-visible', visible)
    if (visible) {
      row.style.transitionDelay = `${Math.min(visibleIndex * 38, 160)}ms`
      visibleIndex += 1
    }
  })

  const label = filtered.length === articleRows.length && !state.query && state.category === 'All'
    ? `${articleRows.length} recent entries`
    : `${filtered.length} result${filtered.length === 1 ? '' : 's'}`
  resultCount.textContent = label
  emptyState.hidden = filtered.length !== 0
}

function moveIndicator(button) {
  if (!button || !filterIndicator?.parentElement) return
  const geometry = getIndicatorGeometry(
    filterIndicator.parentElement.getBoundingClientRect(),
    button.getBoundingClientRect()
  )
  filterIndicator.style.width = `${geometry.width}px`
  filterIndicator.style.transform = `translateX(${geometry.offsetX}px)`
}

function setCategory(category, button, { fromUser = false } = {}) {
  if (fromUser) {
    filterStoryInterrupted = true
    landingStartedAt = null
    navPortal.setState({ opacity: 0, scale: 0, pulse: 0 })
    hideFlight()
    filterIndicator.style.transition = ''
  }

  state.category = category
  filterButtons.forEach(btn => {
    const active = btn === button
    btn.classList.toggle('is-active', active)
    btn.setAttribute('aria-selected', String(active))
  })
  moveIndicator(button)
  if (filterStoryInterrupted || reducedMotion.matches) filterIndicator.style.opacity = '1'
  renderArticles()
}

filterButtons.forEach(button => {
  button.addEventListener('click', () => setCategory(button.dataset.category, button, { fromUser: true }))
})

searchInput.addEventListener('input', event => {
  state.query = event.target.value
  renderArticles()
})

document.addEventListener('keydown', event => {
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

applyTheme(getInitialTheme())
themeToggle.addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')
})

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible')
      observer.unobserve(entry.target)
    }
  })
}, { threshold: .08 })

document.querySelectorAll('.reveal-block').forEach(node => observer.observe(node))

function handleViewportChange() {
  const qualityChanged = sceneMobile !== mobileMedia.matches || sceneReduced !== reducedMotion.matches
  if (qualityChanged) initializeSpaceScene()
  else spaceScene?.resize()

  const active = document.querySelector('.filter-button.is-active')
  if (active) moveIndicator(active)
  updateScrollStory()
}

window.addEventListener('resize', handleViewportChange)
mobileMedia.addEventListener?.('change', handleViewportChange)
reducedMotion.addEventListener?.('change', handleViewportChange)

function animateFlight(frameTime) {
  if (currentStory.ejection.progress > 0 || currentStory.landingReady || reducedMotion.matches || filterStoryInterrupted) {
    paintFlight(frameTime)
  }
  requestAnimationFrame(animateFlight)
}

renderArticles()
requestAnimationFrame(() => {
  moveIndicator(document.querySelector('.filter-button.is-active'))
  initializeSpaceScene()
  updateScrollStory()
  requestAnimationFrame(animateFlight)
})
