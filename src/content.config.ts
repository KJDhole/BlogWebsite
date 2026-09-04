import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    date: z.coerce.date(),
    category: z.enum(['AI', 'Agent', 'Development', 'Product', 'Thinking']),
    tags: z.array(z.string().min(1)),
    visual: z.string().optional(),
    draft: z.boolean().default(false)
  })
})

export const collections = { posts }
