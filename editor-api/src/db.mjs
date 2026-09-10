import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'
import { validateSlug } from './article.mjs'

function iso(value = new Date()) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function createError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function mapDraft(row) {
  if (!row) return null
  const article = JSON.parse(row.payload_json)
  return {
    ...article,
    sourceSha: row.source_sha ?? null,
    status: row.status,
    prNumber: row.pr_number ?? null,
    branch: row.publish_branch ?? null,
    headSha: row.publish_head_sha ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function createStore({ filename }) {
  if (!filename) throw new TypeError('filename is required')
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true })

  const db = new Database(filename)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS drafts (
      slug TEXT PRIMARY KEY,
      payload_json TEXT NOT NULL,
      source_sha TEXT,
      status TEXT NOT NULL CHECK(status IN ('draft','publish_pending')),
      pr_number INTEGER,
      publish_branch TEXT,
      publish_head_sha TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `)

  const getDraftStmt = db.prepare('SELECT * FROM drafts WHERE slug = ?')
  const listDraftsStmt = db.prepare('SELECT * FROM drafts ORDER BY updated_at DESC')
  const insertDraftStmt = db.prepare(`
    INSERT INTO drafts (
      slug, payload_json, source_sha, status, pr_number, publish_branch,
      publish_head_sha, created_at, updated_at
    ) VALUES (?, ?, ?, 'draft', NULL, NULL, NULL, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      payload_json = excluded.payload_json,
      source_sha = COALESCE(drafts.source_sha, excluded.source_sha),
      status = 'draft',
      pr_number = NULL,
      publish_branch = NULL,
      publish_head_sha = NULL,
      updated_at = excluded.updated_at
  `)
  const deleteDraftStmt = db.prepare('DELETE FROM drafts WHERE slug = ?')
  const markPendingStmt = db.prepare(`
    UPDATE drafts
    SET status = 'publish_pending', pr_number = ?, publish_branch = ?, publish_head_sha = ?, updated_at = ?
    WHERE slug = ?
  `)
  const getSessionStmt = db.prepare('SELECT * FROM sessions WHERE token_hash = ?')
  const insertSessionStmt = db.prepare(`
    INSERT INTO sessions (token_hash, expires_at, created_at)
    VALUES (?, ?, ?)
    ON CONFLICT(token_hash) DO UPDATE SET expires_at = excluded.expires_at
  `)
  const deleteSessionStmt = db.prepare('DELETE FROM sessions WHERE token_hash = ?')
  const deleteExpiredStmt = db.prepare('DELETE FROM sessions WHERE expires_at <= ?')

  const renameDraftTx = db.transaction((oldSlug, newSlug) => {
    const errors = validateSlug(newSlug)
    if (errors.length) throw createError('INVALID_SLUG', errors.join('; '))

    const existing = getDraftStmt.get(oldSlug)
    if (!existing) throw createError('DRAFT_NOT_FOUND', 'Draft not found')
    if (existing.source_sha !== null || existing.status !== 'draft') {
      throw createError('SLUG_LOCKED', 'Published or pending article slugs cannot be renamed')
    }
    if (getDraftStmt.get(newSlug)) throw createError('SLUG_EXISTS', 'A draft with that slug already exists')

    const article = JSON.parse(existing.payload_json)
    article.slug = newSlug
    db.prepare(`
      UPDATE drafts
      SET slug = ?, payload_json = ?, updated_at = ?
      WHERE slug = ?
    `).run(newSlug, JSON.stringify(article), iso(), oldSlug)
    return mapDraft(getDraftStmt.get(newSlug))
  })

  return {
    getDraft(slug) {
      return mapDraft(getDraftStmt.get(slug))
    },
    listDrafts() {
      return listDraftsStmt.all().map(mapDraft)
    },
    saveDraft({ article, sourceSha = null }) {
      const errors = validateSlug(article?.slug)
      if (errors.length) throw createError('INVALID_SLUG', errors.join('; '))
      const now = iso()
      insertDraftStmt.run(article.slug, JSON.stringify(article), sourceSha, now, now)
      return mapDraft(getDraftStmt.get(article.slug))
    },
    renameDraft(oldSlug, newSlug) {
      return renameDraftTx(oldSlug, newSlug)
    },
    setPublishPending(slug, { prNumber, branch, headSha }) {
      const result = markPendingStmt.run(prNumber, branch, headSha, iso(), slug)
      if (result.changes !== 1) throw createError('DRAFT_NOT_FOUND', 'Draft not found')
      return mapDraft(getDraftStmt.get(slug))
    },
    deleteDraft(slug) {
      return deleteDraftStmt.run(slug).changes === 1
    },
    createSession({ tokenHash, expiresAt }) {
      const now = iso()
      insertSessionStmt.run(tokenHash, iso(expiresAt), now)
      return this.getSession(tokenHash)
    },
    getSession(tokenHash) {
      const row = getSessionStmt.get(tokenHash)
      if (!row) return null
      return {
        tokenHash: row.token_hash,
        expiresAt: row.expires_at,
        createdAt: row.created_at
      }
    },
    deleteSession(tokenHash) {
      return deleteSessionStmt.run(tokenHash).changes === 1
    },
    deleteExpiredSessions(now = new Date()) {
      return deleteExpiredStmt.run(iso(now)).changes
    },
    close() {
      db.close()
    }
  }
}
