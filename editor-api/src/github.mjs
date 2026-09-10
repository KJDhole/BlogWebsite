const API_VERSION = '2022-11-28'
const ACCEPT = 'application/vnd.github+json'
const SUCCESS_CONCLUSIONS = new Set(['success', 'skipped', 'neutral'])
const FAILURE_CONCLUSIONS = new Set(['failure', 'cancelled', 'timed_out', 'action_required', 'startup_failure', 'stale'])

function encodePath(path) {
  return path.split('/').map(segment => encodeURIComponent(segment)).join('/')
}

function toBase64(value) {
  return Buffer.from(value, 'utf8').toString('base64')
}

function fromBase64(value) {
  return Buffer.from(String(value).replace(/\n/g, ''), 'base64').toString('utf8')
}

export function createGitHubClient({ token, owner, repo, fetchImpl = fetch }) {
  if (!token || !owner || !repo) throw new TypeError('token, owner, and repo are required')
  const baseUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`

  async function request(path, { method = 'GET', body, allow404 = false } = {}) {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: {
        Accept: ACCEPT,
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': API_VERSION,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    })

    if (allow404 && response.status === 404) return null

    const text = await response.text()
    let payload = null
    if (text) {
      try {
        payload = JSON.parse(text)
      } catch {
        payload = { message: text }
      }
    }

    if (!response.ok) {
      const error = new Error(`GitHub API ${response.status}: ${payload?.message ?? 'request failed'}`)
      error.status = response.status
      error.githubMessage = payload?.message ?? null
      throw error
    }

    return payload
  }

  return {
    async getMainHeadSha() {
      const data = await request('/git/ref/heads/main')
      return data.object.sha
    },

    async listDirectory(path, ref = 'main') {
      return request(`/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`)
    },

    async getContent(path, ref = 'main') {
      const data = await request(`/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`, { allow404: true })
      if (!data) return null
      return { content: fromBase64(data.content), sha: data.sha }
    },

    async createBranch(name, sha) {
      const data = await request('/git/refs', {
        method: 'POST',
        body: { ref: `refs/heads/${name}`, sha }
      })
      return { ref: data.ref, sha: data.object?.sha ?? sha }
    },

    async putContent({ path, branch, content, message, sha }) {
      const data = await request(`/contents/${encodePath(path)}`, {
        method: 'PUT',
        body: {
          message,
          content: toBase64(content),
          branch,
          ...(sha ? { sha } : {})
        }
      })
      return {
        commitSha: data.commit?.sha ?? null,
        contentSha: data.content?.sha ?? null
      }
    },

    async createPullRequest({ title, body, head, base = 'main' }) {
      const data = await request('/pulls', {
        method: 'POST',
        body: { title, body, head, base }
      })
      return {
        number: data.number,
        url: data.html_url,
        headSha: data.head?.sha ?? null,
        state: data.state
      }
    },

    async getPullRequest(number) {
      const data = await request(`/pulls/${number}`)
      return {
        number: data.number,
        url: data.html_url,
        state: data.state,
        mergeable: data.mergeable,
        merged: data.merged === true,
        headSha: data.head?.sha ?? null
      }
    },

    async getCheckSummary(headSha) {
      const data = await request(`/actions/runs?head_sha=${encodeURIComponent(headSha)}&event=pull_request&per_page=100`)
      const checks = (data.workflow_runs ?? []).map(run => ({
        name: run.name,
        status: run.status,
        conclusion: run.conclusion ?? null
      }))

      if (checks.length === 0) return { state: 'pending', checks }
      if (checks.some(check => check.status !== 'completed')) return { state: 'pending', checks }
      if (checks.some(check => FAILURE_CONCLUSIONS.has(check.conclusion))) return { state: 'failure', checks }
      if (checks.every(check => SUCCESS_CONCLUSIONS.has(check.conclusion))) return { state: 'success', checks }
      return { state: 'pending', checks }
    },

    async mergePullRequest({ number, expectedHeadSha }) {
      const data = await request(`/pulls/${number}/merge`, {
        method: 'PUT',
        body: { merge_method: 'squash', sha: expectedHeadSha }
      })
      return {
        merged: data.merged === true,
        sha: data.sha ?? null,
        message: data.message ?? null
      }
    }
  }
}
