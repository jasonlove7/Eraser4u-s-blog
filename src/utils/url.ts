/**
 * 站点 URL 工具。
 *
 * 这个文件存在的唯一理由：本项目部署在 GitHub Pages 的 **子路径** 下
 * （https://jasonlove7.github.io/Eraser4u-s-blog/），因此站内每一个
 * 绝对路径都必须带上 base 前缀。
 *
 * ⚠️ 千万 **不要** 手写字符串拼接：
 *     `${import.meta.env.BASE_URL}favicon.svg`
 * 当 base 为 `/Eraser4u-s-blog`（无尾斜杠）时，结果是
 *     `/Eraser4u-s-blogfavicon.svg`   ← 404
 *
 * 一律使用 withBase()。
 */

/** 原始 base，例如 `/Eraser4u-s-blog`；根部署时为 `/` */
const rawBase = import.meta.env.BASE_URL || '/';

/** 规范化后的 base：不以 / 结尾；根部署时为空字符串 */
const base = rawBase.replace(/\/+$/, '');

/**
 * 把站内绝对路径拼上 base 前缀。
 *
 * @example
 * withBase('favicon.svg')      // '/Eraser4u-s-blog/favicon.svg'
 * withBase('/articles/')       // '/Eraser4u-s-blog/articles/'
 * withBase()                   // '/Eraser4u-s-blog/'
 */
export function withBase(path = ''): string {
  const clean = String(path).replace(/^\/+/, '');
  return clean ? `${base}/${clean}` : `${base}/`;
}

/**
 * 拼接站点的绝对 URL（含协议与域名），用于 canonical / Open Graph / RSS / sitemap。
 * 这些地方的 URL **同样必须带 base**，是最容易被忽略的一处。
 *
 * @example
 * absoluteUrl('articles/stack-overflow/')
 * // 'https://jasonlove7.github.io/Eraser4u-s-blog/articles/stack-overflow/'
 */
export function absoluteUrl(path = ''): string {
  return new URL(withBase(path), import.meta.env.SITE).href;
}

export { base };
