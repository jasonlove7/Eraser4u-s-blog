/**
 * 文章相关的查询与计算。
 *
 * 集中在这里的目的：页面组件只负责渲染，不重复写过滤/排序逻辑。
 * 以后要改「草稿怎么处理」「相关文章怎么算」，只动这一个文件。
 */
import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

/**
 * 是否包含草稿。
 *
 * - `npm run dev`：默认包含，写作时能看到全貌
 * - `npm run build`：默认排除，线上保持干净
 * - `PUBLIC_SHOW_DRAFTS=true npm run build`：临时构建一份**带草稿**的产物，
 *   用于在真实构建下预览草稿文章的排版（dev 与 build 的资源处理不同，
 *   有些问题只在 build 之后才暴露）
 */
export const SHOW_DRAFTS =
  import.meta.env.DEV || import.meta.env.PUBLIC_SHOW_DRAFTS === 'true';

/**
 * 取全部文章，按日期倒序。
 * 生产构建自动排除 draft。
 */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => SHOW_DRAFTS || !data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/**
 * 中文阅读时间。
 *
 * ⚠️ 绝不使用「英文单词数 ÷ 200」那一套：
 *    中文没有空格，按单词数算会把一篇 5000 字的长文算成「1 分钟」。
 *    这里按字符数分别统计中日韩字符与拉丁词，再各自按合理速度折算。
 */
export function readingTime(body: string | undefined): number {
  if (!body) return 1;

  // 去掉代码块与行内代码：读者不会逐字读代码，按正文速度算会严重高估
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, ' ');

  const cjk = (text.match(/[㐀-䶿一-鿿぀-ヿ]/g) ?? []).length;
  const latinWords = (text.match(/[A-Za-z0-9]+/g) ?? []).length;

  // 中文约 400 字/分钟，英文约 200 词/分钟
  const minutes = cjk / 400 + latinWords / 200;
  return Math.max(1, Math.round(minutes));
}

/** 按标签聚合 */
export function collectTags(posts: Post[]): Map<string, Post[]> {
  const map = new Map<string, Post[]>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      const list = map.get(tag) ?? [];
      list.push(post);
      map.set(tag, list);
    }
  }
  return map;
}

/** 按分类聚合 */
export function collectCategories(posts: Post[]): Map<string, Post[]> {
  const map = new Map<string, Post[]>();
  for (const post of posts) {
    const list = map.get(post.data.category) ?? [];
    list.push(post);
    map.set(post.data.category, list);
  }
  return map;
}

/** 上一篇 / 下一篇（按发布时间） */
export function adjacentPosts(posts: Post[], id: string): { prev?: Post; next?: Post } {
  const index = posts.findIndex((p) => p.id === id);
  if (index === -1) return {};
  // posts 是倒序的：index-1 更新，index+1 更旧
  return {
    next: posts[index - 1],
    prev: posts[index + 1],
  };
}

/**
 * 相关文章：按标签交集数量排序。
 */
export function relatedPosts(posts: Post[], current: Post, limit = 3): Post[] {
  const tags = new Set(current.data.tags);
  return posts
    .filter((p) => p.id !== current.id)
    .map((p) => {
      const shared = p.data.tags.filter((t) => tags.has(t)).length;
      return { post: p, score: shared };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.post.data.date.valueOf() - a.post.data.date.valueOf())
    .slice(0, limit)
    .map(({ post }) => post);
}
