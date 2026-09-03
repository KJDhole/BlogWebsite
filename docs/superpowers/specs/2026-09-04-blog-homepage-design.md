# BlogWebsite 首页设计规格

日期：2026-09-04

## 目标
实现一个以文章为核心的个人博客首页。视觉参考 Peter Steinberger、Swyx、Paco Coursey、Emil Kowalski、Rauno Freiberg 一类极简、内容优先的个人站；交互采用轻量、克制的 spring / reveal / hover 动效。

不做传统博客的大导航、卡片墙、标签云和复杂侧栏。首页本身承担个人介绍、搜索、分类筛选和文章列表。

## 信息架构
1. 顶部品牌标识 GLENN 与明暗模式切换。
2. Hero：姓名、简短介绍、社交入口，以及右侧轨道视觉。
3. 搜索框：即时过滤文章。
4. 分类筛选：All / AI / Agent / Development / Product / Thinking。
5. 文章列表：日期、标题、摘要、阅读时间、标签、可选缩略图。
6. 简洁页脚。

不设置 Writing / Notes / Projects / About 顶部导航。

## 视觉语言
- 大面积留白，暖白背景与近黑文字。
- 标题使用高对比衬线字体，正文与 UI 使用干净无衬线字体。
- 主强调色仅使用暖橙色。
- 极细分割线、低对比度标签、弱边框。
- 文章列表以排版层级而非大卡片制造结构。

## 动效
- Hero 轨道：2–3 条轨道以不同速度缓慢旋转，18–40 秒一圈；外圈橙色点与灰色点独立运动；hover 轻微加速；reduced-motion 下停止。
- 分类切换：激活下划线 spring 位移；筛选结果淡入并轻微上移。
- 文章 hover：标题右移 4px；缩略图缩放约 1.03。
- 页面进入：短时 stagger reveal；避免大幅视差。
- 主题切换：颜色平滑过渡，图标轻微旋转。

## 技术架构
- React + Vite + TypeScript。
- Motion / Framer Motion 负责 spring、列表进入和 hover 动效。
- CSS variables 管理主题与排版。
- Lucide React 图标。
- 文章数据暂用本地 TypeScript，后续替换 Markdown/MDX。
- Remotion 不用于页面实时交互；未来用于动态文章封面或视频资产。

## 响应式
桌面 Hero 两列；文章为日期 / 内容 / 缩略图布局。移动端 Hero 单列，分类横向滚动，文章缩略图弱化或下沉。

## 验收标准
1. npm run build 成功。
2. 搜索 + 分类组合可用。
3. 明暗模式可切换。
4. 轨道默认持续缓慢运动，reduced-motion 下停止。
5. 桌面和移动端无横向溢出。
6. 无 Writing / Notes / Projects / About 顶部导航。
7. 动效克制，不靠大卡片阴影制造“高级感”。
