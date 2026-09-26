// @ts-check
import { defineConfig } from 'astro/config';

// Eraser4u's Blog
// GitHub Pages Project Site —— 站点位于子路径下，site 与 base 必须成对配置。
// 站点根 URL: https://jasonlove7.github.io/Eraser4u-s-blog/
//
// 注意：base 以 / 开头、结尾不带 / 。
// 任何硬编码的绝对路径（如 /images/a.png）在构建后都会 404，
// 必须使用 import.meta.env.BASE_URL 或 Astro 的相对路径解析。
export default defineConfig({
  site: 'https://jasonlove7.github.io',
  base: '/Eraser4u-s-blog',
  trailingSlash: 'ignore',
  build: {
    // 输出目录保持 Astro 默认值（dist），与 withastro/action 的默认 out-dir 一致。
    format: 'directory',
  },
});
