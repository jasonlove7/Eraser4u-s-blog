/**
 * RSS 订阅源。
 *
 * ⚠️ link 必须带 base 前缀（本站部署在 GitHub Pages 的子路径下）。
 *    直接写 `articles/xxx/` 会生成指向站点根域的链接，订阅器点进去全是 404。
 *    这是 base path 问题里最容易被忽略的一处 —— canonical / OG / sitemap / RSS。
 */
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPosts } from '../utils/posts';
import { site } from '../config/site';
import { withBase } from '../utils/url';

export async function GET(context: APIContext) {
  const posts = await getPosts();

  return rss({
    title: site.title,
    description: site.description,
    // context.site 来自 astro.config 的 site；@astrojs/rss 会在其基础上拼接 link
    site: context.site ?? site.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: withBase(`articles/${post.id}/`),
      categories: [post.data.category, ...post.data.tags],
    })),
    customData: `<language>zh-cn</language>`,
  });
}
