/**
 * 分类体系。
 *
 * ⭐ 想增加 / 修改分类，**只改这个文件**：
 *    加一行 `{ slug: 'xxx', name: '显示名', description: '…' }` 即可。
 *    详情页、列表页、导航、URL 全部自动跟着变。
 *
 * 为什么用 slug 而不是把中文名直接放进 URL：
 *   · URL 更干净、可读、可分享（/categories/tech/ 而不是一串百分号编码）
 *   · 显示名以后想改就改，**已经发出去的链接不会失效**
 *
 * 文章 frontmatter 里写的是**显示名**（`category: 技术分享`），
 * 因为写作时那才是自然的写法。Zod 会校验它必须在下面的列表里 ——
 * 写错一个字会直接构建失败，而不是静默生成一个空分类页。
 */

export interface Category {
  /** URL 段。一旦发布就不要再改，否则旧链接会 404。 */
  slug: string;
  /** 显示名。文章 frontmatter 的 `category` 写这个值。 */
  name: string;
  /** 分类页上的一句话说明 */
  description: string;
}

export const categories: Category[] = [
  {
    slug: 'tech',
    name: '技术分享',
    description: '漏洞分析、逆向、内核、系统编程 —— 把调试器里想明白的事写下来。',
  },
  {
    slug: 'life',
    name: '生活分享',
    description: '读书、走路、拍到的天空，以及一些没什么用但想记住的瞬间。',
  },
  {
    slug: 'essay',
    name: '杂谈',
    description: '不成体系的想法。学习方式、工具取舍、对某个问题的反复琢磨。',
  },
];

/** 全部显示名，供 Zod 校验使用 */
export const categoryNames = categories.map((c) => c.name) as [string, ...string[]];

/** 按显示名查分类（文章 frontmatter → 分类对象） */
export function categoryByName(name: string): Category | undefined {
  return categories.find((c) => c.name === name);
}

/** 按 URL 段查分类 */
export function categoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

/**
 * 把显示名转成 URL 段。
 * 找不到时回退到显示名本身 —— 保证"分类还没登记但文章已经写了"时
 * 链接依然能生成，而不是整站构建失败。
 */
export function categorySlug(name: string): string {
  return categoryByName(name)?.slug ?? name;
}
