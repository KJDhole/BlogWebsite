import crypto from 'node:crypto'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { hashSessionToken, verifyAdminPassword } from './auth.mjs'
import { parseArticleMarkdown, validateSlug } from './article.mjs'
import { createPublishingService } from './publishing.mjs'

const SESSION_COOKIE = 'glenn_editor_session'
const SESSION_MS = 7 * 24 * 60 * 60 * 1000

function postPath(slug) {
  return `src/content/posts/${slug}.md`
}

function httpError(statusCode, code, message, details) {
  const error = new Error(message)
  error.statusCode = statusCode
  error.code = code
  if (details) error.details = details
  return error
}

function articleSummary(article) {
  return {
    slug: article.slug,
    title: article.title,
    description: article.description,
    date: article.date,
    updated: article.updated ?? null,
    category: article.category,
    tags: article.tags,
    cover: article.cover ?? null,
    status: article.status ?? (article.sourceSha ? 'published' : 'draft'),
    sourceSha: article.sourceSha ?? null,
    prNumber: article.prNumber ?? null
  }
}

export async function buildApp({ config, store, github, clock = () => new Date() }) {
  const logger = config.nodeEnv === 'test' ? false : {
    level: 'info',
    redact: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers.set-cookie',
      'req.body.password'
    ]
  }
  const app = Fastify({ logger })
  const publishing = createPublishingService({ store, github, clock })

  await app.register(cookie, { secret: config.sessionSecret })
  await app.register(cors, { origin: config.adminOrigin, credentials: true })
  await app.register(rateLimit, { global: false })

  function requireOrigin(request) {
    if (request.headers.origin !== config.adminOrigin) {
      throw httpError(403, 'ORIGIN_FORBIDDEN', 'Request origin is not allowed')
    }
  }

  function rawSessionToken(request) {
    const signedValue = request.cookies[SESSION_COOKIE]
    if (!signedValue) return null
    const unsigned = request.unsignCookie(signedValue)
    return unsigned.valid ? unsigned.value : null
  }

  async function requireSession(request) {
    const rawToken = rawSessionToken(request)
    if (!rawToken) throw httpError(401, 'UNAUTHORIZED', 'Authentication required')

    const tokenHash = hashSessionToken(rawToken)
    const session = store.getSession(tokenHash)
    if (!session) throw httpError(401, 'UNAUTHORIZED', 'Authentication required')

    if (new Date(session.expiresAt).valueOf() <= clock().valueOf()) {
      store.deleteSession(tokenHash)
      throw httpError(401, 'UNAUTHORIZED', 'Authentication required')
    }
    request.editorSessionHash = tokenHash
  }

  async function loadPublished(slug) {
    const source = await github.getContent(postPath(slug), 'main')
    if (!source) return null
    return {
      ...parseArticleMarkdown({ slug, source: source.content, sourceSha: source.sha }),
      status: 'published'
    }
  }

  app.post('/auth/login', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } }
  }, async (request, reply) => {
    requireOrigin(request)
    const { username = '', password = '' } = request.body ?? {}
    const valid = await verifyAdminPassword({ username, password, config })
    if (!valid) return reply.code(401).send({ error: 'Invalid credentials' })

    const rawToken = crypto.randomBytes(32).toString('base64url')
    const expiresAt = new Date(clock().valueOf() + SESSION_MS)
    store.createSession({ tokenHash: hashSessionToken(rawToken), expiresAt })
    reply.setCookie(SESSION_COOKIE, rawToken, {
      path: '/',
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      signed: true,
      maxAge: Math.floor(SESSION_MS / 1000)
    })
    return { authenticated: true }
  })

  app.post('/auth/logout', async (request, reply) => {
    requireOrigin(request)
    const rawToken = rawSessionToken(request)
    if (rawToken) store.deleteSession(hashSessionToken(rawToken))
    reply.clearCookie(SESSION_COOKIE, { path: '/' })
    return { authenticated: false }
  })

  app.get('/auth/session', { preHandler: requireSession }, async () => ({ authenticated: true }))

  app.get('/posts', { preHandler: requireSession }, async () => {
    const entries = await github.listDirectory('src/content/posts', 'main')
    const published = await Promise.all(
      entries
        .filter(entry => entry.type === 'file' && entry.name.endsWith('.md'))
        .map(async entry => loadPublished(entry.name.slice(0, -3)))
    )
    const bySlug = new Map(published.filter(Boolean).map(article => [article.slug, article]))
    for (const draft of store.listDrafts()) bySlug.set(draft.slug, draft)
    return [...bySlug.values()]
      .map(articleSummary)
      .sort((a, b) => String(b.updated ?? b.date ?? '').localeCompare(String(a.updated ?? a.date ?? '')))
  })

  app.get('/posts/:slug', { preHandler: requireSession }, async request => {
    const { slug } = request.params
    const slugErrors = validateSlug(slug)
    if (slugErrors.length) throw httpError(400, 'INVALID_SLUG', slugErrors.join('; '))
    const draft = store.getDraft(slug)
    if (draft) return draft
    const published = await loadPublished(slug)
    if (!published) throw httpError(404, 'POST_NOT_FOUND', 'Article not found')
    return published
  })

  app.post('/drafts', { preHandler: requireSession }, async request => {
    requireOrigin(request)
    const article = request.body?.article ?? request.body
    const slugErrors = validateSlug(article?.slug)
    if (slugErrors.length) throw httpError(400, 'INVALID_SLUG', slugErrors.join('; '))
    if (store.getDraft(article.slug)) throw httpError(409, 'SLUG_EXISTS', 'A draft with this slug already exists')
    if (await github.getContent(postPath(article.slug), 'main')) {
      throw httpError(409, 'SLUG_EXISTS', 'A published article with this slug already exists')
    }
    return store.saveDraft({ article, sourceSha: null })
  })

  app.put('/drafts/:slug', { preHandler: requireSession }, async request => {
    requireOrigin(request)
    const oldSlug = request.params.slug
    const article = request.body?.article ?? request.body
    const oldSlugErrors = validateSlug(oldSlug)
    const newSlugErrors = validateSlug(article?.slug)
    if (oldSlugErrors.length || newSlugErrors.length) {
      throw httpError(400, 'INVALID_SLUG', [...oldSlugErrors, ...newSlugErrors].join('; '))
    }

    let draft = store.getDraft(oldSlug)
    if (draft?.status === 'publish_pending') {
      throw httpError(409, 'PUBLISH_PENDING', 'Cannot edit a draft while its pull request is pending')
    }

    if (!draft) {
      const published = await github.getContent(postPath(oldSlug), 'main')
      if (!published) throw httpError(404, 'POST_NOT_FOUND', 'Article not found')
      if (article.slug !== oldSlug) throw httpError(409, 'SLUG_LOCKED', 'Published article slugs cannot be renamed')
      return store.saveDraft({ article, sourceSha: published.sha })
    }

    if (article.slug !== oldSlug) {
      draft = store.renameDraft(oldSlug, article.slug)
    }
    return store.saveDraft({ article, sourceSha: draft.sourceSha })
  })

  app.delete('/drafts/:slug', { preHandler: requireSession }, async request => {
    requireOrigin(request)
    const draft = store.getDraft(request.params.slug)
    if (!draft) throw httpError(404, 'DRAFT_NOT_FOUND', 'Draft not found')
    if (draft.status === 'publish_pending') {
      throw httpError(409, 'PUBLISH_PENDING', 'Cannot delete a draft while its pull request is pending')
    }
    store.deleteDraft(request.params.slug)
    return { deleted: true }
  })

  app.post('/publish/:slug', { preHandler: requireSession }, async request => {
    requireOrigin(request)
    return publishing.submit(request.params.slug)
  })

  app.get('/publish/:slug/status', { preHandler: requireSession }, async request => {
    return publishing.status(request.params.slug)
  })

  app.post('/publish/:slug/merge', { preHandler: requireSession }, async request => {
    requireOrigin(request)
    return publishing.merge(request.params.slug)
  })

  app.setErrorHandler((error, request, reply) => {
    const knownStatus = {
      DRAFT_NOT_FOUND: 404,
      ARTICLE_INVALID: 400,
      INVALID_SLUG: 400,
      SOURCE_CONFLICT: 409,
      PUBLISH_ALREADY_PENDING: 409,
      CI_NOT_READY: 409,
      PR_HEAD_CHANGED: 409,
      MERGE_FAILED: 409,
      SLUG_LOCKED: 409,
      SLUG_EXISTS: 409,
      PUBLISH_PENDING: 409
    }
    const statusCode = error.statusCode ?? knownStatus[error.code] ?? 500
    if (statusCode >= 500) request.log.error(error)
    reply.code(statusCode).send({
      error: error.message,
      ...(error.code ? { code: error.code } : {}),
      ...(error.details ? { details: error.details } : {})
    })
  })

  await app.ready()
  return app
}
