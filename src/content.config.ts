import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { categoryNames } from './config/taxonomy';

/**
 * 内容集合定义（Astro 7 的 Content Layer API）。
 *
 * ⚠️ 文件路径是 `src/content.config.ts`，不是旧版的 `src/content/config.ts`。
 *    旧写法在 Astro 5 之后已被移除，网上大量教程仍是旧的。
 *
 * 用 Zod 校验 frontmatter 的价值：写错一个字段名、漏一个必填项，
 * **构建直接报错**，而不是线上静默渲染出一个缺东西的页面。
 * 对一个要长期写、且由 Agent 维护的博客来说，这是最重要的一个保障。
 */

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    /** 用于 SEO 与列表摘要，别写成标题的复述 */
    description: z.string(),

    date: z.coerce.date(),
    /** 有实质修改时才填，页面会显示「最后更新」 */
    updated: z.coerce.date().optional(),

    /**
     * 分类，写显示名（如 `技术分享`）。
     *
     * 取值必须在 src/config/taxonomy.ts 的列表里 ——
     * 写错一个字会**直接构建失败**，并提示可用的值。
     * 这是刻意的：静默生成一个空分类页比构建失败更难排查。
     * 要先加新分类，去 taxonomy.ts 加一行即可。
     */
    category: z.enum(categoryNames, {
      message: `category 必须是 src/config/taxonomy.ts 里已登记的分类名之一`,
    }),

    tags: z.array(z.string()).default([]),

    cover: z.string().optional(),

    /**
     * 草稿：不进构建、不进 sitemap、不进 RSS。
     * 示例 / 占位文章一律标 true。
     */
    draft: z.boolean().default(false),

    /** 覆盖该页页头的天气氛围（不填则用站点的默认天气） */
    weather: z.enum(['day', 'dusk', 'rain', 'snow']).optional(),

    /** 是否显示右侧目录 */
    toc: z.boolean().default(true),

    /** 是否加载 KaTeX 样式（很重，默认关，用到公式才开） */
    math: z.boolean().default(false),
  }),
});

export const collections = { blog };
