import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

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

/** 常见分类，作为写作时的参考；不是枚举，随时可以新增 */
export const CATEGORIES = [
  'PWN',
  '二进制',
  'Windows 内核',
  'CTF',
  '系统编程',
  '编程',
  '随笔',
] as const;

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    /** 用于 SEO 与列表摘要，别写成标题的复述 */
    description: z.string(),

    date: z.coerce.date(),
    /** 有实质修改时才填，页面会显示「最后更新」 */
    updated: z.coerce.date().optional(),

    category: z.string(),

    tags: z.array(z.string()).default([]),

    /**
     * 系列名（可选）。
     *
     * 这是「成长记录」定位的核心数据结构：
     * category 是横切（这篇属于哪一类），series 是纵深（这篇在成长线上的第几站）。
     * 比如 `PWN 从零开始` 就是一个系列，读者可以顺着看完整条学习路径。
     */
    series: z.string().optional(),
    /** 系列内序号，用于排序 */
    seriesOrder: z.number().optional(),

    cover: z.string().optional(),

    /**
     * 草稿：不进构建、不进 sitemap、不进 RSS。
     * 示例 / 占位文章一律标 true。
     */
    draft: z.boolean().default(false),

    /** 覆盖该页页头的天气氛围 */
    weather: z.enum(['day', 'dusk']).optional(),

    /** 是否显示右侧目录 */
    toc: z.boolean().default(true),

    /** 是否加载 KaTeX 样式（很重，默认关，用到公式才开） */
    math: z.boolean().default(false),
  }),
});

export const collections = { blog };
