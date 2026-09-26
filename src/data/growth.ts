/**
 * 成长记录数据。
 *
 * ⚠️ 这里是**待你填写的占位内容**，不是真实经历。
 *    作者本人的学习路径只有自己知道，Agent 不该替你编。
 *    把下面的条目替换成真实内容即可，结构不用动。
 *
 * 关于技术栈的呈现方式：
 *   刻意 **不使用「PWN 73%」这种技能进度条**。
 *   百分比是编出来的，没有信息量，而且一旦写死就会过期。
 *   用「在用 / 在学 / 用过」三档描述状态，才是一个人真实的处境。
 */

export interface Project {
  name: string;
  summary: string;
  /** 项目链接，没有就留空 */
  href?: string;
  /** 技术标签 */
  stack: string[];
  /** 进行中 / 已完成 / 长期维护 */
  status: '进行中' | '已完成' | '长期维护';
  year: string;
}

export interface TimelineEntry {
  /** 显示的时间，如「2025 春」 */
  when: string;
  title: string;
  detail: string;
  /** 可选：相关文章或系列的链接（站点根相对路径） */
  href?: string;
}

/** 技术栈三档。替换成你自己的。 */
export const stack = {
  /** 现在主力在用的 */
  using: ['C', 'Python', 'Linux', 'GDB / pwntools'],
  /** 正在学的 */
  learning: ['Windows 内核', 'x64 汇编', 'IDA / WinDbg'],
  /** 用过、暂时放下的 */
  used: ['C++', 'Go', 'PHP'],
};

/** 学习与 CTF 时间线 */
export const timeline: TimelineEntry[] = [
  {
    when: '——',
    title: '（待补充）',
    detail:
      '这里放你的学习节点：第一次做出 PWN 题、第一次打 CTF、第一次读内核源码……' +
      '在 src/data/growth.ts 的 timeline 数组里按时间顺序补上。',
  },
];

/** 项目列表 */
export const projects: Project[] = [
  {
    name: 'Eraser4u\'s Blog',
    summary:
      '你正在看的这个站点。Astro + 原生 CSS，自己写的氛围视觉系统，' +
      '部署在 GitHub Pages 上。',
    href: 'https://github.com/jasonlove7/Eraser4u-s-blog',
    stack: ['Astro', 'TypeScript', 'CSS'],
    status: '长期维护',
    year: '2026',
  },
];
