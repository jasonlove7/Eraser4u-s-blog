/**
 * 日期格式化。
 *
 * 统一走这里，避免各个组件各写一遍 toLocaleDateString，
 * 出现格式不一致（有的 2026/9/22，有的 2026-09-22）。
 */

const DATE = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const DATE_LONG = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

/** 2026-09-22 */
export function formatDate(date: Date): string {
  return DATE.format(date).replace(/\//g, '-');
}

/** 2026 年 9 月 22 日 */
export function formatDateLong(date: Date): string {
  return DATE_LONG.format(date);
}

/** <time> 元素需要的机器可读格式 */
export function isoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** 按年份分组，用于归档页 */
export function groupByYear<T extends { data: { date: Date } }>(items: T[]): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const item of items) {
    const year = item.data.date.getFullYear();
    const list = map.get(year) ?? [];
    list.push(item);
    map.set(year, list);
  }
  return new Map([...map.entries()].sort((a, b) => b[0] - a[0]));
}
