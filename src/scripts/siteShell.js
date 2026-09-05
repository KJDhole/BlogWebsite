import { filterSearchItems } from '../lib/postIndex.mjs'

const THEME_KEY = 'glenn-blog-theme'

function applyTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light'
  document.documentElement.dataset.theme = next
  try { localStorage.setItem(THEME_KEY, next) } catch {}
  document.querySelectorAll('[data-theme-toggle]').forEach(button => {
    button.setAttribute('aria-label', next === 'dark' ? '切换到浅色主题' : '切换到深色主题')
  })
}

function initTheme() {
  document.querySelectorAll('[data-theme-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')
    })
  })
}

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return ''
  return new Intl.DateTimeFormat('en', {
    year: 'numeric', month: 'short', day: '2-digit', timeZone: 'UTC'
  }).format(date).toUpperCase()
}

function createResult(item, active = false) {
  const li = document.createElement('li')
  li.className = 'signal-search-result'
  li.dataset.searchResult = ''
  if (active) li.dataset.active = 'true'

  const link = document.createElement('a')
  link.href = item.href || `/writing/${item.id}/`

  const meta = document.createElement('span')
  meta.className = 'signal-search-result__meta'
  meta.textContent = [formatDate(item.date), item.category].filter(Boolean).join(' / ')

  const title = document.createElement('strong')
  title.textContent = item.title

  const description = document.createElement('span')
  description.className = 'signal-search-result__description'
  description.textContent = item.description || ''

  link.append(meta, title, description)
  li.append(link)
  return li
}

function initSearch() {
  const dialog = document.querySelector('[data-search-dialog]')
  const input = dialog?.querySelector('[data-search-input]')
  const results = dialog?.querySelector('[data-search-results]')
  const status = dialog?.querySelector('[data-search-status]')
  const indexNode = dialog?.querySelector('[data-search-index]')
  if (!dialog || !input || !results || !indexNode) return

  let items = []
  try { items = JSON.parse(indexNode.textContent || '[]') } catch { items = [] }
  let activeIndex = 0
  let opener = null

  const paint = query => {
    const matches = filterSearchItems(items, query)
    activeIndex = 0
    results.replaceChildren(...matches.map((item, index) => createResult(item, index === activeIndex)))
    if (status) status.textContent = matches.length ? `${matches.length} ${matches.length === 1 ? 'result' : 'results'}` : 'No matching notes.'
  }

  const syncActive = () => {
    const rows = [...results.querySelectorAll('[data-search-result]')]
    if (!rows.length) return
    activeIndex = Math.max(0, Math.min(activeIndex, rows.length - 1))
    rows.forEach((row, index) => {
      if (index === activeIndex) row.dataset.active = 'true'
      else delete row.dataset.active
    })
    rows[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }

  const open = source => {
    opener = source instanceof HTMLElement ? source : document.activeElement
    if (!dialog.open) dialog.showModal()
    input.value = ''
    paint('')
    requestAnimationFrame(() => input.focus())
  }

  const close = () => {
    if (dialog.open) dialog.close()
    if (opener instanceof HTMLElement) opener.focus()
  }

  document.querySelectorAll('[data-search-open]').forEach(button => {
    button.addEventListener('click', () => open(button))
  })
  dialog.querySelectorAll('[data-search-close]').forEach(button => button.addEventListener('click', close))
  dialog.addEventListener('click', event => { if (event.target === dialog) close() })
  dialog.addEventListener('cancel', event => { event.preventDefault(); close() })
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  })
  input.addEventListener('input', () => paint(input.value))
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      activeIndex += event.key === 'ArrowDown' ? 1 : -1
      syncActive()
    }
    if (event.key === 'Enter') {
      const link = results.querySelectorAll('[data-search-result] a')[activeIndex]
      if (link) { event.preventDefault(); link.click() }
    }
  })
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      dialog.open ? close() : open(document.activeElement)
    }
  })
}

initTheme()
initSearch()
