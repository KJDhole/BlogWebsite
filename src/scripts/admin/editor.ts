import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { ApiError, apiFetch, requireAdminSession } from './api'

type Article = {
  slug: string
  title: string
  description: string
  date: string
  updated?: string | null
  category: string
  tags: string[]
  visual?: string | null
  cover?: string | null
  sourceUrl?: string | null
  sourceLabel?: string | null
  body: string
  extraFrontmatter?: Record<string, unknown>
  sourceSha?: string | null
  status?: 'published' | 'draft' | 'publish_pending'
}

type PublishStatus = {
  state: 'draft' | 'pending' | 'failed' | 'ready' | 'published'
  prNumber?: number | null
  prUrl?: string | null
  checks?: Array<{ name: string; status: string; conclusion: string | null }>
}

const root = document.querySelector<HTMLElement>('[data-article-editor]')
if (!root) throw new Error('Article editor root is missing')

const input = <T extends HTMLElement>(name: string) => root.querySelector<T>(`[name="${name}"]`)!
const titleInput = input<HTMLInputElement>('title')
const slugInput = input<HTMLInputElement>('slug')
const descriptionInput = input<HTMLTextAreaElement>('description')
const dateInput = input<HTMLInputElement>('date')
const categoryInput = input<HTMLSelectElement>('category')
const tagsInput = input<HTMLInputElement>('tags')
const coverInput = input<HTMLInputElement>('cover')
const bodyInput = input<HTMLTextAreaElement>('body')
const preview = root.querySelector<HTMLElement>('[data-markdown-preview]')!
const previewPane = root.querySelector<HTMLElement>('[data-preview-pane]')!
const inputPane = root.querySelector<HTMLElement>('.editor-pane-input')!
const saveButton = root.querySelector<HTMLButtonElement>('[data-save-draft]')!
const submitButton = root.querySelector<HTMLButtonElement>('[data-submit-publish]')!
const mergeButton = root.querySelector<HTMLButtonElement>('[data-merge-publish]')!
const previewButton = root.querySelector<HTMLButtonElement>('[data-preview-toggle]')!
const saveState = root.querySelector<HTMLElement>('[data-save-state]')!
const publishState = root.querySelector<HTMLElement>('[data-publish-state]')!
const errorBox = root.querySelector<HTMLElement>('[data-editor-error]')!
const publicLink = root.querySelector<HTMLAnchorElement>('[data-public-link]')!
const wordCount = root.querySelector<HTMLElement>('[data-word-count]')!

let articleExtra: Record<string, unknown> = {}
let articleVisual: string | null = null
let articleSourceUrl: string | null = null
let articleSourceLabel: string | null = null
let sourceSha: string | null = null
let currentSlug: string | null = null
let isNew = root.dataset.mode === 'new'
let slugTouched = !isNew
let pollTimer: number | null = null
const fallbackSlug = `post-${Date.now().toString(36)}`

function today() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function slugify(value: string) {
  const slug = value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120)
  return slug || fallbackSlug
}

function collectArticle(): Article {
  return {
    slug: slugInput.value.trim(),
    title: titleInput.value,
    description: descriptionInput.value,
    date: dateInput.value,
    category: categoryInput.value,
    tags: tagsInput.value.split(',').map(tag => tag.trim()).filter(Boolean),
    visual: articleVisual,
    cover: coverInput.value.trim() || null,
    sourceUrl: articleSourceUrl,
    sourceLabel: articleSourceLabel,
    body: bodyInput.value,
    extraFrontmatter: articleExtra,
    sourceSha
  }
}

function renderPreview() {
  const markdown = bodyInput.value
  const html = marked.parse(markdown) as string
  preview.innerHTML = DOMPurify.sanitize(html)
  const words = markdown.trim() ? markdown.trim().split(/\s+/).length : 0
  wordCount.textContent = `${words} word${words === 1 ? '' : 's'}`
}

function showError(error: unknown) {
  let message = error instanceof Error ? error.message : 'Something went wrong'
  if (error instanceof ApiError && error.details?.length) message = error.details.join(' · ')
  errorBox.textContent = message
  errorBox.classList.remove('is-hidden')
}

function clearError() {
  errorBox.classList.add('is-hidden')
  errorBox.textContent = ''
}

function fillArticle(article: Article) {
  currentSlug = article.slug
  titleInput.value = article.title ?? ''
  slugInput.value = article.slug ?? ''
  descriptionInput.value = article.description ?? ''
  dateInput.value = article.date ?? ''
  categoryInput.value = article.category ?? ''
  tagsInput.value = (article.tags ?? []).join(', ')
  coverInput.value = article.cover ?? ''
  bodyInput.value = article.body ?? ''
  articleExtra = article.extraFrontmatter ?? {}
  articleVisual = article.visual ?? null
  articleSourceUrl = article.sourceUrl ?? null
  articleSourceLabel = article.sourceLabel ?? null
  sourceSha = article.sourceSha ?? null
  slugInput.disabled = Boolean(sourceSha)
  saveState.textContent = article.status === 'publish_pending' ? 'Publish pending' : sourceSha ? 'Published source loaded' : 'Draft loaded'
  publicLink.href = `/writing/${encodeURIComponent(article.slug)}/`
  publicLink.classList.toggle('is-hidden', !sourceSha)
  renderPreview()
  if (article.status === 'publish_pending') setPendingMode(true)
}

function setPendingMode(pending: boolean) {
  saveButton.disabled = pending
  submitButton.disabled = pending
  for (const control of root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select')) {
    control.disabled = pending || (control === slugInput && Boolean(sourceSha))
  }
  if (pending) startPolling()
  else stopPolling()
}

