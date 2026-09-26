/**
 * 搜索页的交互脚本。
 *
 * ⚠️ 为什么这个文件放在 public/ 而不是写成 .astro 里的 <script>：
 *
 *   Pagefind 的 pagefind.js 是**构建之后的 postbuild 步骤才生成的**，
 *   构建时并不存在。所以只能运行时动态 import。
 *   而 Astro/Vite 会把内联 <script> 里的动态 import 包进预加载辅助函数，
 *   并把 `__VITE_PRELOAD__` 占位符原样留在产物里 —— 运行时直接 ReferenceError，
 *   表现为"搜索索引不可用"，但网络面板里那个文件明明是 200。
 *
 *   放进 public/ 并用 is:inline 引入，浏览器就按原生 ES 模块加载，
 *   完全绕开打包器，这行代码不会再被改写。
 *
 * 代价：这个文件没有 TypeScript 检查。它足够小，可以接受。
 */

const root = document.querySelector('.search');
const form = document.getElementById('search-form');
const input = document.getElementById('search-input');
const statusEl = document.getElementById('search-status');
const resultsEl = document.getElementById('search-results');

if (root && form && input && statusEl && resultsEl) {
  const base = root.dataset.base || '';

  let pagefind = null;
  let loadFailed = false;
  let timer;

  const setStatus = (text) => {
    statusEl.textContent = text;
  };

  /**
   * 懒加载：只有用户真的开始输入时才去拉索引。
   * 不搜索的访客不会为搜索付任何代价（索引有几百 KB）。
   */
  async function ensurePagefind() {
    if (pagefind || loadFailed) return pagefind;
    try {
      const url = base + '/pagefind/pagefind.js';
      pagefind = await import(url);
      await pagefind.options({ excerptLength: 30 });
    } catch (error) {
      loadFailed = true;
      console.error('[search] 无法加载 Pagefind 索引:', error);
      setStatus(
        '搜索索引不可用。它由构建后的步骤生成 —— 开发模式下没有，请用 npm run build 之后再预览。'
      );
    }
    return pagefind;
  }

  async function runSearch(query) {
    if (!query || query.trim().length < 1) {
      resultsEl.innerHTML = '';
      setStatus('');
      return;
    }

    const pf = await ensurePagefind();
    if (!pf) return;

    setStatus('搜索中…');

    try {
      const search = await pf.search(query);
      const data = await Promise.all(search.results.slice(0, 12).map((r) => r.data()));

      resultsEl.innerHTML = '';

      if (data.length === 0) {
        setStatus('没有找到「' + query + '」。');
        return;
      }

      setStatus('找到 ' + search.results.length + ' 条结果。');

      for (const item of data) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = item.url;

        const h2 = document.createElement('h2');
        h2.textContent = (item.meta && item.meta.title) || item.url;

        const p = document.createElement('p');
        // excerpt 里的 <mark> 高亮由 Pagefind 自己生成，不是用户输入，可安全插入。
        p.innerHTML = item.excerpt;

        a.append(h2, p);
        li.append(a);

        if (item.meta && item.meta.category) {
          const meta = document.createElement('span');
          meta.className = 'result-meta';
          meta.textContent = item.meta.category;
          li.append(meta);
        }

        resultsEl.append(li);
      }
    } catch (error) {
      console.error('[search] 查询失败:', error);
      setStatus('搜索出错了。');
    }
  }

  // 节流：输入停顿 200ms 才查询，避免每敲一个字符就跑一次
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => runSearch(input.value), 200);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearTimeout(timer);
    runSearch(input.value);
  });

  // 允许通过 /search/?q=xxx 直接进入
  const q = new URLSearchParams(location.search).get('q');
  if (q) {
    input.value = q;
    runSearch(q);
  }
}
