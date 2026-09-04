import test from 'node:test'
import assert from 'node:assert/strict'
import { filterArticleMetadata } from '../src/scripts/filterArticles.mjs'

const items = [
  {
    title: 'Agent Memory',
    description: 'long term memory notes',
    category: 'Agent',
    tags: ['AI', 'Memory']
  },
  {
    title: 'AI Native 开发',
    description: 'delivery intelligence',
    category: 'Development',
    tags: ['AI', 'Tools']
  }
]

test('empty filters keep every generated article row', () => {
  assert.deepEqual(filterArticleMetadata(items, { query: '', category: 'All' }), items)
})

test('query searches title description and tags case-insensitively', () => {
  assert.deepEqual(
    filterArticleMetadata(items, { query: 'MEMORY', category: 'All' }).map(item => item.title),
    ['Agent Memory']
  )
  assert.deepEqual(
    filterArticleMetadata(items, { query: 'tools', category: 'All' }).map(item => item.title),
    ['AI Native 开发']
  )
})

test('visible category buttons can match either category or same-named tag', () => {
  assert.deepEqual(
    filterArticleMetadata(items, { query: '', category: 'AI' }).map(item => item.title),
    ['Agent Memory', 'AI Native 开发']
  )
  assert.deepEqual(
    filterArticleMetadata(items, { query: 'memory', category: 'AI' }).map(item => item.title),
    ['Agent Memory']
  )
  assert.deepEqual(
    filterArticleMetadata(items, { query: 'ai', category: 'Development' }).map(item => item.title),
    ['AI Native 开发']
  )
})
