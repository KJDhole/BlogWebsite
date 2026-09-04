import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import { SITE } from '../config/site.mjs'

export async function GET(context) {
  const posts = (await getCollection('posts', ({ data }) => data.draft !== true))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items: posts.map(post => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/writing/${post.id}/`,
      categories: [post.data.category, ...post.data.tags]
    })),
    customData: '<language>zh-CN</language>'
  })
}
