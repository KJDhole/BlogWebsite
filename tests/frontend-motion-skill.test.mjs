import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('frontend motion skill requires official library primitives before custom animation code', async () => {
  const [skill, reference] = await Promise.all([
    read('../.claude/skills/frontend-motion/SKILL.md'),
    read('../.claude/skills/frontend-motion/references/threejs-official-patterns.md')
  ])

  assert.match(skill, /^---[\s\S]*?name:\s*frontend-motion/m)
  assert.match(skill, /Use when/i)
  assert.match(skill, /official/i)
  assert.match(skill, /docs|examples/i)
  assert.match(skill, /do not|don['’]t|禁止|不得/i)
  assert.match(skill, /reimplement|recreate|重复实现|造轮子/i)

  assert.match(reference, /RenderTransitionPass/)
  assert.match(reference, /UnrealBloomPass/)
  assert.match(reference, /threejs\.org\/docs/)
  assert.match(reference, /threejs\.org\/examples/)
})
