export function filterArticleMetadata(items, { query = '', category = 'All' } = {}) {
  const needle = query.trim().toLocaleLowerCase()

  return items.filter(item => {
    const categoryMatch = category === 'All' || item.category === category
    const haystack = [item.title, item.description, ...(item.tags ?? [])]
      .join(' ')
      .toLocaleLowerCase()

    return categoryMatch && (!needle || haystack.includes(needle))
  })
}
