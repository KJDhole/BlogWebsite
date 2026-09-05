import { readFile, writeFile } from 'node:fs/promises'

const fixturePath = new URL('../tests/fixtures/ai-design-99-workflow.md', import.meta.url)
const outputPath = new URL('../src/content/posts/__qa-ai-design-99.md', import.meta.url)

const source = await readFile(fixturePath, 'utf8')
const converted = source.replace(
  /^\[image\]\((https?:\/\/[^)]+)\)$/gm,
  '![Article figure]($1)'
)

const frontmatter = `---
title: "QA · 如何榨出 AI 设计的 99% 创造力：一套三阶段工作流"
description: "Signal Ledger long-form stress fixture"
date: 2026-09-04
category: "AI"
tags: ["AI", "Design", "Workflow"]
draft: false
---

`

await writeFile(outputPath, frontmatter + converted, 'utf8')
console.log('Prepared temporary stress post: src/content/posts/__qa-ai-design-99.md')
