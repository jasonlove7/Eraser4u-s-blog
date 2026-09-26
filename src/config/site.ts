/**
 * 站点统一配置 —— 全站唯一的内容数据源。
 *
 * 换签名、换头像、换社交链接、调导航，只改这一个文件，不动任何组件。
 *
 * ⚠️ 路径约定：
 *   这里所有以 `images/` 等开头的路径都是 **站点根相对路径**，
 *   使用时必须经过 `withBase()`（见 src/utils/url.ts）。
 *   例：<img src={withBase(site.author.avatar)} />
 *   直接当 href 用会在 GitHub Pages 子路径下 404。
 */

export interface NavItem {
  label: string;
  /** 站点根相对路径，例如 `articles/`；渲染时经 withBase() */
  href: string;
}

export interface SocialLink {
  label: string;
  href: string;
  /** 用于无障碍标签，避免重复的「链接」朗读 */
  rel?: string;
}

/**
 * 可用的天气主题。
 *
 * 新增一种天气需要改三处：
 *   1. 这里加一个值
 *   2. src/styles/tokens.css 里加一个 [data-weather='xxx'] 块（5 个天空原语 + 若干辅助 token）
 *   3. src/components/ui/WeatherSwitcher.astro 的列布里加一项
 * 其它地方（首页、文章页、内页页头）会自动跟随。
 */
export type Weather = 'day' | 'dusk' | 'rain' | 'snow';

export const site = {
  /** 站点名称，用于 <title> 后缀与页头 */
  title: "Eraser4u's Blog",
  /**
   * 站点描述。
   *
   * ⭐ 这一条同时喂给 <meta name="description">、Open Graph、Twitter Card 和 RSS，
   *    改这里就够了，不用去各个页面分别改。
   *
   *    定位是「记录技术、成长与思考」，后面挂的几个技术词是给搜索用的，
   *    但刻意只留了最核心的几个 —— 堆关键词既没用，读起来也假。
   */
  description:
    '一个记录技术、成长与思考的个人博客 —— 信息安全、CTF、PWN、二进制与 Windows 内核安全，以及一些生活与杂谈。',
  lang: 'zh-CN',

  /** 站点根 URL（不带子路径），与 astro.config.mjs 的 site 保持一致 */
  url: 'https://jasonlove7.github.io',
  /** 子路径，与 astro.config.mjs 的 base 保持一致 */
  base: '/Eraser4u-s-blog',

  author: {
    name: 'Eraser4u',
    handle: 'Eraser4u',
    /** 头像（1:1）。当前为占位 SVG，替换时改这一行即可。 */
    avatar: 'images/avatar/avatar.svg',
    /**
     * 页脚与 SEO 用的一句话签名。
     * 首页 Hero 里真正显示的是 src/data/hero.ts 的 quotes ——
     * 那里是轮播的多句话，这里只在页脚和元信息里用。
     */
    signature: '系统底层有裂缝，抬头有云。',
  },

  /** 首页与页头使用的天气氛围 */
  theme: {
    /** 首页 Hero 的天气 */
    hero: 'dusk' as Weather,
    /** 全站默认天气（内页页头） */
    default: 'day' as Weather,
    /** 主题强调色 —— 暖橙，来自黄昏的光 */
    accent: 'oklch(0.62 0.15 48)',
    /** 强调色的暗色模式版本 */
    accentDark: 'oklch(0.76 0.13 55)',
  },

  /** 首页 Hero 背景。留空 = 使用 CSS/SVG 绘制的大气分层（推荐，零版权风险、体积极小） */
  heroBackground: '',
  /** 关于页配图。同上，留空则用原创 SVG */
  aboutImage: '',

  social: [
    { label: 'GitHub', href: 'https://github.com/jasonlove7' },
    // 后续补充：邮箱、X、博客友链等。留空数组项会被 UI 自动忽略。
  ] as SocialLink[],

  /** 主导航。href 为站点根相对路径。 */
  nav: [
    { label: '文章', href: 'articles/' },
    { label: '系列', href: 'series/' },
    { label: '图片', href: 'photos/' },
    { label: '项目', href: 'projects/' },
    { label: '关于', href: 'about/' },
    { label: 'Now', href: 'now/' },
    { label: '搜索', href: 'search/' },
  ] as NavItem[],

  /** 页脚 */
  footer: {
    note: '用 Astro 构建，托管于 GitHub Pages。',
  },
};

export type Site = typeof site;
