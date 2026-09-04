import test from 'node:test'
import assert from 'node:assert/strict'
import { estimateReadingTime } from '../src/lib/readingTime.mjs'

test('reading time has a one-minute floor', () => {
  assert.equal(estimateReadingTime('short note'), 1)
})

test('reading time counts 300 CJK characters as one minute', () => {
  assert.equal(estimateReadingTime('中'.repeat(300)), 1)
})

test('reading time counts 300 Latin words as one minute', () => {
  const latin = Array.from({ length: 300 }, () => 'word').join(' ')
  assert.equal(estimateReadingTime(latin), 1)
})

test('reading time combines CJK and Latin units', () => {
  const chinese = '中'.repeat(300)
  const latin = Array.from({ length: 300 }, () => 'word').join(' ')
  assert.equal(estimateReadingTime(`${chinese}${latin}`), 2)
})
