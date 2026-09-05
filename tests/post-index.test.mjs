import test from 'node:test'
import assert from 'node:assert/strict'
import { filterSearchItems, groupPostsByYearMonth, summarizeTopics } from '../src/lib/postIndex.mjs'

const posts = [
  {
    id: 'commerce-agent-rules',
    title: 'Commerce Agent 的 24 条设计法则',
    description: '从 Agent 架构出发讨论产品设计。',
    date: new Date('2026-09-03T00:00:00Z'),
    category: 'Agent',
    tags: ['AI', 'Architecture']
  },
  {
    id: 'systems-note',
    title: 'Systems Note',
    description: 'A development note.',
    date: new Date('2025-12-01T00:00:00Z'),
    category: 'Development',
    tags: ['Systems']
  }
]

test('search matches title description category and tags', () => {
  assert.equal(filterSearchItems(posts, 'architecture').length, 1)
  assert.equal(filterSearchItems(posts, 'AGENT').length, 1)
  assert.equal(filterSearchItems(posts, 'development').length, 1)
})

test('archive groups descending by year/month', () => {
  const groups = groupPostsByYearMonth(posts)
  assert.deepEqual(groups.map(group => group.year), [2026, 2025])
  assert.equal(groups[0].months[0].month, 9)
})

test('topic summary uses only real tags', () => {
  const topics = summarizeTopics(posts)
  assert.deepEqual(topics.map(topic => topic.name).sort(), ['AI', 'Architecture', 'Systems'])
  assert.equal(topics.find(topic => topic.name === 'AI').count, 1)
})
