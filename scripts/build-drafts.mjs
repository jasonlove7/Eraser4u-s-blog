/**
 * 构建一份**包含草稿**的产物，用于在真实构建下预览草稿文章的排版。
 *
 * 为什么不直接写成 npm script 里的 `PUBLIC_SHOW_DRAFTS=true astro build`：
 *   Windows 上 npm 默认用 cmd.exe 执行 script，而 `VAR=value command`
 *   是 POSIX shell 的语法，在 cmd 下会被当成命令名而**静默失效** ——
 *   表现为"明明加了 flag，构建结果却和不加时一模一样"。
 *   这个脚本用 Node 显式设置环境变量再 spawn，两个平台行为一致。
 *
 * 用法：npm run build:with-drafts
 */

import { spawnSync } from 'node:child_process';

const env = { ...process.env, PUBLIC_SHOW_DRAFTS: 'true' };

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env,
    // shell: true 才能让 npx 在 Windows 上被正确解析
    shell: true,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('构建中（包含 draft 文章）…\n');
run('npx', ['astro', 'build']);
run('npx', ['pagefind', '--site', 'dist']);
console.log('\n完成。产物在 dist/ —— 用 npm run preview 查看。');
