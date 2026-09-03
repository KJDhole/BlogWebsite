export function filterArticles(articles, query, category) {
  const needle = query.trim().toLocaleLowerCase()
  return articles.filter((article) => {
    const categoryMatch = category === 'All' || article.category === category
    if (!categoryMatch) return false
    if (!needle) return true

    const haystack = [
      article.title,
      article.summary,
      article.category,
      ...(article.tags ?? [])
    ].join(' ').toLocaleLowerCase()

    return haystack.includes(needle)
  })
}
