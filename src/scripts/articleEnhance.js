const article = document.querySelector('.article-body')
const progress = document.querySelector('.reading-progress span')

const clamp01 = value => Math.max(0, Math.min(1, value))

const updateProgress = () => {
  if (!article || !progress) return
  const rect = article.getBoundingClientRect()
  const articleTop = window.scrollY + rect.top
  const articleBottom = articleTop + article.offsetHeight
  const start = articleTop - window.innerHeight * 0.18
  const end = Math.max(start + 1, articleBottom - window.innerHeight * 0.42)
  const ratio = clamp01((window.scrollY - start) / (end - start))
  progress.style.transform = `scaleX(${ratio})`
}

const copyText = async (button, text) => {
  try {
    await navigator.clipboard.writeText(text)
    const previous = button.textContent
    button.textContent = 'Copied'
    window.setTimeout(() => { button.textContent = previous }, 1200)
  } catch {
    button.textContent = 'Copy failed'
    window.setTimeout(() => { button.textContent = 'Copy' }, 1200)
  }
}

const enhanceCodeBlocks = () => {
  if (!article) return
  article.querySelectorAll('pre').forEach(pre => {
    if (pre.parentElement?.classList.contains('code-block')) return
    const code = pre.querySelector('code')
    if (!code) return
    const languageClass = [...code.classList].find(name => name.startsWith('language-'))
    const language = languageClass ? languageClass.replace('language-', '').toUpperCase() : 'CODE'
    const wrapper = document.createElement('div')
    wrapper.className = 'code-block'
    const head = document.createElement('div')
    head.className = 'code-block-head'
    const label = document.createElement('span')
    label.textContent = language
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'copy-control'
    button.textContent = 'Copy'
    button.addEventListener('click', () => copyText(button, code.textContent ?? ''))
    head.append(label, button)
    pre.before(wrapper)
    wrapper.append(head, pre)
  })
}

const enhancePromptBlocks = () => {
  if (!article) return
  article.querySelectorAll('blockquote').forEach(block => {
    const first = block.querySelector('p')
    if (!first) return
    const marker = '[!PROMPT]'
    if (!first.textContent?.trim().startsWith(marker)) return
    first.innerHTML = first.innerHTML.replace('[!PROMPT]', '').trim()
    block.classList.add('prompt-block')
    const head = document.createElement('div')
    head.className = 'prompt-block-head'
    const label = document.createElement('span')
    label.textContent = 'PROMPT'
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'copy-control'
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

const setupToc = () => {
  if (!article || !('IntersectionObserver' in window)) return
  const headings = [...article.querySelectorAll('h2[id], h3[id]')]
  const links = [...document.querySelectorAll('.article-toc-desktop a, .article-toc-mobile a')]
  if (!headings.length || !links.length) return

  const setCurrent = id => {
    links.forEach(link => {
      const active = link.getAttribute('href') === `#${id}`
      link.classList.toggle('is-current', active)
      if (active) link.setAttribute('aria-current', 'location')
      else link.removeAttribute('aria-current')
    })
  }

  const observer = new IntersectionObserver(entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
    if (visible?.target?.id) setCurrent(visible.target.id)
  }, { rootMargin: '-12% 0px -72% 0px', threshold: [0, 1] })

  headings.forEach(heading => observer.observe(heading))
  setCurrent(headings[0].id)
}

updateProgress()
enhanceCodeBlocks()
enhancePromptBlocks()
enhanceMedia()
setupToc()

window.addEventListener('scroll', updateProgress, { passive: true })
window.addEventListener('resize', updateProgress)
