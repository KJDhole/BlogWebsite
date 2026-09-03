import test from 'node:test'
import assert from 'node:assert/strict'
import { filterArticles } from '../filterArticles.mjs'

const sample = [
  { id:'a', title:'Commerce Agent 的 24 条设计法则', summary:'重新理解 Agent 应负责什么', category:'Agent', tags:['AI','Architecture'] },
  { id:'b', title:'AI Native 开发到底改变了什么', summary:'交付智能的速度', category:'Development', tags:['AI','Tools'] }
]

test('returns all articles with empty filters', () => {
  assert.deepEqual(filterArticles(sample, '', 'All').map(x => x.id), ['a','b'])
})

test('query matches title summary and tags case-insensitively', () => {
  assert.deepEqual(filterArticles(sample, 'architecture', 'All').map(x => x.id), ['a'])
  assert.deepEqual(filterArticles(sample, '交付智能', 'All').map(x => x.id), ['b'])
})

test('category filter works and combines with query', () => {
  assert.deepEqual(filterArticles(sample, '', 'Agent').map(x => x.id), ['a'])
  assert.deepEqual(filterArticles(sample, 'AI', 'Development').map(x => x.id), ['b'])
})
