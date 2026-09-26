/**
 * 项目列表。
 *
 * ⭐ 想增删项目，只改这个文件。
 *
 * ⚠️ 这里只放**确实存在、可以给出链接**的东西。
 *    不要写"待补充"式的占位条目 —— 一个空项目列表比一堆占位内容好看得多。
 *    没有项目时，/projects 页面会显示一句得体的空状态。
 */

export interface Project {
  name: string;
  summary: string;
  /** 项目链接。没有外部链接就留空，页面会渲染成纯文本而不是死链。 */
  href?: string;
  /** 技术标签，纯文本，不做进度条 */
  stack: string[];
  status: '进行中' | '已完成' | '长期维护';
  year: string;
}

export const projects: Project[] = [
  {
    name: "Eraser4u's Blog",
    summary:
      '你正在看的这个站点。Astro + 原生 CSS，天空、云、城市和天气系统都是手写的 SVG 与 CSS，部署在 GitHub Pages 上。',
    href: 'https://github.com/jasonlove7/Eraser4u-s-blog',
    stack: ['Astro', 'TypeScript', 'CSS'],
    status: '长期维护',
    year: '2026',
  },
];
