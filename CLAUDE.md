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

## 3. 设计系统：单一数据源

视觉相关的值**只允许**定义在两处：

| 文件 | 管什么 |
|---|---|
| `src/config/site.ts` | 站点内容配置：站名、描述、头像、签名、社交链接、导航、主题色 |
| `src/styles/tokens.css` | 设计 token：颜色、间距、字号、圆角、天气主题变量 |

**规则：**

- 新颜色必须先进 `tokens.css` 定义语义 token，再在组件里引用。**禁止组件里出现裸色值**（`#fff`、`rgb(...)`、`oklch(...)` 直接写）。
- 改主题色 / 换天气 / 调间距，只改 `tokens.css`，不动组件。
- 换签名 / 头像 / 社交链接，只改 `site.ts`，不动组件。
- 组件样式优先用 `<style>`（Astro 自动 scope），避免全局污染。

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
npm run dev        # 开发服务器（base 不生效）
npm run build      # 构建到 dist/
npm run preview    # 本地预览构建产物（验证 base 路径必须用它）
npm run check      # Astro + TypeScript 类型检查

npx astro preview stop   # 关闭残留的 preview 进程
```

---

## 9. 内容约定

- 文章位于 `src/content/blog/`，frontmatter 由 `src/content.config.ts` 的 Zod schema 校验。
- 示例 / 占位文章必须标 `draft: true`，**不得编造真实个人经历**。
- 分类是横切，**`series`（系列）是纵深** —— 系列是「成长记录」定位的核心数据结构。

---

## 10. Git

- 单人项目，直接在 `main` 上小步提交。
- `feat:` / `fix:` / `style:` / `refactor:` / `content:` / `chore:` / `docs:`
- 阶段完成打 tag：`v0.1-foundation`、`v0.2-design-system` …
- **禁止** `git reset --hard`、`git clean -fd`、`force push`。

---

## 11. 安全边界

**只操作本仓库（`D:\ccswitch\Eraser4u-s-blog`）。**

禁止修改、删除、覆盖仓库目录之外的任何内容 —— 尤其是 `D:\ccswitch\fzu-pixel`。
