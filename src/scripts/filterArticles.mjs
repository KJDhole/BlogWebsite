export function filterArticleMetadata(items, { query = '', category = 'All' } = {}) {
  const needle = query.trim().toLocaleLowerCase()

  return items.filter(item => {
    const tags = item.tags ?? []
    const categoryMatch = category === 'All' || item.category === category || tags.includes(category)
    const haystack = [item.title, item.description, ...tags]
      .join(' ')
      .toLocaleLowerCase()

    return categoryMatch && (!needle || haystack.includes(needle))
  })
}
