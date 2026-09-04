# Glenn Blog

Glenn 的个人静态博客。首页保留原有极简视觉、轨道滚动动画、搜索、分类筛选、深浅色主题和移动端适配；文章内容由 Markdown 驱动，并在构建时生成真实文章页面。

## 技术结构

- Astro：静态站点构建
- Astro Content Collections：文章 schema 与内容读取
- Markdown：文章唯一内容源
- 原生 JavaScript / CSS / SVG：首页交互与轨道动画
- GitHub：内容版本管理与发布入口

V1 没有 CMS、后台管理界面、登录、数据库、评论系统，也没有额外的 Projects / About 导航页面。

## 本地运行

```bash
npm install
npm run dev
```

Astro 会输出本地开发地址。

## 测试与构建

```bash
npm test
npm run build
```

生产构建输出到 `dist/`，该目录是生成物，不提交到 Git。

## 发布一篇文章

只需要创建一个 Markdown 文件：

```text
src/content/posts/<slug>.md
```

例如：

```md
---
title: "文章标题"
description: "文章摘要"
date: 2026-09-04
category: Agent
tags:
  - AI
  - Agent
visual: paper
draft: false
---

这里开始写 Markdown 正文。
```

然后运行：

```bash
npm test
npm run build
```

提交并 push 后，这篇文章会自动：

1. 出现在首页文章列表中；
2. 参与首页搜索和分类筛选；
3. 生成 `/writing/<slug>/` 文章页。

添加文章不需要修改 `src/pages/index.astro`、`src/scripts/home.js` 或任何文章注册表。

## 文章字段

- `title`：标题
- `description`：摘要
- `date`：发布日期
- `category`：`AI | Agent | Development | Product | Thinking`
- `tags`：标签数组
- `visual`：首页右侧装饰样式，可选
- `draft`：草稿标记；`true` 时不会生成公开文章

## 主要目录

```text
src/
├── content.config.ts
├── content/posts/          # Markdown 文章
├── components/
│   └── ArticleRow.astro
├── layouts/
│   ├── BaseLayout.astro
│   └── ArticleLayout.astro
├── pages/
│   ├── index.astro
│   └── writing/[...slug].astro
├── scripts/
│   ├── home.js
│   ├── filterArticles.mjs
│   └── orbitMotion.mjs
└── styles/
    └── global.css

tests/                      # 内容、筛选、路由、UI 合约和轨道物理回归测试
```

## 当前页面

- `/`：Glenn 首页 / 文章列表
- `/writing/<slug>/`：文章阅读页

GitHub 就是当前的发布后台：编辑 Markdown → 测试/构建 → commit/push。
