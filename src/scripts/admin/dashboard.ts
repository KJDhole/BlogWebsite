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

const CATEGORY_LABELS: Record<string, string> = {
  AI: 'AI',
  Agent: 'Agent',
  Development: '开发',
  Product: '产品',
  Thinking: '思考'
}

function statusLabel(status: ArticleSummary['status']) {
  if (status === 'publish_pending') return '发布中'
  if (status === 'draft') return '草稿'
  return '已发布'
}

function categoryLabel(category?: string) {
  if (!category) return '未分类'
  return CATEGORY_LABELS[category] ?? category
}

function renderArticle(article: ArticleSummary) {
  const row = document.createElement('article')
  row.className = 'article-admin-row'

  const main = document.createElement('div')
  const title = document.createElement('a')
  title.className = 'article-admin-title'
  title.href = `/admin/editor/?slug=${encodeURIComponent(article.slug)}`
  title.textContent = article.title || '未命名草稿'
  main.append(title)

  const meta = document.createElement('p')
  meta.className = 'article-admin-meta'
  meta.textContent = [categoryLabel(article.category), article.updated || article.date || '暂无日期'].join(' · ')
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
    if (state) state.textContent = `${articles.length} 篇文章`
  } catch {
    if (state) state.textContent = '文章加载失败'
  }
}

start()
