# Eraser4u's Blog — 项目约定

个人信息安全 / CTF / PWN / 二进制 / Windows 内核安全 技术博客。
视觉语言：**Atmospheric Layering（大气分层）** —— 天空、云、城市、光影、空间纵深。

本文件是这个仓库的**强制约定**。修改前先读这里。

---

## 1. 部署形态（最重要，最容易出错）

本站在 GitHub Pages 的 **Project Site 子路径**下：

```
https://jasonlove7.github.io/Eraser4u-s-blog/
```

`astro.config.mjs` 中：

```js
site: 'https://jasonlove7.github.io'   // 域名，不带子路径
base: '/Eraser4u-s-blog'               // 子路径，以 / 开头，结尾不带 /
```

### base 路径铁律

1. **绝不在代码里硬编码绝对路径**。`/images/a.png` 构建后一定 404。
2. 站内链接与静态资源一律走 `src/utils/url.ts` 的 **`withBase()`**。
3. 需要完整 URL 的地方（canonical / OG / RSS / sitemap）走 **`absoluteUrl()`**。
4. 文章内图片放在内容目录旁并用 `import` 或 `astro:assets`，让 Astro 处理路径。
5. `import.meta.env.BASE_URL` **不带尾斜杠**，直接字符串拼接会得到
   `/Eraser4u-s-blogfavicon.svg` 这种错误路径 —— 所以必须用 `withBase()`。
6. **`npm run dev` 下 base 不生效，`build`/`preview` 下才生效。**
   任何与路径有关的改动，都必须在 `npm run preview` 下验证，不能只看 dev。

---

## 2. 版本锁定

网上绝大多数 Astro 教程是 3.x / 4.x 的，**与本项目不兼容**。写代码前先确认：

| 项 | 本项目使用 | 常见过时写法（禁用） |
|---|---|---|
| Astro | **7.x** | 3.x / 4.x |
| 页面转场 | `<ClientRouter />`（来自 `astro:transitions`） | `<ViewTransitions />` |
| 内容集合 | **Content Layer API**（`src/content.config.ts` + `glob()` loader） | `src/content/config.ts` 的 legacy collections |
| Zod | `import { z } from 'astro/zod'` | `from 'zod'` |
| 资源 | `astro:assets` 的 `<Image />` | 手写 `<img>` 处理本地图 |

**不确定某个 API 时，查 https://docs.astro.build 当前文档，不要凭记忆写。**

---

## 3. 单一数据源：改内容/配置只碰这些文件

**页面组件里不应该出现硬编码的文案、列表或视觉数值。** 全部集中在下面这几处：

| 文件 | 管什么 | 典型改动 |
|---|---|---|
| `src/data/hero.ts` | 首页标语（轮播）、方向清单、停留秒数 | 增删一句话 |
| `src/config/taxonomy.ts` | 文章分类表（slug / 显示名 / 说明） | 加一个分类 |
| `src/data/about.ts` | 「关于」页的博客介绍文案 | 改介绍 |
| `src/data/now.ts` | 「Now」页的近况 | 更新在做什么 |
| `src/data/projects.ts` | 项目列表 | 增删项目 |
| `src/config/site.ts` | 站名、描述、头像、页脚签名、社交链接、主导航 | 换签名/加链接 |
| `src/styles/tokens.css` | 全部设计 token：颜色、间距、字号、圆角、**天气主题** | 调色、加天气 |
| `src/content/blog/*.md` | 博客文章 | 写文章 |

**规则：**

- 新颜色必须先进 `tokens.css` 定义语义 token，再在组件里引用。**禁止组件里出现裸色值**（`#fff`、`rgb(...)`、`oklch(...)` 直接写）。
- 组件样式优先用 `<style>`（Astro 自动 scope），避免全局污染。
- 分类的 `name` 是文章 frontmatter 里写的值；Zod 会校验它必须在 `taxonomy.ts` 里登记过 —— 写错会**构建失败**而不是静默生成空页面。

### 分类为什么用 slug 而不是中文名做 URL

`/categories/tech/` 而不是 `/categories/技术分享/`：
URL 干净可分享，而且**以后想改显示名，已经发出去的链接不会失效**。

---

## 3.1 天气系统（四种主题）

天气由 `<html data-weather="...">` 驱动，值有 `day` / `dusk` / `rain` / `snow`。
所有视觉差异都来自 `tokens.css` 里的 `[data-weather='...']` 块 —— 组件里没有一句
「如果是雨天就……」。**加一种天气不需要动任何组件。**

一处例外是降水本身：`src/components/weather/RainLayer.astro` 与 `SnowLayer.astro`
各自用 `:global([data-weather='rain'])` 把自己显示出来。

### 新增一种天气要改三处

1. `src/config/site.ts` 的 `Weather` 类型加一个值
2. `src/styles/tokens.css` 加一个 `[data-weather='xxx']` 块
   （**必须**定义 5 个天空原语 `--sky-zenith/--sky-mid/--sky-horizon/--cloud-lit/--cloud-shadow`，
   外加 `--ground`、`--luminary`、`--window-opacity`、`--scrim`、`--cloud-density`）
