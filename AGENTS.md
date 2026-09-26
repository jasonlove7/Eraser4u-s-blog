# AGENTS.md

**本仓库的完整开发约定见 [`CLAUDE.md`](./CLAUDE.md)。请先读它。**

下面是几条最容易出错、必须立刻知道的规则：

1. **本站部署在子路径下** —— `https://jasonlove7.github.io/Eraser4u-s-blog/`。
   站内绝对路径一律用 `src/utils/url.ts` 的 `withBase()` / `absoluteUrl()`，
   **禁止**手写 `${import.meta.env.BASE_URL}xxx`（base 无尾斜杠，会拼错）。
   路径相关的改动必须在 `npm run preview` 下验证，`dev` 下看不出问题。

2. **Astro 7.x**。禁用过时 API：用 `<ClientRouter />` 而非 `<ViewTransitions />`；
   内容集合用 Content Layer（`src/content.config.ts` + `glob()` loader）；
   Zod 从 `astro/zod` 导入。

3. **视觉值只在两处定义**：`src/config/site.ts`（内容配置）与
   `src/styles/tokens.css`（设计 token）。组件里禁止出现裸色值。

4. **动画只允许 `transform` / `opacity` / `filter`**，且滚动驱动动画必须写在
   `@supports` 里、默认样式即最终态，否则不支持的浏览器会渲染空白页。

5. **不新增依赖**（无 UI 框架、无 Tailwind、无动画库）。当前依赖即全部依赖。

6. **只操作本仓库目录。** 严禁修改仓库之外的任何文件。
