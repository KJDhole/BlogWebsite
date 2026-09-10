import { apiFetch, requireAdminSession } from './api'

type ArticleSummary = {
  slug: string
  title: string
  date?: string
  updated?: string | null
  category?: string
  status: 'published' | 'draft' | 'publish_pending'
  prNumber?: number | null
}

const list = document.querySelector<HTMLElement>('[data-article-list]')
const state = document.querySelector<HTMLElement>('[data-dashboard-state]')

function statusLabel(status: ArticleSummary['status']) {
  if (status === 'publish_pending') return 'Publish Pending'
  if (status === 'draft') return 'Draft'
  return 'Published'
}

function renderArticle(article: ArticleSummary) {
  const row = document.createElement('article')
  row.className = 'article-admin-row'

  const main = document.createElement('div')
  const title = document.createElement('a')
  title.className = 'article-admin-title'
  title.href = `/admin/editor/?slug=${encodeURIComponent(article.slug)}`
  title.textContent = article.title || 'Untitled draft'
  main.append(title)

  const meta = document.createElement('p')
  meta.className = 'article-admin-meta'
  meta.textContent = [article.category || 'Uncategorized', article.updated || article.date || 'No date', article.slug].join(' · ')
  main.append(meta)

  const badge = document.createElement('span')
  badge.className = `article-status article-status-${article.status}`
  badge.textContent = statusLabel(article.status)

  row.append(main, badge)
  return row
}

async function start() {
  if (!(await requireAdminSession())) return
  try {
    const articles = await apiFetch<ArticleSummary[]>('/posts')
    list?.replaceChildren(...articles.map(renderArticle))
    if (state) state.textContent = `${articles.length} article${articles.length === 1 ? '' : 's'}`
  } catch (error) {
    if (state) state.textContent = error instanceof Error ? error.message : 'Could not load articles'
  }
}

start()
