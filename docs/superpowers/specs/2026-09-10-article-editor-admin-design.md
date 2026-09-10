# Article Editor Admin Design

## Status

Approved direction; implementation plan pending user review.

## Goal

给现有 Glenn Blog 增加一个只供本人使用的网页文章后台，同时保持公开博客继续使用 Astro 静态构建、Markdown 内容和 GitHub Pages。

V1 必须支持：

- 登录后台
- 查看已发布文章和草稿
- 新建文章
- 编辑已发布文章
- 保存草稿
- Markdown 编辑 + 实时预览
- 提交发布
- 在网页里完成“修改旧文章后重新发布”

文章最终真值仍然是 `src/content/posts/*.md`，不把正文迁移进数据库。

## Non-goals

V1 不做：

- 多用户 / 注册 / 权限系统
- 富文本 Notion 式块编辑器
- AI 自动改写、润色、生成标题
- 评论管理
- 媒体资源库
- 图片拖拽上传
- 数据库驱动的公开博客
- 重构现有首页和文章页

AI 改写以后可以作为独立能力接入，不进入本轮核心链路。

## Architecture Decision

保留当前公开站：

```text
Astro static site
  -> src/content/posts/*.md
  -> GitHub main
  -> GitHub Actions
  -> GitHub Pages
  -> blog.minglingyun.com
```

新增编辑后台：

```text
/admin (Astro 静态管理界面)
        |
        v
Editor API (Node.js, 私有服务)
   |             |
   |             +-> SQLite: 只保存草稿/会话
   |
   +-> GitHub API: 读取/提交 Markdown、创建 PR、合并 PR
```

原因：GitHub Pages 是静态托管，不能安全保存管理员密码或 GitHub Token。秘密必须只存在服务端。

公开博客不切 SSR，不迁数据库，不改变现有访问链路。

## Admin Surface

### `/admin/login`

- 单用户登录
- 不提供注册入口
- 登录成功进入 `/admin`
- 登录失败只返回通用错误，不暴露账号是否存在

### `/admin`

文章列表显示：

- 标题
- slug
- 分类
- 更新时间
- 状态：Published / Draft / Publish Pending

主要操作：

- 新建文章
- 编辑文章
- 继续草稿
- 查看线上文章

### `/admin/new`

新建文章字段：

- title
- slug
- description
- date
- category
- tags
- cover
- body

`category` 只允许当前 schema：

`AI | Agent | Development | Product | Thinking`

slug 默认由标题生成，但允许手动修改；创建后如果文章已经发布，slug 默认锁定，避免无意改变线上 URL。

### `/admin/edit/:slug`

加载顺序：

1. 优先读取该文章未发布草稿。
2. 没有草稿则读取 GitHub `main` 中的 Markdown。
3. 编辑后保存到 SQLite 草稿，不直接改 GitHub。

布局：

```text
左侧/上方：文章元信息
正文区：Markdown Editor
右侧：实时 Preview
顶部操作：保存草稿 / 提交发布 / 查看线上
```

桌面端编辑与预览左右分栏；移动端切换“编辑 / 预览”。

## Content Contract

后台生成的 Markdown 必须与现有 `src/content.config.ts` 完全兼容。

标准格式：

```yaml
---
title: "..."
description: "..."
date: 2026-09-10
updated: 2026-09-10
category: Thinking
tags:
  - AI
cover: "/images/..."
draft: false
---

正文...
```

规则：

- 新文章首次发布时写入 `date`。
- 已发布文章再次发布时保留原 `date`，更新 `updated`。
- 正式发布写入 `draft: false`。
- 后台草稿不写进 `src/content/posts`，避免 GitHub Pages 意外构建草稿。
- 未知 frontmatter 字段读取后必须保留，避免后台编辑导致已有字段丢失。

## Draft Model

SQLite 只保存工作态，不成为文章真值。

最小字段：

```text
drafts
- id
- slug
- payload_json
- source_sha
- status
- created_at
- updated_at
```

`payload_json` 保存文章字段与正文。

`source_sha` 记录开始编辑时对应的 GitHub 文件 SHA，用于发布前做冲突检查。

状态：

- `draft`
- `publish_pending`

发布成功并合并后，对应草稿删除或标记完成。

## Publishing Flow

为了保持“先 PR，再 main”的博客开发规则，后台不直接写 `main`。

### 第一步：提交发布

点击 `提交发布`：

