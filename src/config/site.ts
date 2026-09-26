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

/** 可用的天气主题。新增主题时同步在 tokens.css 里加 [data-weather="..."] 定义。 */
export type Weather = 'day' | 'dusk';

export const site = {
  /** 站点名称，用于 <title> 后缀与页头 */
  title: "Eraser4u's Blog",
  /** 站点一句话签名 */
  tagline: '系统底层有裂缝，抬头有云。',
  /** 用于 <meta name="description"> 与 RSS */
  description:
    '一个记录信息安全、CTF、PWN、二进制与 Windows 内核安全的技术博客。写代码，也写天空。',
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
    /** 首页 Hero 大标题下的签名 */
    signature: '系统底层有裂缝，抬头有云。',
    /** 关于页用的较长自述 */
    bio: [
      '在读大学生，方向是信息安全。',
      '喜欢把程序拆开看它为什么这样跑 —— 从栈上的一个字节，到内核里的一个结构体。',
      '也喜欢抬头看天。黄昏、积雨云、雨后的路面，和调试器里那个终于对上的地址一样好看。',
    ],
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
    { label: '项目', href: 'projects/' },
    { label: '关于', href: 'about/' },
    { label: 'Now', href: 'now/' },
  ] as NavItem[],

  /** 页脚 */
  footer: {
    note: '用 Astro 构建，托管于 GitHub Pages。',
  },
};

export type Site = typeof site;