async function saveDraft() {
  clearError()
  const article = collectArticle()
  if (!article.slug) {
    showError(new Error('Slug is required before saving'))
    return null
  }
  saveButton.disabled = true
  saveState.textContent = 'Saving…'
  try {
    let saved: Article
    if (isNew && !currentSlug) {
      saved = await apiFetch<Article>('/drafts', { method: 'POST', body: JSON.stringify({ article }) })
      isNew = false
    } else {
      const oldSlug = currentSlug ?? article.slug
      saved = await apiFetch<Article>(`/drafts/${encodeURIComponent(oldSlug)}`, { method: 'PUT', body: JSON.stringify({ article }) })
    }
    currentSlug = saved.slug
    sourceSha = saved.sourceSha ?? null
    slugInput.value = saved.slug
    slugInput.disabled = Boolean(sourceSha)
    history.replaceState(null, '', `/admin/editor/?slug=${encodeURIComponent(saved.slug)}`)
    saveState.textContent = 'Draft saved'
    return saved
  } catch (error) {
    saveState.textContent = 'Save failed'
    showError(error)
    return null
  } finally {
    saveButton.disabled = false
  }
}

function setPublishMessage(message: string, prUrl?: string | null) {
  publishState.replaceChildren(document.createTextNode(message))
  if (prUrl) {
    const link = document.createElement('a')
    link.href = prUrl
    link.target = '_blank'
    link.rel = 'noreferrer'
    link.textContent = 'Open PR'
    link.className = 'editor-pr-link'
    publishState.append(' ', link)
  }
  publishState.classList.remove('is-hidden')
}

async function submitPublish() {
  const saved = await saveDraft()
  if (!saved || !currentSlug) return
  submitButton.disabled = true
  clearError()
  try {
    const result = await apiFetch<{ prNumber: number; prUrl: string }>(`/publish/${encodeURIComponent(currentSlug)}`, { method: 'POST' })
    setPublishMessage(`PR #${result.prNumber} created. Waiting for CI…`, result.prUrl)
    setPendingMode(true)
  } catch (error) {
    submitButton.disabled = false
    showError(error)
  }
}

function applyPublishStatus(status: PublishStatus) {
  publishState.classList.remove('is-hidden')
  mergeButton.classList.add('is-hidden')
  mergeButton.disabled = true
  if (status.state === 'ready') {
    setPublishMessage(`PR #${status.prNumber} passed CI and is ready to merge.`, status.prUrl)
    mergeButton.classList.remove('is-hidden')
    mergeButton.disabled = false
  } else if (status.state === 'failed') {
    setPublishMessage(`PR #${status.prNumber} needs attention before publishing.`, status.prUrl)
    setPendingMode(true)
    stopPolling()
  } else if (status.state === 'published') {
    sourceSha = 'published'
    setPendingMode(false)
    setPublishMessage('Published.')
    if (currentSlug) {
      publicLink.href = `/writing/${encodeURIComponent(currentSlug)}/`
      publicLink.classList.remove('is-hidden')
    }
  } else {
    setPublishMessage(`PR #${status.prNumber ?? ''} is waiting for CI…`, status.prUrl)
  }
}

async function checkPublishStatus() {
  if (!currentSlug || document.visibilityState !== 'visible') return
  try {
    const status = await apiFetch<PublishStatus>(`/publish/${encodeURIComponent(currentSlug)}/status`)
    applyPublishStatus(status)
  } catch (error) {
    showError(error)
  }
}

function startPolling() {
  if (pollTimer !== null) return
  checkPublishStatus()
  pollTimer = window.setInterval(checkPublishStatus, 10_000)
}

function stopPolling() {
  if (pollTimer !== null) window.clearInterval(pollTimer)
  pollTimer = null
}

async function mergePublish() {
  if (!currentSlug) return
  mergeButton.disabled = true
  clearError()
  try {
    await apiFetch(`/publish/${encodeURIComponent(currentSlug)}/merge`, { method: 'POST' })
    sourceSha = 'published'
    setPendingMode(false)
    applyPublishStatus({ state: 'published' })
  } catch (error) {
    showError(error)
    mergeButton.disabled = false
  }
}

async function boot() {
  if (!(await requireAdminSession())) return
  dateInput.value ||= today()

  if (!isNew) {
    const slug = new URLSearchParams(window.location.search).get('slug')
    if (!slug) {
      showError(new Error('Missing article slug'))
      return
    }
    try {
      const article = await apiFetch<Article>(`/posts/${encodeURIComponent(slug)}`)
      fillArticle(article)
    } catch (error) {
      showError(error)
    }
  } else {
    renderPreview()
  }
}

titleInput.addEventListener('input', () => {
  if (!slugTouched && isNew) slugInput.value = slugify(titleInput.value)
})
slugInput.addEventListener('input', () => { slugTouched = true })
bodyInput.addEventListener('input', renderPreview)
previewButton.addEventListener('click', () => {
  const showingPreview = previewPane.classList.toggle('is-mobile-visible')
  inputPane.classList.toggle('is-mobile-hidden', showingPreview)
  previewButton.textContent = showingPreview ? 'Editor' : 'Preview'
})
saveButton.addEventListener('click', saveDraft)
submitButton.addEventListener('click', submitPublish)
mergeButton.addEventListener('click', mergePublish)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && pollTimer !== null) checkPublishStatus()
})
window.addEventListener('beforeunload', stopPolling)

boot()
