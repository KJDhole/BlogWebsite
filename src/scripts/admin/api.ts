import { EDITOR_API_BASE } from '../../config/admin'

export class ApiError extends Error {
  status: number
  code?: string
  details?: string[]

  constructor(message: string, status: number, code?: string, details?: string[]) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json')

  const response = await fetch(`${EDITOR_API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  })

  const text = await response.text()
  let payload: any = null
  if (text) {
    try { payload = JSON.parse(text) } catch { payload = { error: text } }
  }

  if (!response.ok) {
    throw new ApiError(payload?.error ?? `Request failed (${response.status})`, response.status, payload?.code, payload?.details)
  }
  return payload as T
}

export async function requireAdminSession() {
  try {
    await apiFetch('/auth/session')
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      window.location.replace('/admin/login/')
      return false
    }
    throw error
  }
  return true
}
