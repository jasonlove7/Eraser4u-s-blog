// @ts-check
import { defineConfig } from 'astro/config';
import expressiveCode from 'astro-expressive-code';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// Eraser4u's Blog
// GitHub Pages Project Site —— 站点位于子路径下，site 与 base 必须成对配置。
// 站点根 URL: https://jasonlove7.github.io/Eraser4u-s-blog/
//
// 注意：base 以 / 开头、结尾不带 / 。
// 任何硬编码的绝对路径（如 /images/a.png）在构建后都会 404，
// 必须使用 withBase()（见 src/utils/url.ts）。
export default defineConfig({
  site: 'https://jasonlove7.github.io',
  base: '/Eraser4u-s-blog',
  trailingSlash: 'ignore',

  build: {
    // 输出目录保持 Astro 默认值（dist），与 withastro/action 的默认 out-dir 一致。
    format: 'directory',
  },

  integrations: [
    /**
     * 代码块高亮。
     *
     * 在**构建期**渲染成静态 HTML —— 运行时零 JavaScript
     * （只有复制按钮等少数交互会带一点点 JS）。
     * 这直接决定了 PWN / ASM / C 这类文章的可读性：
     * 行号、行高亮、文件名标题栏、长代码横向滚动。
     */
    expressiveCode({
      themes: ['github-light', 'github-dark'],
      // 使用我们自己的设计 token，而不是让插件注入它默认的配色与圆角
      useStarlightDarkModeSwitch: false,
      styleOverrides: {
        borderRadius: '4px',
        // 长代码不撑破正文宽度，超出则横向滚动
        codeFontSize: '0.875rem',
        codeLineHeight: '1.7',
        frames: {
          // 只在有 title 时显示标题栏，避免无意义的装饰边框
          showCopyToClipboardButton: true,
        },
      },
      defaultProps: {
        // 默认关闭行号：技术文章里行号多数时候是噪音，需要时再按代码块开启
        showLineNumbers: false,
        wrap: false,
      },
    }),

    // sitemap / RSS 的 URL 会自动带上 base（由 astro.config 的 site + base 推导）
    sitemap(),
  ],

  markdown: {
    /**
     * Astro 7 起默认的 Markdown 处理器已经不是 unified（而是 Sätteri），
     * remark / rehype 插件必须通过 `unified()` 显式声明。
     * 旧的 `markdown.remarkPlugins` 写法仍能跑，但已废弃并会告警。
     */
    processor: unified({
      // 数学公式：密码学 / 算法类文章会用到。
      // 注意：这里只是让 remark/rehype 能解析公式；
      // KaTeX 的样式表很重（数百 KB），只有在 frontmatter 标了
      // `math: true` 的文章里才动态加载（见 PostLayout.astro）。
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
  },
});
