const article = document.querySelector('.article-body')
const progress = document.querySelector('.reading-progress span')

const clamp01 = value => Math.max(0, Math.min(1, value))

const updateProgress = () => {
  if (!article || !progress) return
  const rect = article.getBoundingClientRect()
  const articleTop = window.scrollY + rect.top
  const articleBottom = articleTop + article.offsetHeight
  const start = articleTop - window.innerHeight * 0.16
  const end = Math.max(start + 1, articleBottom - window.innerHeight * 0.4)
  progress.style.transform = `scaleX(${clamp01((window.scrollY - start) / (end - start))})`
}

const copyText = async (button, text) => {
  const previous = button.textContent
  try {
    await navigator.clipboard.writeText(text)
    button.textContent = 'Copied'
    button.setAttribute('aria-label', '已复制')
  } catch {
    button.textContent = 'Copy failed'
  }
  window.setTimeout(() => {
    button.textContent = previous
    button.removeAttribute('aria-label')
  }, 1200)
}

const enhanceCodeBlocks = () => {
  if (!article) return
  article.querySelectorAll('pre').forEach(pre => {
    if (pre.closest('.code-frame')) return
    const code = pre.querySelector('code')
    if (!code) return
    const languageClass = [...code.classList].find(name => name.startsWith('language-'))
    const language = languageClass ? languageClass.replace('language-', '').toUpperCase() : 'CODE'
    const frame = document.createElement('div')
    frame.className = 'code-frame'
    const head = document.createElement('div')
    head.className = 'code-frame__head'
    const label = document.createElement('span')
    label.className = 'code-language'
    label.textContent = language
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'copy-control'
    button.dataset.copyCode = ''
    button.textContent = 'Copy'
    button.addEventListener('click', () => copyText(button, code.textContent ?? ''))
    head.append(label, button)
    pre.before(frame)
    frame.append(head, pre)
  })
}

const enhancePromptBlocks = () => {
  if (!article) return
  article.querySelectorAll('blockquote').forEach(block => {
    const first = block.querySelector('p')
    if (!first) return
    const marker = '[!PROMPT]'
    const raw = first.textContent?.trim() ?? ''
    if (!raw.startsWith(marker)) return
    first.textContent = raw.slice(marker.length).trim()
    block.classList.add('prompt-block')
    const head = document.createElement('div')
    head.className = 'prompt-block__head'
    const label = document.createElement('span')
    label.textContent = 'PROMPT'
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'copy-control'
    button.dataset.copyPrompt = ''
    button.textContent = 'Copy'
    button.addEventListener('click', () => {
      const text = [...block.children]
        .filter(node => node !== head)
        .map(node => node.textContent?.trim() ?? '')
        .filter(Boolean)
        .join('\n\n')
      copyText(button, text)
    })
    head.append(label, button)
    block.prepend(head)
  })
}

const enhanceMedia = () => {
  if (!article) return
  article.querySelectorAll('img').forEach(img => {
    const alt = img.getAttribute('alt') ?? ''
    const parent = img.parentElement
    if (!parent) return
    if (/^wide:/i.test(alt)) {
      parent.classList.add('media-wide')
      img.alt = alt.replace(/^wide:\s*/i, '')
    } else if (/^full:/i.test(alt)) {
      parent.classList.add('media-full')
      img.alt = alt.replace(/^full:\s*/i, '')
    }
    const caption = img.getAttribute('title')
    if (caption && !parent.querySelector('.media-caption')) {
      const note = document.createElement('span')
      note.className = 'media-caption'
      note.textContent = caption
      parent.append(note)
    }
  })
}

const setupSectionsAndToc = () => {
  if (!article) return
  const sections = [...article.querySelectorAll('h2[id]')]
  sections.forEach((heading, index) => {
    heading.dataset.sectionIndex = String(index + 1).padStart(2, '0')
  })

  if (!('IntersectionObserver' in window)) return
  const links = [...document.querySelectorAll('.article-context-rail a[href^="#"], .article-toc-mobile a[href^="#"]')]
  if (!sections.length || !links.length) return

  const setCurrent = id => {
    links.forEach(link => {
      const active = decodeURIComponent(link.hash.slice(1)) === id
      if (active) link.setAttribute('aria-current', 'location')
      else link.removeAttribute('aria-current')
    })
  }

  const observer = new IntersectionObserver(entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
    if (visible?.target?.id) setCurrent(visible.target.id)
  }, { rootMargin: '-18% 0px -68% 0px', threshold: 0 })

  sections.forEach(section => observer.observe(section))
  setCurrent(sections[0].id)
}

enhanceCodeBlocks()
enhancePromptBlocks()
enhanceMedia()
setupSectionsAndToc()
updateProgress()

window.addEventListener('scroll', updateProgress, { passive: true })
window.addEventListener('resize', updateProgress)