1. 服务端校验登录状态。
2. 校验 title / description / category / tags / slug / Markdown。
3. 从 GitHub 获取目标文件当前 SHA。
4. 与草稿 `source_sha` 比较；不一致则阻止覆盖并提示“线上版本已变化”。
5. 创建临时分支：`content/editor-<slug>-<timestamp>`。
6. 新建或更新 `src/content/posts/<slug>.md`。
7. 创建 Pull Request 到 `main`。
8. 草稿状态改为 `publish_pending`。
9. 后台显示 PR 链接和 CI 状态。

### 第二步：合并发布

当 PR 检查通过后，后台显示 `合并并发布`。

点击后：

1. 再确认 PR 仍可合并且 HEAD 未变化。
2. 合并 PR 到 `main`。
3. GitHub 现有 Deploy Blog workflow 自动构建 GitHub Pages。
4. 后台显示 `Published`。
5. 清理对应草稿工作态。

这样既能在网页完成发布，也不会绕过 PR。

## Authentication & Security

V1 使用单用户账号，不做用户表。

服务端环境变量保存：

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `SESSION_SECRET`
- `GITHUB_TOKEN`

要求：

- GitHub Token 使用 fine-grained PAT，只授权 `KJDhole/BlogWebsite`。
- 只给 Contents / Pull Requests 所需最小权限。
- Token 永不发送到浏览器。
- 密码只存哈希，不存明文。
- 登录成功使用 HttpOnly + Secure session cookie。
- API 只允许博客后台 Origin。
- 所有写操作校验 Origin / session。
- 登录接口做基础速率限制。
- 日志不得记录密码、cookie、GitHub Token 或完整 Authorization header。

## API Boundary

V1 最小接口：

```text
POST   /auth/login
POST   /auth/logout
GET    /auth/session

GET    /posts
GET    /posts/:slug
POST   /drafts
PUT    /drafts/:slug
DELETE /drafts/:slug

POST   /publish/:slug
GET    /publish/:slug/status
POST   /publish/:slug/merge
```

前端只调用 Editor API，不直接调用带写权限的 GitHub API。

## Repository Shape

建议新增：

```text
src/pages/admin/
  login.astro
  index.astro
  new.astro
  edit/[slug].astro

src/components/admin/
  AdminShell.astro
  ArticleEditor.astro
  ArticleMetaForm.astro
  MarkdownPreview.astro

src/scripts/admin/
  editor.ts
  api.ts

src/styles/
  admin.css

editor-api/
  package.json
  src/
    server.ts
    auth.ts
    db.ts
    github.ts
    markdown.ts
    routes/
  tests/
  Dockerfile
```

Editor API 与公开 Astro build 解耦；GitHub Pages workflow 继续只构建静态站。

## Deployment

公开站部署方式不变。

Editor API 独立部署到已有服务器，通过 Nginx 暴露 HTTPS，例如：

`https://editor-api.minglingyun.com`

后台 `/admin` 仍由当前博客静态站提供。

部署时只需要在服务器环境中配置管理员密码哈希、session secret 和 GitHub fine-grained PAT。

## Failure Handling

必须明确处理：

- 网络断开：草稿保存失败时保留浏览器当前文本并提示，不清空编辑器。
- GitHub API 失败：草稿继续保留，不改变为已发布。
- 文件 SHA 冲突：禁止静默覆盖，要求重新加载线上版本后再处理。
- PR 已关闭/被修改：后台重新读取 PR 状态，不允许盲目合并。
- CI 未通过：不显示可用的“合并并发布”。
- Markdown/frontmatter 校验失败：在提交发布前阻止请求。

## Testing

至少覆盖：

- frontmatter parse / serialize 往返不丢字段
- 新文章 Markdown 生成
- 已发布文章更新 `updated` 且保留 `date`
- slug 校验
- category/schema 校验
- 未登录访问写接口返回 401
- source SHA 冲突阻止发布
- publish 创建 branch + file + PR 的 GitHub client contract
- CI 未通过时禁止 merge
- admin 页面基础 UI contract
- 现有博客 `npm test` 与 `npm run build` 继续通过

## Acceptance Criteria

完成后，我可以只通过浏览器完成下面流程：

```text
登录
-> 新建文章
-> 写 Markdown
-> 实时预览
-> 保存草稿
-> 关闭页面后重新打开继续写
-> 提交发布
-> 查看 PR/CI 状态
-> 合并并发布
-> GitHub Pages 上线
```

以及：

```text
登录
-> 打开一篇已有文章
-> 修改正文或元信息
-> 保存草稿
-> 提交 PR
-> 合并
-> 原 URL 内容更新
```

整个过程中 GitHub Markdown 始终是已发布内容的最终真值，公开博客不依赖 Editor API 才能正常访问。
