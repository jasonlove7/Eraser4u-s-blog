<div align="center">

# Eraser4u's Blog

**系统底层有裂缝，抬头有云。**

一个记录技术探索、生活和一些想法的个人博客。

<br>

### 🌐 [在线访问博客](https://jasonlove7.github.io/Eraser4u-s-blog/)

<code>https://jasonlove7.github.io/Eraser4u-s-blog/</code>

</div>

---

## 写什么

博客分成三个分类：

| 分类 | 内容 |
| --- | --- |
| **技术分享** | 漏洞分析、逆向、内核、系统编程 —— 把调试器里想明白的事写下来 |
| **生活分享** | 读书、走路、拍到的天空，以及一些没什么用但想记住的瞬间 |
| **杂谈** | 不成体系的想法。学习方式、工具取舍、对某个问题的反复琢磨 |

文章也可以归入**系列**，按顺序读下来就是一条完整的路径。

## 技术栈

| | |
| --- | --- |
| [Astro](https://astro.build) | 静态站点框架，默认零客户端 JavaScript |
| TypeScript | 严格模式；文章 frontmatter 由 Zod 校验 |
| Markdown | 文章以纯 Markdown 编写 |
| CSS | 原生 CSS + 自定义属性。无预处理器、无 UI 框架、无 Tailwind |
| GitHub Pages | 推送 `main` 后由 GitHub Actions 自动构建并部署 |

## 已经实现

- **多天气主题** —— 晴天 / 黄昏 / 雨天 / 雪天，页脚可切换，选择会被记住
- **Hero 标语轮播** —— 纯 CSS 实现，零 JavaScript
- **分类与标签** —— 分类横切主题，标签用于交叉索引
- **全文搜索** —— 基于 [Pagefind](https://pagefind.app)，静态索引，不需要任何后端

天空、云、城市天际线、电线杆等全部视觉元素都是用 CSS 与 SVG **手写的**，
没有使用任何第三方素材或背景图。

## 本地运行

需要 Node.js 22.12 以上（开发时使用 24.x）。

```bash
npm install
npm run dev      # 开发服务器
npm run build    # 构建到 dist/
npm run preview  # 预览构建产物
```

其他命令：

| 命令 | 作用 |
| --- | --- |
| `npm run verify` | 类型检查 + 构建 + 链接检查 + 无障碍检查，一条命令跑完 |
| `npm run check` | 仅类型检查 |
| `npm run check:links` | 检查站内链接与 base 路径（需先 build） |
| `npm run check:a11y` | 结构性无障碍检查（需先 build） |
| `npm run build:with-drafts` | 构建一份包含草稿文章的产物，用于预览排版 |

## 目录结构

```
src/
├── config/         站点配置与分类表
├── data/           首页标语、关于、Now、项目等可编辑内容
├── content/blog/   Markdown 文章
├── components/     sky / city / weather / atmosphere / post / ui / seo
├── layouts/        BaseLayout、PostLayout
├── pages/          路由
└── styles/         tokens.css（设计 token 与天气主题）、base、prose
```

想改首页标语、方向清单、分类、天气配色或写新文章，
`CLAUDE.md` 里有一份「改什么该动哪个文件」的对照表。

## 说明

- 站点所有插画均为原创 CSS / SVG，不含任何第三方版权素材。
- 文章内容的著作权归作者所有。
