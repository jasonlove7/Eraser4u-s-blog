/**
 * 站内链接完整性检查。
 *
 * 为什么需要它：本站部署在 GitHub Pages 的子路径下，
 * 任何漏掉 base 前缀的绝对路径在**本地 dev 下看不出来**，只在线上炸。
 * 这个脚本直接扫构建产物 dist/，把所有内部链接解析成文件路径逐一验证。
 *
 * 用法：
 *   npm run build && node scripts/check-links.mjs
 */

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, posix } from 'node:path';

const DIST = resolve('dist');
const BASE = '/Eraser4u-s-blog';

/** 递归收集 dist 下所有 html 文件 */
async function collectHtml(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await collectHtml(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

/** 把一个站内 URL 映射到 dist 里的文件路径；返回 null 表示不检查（外链、锚点等） */
function resolveTarget(href) {
  if (!href) return null;
  // 外链、协议、锚点、data: 一律跳过
  if (/^(https?:)?\/\//.test(href) || href.startsWith('#') || href.startsWith('data:')) {
    return null;
  }
  if (href.startsWith('mailto:') || href.startsWith('tel:')) return null;

  const path = href.split('#')[0].split('?')[0];
  if (!path) return null;

  const decoded = decodeURIComponent(path);

  if (decoded.startsWith('/')) {
    // 绝对路径：必须带 base 前缀，否则线上必然 404
    if (!decoded.startsWith(BASE)) {
      return { missingBase: true, target: decoded };
    }
    return { rel: decoded.slice(BASE.length) || '/' };
  }
  // 相对路径暂不深究（Astro 生成的资源引用都是 resolved 的绝对路径）
  return { rel: posix.normalize(decoded) };
}

const files = await collectHtml(DIST);
const problems = [];
let checked = 0;

for (const file of files) {
  const html = await readFile(file, 'utf8');
  const from = file.replace(DIST, '').replace(/\\/g, '/');

  const hrefs = [...html.matchAll(/(?:href|src)="([^"]*)"/g)].map((m) => m[1]);

  for (const href of hrefs) {
    const res = resolveTarget(href);
    if (!res) continue;

    if (res.missingBase) {
      problems.push({
        kind: '缺少 base 前缀',
        from,
        href,
        detail: `${res.target} —— 应形如 ${BASE}${res.target}`,
      });
      continue;
    }

    checked++;
    const rel = res.rel.replace(/^\//, '');
    const direct = join(DIST, rel);
    const candidates = [
      direct,
      join(DIST, rel, 'index.html'),
      `${direct}.html`,
    ];

    if (!candidates.some((c) => existsSync(c))) {
      problems.push({ kind: '目标不存在', from, href, detail: `期望 ${rel}` });
    }
  }
}

console.log(`扫描 ${files.length} 个 HTML，检查 ${checked} 条站内链接。`);

if (problems.length === 0) {
  console.log('✅ 没有发现问题。');
  process.exit(0);
}

console.log(`\n❌ 发现 ${problems.length} 个问题：\n`);
const seen = new Set();
for (const p of problems) {
  const key = `${p.kind}|${p.href}`;
  if (seen.has(key)) continue;
  seen.add(key);
  console.log(`[${p.kind}] 页面 ${p.from}`);
  console.log(`    ${p.href}  →  ${p.detail}\n`);
}
process.exit(1);
