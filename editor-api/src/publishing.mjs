import { serializeArticleMarkdown, validateArticle } from './article.mjs'

function editorError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function branchTimestamp(date) {
  return date.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
}

function postPath(slug) {
  return `src/content/posts/${slug}.md`
}

export function createPublishingService({ store, github, clock = () => new Date() }) {
  async function submit(slug) {
    const draft = store.getDraft(slug)
    if (!draft) throw editorError('DRAFT_NOT_FOUND', 'Draft not found')
    if (draft.status === 'publish_pending') {
      throw editorError('PUBLISH_ALREADY_PENDING', 'A publish request is already pending')
    }

    const validationErrors = validateArticle(draft)
    if (validationErrors.length) {
      const error = editorError('ARTICLE_INVALID', 'Article is not ready to publish')
      error.details = validationErrors
      throw error
    }

    const path = postPath(slug)
    const current = await github.getContent(path, 'main')

    if (draft.sourceSha) {
      if (!current || current.sha !== draft.sourceSha) {
        throw editorError('SOURCE_CONFLICT', 'The published article changed after this draft was opened')
      }
    } else if (current) {
      throw editorError('SOURCE_CONFLICT', 'An article with this slug already exists')
    }

    const mainHead = await github.getMainHeadSha()
    const now = clock()
    const branch = `content/editor-${slug}-${branchTimestamp(now)}`
    await github.createBranch(branch, mainHead)

    const markdown = serializeArticleMarkdown(draft, {
      mode: current ? 'update' : 'create',
      now
    })
    const written = await github.putContent({
      path,
      branch,
      content: markdown,
      message: current ? `content: update ${slug}` : `content: publish ${slug}`,
      sha: current?.sha
    })
    if (!written.commitSha) throw editorError('GITHUB_WRITE_FAILED', 'GitHub did not return the content commit SHA')

    const pr = await github.createPullRequest({
      title: current ? `content: update ${draft.title}` : `content: publish ${draft.title}`,
      body: `Submitted from Glenn Blog Editor.\n\nArticle: \`${slug}\``,
      head: branch,
      base: 'main'
    })

    store.setPublishPending(slug, {
      prNumber: pr.number,
      branch,
      headSha: written.commitSha
    })

    return {
      prNumber: pr.number,
      prUrl: pr.url,
      branch,
      headSha: written.commitSha
    }
  }

  async function status(slug) {
    const draft = store.getDraft(slug)
    if (!draft) {
      const published = await github.getContent(postPath(slug), 'main')
      return {
        state: published ? 'published' : 'draft',
        prNumber: null,
        prUrl: null,
        checks: []
      }
    }

    if (draft.status !== 'publish_pending') {
      return { state: 'draft', prNumber: null, prUrl: null, checks: [] }
    }

    const pr = await github.getPullRequest(draft.prNumber)
    if (pr.merged) {
      store.deleteDraft(slug)
      return { state: 'published', prNumber: pr.number, prUrl: pr.url, checks: [] }
    }

    if (pr.state !== 'open' || pr.headSha !== draft.headSha) {
      return { state: 'failed', prNumber: pr.number, prUrl: pr.url, checks: [] }
    }

    const checkSummary = await github.getCheckSummary(draft.headSha)
    if (checkSummary.state === 'failure') {
      return { state: 'failed', prNumber: pr.number, prUrl: pr.url, checks: checkSummary.checks }
    }
    if (checkSummary.state !== 'success' || pr.mergeable !== true) {
      return { state: 'pending', prNumber: pr.number, prUrl: pr.url, checks: checkSummary.checks }
    }
    return { state: 'ready', prNumber: pr.number, prUrl: pr.url, checks: checkSummary.checks }
  }

  async function merge(slug) {
    const before = store.getDraft(slug)
    if (!before || before.status !== 'publish_pending') {
      throw editorError('CI_NOT_READY', 'There is no publish request ready to merge')
    }

    const initialPr = await github.getPullRequest(before.prNumber)
    if (initialPr.headSha !== before.headSha) {
      throw editorError('PR_HEAD_CHANGED', 'Pull request HEAD changed after submission')
    }

    const publishStatus = await status(slug)
    if (publishStatus.state !== 'ready') {
      throw editorError('CI_NOT_READY', 'CI checks have not passed or the pull request is not mergeable')
    }

    const draft = store.getDraft(slug)
    const pr = await github.getPullRequest(draft.prNumber)
    if (pr.headSha !== draft.headSha) {
      throw editorError('PR_HEAD_CHANGED', 'Pull request HEAD changed after submission')
    }

    const result = await github.mergePullRequest({
      number: draft.prNumber,
      expectedHeadSha: draft.headSha
    })
    if (!result.merged) throw editorError('MERGE_FAILED', result.message || 'GitHub refused the merge')

    store.deleteDraft(slug)
    return { state: 'published', mergeCommitSha: result.sha }
  }

  return { submit, status, merge }
}
