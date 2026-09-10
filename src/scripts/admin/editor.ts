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
const categoryInput = input<HTMLInputElement>('category')
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
const categoryOptions = [...root.querySelectorAll<HTMLButtonElement>('[data-category-option]')]
const tagOptions = root.querySelector<HTMLElement>('[data-tag-options]')!
const newTagToggle = root.querySelector<HTMLButtonElement>('[data-new-tag-toggle]')!
const tagCreate = root.querySelector<HTMLElement>('[data-tag-create]')!
const newTagInput = root.querySelector<HTMLInputElement>('[data-new-tag]')!
const addTagButton = root.querySelector<HTMLButtonElement>('[data-add-tag]')!

let articleExtra: Record<string, unknown> = {}
let articleVisual: string | null = null
let articleSourceUrl: string | null = null
let articleSourceLabel: string | null = null
let sourceSha: string | null = null
let currentSlug: string | null = null
let isNew = root.dataset.mode === 'new'
let slugTouched = !isNew
let pollTimer: number | null = null
let selectedTags = new Set<string>()
const fallbackSlug = `post-${Date.now().toString(36)}`

const friendlyErrors: Record<string, string> = {
  INVALID_SLUG: '文章链接格式不正确',
  SLUG_EXISTS: '这个文章链接已经存在',
  PUBLISH_PENDING: '文章正在发布，暂时不能修改',
  CI_NOT_READY: '发布检查还没完成',
  SOURCE_CONFLICT: '线上文章已经变化，请刷新后再编辑',
  PR_HEAD_CHANGED: '发布内容已经变化，请重新提交',
  MERGE_FAILED: '发布失败，请稍后重试'
}

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

function syncCategoryButtons() {
  for (const button of categoryOptions) {
    const selected = button.dataset.categoryOption === categoryInput.value
    button.classList.toggle('is-selected', selected)
    button.setAttribute('aria-pressed', String(selected))
  }
}

function setCategory(value: string) {
  categoryInput.value = value
  syncCategoryButtons()
}

function ensureTagOption(tag: string) {
  const buttons = [...tagOptions.querySelectorAll<HTMLButtonElement>('[data-tag-option]')]
  let button = buttons.find(item => item.dataset.tagOption === tag)
  if (!button) {
    button = document.createElement('button')
    button.type = 'button'
    button.className = 'choice-chip choice-chip-custom'
    button.dataset.tagOption = tag
    button.setAttribute('aria-pressed', 'false')
    button.textContent = tag
    tagOptions.append(button)
  }
  return button
}

function syncTagInput() {
  tagsInput.value = [...selectedTags].join(', ')
  for (const button of tagOptions.querySelectorAll<HTMLButtonElement>('[data-tag-option]')) {
    const selected = selectedTags.has(button.dataset.tagOption ?? '')
    button.classList.toggle('is-selected', selected)
    button.setAttribute('aria-pressed', String(selected))
  }
}

function setTags(tags: string[]) {
  selectedTags = new Set(tags.map(tag => tag.trim()).filter(Boolean))
  selectedTags.forEach(ensureTagOption)
  syncTagInput()
}

function addCustomTag() {
  const tag = newTagInput.value.trim()
  if (!tag) return
  ensureTagOption(tag)
  selectedTags.add(tag)
  syncTagInput()
  newTagInput.value = ''
  tagCreate.classList.add('is-hidden')
  newTagToggle.textContent = '＋ 新建标签'
}

function collectArticle(): Article {
  return {
    slug: slugInput.value.trim(),
    title: titleInput.value,
    description: descriptionInput.value,
    date: dateInput.value,
    category: categoryInput.value,
    tags: [...selectedTags],
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
  const chars = Array.from(markdown.replace(/\s/g, '')).length
  wordCount.textContent = `${chars} 字`
}

function showError(error: unknown) {
  let message = '操作失败，请稍后重试'
  if (error instanceof ApiError && error.code && friendlyErrors[error.code]) {
    message = friendlyErrors[error.code]
  } else if (error instanceof ApiError && error.details?.length) {
    message = error.details.join(' · ')
  } else if (error instanceof Error) {
    message = error.message
  }
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
  setCategory(article.category ?? '')
  setTags(article.tags ?? [])
  coverInput.value = article.cover ?? ''
  bodyInput.value = article.body ?? ''
  articleExtra = article.extraFrontmatter ?? {}
  articleVisual = article.visual ?? null
  articleSourceUrl = article.sourceUrl ?? null
  articleSourceLabel = article.sourceLabel ?? null
  sourceSha = article.sourceSha ?? null
  slugInput.disabled = Boolean(sourceSha)
  saveState.textContent = article.status === 'publish_pending' ? '发布中' : sourceSha ? '已加载线上版本' : '已加载草稿'
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
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-category-option], [data-tag-option], [data-new-tag-toggle], [data-add-tag]')) {
    button.disabled = pending
  }
  if (pending) startPolling()
  else stopPolling()
}

async function saveDraft() {
  clearError()
  const article = collectArticle()
  if (!article.slug) {
    showError(new Error('请先填写文章标题'))
    return null
  }
  saveButton.disabled = true
  saveState.textContent = '正在保存…'
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
    saveState.textContent = '已保存'
    return saved
  } catch (error) {
    saveState.textContent = '保存失败'
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
    link.textContent = '查看发布详情'
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
    setPublishMessage('已提交发布，正在自动检查…', result.prUrl)
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
    setPublishMessage('检查通过，可以发布。', status.prUrl)
    mergeButton.classList.remove('is-hidden')
    mergeButton.disabled = false
  } else if (status.state === 'failed') {
    setPublishMessage('发布检查未通过，请查看详情。', status.prUrl)
    setPendingMode(true)
    stopPolling()
  } else if (status.state === 'published') {
    sourceSha = 'published'
    setPendingMode(false)
    setPublishMessage('已发布。')
    saveState.textContent = '已发布'
    if (currentSlug) {
      publicLink.href = `/writing/${encodeURIComponent(currentSlug)}/`
      publicLink.classList.remove('is-hidden')
    }
  } else {
    setPublishMessage('正在检查发布状态…', status.prUrl)
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
      showError(new Error('没有找到这篇文章'))
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

for (const button of categoryOptions) {
  button.addEventListener('click', () => setCategory(button.dataset.categoryOption ?? ''))
}

tagOptions.addEventListener('click', event => {
  const target = event.target
  if (!(target instanceof Element)) return
  const button = target.closest<HTMLButtonElement>('[data-tag-option]')
  const tag = button?.dataset.tagOption
  if (!tag) return
  if (selectedTags.has(tag)) selectedTags.delete(tag)
  else selectedTags.add(tag)
  syncTagInput()
})

newTagToggle.addEventListener('click', () => {
  const willOpen = tagCreate.classList.contains('is-hidden')
  tagCreate.classList.toggle('is-hidden', !willOpen)
  newTagToggle.textContent = willOpen ? '收起' : '＋ 新建标签'
  if (willOpen) newTagInput.focus()
})

addTagButton.addEventListener('click', addCustomTag)
newTagInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault()
    addCustomTag()
  }
})

previewButton.addEventListener('click', () => {
  const showingPreview = previewPane.classList.toggle('is-preview-visible')
  inputPane.classList.toggle('is-editor-hidden', showingPreview)
  previewButton.textContent = showingPreview ? '继续编辑' : '预览'
})
saveButton.addEventListener('click', saveDraft)
submitButton.addEventListener('click', submitPublish)
mergeButton.addEventListener('click', mergePublish)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && pollTimer !== null) checkPublishStatus()
})
window.addEventListener('beforeunload', stopPolling)

boot()
