import matter from 'gray-matter'
import YAML from 'yaml'

export const CATEGORIES = Object.freeze(['AI', 'Agent', 'Development', 'Product', 'Thinking'])

const KNOWN_FRONTMATTER = new Set([
  'title',
  'description',
  'date',
  'updated',
  'category',
  'tags',
  'visual',
  'cover',
  'sourceUrl',
  'sourceLabel',
  'draft'
])

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeDate(value) {
  if (value == null || value === '') return null
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString().slice(0, 10)
  }
  const text = String(value).trim()
  const match = /^\d{4}-\d{2}-\d{2}/.exec(text)
  return match ? match[0] : text
}

function formatDate(value) {
  return value.toISOString().slice(0, 10)
}

function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.valueOf()) && formatDate(parsed) === value
}

function optionalString(value) {
  return isNonEmptyString(value) ? value : null
}

function assertMode(mode) {
  if (mode !== 'create' && mode !== 'update') {
    throw new TypeError(`Unsupported serialization mode: ${mode}`)
  }
}

export function validateSlug(slug) {
  const errors = []
  if (!isNonEmptyString(slug)) {
    return ['slug is required']
  }
  if (slug.length > 120) errors.push('slug must be 120 characters or fewer')
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.push('slug must contain only lowercase letters, numbers, and single hyphens')
  }
  return errors
}

export function validateArticle(article) {
  const errors = [...validateSlug(article?.slug)]

  if (!isNonEmptyString(article?.title)) errors.push('title is required')
  if (!isNonEmptyString(article?.description)) errors.push('description is required')
  if (!CATEGORIES.includes(article?.category)) errors.push('category is invalid')
  if (!Array.isArray(article?.tags) || article.tags.length === 0) {
    errors.push('at least one tag is required')
  } else if (article.tags.some(tag => !isNonEmptyString(tag))) {
    errors.push('tags must be non-empty strings')
  }
  if (!isNonEmptyString(article?.body)) errors.push('body is required')
  if (article?.date && (!isNonEmptyString(article.date) || !isValidDateString(article.date))) {
    errors.push('date must use YYYY-MM-DD and be a real calendar date')
  }

  if (article?.sourceUrl) {
    try {
      new URL(article.sourceUrl)
    } catch {
      errors.push('sourceUrl must be a valid URL')
    }
  }

  return errors
}

export function parseArticleMarkdown({ slug, source, sourceSha }) {
  const parsed = matter(source)
  const data = parsed.data ?? {}
  const extraFrontmatter = {}

  for (const [key, value] of Object.entries(data)) {
    if (!KNOWN_FRONTMATTER.has(key)) extraFrontmatter[key] = value
  }

  return {
    slug,
    title: data.title ?? '',
    description: data.description ?? '',
    date: normalizeDate(data.date) ?? '',
    updated: normalizeDate(data.updated),
    category: data.category ?? '',
    tags: Array.isArray(data.tags) ? data.tags.map(tag => String(tag)) : [],
    visual: optionalString(data.visual),
    cover: optionalString(data.cover),
    sourceUrl: optionalString(data.sourceUrl),
    sourceLabel: optionalString(data.sourceLabel),
    body: parsed.content.replace(/^\n+/, '').replace(/\s+$/, ''),
    extraFrontmatter,
    sourceSha: sourceSha ?? null
  }
}

export function serializeArticleMarkdown(article, { mode, now = new Date() }) {
  assertMode(mode)

  const publishDate = formatDate(now)
  const frontmatter = {
    ...(article.extraFrontmatter ?? {}),
    title: article.title,
    description: article.description,
    date: normalizeDate(article.date) || publishDate,
    category: article.category,
    tags: article.tags,
    draft: false
  }

  if (mode === 'update') frontmatter.updated = publishDate
  if (article.visual) frontmatter.visual = article.visual
  if (article.cover) frontmatter.cover = article.cover
  if (article.sourceUrl) frontmatter.sourceUrl = article.sourceUrl
  if (article.sourceLabel) frontmatter.sourceLabel = article.sourceLabel

  const yaml = YAML.stringify(frontmatter, { lineWidth: 0 }).trimEnd()
  const body = String(article.body ?? '').replace(/^\n+/, '').replace(/\s+$/, '')
  return `---\n${yaml}\n---\n\n${body}\n`
}
