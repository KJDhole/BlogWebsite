import { filterArticleMetadata } from './filterArticles.mjs'
import { getCosmicPath, getCosmicPathD, sampleCosmicPath } from './cosmicPath.mjs'
import { getScrollStoryState, getStoryScrollDistance } from './scrollStory.mjs'
import { createSceneViewport } from './sceneViewport.mjs'
import { createSpaceScene } from './spaceScene.mjs'

const state = { query: '', category: 'All' }
const articleList = document.querySelector('#article-list')
const searchInput = document.querySelector('#article-search')
const filterButtons = [...document.querySelectorAll('.filter-button')]
const filterIndicator = document.querySelector('.filter-indicator')
const resultCount = document.querySelector('#result-count')
const emptyState = document.querySelector('#empty-state')
const clearFilters = document.querySelector('#clear-filters')
const hero = document.querySelector('.hero')
const controls = document.querySelector('.controls')
const orbitCaption = document.querySelector('.orbit-caption')
const spaceSceneNode = document.querySelector('[data-space-scene]')
const spaceCanvas = document.querySelector('[data-space-canvas]')
const cosmicPathNode = document.querySelector('[data-cosmic-path]')
const cosmicPathGlowNode = document.querySelector('[data-cosmic-path-glow]')
const cosmicTrailNode = document.querySelector('[data-cosmic-trail]')
const cosmicTravelerNode = document.querySelector('[data-cosmic-traveler]')
const allButton = filterButtons.find(button => button.dataset.category === 'All')
const mobileMedia = window.matchMedia('(max-width: 760px)')
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

let currentStory = getScrollStoryState(0, {
  mobile: mobileMedia.matches,
  reducedMotion: reducedMotion.matches
})
let currentCosmicPath = null
let spaceScene = null
let sceneViewport = null
let sceneMobile = mobileMedia.matches
let sceneReduced = reducedMotion.matches
let scrollStoryLayoutSettled = false
let storyScrollFrame = 0

function clamp01(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
}

function refreshCosmicGeometry() {
  currentCosmicPath = getCosmicPath({
    width: 1000,
    height: 1000,
    mobile: mobileMedia.matches
  })
  const d = getCosmicPathD(currentCosmicPath)
  cosmicPathNode?.setAttribute('d', d)
  cosmicPathGlowNode?.setAttribute('d', d)
  cosmicTrailNode?.setAttribute('d', d)
}

function paintCosmicForeground() {
  if (!currentCosmicPath || !cosmicTravelerNode) return

  const point = sampleCosmicPath(currentCosmicPath, currentStory.pathProgress)
  const scale = currentStory.traveler.scale ?? 1
  cosmicTravelerNode.setAttribute('transform', `translate(${point.x} ${point.y}) scale(${scale})`)
  cosmicTravelerNode.style.opacity = currentStory.traveler.visible
    ? String(currentStory.traveler.opacity)
    : '0'

  const charge = clamp01(currentStory.charge)
  const trail = clamp01(currentStory.trail)
  const trailLength = Math.max(0.001, Math.min(0.31, trail * 0.27))

  if (cosmicPathNode) cosmicPathNode.style.opacity = String(0.10 + charge * 0.12)
  if (cosmicPathGlowNode) cosmicPathGlowNode.style.opacity = String(0.02 + charge * 0.18)
  if (cosmicTrailNode) {
    cosmicTrailNode.style.opacity = String(trail)
    cosmicTrailNode.style.strokeDasharray = `${trailLength} ${1 - trailLength}`
    cosmicTrailNode.style.strokeDashoffset = String(1 - currentStory.pathProgress + trailLength * 0.45)
  }

  if (spaceSceneNode) {
    spaceSceneNode.style.setProperty('--cosmic-charge', String(charge))
    spaceSceneNode.style.setProperty('--cosmic-energy', String(currentStory.field.energy ?? 0))
    spaceSceneNode.style.setProperty('--cosmic-trail', String(trail))
    spaceSceneNode.dataset.pathProgress = String(currentStory.pathProgress)
    spaceSceneNode.dataset.cosmicPhase = currentStory.phase
  }
}

function getScrollProgress() {
  if (!hero) return 0
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

  if (hero) {
    hero.style.transition = 'none'
    hero.classList.add('is-visible')
    hero.style.opacity = '1'
    hero.style.transform = 'none'
  }

  if (controls) {
    controls.style.transition = 'none'
    controls.classList.add('is-visible')
    controls.style.opacity = '1'
    controls.style.transform = 'none'
  }
}

