/**
 * Month-key helpers — 用户本地时区的月份归档逻辑
 * 决策点：month_key 用 VARCHAR(7) "YYYY-MM"，按用户本地时区生成（不是 UTC）
 */

/**
 * 把 Date + 用户 timezone 转为 "YYYY-MM" 字符串
 * @param date 任意 ISO 时间戳或 Date 对象
 * @param timezone IANA 时区名，如 "Asia/Shanghai"
 */
export function toMonthKey(date: Date | string, timezone: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
  });
  const parts = formatter.formatToParts(d);
  const year  = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  return `${year}-${month}`;
}

/**
 * R-08：判断 capturedAt 是否在用户的"当月"内 → memory 是否可编辑
 */
export function isCurrentMonth(capturedAt: Date | string, timezone: string): boolean {
  return toMonthKey(capturedAt, timezone) === toMonthKey(new Date(), timezone);
}

/**
 * 当前 monthKey
 */
export function currentMonthKey(timezone: string): string {
  return toMonthKey(new Date(), timezone);
}
