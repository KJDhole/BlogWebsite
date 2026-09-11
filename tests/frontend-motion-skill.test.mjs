import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('frontend-motion skill follows the project-local Agent Skill contract', async () => {
  const skill = await read('../.claude/skills/frontend-motion/SKILL.md')
  assert.match(skill, /^---\nname:\s*frontend-motion\n/m)
  assert.match(skill, /description:\s*Use when .*frontend animation.*Three\.js.*post-processing/i)
  assert.match(skill, /official/i)
  assert.match(skill, /references\/threejs-official-patterns\.md/)
  assert.match(skill, /custom shader|custom render pass|custom particle engine/i)
})

test('frontend-motion skill records official Three.js sources before custom infrastructure', async () => {
  const refs = await read('../.claude/skills/frontend-motion/references/threejs-official-patterns.md')
  assert.match(refs, /threejs\.org\/examples\/webgl_postprocessing_transition\.html/)
  assert.match(refs, /threejs\.org\/docs\/pages\/RenderTransitionPass\.html/)
  assert.match(refs, /threejs\.org\/docs\/pages\/UnrealBloomPass\.html/)
  assert.match(refs, /threejs\.org\/manual\/en\/how-to-update-things\.html/)
  assert.match(refs, /RenderTransitionPass/)
  assert.match(refs, /BufferGeometry/)
})