function updateScrollStory() {
  currentStory = getScrollStoryState(getScrollProgress(), {
    mobile: mobileMedia.matches,
    reducedMotion: reducedMotion.matches
  })

  if (currentStory.progress > 0.12) settleScrollStoryLayout()
  spaceScene?.setStoryState(currentStory)
  paintCosmicForeground()

  if (orbitCaption) {
    orbitCaption.style.opacity = reducedMotion.matches
      ? '1'
      : String(Math.max(0.18, 1 - currentStory.progress * 1.55))
  }
}

function scheduleScrollStory() {
  if (storyScrollFrame) return
  storyScrollFrame = requestAnimationFrame(() => {
    storyScrollFrame = 0
    updateScrollStory()
  })
}

function createViewportController() {
  sceneViewport?.destroy()
  sceneViewport = createSceneViewport(spaceSceneNode, {
    reducedMotion: sceneReduced,
    getAnchor(world) {
      return document.querySelector(`[data-scene-anchor="${world}"]`)?.getBoundingClientRect()
    }
  })
  sceneViewport.setWorld(document.documentElement.dataset.world || 'solar')
}

function initializeSpaceScene() {
  spaceScene?.destroy()
  sceneMobile = mobileMedia.matches
  sceneReduced = reducedMotion.matches
  spaceSceneNode?.classList.remove('is-fallback')
  createViewportController()
  spaceScene = createSpaceScene(spaceCanvas, {
    mobile: sceneMobile,
    reducedMotion: sceneReduced,
    theme: document.documentElement.dataset.theme || 'light',
    onUnavailable() {
      spaceSceneNode?.classList.add('is-fallback')
    }
  })
  spaceScene.setStoryState(currentStory)
  spaceScene.resize()
}

window.addEventListener('glenn:worldchange', event => {
  const { world, theme } = event.detail ?? {}
  sceneViewport?.setWorld?.(world)
  spaceScene?.setWorld?.(world)
  spaceScene?.setTheme?.(theme)
})

window.addEventListener('glenn:worldtransition', event => {
  sceneViewport?.setTransition?.(event.detail)
  spaceScene?.resize?.()
  spaceScene?.setWorldTransition?.(event.detail)
})

window.addEventListener('scroll', scheduleScrollStory, { passive: true })

const articleRows = articleList ? [...articleList.querySelectorAll('.article-row')] : []
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

  if (resultCount) {
    resultCount.textContent = filtered.length === articleRows.length && !state.query && state.category === 'All'
      ? `${articleRows.length} recent entries`
      : `${filtered.length} result${filtered.length === 1 ? '' : 's'}`
  }
  if (emptyState) emptyState.hidden = filtered.length !== 0
}

function moveIndicator(button) {
  if (!button || !filterIndicator?.parentElement) return
  const parentRect = filterIndicator.parentElement.getBoundingClientRect()
  const buttonRect = button.getBoundingClientRect()
  filterIndicator.style.width = `${buttonRect.width}px`
  filterIndicator.style.transform = `translateX(${buttonRect.left - parentRect.left}px)`
  filterIndicator.style.opacity = '1'
}

function setCategory(category, button) {
  state.category = category
  filterButtons.forEach(btn => {
    const active = btn === button
    btn.classList.toggle('is-active', active)
    btn.setAttribute('aria-selected', String(active))
  })
  moveIndicator(button)
  renderArticles()
}

filterButtons.forEach(button => {
  button.addEventListener('click', () => setCategory(button.dataset.category, button))
})

searchInput?.addEventListener('input', event => {
  state.query = event.target.value
  renderArticles()
})

document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && searchInput) {
    event.preventDefault()
    searchInput.focus()
  }

  if (event.key === 'Escape' && document.activeElement === searchInput && searchInput) {
    searchInput.value = ''
    state.query = ''
    renderArticles()
    searchInput.blur()
  }
})

clearFilters?.addEventListener('click', () => {
  if (searchInput) searchInput.value = ''
  state.query = ''
  setCategory('All', allButton)
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
  else {
    sceneViewport?.refresh()
    spaceScene?.resize()
  }

  refreshCosmicGeometry()
  const active = document.querySelector('.filter-button.is-active')
  if (active) moveIndicator(active)
  updateScrollStory()
}

window.addEventListener('resize', handleViewportChange)
mobileMedia.addEventListener?.('change', handleViewportChange)
reducedMotion.addEventListener?.('change', handleViewportChange)

renderArticles()
requestAnimationFrame(() => {
  moveIndicator(document.querySelector('.filter-button.is-active'))
  refreshCosmicGeometry()
  initializeSpaceScene()
  updateScrollStory()
})
