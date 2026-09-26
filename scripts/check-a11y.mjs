/**
 * 无障碍静态检查。
 *
 * 这不是要替代 axe / Lighthouse —— 那类工具需要在真实浏览器里跑。
 * 这里只覆盖**构建产物里能直接查出来的结构性错误**：
 * 缺 lang、图片缺 alt、标题层级断裂、表单控件没有标签、
 * 装饰元素没有对辅助技术隐藏。这些恰恰是最常犯、也最容易漏的。
 *
 * 用法：npm run build && node scripts/check-a11y.mjs
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const DIST = resolve('dist');

async function collectHtml(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Pagefind 的产物是它自己的运行时代码，不参与检查
      if (entry.name === 'pagefind') continue;
      await collectHtml(full, out);
    } else if (entry.name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

const files = await collectHtml(DIST);
const issues = [];

for (const file of files) {
  const html = await readFile(file, 'utf8');
  const page = file.replace(DIST, '').replace(/\\/g, '/');
  const add = (rule, detail) => issues.push({ page, rule, detail });

  // 1. lang 属性
  const htmlTag = html.match(/<html[^>]*>/i)?.[0] ?? '';
  if (!/\blang=/.test(htmlTag)) add('缺少 lang', '<html> 上没有 lang 属性');

  // 2. 图片必须有 alt（装饰性图片用 alt="" 也是合法的）
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    if (!/\balt=/.test(tag)) add('图片缺少 alt', tag.slice(0, 90));
  }

  // 3. 表单控件必须有可访问名（label / aria-label / aria-labelledby）
  for (const tag of html.match(/<(input|select|textarea)\b[^>]*>/gi) ?? []) {
    if (/type=["'](hidden|submit|button)["']/i.test(tag)) continue;
    const hasName = /\b(aria-label|aria-labelledby|title|id)=/.test(tag);
    if (!hasName) add('表单控件没有标签', tag.slice(0, 90));
  }

  // 4. 标题层级：必须恰好一个 h1，且不跳级（h2 -> h4）
  const headings = [...html.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]));
  const h1Count = headings.filter((h) => h === 1).length;
  if (h1Count === 0) add('缺少 h1', '页面没有任何一级标题');
  if (h1Count > 1) add('多个 h1', `找到 ${h1Count} 个（应只有 1 个）`);

  let prev = 0;
  for (const level of headings) {
    if (prev && level > prev + 1) {
      add('标题跳级', `h${prev} 之后直接出现 h${level}`);
      break;
    }
    prev = level;
  }

  // 5. 必须有跳到主内容的链接（键盘用户第一个 Tab 就能跳过导航）
  if (!/class="skip-link"/.test(html)) add('缺少 skip link', '没有跳到主内容的链接');

  // 6. 主内容区必须有 id="main" 供 skip link 指向
  if (!/id="main"/.test(html)) add('缺少主内容锚点', '找不到 id="main"');
}

console.log(`检查 ${files.length} 个页面。`);

if (issues.length === 0) {
  console.log('✅ 结构性无障碍检查全部通过。');
  console.log('   （完整审计仍需在真实浏览器里跑 Lighthouse / axe）');
  process.exit(0);
}

const grouped = new Map();
for (const i of issues) {
  const list = grouped.get(i.rule) ?? [];
  list.push(i);
  grouped.set(i.rule, list);
}

console.log(`\n❌ ${issues.length} 个问题：\n`);
for (const [rule, list] of grouped) {
  console.log(`[${rule}] ${list.length} 处`);
  for (const i of list.slice(0, 3)) console.log(`    ${i.page}  ${i.detail}`);
  if (list.length > 3) console.log(`    …还有 ${list.length - 3} 处`);
  console.log();
}

process.exit(1);
