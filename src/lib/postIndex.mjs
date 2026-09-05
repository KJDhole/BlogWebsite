const clean = value => String(value ?? '').trim()

export function normalizeSearchItem(item) {
  const tags = Array.isArray(item.tags) ? item.tags.map(clean).filter(Boolean) : []
  return {
    ...item,
    tags,
    searchable: [item.title, item.description, item.category, ...tags]
      .map(clean)
      .join(' ')
      .toLocaleLowerCase()
  }
}

export function filterSearchItems(items, query) {
  const needle = clean(query).toLocaleLowerCase()
  const normalized = items.map(normalizeSearchItem)
  return needle ? normalized.filter(item => item.searchable.includes(needle)) : normalized
}

export function groupPostsByYearMonth(posts) {
  const years = new Map()
  for (const post of [...posts].sort((a, b) => new Date(b.date) - new Date(a.date))) {
    const date = new Date(post.date)
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth() + 1
    if (!years.has(year)) years.set(year, new Map())
    if (!years.get(year).has(month)) years.get(year).set(month, [])
    years.get(year).get(month).push(post)
  }

  return [...years.entries()].map(([year, months]) => ({
    year,
    months: [...months.entries()].map(([month, monthPosts]) => ({
      month,
      label: String(month).padStart(2, '0'),
      posts: monthPosts
    }))
  }))
}

export function summarizeTopics(posts) {
  const topicMap = new Map()
  for (const post of posts) {
    for (const rawTag of Array.isArray(post.tags) ? post.tags : []) {
      const name = clean(rawTag)
      if (!name) continue
      if (!topicMap.has(name)) topicMap.set(name, [])
      topicMap.get(name).push(post)
    }
  }

  return [...topicMap.entries()]
    .map(([name, topicPosts]) => {
      const sorted = [...topicPosts].sort((a, b) => new Date(b.date) - new Date(a.date))
      return {
        name,
        count: sorted.length,
        latestDate: sorted[0].date,
        posts: sorted
      }
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}