3. `src/components/ui/WeatherSwitcher.astro` 的 `options` 里加一项

### 切换与防闪烁

- 用户在页脚切换 → 写入 `localStorage['eraser4u-weather']`
- **`BaseLayout` 的 `<head>` 里有一小段 `is:inline` 脚本**，在首次绘制前把偏好读回来。
  没有它就会先按默认天气画一帧再跳到用户选的配色。
- `?w=rain` 之类的查询参数可以临时覆盖（不写入 localStorage），用于分享和调试。

### 降水的实现约束

雨和雪各自**只有 3 个 div**，靠周期性渐变 + `mask-image` 平铺，位移距离正好等于
图案周期所以循环无缝。动画只改 `transform`，全程在合成器上。

⚠️ 绝不要改成"逐滴生成元素"的写法 —— 那会塞进几十上百个节点，
而且每帧都要动它们。也不要减小图案周期：周期太小会看出规则的网格。

---

## 3.2 首页标语轮播的实现

纯 CSS，零 JavaScript：所有句子叠在同一个网格单元里（`grid-area: 1/1`），
跑同一个关键帧动画，只是 `animation-delay` 依次错开一个间隔。
句数在构建期已知，所以关键帧里的百分比是**算出来**的（见 `Hero.astro`）。

- 只有一句时不生成动画（轮播一句没有意义，还会平白引入闪烁）
- ⚠️ `prefers-reduced-motion` 下必须写 `animation: none !important`。
  base.css 会把时长压到 0.01ms 并设 `animation-iteration-count: 1`，
  配着 `fill-mode: both` 会让动画**瞬间跑到 opacity: 0 并停住** ——
  所有句子一起消失。这是动效降级最典型的翻车方式。

---

## 4. 视觉纪律

### 必须

- 层次靠**大气透视**：远层混入天空色、降对比、加模糊；前景压暗、不模糊。
- 全站色相家族 **≤ 3**：暖橙（光/黄昏）、冷蓝（天空/阴影）、中性（文字/表面）。
- 天空氛围**只出现在页头**（约 30vh）；正文区必须是安静的中性表面。
- 渐变 stop ≥ 4 个且不等距，明度单调递减，中间经过**去饱和**的过渡色。
- 颗粒（grain）叠层：这是把「数字渐变」变成「摄影」的关键。

### 禁止

- `box-shadow` 做层次（用明度差和模糊差代替）
- 大面积圆角（> 8px）、发光边框、玻璃拟态
- 渐变文字、发光文字
- 纯黑 `#000`、纯蓝紫渐变铺满全屏
- 赛博朋克 / 霓虹 / 粒子海 / 鼠标跟随特效
- 正文区出现背景图、强渐变、视差、动画

---

## 5. 动画与性能

- **只允许动画 `transform` / `opacity` / `filter`**。绝不在滚动回调里读 `offsetHeight`（layout thrashing）。
- 滚动驱动动画必须写在 `@supports (animation-timeline: view())` 里，
  **默认样式 = 最终状态**。写反了会让不支持的浏览器渲染出空白页。
- `prefers-reduced-motion: reduce` 下关闭全部视差 / 雨 / 云漂移，保留静态最终态（WCAG 2.1 SC 2.3.3，硬性要求）。
- 禁止实时 `feTurbulence`（逐帧重算，极贵）。
- 移动端视差降级为单层或静态。
- 视口单位用 `svh` / `dvh`，不用 `vh`。

性能预算：首屏 JS < 20KB、首屏视觉资源 < 150KB、LCP < 2.5s、CLS < 0.05、Lighthouse ≥ 95。

---

## 6. 排版（中文优先）

| 项 | 值 |
|---|---|
| 正文行宽 | 35–42 汉字/行（约 `max-width: 40em`） |
| 行高 | 1.8–2.0 |
| 段落 | 段间距 `1em`，**不首行缩进** |
| 正文对比度 | ≥ 7:1（次要文字/代码 ≥ 4.5:1） |
| 阅读时间 | 按**中文字符数 ÷ 400**，不能按英文单词数 |

字体：正文用系统字体栈（中文 Web 字体体积 5–15MB，全量引入不可接受）。
字体文件属于 Phase 7，**在此之前不要引入任何 Web 字体文件**。

---

## 7. 依赖纪律

**当前依赖就是全部依赖，增加任何一个都要有充分理由。**

明确不使用：

- React / Vue / Svelte / Preact 等 UI 框架
- Tailwind / Bootstrap / 任何 UI 组件库
- GSAP / Framer Motion 等动画库
- SCSS / Less（原生 CSS 嵌套 + 自定义属性 + `@layer` 已足够）

能自己写几十行 CSS/JS 解决的，不引依赖。

---

## 8. 常用命令

