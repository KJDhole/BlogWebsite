# Glenn Blog

**Study in public.**

Glenn 的正式个人博客，生产域名为 `https://blog.minglingyun.com`。站点保留原首页 UI、轨道滚动动画、搜索、分类按钮、深浅色主题和移动端适配；内容、SEO、归档、标签、RSS、Sitemap、404 与部署能力由 Astro 提供。

## 当前正式内容

目前只发布一篇文章：

- `Commerce Agent 的 24 条设计法则`
- URL：`/writing/commerce-agent-rules/`

另外 4 篇原 Demo 文章已删除，不会出现在生产站点。

## 技术结构

- Astro 7.3.1：静态站点生成
- Astro Content Collections：文章 Schema 与 Markdown 内容
- `@astrojs/sitemap`：Sitemap
- `@astrojs/rss`：RSS
- 原生 JavaScript / CSS / SVG：首页 UI 与轨道动画
- GitHub Actions：测试、构建与 GitHub Pages 部署

没有 CMS、登录、数据库或服务端运行时。GitHub + Markdown 就是内容后台。

## 本地运行

```bash
npm install
npm run dev
```

## 验证

```bash
npm test
npm run build
```

构建后会生成：

- `/` 首页
- `/writing/<slug>/` 文章页
- `/archive/` 归档
- `/tags/` 标签索引
- `/tags/<tag>/` 标签文章页
- `/rss.xml` RSS
- `/sitemap-index.xml` Sitemap
- `/404.html` 404 页面

## 发布文章

新建：

```text
src/content/posts/<slug>.md
```

模板：

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

Markdown 正文。
```

可选字段：

- `updated`：更新时间
- `cover`：文章封面 URL
- `sourceUrl`：灵感/参考来源
- `sourceLabel`：来源显示名称
- `draft`：`true` 时不公开

提交到 GitHub 后，首页、归档、标签页、RSS、Sitemap 和独立文章路由都会自动更新。

## SEO 与发现

站点自动提供：

- Canonical URL
- Open Graph / Twitter Card 元信息
- BlogPosting / WebSite JSON-LD
- RSS 自动发现
- robots.txt
- Sitemap
- 语义化文章标题、日期、标签和阅读时间

## Umami

BaseLayout 已支持可选 Umami 环境变量：

```text
PUBLIC_UMAMI_WEBSITE_ID=<website-id>
PUBLIC_UMAMI_SCRIPT_URL=https://<your-umami-host>/script.js
```

不配置时不会加载统计脚本。

## 部署

`.github/workflows/deploy.yml` 在 `main` push 后执行：

`test → build → upload Pages artifact → deploy-pages`

`public/CNAME` 已写入：

```text
blog.minglingyun.com
```

首次上线还需要在 GitHub 仓库 Settings → Pages 启用 GitHub Actions，并在 DNS 中把 `blog.minglingyun.com` 指向 GitHub Pages 对应域名。之后文章发布只需要改 Markdown 并 push。
