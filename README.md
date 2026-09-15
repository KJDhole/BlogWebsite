# Glenn Blog

**Study in public.**

Glenn 的个人博客，生产域名为 `https://blog.minglingyun.com`。

## 仓库分工

```text
KJDhole/BlogWebsite   public   网站代码 / UI / CI / GitHub Pages
KJDhole/Blog          private  文章 Markdown 真值源
```

`BlogWebsite` 不再保存文章正文源码。CI 和部署时会读取私有仓库 `KJDhole/Blog`，把 `Blog/posts/` 临时覆盖到：

```text
src/content/posts/
```

然后再执行测试和 Astro 构建。

> `src/content/posts/` 在本仓库中必须保持未跟踪状态，避免文章源码重新泄露到 public repo。

## 技术结构

- Astro 7.3.1：静态站点生成
- Astro Content Collections：文章 Schema 与构建期内容加载
- `@astrojs/sitemap`：Sitemap
- `@astrojs/rss`：RSS
- 原生 JavaScript / CSS / Three.js：首页与双世界动效
- GitHub Actions：测试、构建与 GitHub Pages 部署
- `editor-api/`：私有写作后台后端，运行在独立服务器

生产站点本身仍然是 GitHub Pages 静态站点；服务器只承载写作后台 API，不承载公开博客页面。

## 内容与草稿

- 已发布文章和 GitHub Markdown 草稿：`KJDhole/Blog/posts/`
- 后台尚未提交发布的工作草稿：editor-api 的 SQLite
- 发布时 editor-api 会向 `KJDhole/Blog` 创建 PR
- 私有仓库 `main` 更新后，Content CI 会触发 `BlogWebsite` 的 Pages 部署

## 本地运行

本地开发网站时，需要先把私有文章临时覆盖到 `src/content/posts/`。例如两个仓库位于同一目录：

```bash
rm -rf src/content/posts
mkdir -p src/content/posts
cp -a ../Blog/posts/. src/content/posts/

npm install
npm test
npm run dev
```

`src/content/posts/` 已加入 `.gitignore`，本地文章副本不会被正常 Git 操作提交到 public repo。

## 验证

```bash
npm test
npm run build
npm install --prefix editor-api
npm test --prefix editor-api
```

GitHub CI 会自动 checkout 私有 `KJDhole/Blog` 并覆盖文章，因此 CI 不需要手动复制。

## 发布文章

推荐通过 `/admin/` 写作后台发布：

```text
保存草稿
→ 提交发布
→ KJDhole/Blog 创建 PR
→ Content CI
→ 确认发布 / 合并
→ Blog main 更新
→ 自动触发 BlogWebsite Pages 部署
```

也可以直接在私有仓库创建或修改：

```text
posts/<slug>.md
```

文章模板：

```md
---
title: "文章标题"
description: "文章摘要"
date: 2026-09-04
category: Agent
tags:
  - AI
  - Agent
draft: false
---

Markdown 正文。
```

`draft: true` 不会出现在公开站点。

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

BaseLayout 支持可选 Umami 环境变量：

```text
PUBLIC_UMAMI_WEBSITE_ID=<website-id>
PUBLIC_UMAMI_SCRIPT_URL=https://<your-umami-host>/script.js
```

不配置时不会加载统计脚本。

## 部署

`.github/workflows/deploy.yml` 会：

```text
checkout BlogWebsite
→ checkout private KJDhole/Blog
→ overlay Blog/posts → src/content/posts
→ test
→ build
→ deploy GitHub Pages
```

跨仓库部署由私有 `Blog` 的 Content CI 触发。

`public/CNAME`：

```text
blog.minglingyun.com
```