```bash
npm run dev               # 开发服务器
npm run build             # 构建到 dist/（自动跑 pagefind 建索引）
npm run preview           # 本地预览构建产物 —— 验证 base 路径必须用它
npm run verify            # ⭐ 类型检查 + 构建 + 链接检查 + 无障碍检查，一条命令
npm run check             # 仅类型检查
npm run check:links       # 仅链接检查（先 build）
npm run check:a11y        # 仅结构性无障碍检查（先 build）
npm run build:with-drafts # 构建一份**带草稿**的产物，用于预览草稿排版

npx astro preview stop    # 关掉当前 preview 进程
```

**改动之后跑 `npm run verify`，不要只跑 build。** 它一次性覆盖了
类型、base 路径、链接完整性、标题层级与表单标签这几类最常见的错误。

---

## 8.1 草稿与搜索的两个坑

### `PUBLIC_SHOW_DRAFTS` 不能用内联环境变量传

```bash
# ❌ 在 Windows 上静默失效（npm 用 cmd.exe 跑 script，不认 POSIX 语法）
PUBLIC_SHOW_DRAFTS=true astro build

# ✅ 用这个
npm run build:with-drafts
```

失效时**没有任何报错**，只是构建结果和不加 flag 时一模一样 —— 很难发现。

### 搜索脚本必须放在 `public/`

`Pagefind` 的 `pagefind.js` 是 **postbuild 之后才生成的**，构建时不存在，
所以只能运行时动态 `import()`。

但 Astro 会把内联 `<script>` 里的动态 import 包进预加载辅助函数，
并把 `__VITE_PRELOAD__` 占位符**原样留在产物里** → 运行时 ReferenceError。
症状很迷惑：控制台报错，但网络面板里那个文件明明是 200。

所以搜索逻辑放在 `public/js/search.js`，用 `is:inline` 引入，绕开打包器。

---

## 9. 本地验证的坑（踩过一次，务必照做）

### 窄屏验证必须用 iframe，不能直接改窗口宽度

**Windows 上 headless Chrome 的窗口最小宽度是 512px。**
用 `--window-size=390,844` 截图时，实际渲染视口仍是 **512px**，
然后**把 512px 的画面裁成 390px**输出。后果是：

- 截图看起来"导航被截断""右侧内容消失" —— 其实是被裁掉了，不是布局问题
- `@media (max-width: 30rem)`（480px）**不会匹配**，因为真实视口是 512px

**症状识别**：截图里内容在右侧被整齐切掉 → 就是这个坑。

**正确做法**：写一个 wrapper 页面，用 `<iframe>` 指定宽度，
iframe 内部的视口才是真实的窄视口。

```html
<!-- wrapper.html -->
<iframe src="http://localhost:PORT/Eraser4u-s-blog/"
        style="width:390px;height:844px;border:0"></iframe>
```

```bash
chrome --headless=new --hide-scrollbars --virtual-time-budget=9000 \
  --window-size=400,860 --screenshot=out.png "file:///path/to/wrapper.html"
```

自检：`document.documentElement.clientWidth` 必须等于你想要的宽度，否则这次验证无效。

### preview 服务器会残留

`npx astro preview` 退出后进程可能仍在监听。再次启动会报
"Another astro preview server is already running" 并**静默失败**，
于是后续截图全部由**旧构建**服务 —— 你会看到"改了代码却没生效"。

对策：启动前后都用 `netstat -ano | grep LISTENING | grep ":44"` 核对，
需要时 `powershell Stop-Process -Id <PID> -Force` 清掉。

---

## 10. 内容约定

文章位于 `src/content/blog/`，frontmatter 由 `src/content.config.ts` 的 Zod schema 校验。

```yaml
---
title: 标题
description: 一句话摘要（用于 SEO 与列表）
date: 2026-09-20
category: 技术分享        # 必须在 src/config/taxonomy.ts 里登记过
tags: [Windows, PE, 二进制]
series: PWN 从零开始      # 可选，系列名
seriesOrder: 1            # 可选，系列内序号
draft: true               # 草稿不进构建、不进 sitemap、不进 RSS
math: false               # 用到公式才设 true（KaTeX 样式按需加载）
---
```

- **正文不要再写一级标题** `# xxx`。标题来自 frontmatter，已经渲染在页面顶部；
  prose.css 有一条兜底规则会隐藏正文里多余的 h1。
- 示例 / 占位文章必须标 `draft: true`，**不得编造真实个人经历**。
- 分类是横切，**`series`（系列）是纵深** —— 系列是「成长记录」定位的核心数据结构。
- 本地看草稿：`npm run dev`，或 `npm run build:with-drafts` 后 `npm run preview`。

---

## 11. Git

- 单人项目，直接在 `main` 上小步提交。
- `feat:` / `fix:` / `style:` / `refactor:` / `content:` / `chore:` / `docs:`
- 阶段完成打 tag：`v0.1-foundation`、`v0.2-design-system` …
- **禁止** `git reset --hard`、`git clean -fd`、`force push`。

---

## 12. 安全边界

**只操作本仓库（`D:\ccswitch\Eraser4u-s-blog`）。**

禁止修改、删除、覆盖仓库目录之外的任何内容 —— 尤其是 `D:\ccswitch\fzu-pixel`。
